/**
 * freelancers-analyze.ts — reads all latest.json snapshots, computes keyword density,
 * diffs, and improvement recommendations, and writes fixtures/agent/top-freelancers.json.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { CATEGORIES, type CategoryDef } from "./freelancer-categories.ts";
import {
  listSnapshots,
  type FreelancerSnapshot,
} from "./fetch-top-freelancers.ts";

// ─── Output types ─────────────────────────────────────────────────────────────

export interface KeywordDensity {
  keyword: string;
  title: number;
  overview: number;
  skills: number;
  employment: number;
  portfolio: number;
  weighted: number; // title*3 + overview*1 + skills*2 + employment*1 + portfolio*2
}

export interface FreelancerSummary {
  profileKey: string;
  category: string;
  rank: number;
  name: string | null;
  photoUrl: string | null;
  title: string | null;
  hourlyRateDisplay: string | null;
  jobSuccessScore: number | null;
  topRatedStatus: string | null;
  totalEarningsDisplay: string | null;
  totalHours: number | null;
  location: { country: string | null; city: string | null } | null;
  skillsCount: number;
  portfolioCount: number;
  employmentCount: number;
  keywordDensity: KeywordDensity[];
  latestSnapshotAt: string;
  snapshotCount: number;
  lastDiff: null | {
    from: string;
    to: string;
    changedFields: string[];
  };
  improvements: string[];
}

export interface Categ {
  slug: string;
  label: string;
  primaryKeyword: string;
  freelancers: FreelancerSummary[];
  avgOverviewWords: number;
  avgPortfolioCount: number;
  avgHourlyRate: number | null;
  topPrimaryScore: number;
  generatedAt: string;
}

export interface TopFreelancersFile {
  generatedAt: string;
  categories: Categ[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countOccurrences(text: string, keyword: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  const kw = keyword.toLowerCase();
  let count = 0;
  let idx = 0;
  while ((idx = lower.indexOf(kw, idx)) !== -1) {
    count++;
    idx += kw.length;
  }
  return count;
}

function countInText(text: string | null | undefined, keyword: string): number {
  if (!text) return 0;
  return countOccurrences(text, keyword);
}

function wordCount(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractSkillLabels(snap: FreelancerSnapshot): string[] {
  const labels: string[] = [];
  const edges = snap.profile?.skills?.edges ?? [];
  for (const e of edges) {
    if (e.node.preferredLabel) labels.push(e.node.preferredLabel);
  }
  // Also from search record skills
  for (const s of snap.searchRecord?.skills ?? []) {
    const label = s.preferredLabel;
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

function computeKeywordDensity(
  snap: FreelancerSnapshot,
  keywords: string[],
): KeywordDensity[] {
  const titleText =
    snap.profile?.personalData?.title ?? snap.searchRecord?.title ?? "";
  const overviewText =
    snap.profile?.personalData?.description ??
    snap.searchRecord?.description ??
    "";
  const skillsText = extractSkillLabels(snap).join(" ");

  const employmentTexts = (snap.profile?.employmentRecords ?? [])
    .map((e) => `${e.jobTitle} ${e.role ?? ""} ${e.description ?? ""}`)
    .join(" ");

  // FreelancerProfile.project() is a single-by-ID lookup; we don't have a list endpoint.
  // Portfolio data comes from the searchRecord (contracts[].title/description) if present.
  // We treat it as empty for now since full portfolio list is not accessible via this query.
  const portfolioText = "";

  return keywords.map((kw) => {
    const title = countInText(titleText, kw);
    const overview = countInText(overviewText, kw);
    const skills = countInText(skillsText, kw);
    const employment = countInText(employmentTexts, kw);
    const portfolio = countInText(portfolioText, kw);
    const weighted =
      title * 3 + overview * 1 + skills * 2 + employment * 1 + portfolio * 2;
    return {
      keyword: kw,
      title,
      overview,
      skills,
      employment,
      portfolio,
      weighted,
    };
  });
}

/** Compare two snapshots at the top-level fields that matter. */
function diffSnapshots(
  older: FreelancerSnapshot,
  newer: FreelancerSnapshot,
): string[] {
  const changed: string[] = [];

  // Top-level shallow compare
  const deepFields = [
    "title",
    "overview",
    "hourlyRate",
    "skills",
    "jobSuccessScore",
  ] as const;

  type DeepField = (typeof deepFields)[number];

  const getField = (s: FreelancerSnapshot, f: DeepField): unknown => {
    switch (f) {
      case "title":
        return s.profile?.personalData?.title ?? s.searchRecord?.title ?? null;
      case "overview":
        return (
          s.profile?.personalData?.description ??
          s.searchRecord?.description ??
          null
        );
      case "hourlyRate":
        return (
          s.profile?.personalData?.chargeRate?.rawValue ??
          s.searchRecord?.hourlyRate?.rawValue ??
          null
        );
      case "skills":
        return JSON.stringify(extractSkillLabels(s).sort());
      case "jobSuccessScore":
        return s.profile?.aggregates?.jobSuccessScore ?? null;
    }
  };

  for (const f of deepFields) {
    const a = getField(older, f);
    const b = getField(newer, f);
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changed.push(f);
    }
  }

  return changed;
}

// ─── Main analysis function ───────────────────────────────────────────────────

export function analyzeFreelancers(): TopFreelancersFile {
  const freelancersBase = resolve(process.cwd(), "fixtures", "freelancers");
  const generatedAt = new Date().toISOString();

  const resultCategories: Categ[] = [];
  let totalFreelancers = 0;
  let totalImprovements = 0;
  let totalDiffs = 0;

  for (const catDef of CATEGORIES) {
    const summaries = loadCategorySnapshots(freelancersBase, catDef);
    if (summaries.length === 0) {
      console.error(`[analyze:${catDef.slug}] no snapshots found — skipping`);
      continue;
    }

    // Compute category averages over raw data before ranking
    const avgOverviewWords = computeAvg(
      summaries.map((s) =>
        wordCount(
          s._snap.profile?.personalData?.description ??
            s._snap.searchRecord?.description,
        ),
      ),
    );
    const avgPortfolioCount = 0; // portfolio list not available via current queries
    const hourlyRates = summaries
      .map((s) =>
        parseFloat(
          s._snap.profile?.personalData?.chargeRate?.rawValue ??
            s._snap.searchRecord?.hourlyRate?.rawValue ??
            "",
        ),
      )
      .filter((n) => !isNaN(n));
    const avgHourlyRate =
      hourlyRates.length > 0
        ? hourlyRates.reduce((a, b) => a + b, 0) / hourlyRates.length
        : null;

    // Compute keyword density for each freelancer
    const withDensity = summaries.map((s) => ({
      ...s,
      density: computeKeywordDensity(s._snap, catDef.keywords),
    }));

    // Sort by primary keyword weighted score desc, tie-break by JSS desc
    const primaryKw = catDef.primaryKeyword;
    withDensity.sort((a, b) => {
      const aScore =
        a.density.find((d) => d.keyword === primaryKw)?.weighted ?? 0;
      const bScore =
        b.density.find((d) => d.keyword === primaryKw)?.weighted ?? 0;
      if (bScore !== aScore) return bScore - aScore;
      const aJss = a._snap.profile?.aggregates?.jobSuccessScore ?? 0;
      const bJss = b._snap.profile?.aggregates?.jobSuccessScore ?? 0;
      return bJss - aJss;
    });

    const topPrimaryScore =
      withDensity[0]?.density.find((d) => d.keyword === primaryKw)?.weighted ??
      0;

    const freelancerSummaries: FreelancerSummary[] = withDensity.map(
      (item, idx) => {
        const snap = item._snap;
        const density = item.density;
        const primaryScore =
          density.find((d) => d.keyword === primaryKw)?.weighted ?? 0;
        const jss = snap.profile?.aggregates?.jobSuccessScore ?? null;
        const titleText =
          snap.profile?.personalData?.title ?? snap.searchRecord?.title ?? "";
        const overviewWords = wordCount(
          snap.profile?.personalData?.description ??
            snap.searchRecord?.description,
        );
        const skillsCount = extractSkillLabels(snap).length;
        const snapshotCount = listSnapshots(snap.profileKey).length;

        // Diff with prior snapshot
        let lastDiff: FreelancerSummary["lastDiff"] = null;
        const snapFiles = listSnapshots(snap.profileKey);
        if (snapFiles.length >= 2) {
          const prevFile = snapFiles[snapFiles.length - 2]!;
          try {
            const prevSnap = JSON.parse(
              readFileSync(
                resolve(freelancersBase, snap.profileKey, prevFile),
                "utf8",
              ),
            ) as FreelancerSnapshot;
            const changedFields = diffSnapshots(prevSnap, snap);
            if (changedFields.length > 0) {
              lastDiff = {
                from: prevSnap.fetchedAt,
                to: snap.fetchedAt,
                changedFields,
              };
              totalDiffs++;
            }
          } catch {
            // ignore diff errors
          }
        }

        // Improvements
        const improvements: string[] = [];

        if (!titleText.toLowerCase().includes(primaryKw.toLowerCase())) {
          improvements.push(`Add '${primaryKw}' to your title`);
        }

        if (overviewWords < avgOverviewWords * 0.7) {
          improvements.push(
            `Expand your overview (${overviewWords} words vs category avg ${Math.round(avgOverviewWords)})`,
          );
        }

        if (0 < avgPortfolioCount * 0.6) {
          // portfolioCount is 0 since we can't fetch portfolio list
          // skip this rule when avgPortfolioCount is 0
        }

        if (skillsCount < 5) {
          improvements.push("Add more skills tags");
        }

        // Upwork returns JSS as a decimal (0–1); normalize to 0–100 for display
        const jssPct =
          jss !== null
            ? jss <= 1
              ? Math.round(jss * 100)
              : Math.round(jss)
            : null;
        if (jssPct !== null && jssPct < 90) {
          improvements.push(`Improve JSS — currently ${jssPct}%`);
        }

        const certs = snap.profile?.certificates ?? [];
        if (certs.length === 0) {
          improvements.push("Add certifications");
        }

        if (topPrimaryScore > 0 && primaryScore < topPrimaryScore * 0.5) {
          improvements.push(
            `Increase '${primaryKw}' density (your score ${primaryScore}, top ${topPrimaryScore})`,
          );
        }

        const photoUrl =
          snap.profile?.portrait?.portrait100 ??
          snap.profile?.portrait?.portrait ??
          snap.searchRecord?.portrait ??
          null;

        // countryDetails is scope-restricted; fall back to search record location
        const location = snap.searchRecord?.location
          ? {
              country: snap.searchRecord.location.country,
              city: snap.searchRecord.location.city,
            }
          : null;

        totalImprovements += improvements.length;

        return {
          profileKey: snap.profileKey,
          category: catDef.slug,
          rank: idx + 1,
          name: snap.searchRecord?.shortName ?? null,
          photoUrl,
          title: titleText || null,
          hourlyRateDisplay:
            snap.profile?.personalData?.chargeRate?.displayValue ??
            snap.searchRecord?.hourlyRate?.displayValue ??
            null,
          jobSuccessScore: jssPct,
          topRatedStatus:
            snap.profile?.aggregates?.topRatedStatus ??
            snap.searchRecord?.topRatedStatus ??
            null,
          totalEarningsDisplay:
            snap.profile?.aggregates?.totalEarnings?.displayValue ??
            snap.profile?.aggregates?.totalRevenue?.displayValue ??
            null,
          totalHours: snap.profile?.aggregates?.totalHours ?? null,
          location,
          skillsCount,
          portfolioCount: 0,
          employmentCount: (snap.profile?.employmentRecords ?? []).length,
          keywordDensity: density,
          latestSnapshotAt: snap.fetchedAt,
          snapshotCount: snapshotCount + 1, // +1 for the latest.json itself
          lastDiff,
          improvements,
        };
      },
    );

    const categ: Categ = {
      slug: catDef.slug,
      label: catDef.label,
      primaryKeyword: catDef.primaryKeyword,
      freelancers: freelancerSummaries,
      avgOverviewWords,
      avgPortfolioCount,
      avgHourlyRate,
      topPrimaryScore,
      generatedAt,
    };

    resultCategories.push(categ);
    totalFreelancers += freelancerSummaries.length;

    console.error(
      `[analyze:${catDef.slug}] ${freelancerSummaries.length} freelancers, ` +
        `topPrimaryScore=${topPrimaryScore}, avgOverviewWords=${Math.round(avgOverviewWords)}`,
    );
  }

  const output: TopFreelancersFile = {
    generatedAt,
    categories: resultCategories,
  };

  const agentDir = resolve(process.cwd(), "fixtures", "agent");
  mkdirSync(agentDir, { recursive: true });
  const outPath = resolve(agentDir, "top-freelancers.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.error(`[analyze] wrote → ${outPath}`);

  const avgImprovements =
    totalFreelancers > 0
      ? (totalImprovements / totalFreelancers).toFixed(1)
      : "0";
  const smallCats = resultCategories.filter((c) => c.freelancers.length < 5);

  // Final stdout summary
  process.stdout.write(
    `${resultCategories.length} categories · ${totalFreelancers} freelancers · ` +
      `${/* new snapshots counted at fetch time */ "see above"} new snapshots · ` +
      `${totalDiffs} diffs detected\n`,
  );
  if (smallCats.length > 0) {
    process.stdout.write(
      `WARNING: categories with < 5 freelancers: ${smallCats.map((c) => c.slug).join(", ")}\n`,
    );
  }
  console.error(
    `[analyze] avg improvements per freelancer: ${avgImprovements}`,
  );

  return output;
}

// ─── Load snapshots for a category ───────────────────────────────────────────

interface SnapWithRaw {
  _snap: FreelancerSnapshot;
}

function loadCategorySnapshots(
  base: string,
  catDef: CategoryDef,
): SnapWithRaw[] {
  // Read the index to know which profileKeys belong to this category
  const indexPath = resolve(base, "index.json");
  if (!existsSync(indexPath)) {
    console.error(`[analyze:${catDef.slug}] no index.json found`);
    return [];
  }

  let index: {
    categories: Array<{ category: string; profileKeys: string[] }>;
  };
  try {
    index = JSON.parse(readFileSync(indexPath, "utf8")) as typeof index;
  } catch {
    console.error(`[analyze:${catDef.slug}] failed to parse index.json`);
    return [];
  }

  const entry = index.categories.find((c) => c.category === catDef.slug);
  if (!entry) {
    // Fallback: scan all profile dirs for this category
    return scanAllProfilesForCategory(base, catDef.slug);
  }

  const results: SnapWithRaw[] = [];
  for (const profileKey of entry.profileKeys) {
    const latestFile = resolve(base, profileKey, "latest.json");
    if (!existsSync(latestFile)) continue;
    try {
      const snap = JSON.parse(
        readFileSync(latestFile, "utf8"),
      ) as FreelancerSnapshot;
      results.push({ _snap: snap });
    } catch {
      console.error(`[analyze:${catDef.slug}] failed to parse ${latestFile}`);
    }
  }
  return results;
}

function scanAllProfilesForCategory(
  base: string,
  catSlug: string,
): SnapWithRaw[] {
  if (!existsSync(base)) return [];
  const results: SnapWithRaw[] = [];
  for (const dir of readdirSync(base, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const latestFile = resolve(base, dir.name, "latest.json");
    if (!existsSync(latestFile)) continue;
    try {
      const snap = JSON.parse(
        readFileSync(latestFile, "utf8"),
      ) as FreelancerSnapshot;
      if (snap.category === catSlug) {
        results.push({ _snap: snap });
      }
    } catch {
      // skip
    }
  }
  return results;
}

function computeAvg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
