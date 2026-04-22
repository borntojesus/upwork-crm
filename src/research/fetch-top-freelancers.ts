/**
 * fetch-top-freelancers.ts — search top freelancers per category, snapshot full profiles.
 *
 * For each category:
 *   1. Query freelancerProfileSearchRecords (keyword search) → get ciphertext/profileKey
 *   2. For each result → freelancerProfileByProfileKey → full FreelancerProfile
 *   3. Save per-profile snapshot to fixtures/freelancers/<profileKey>/<ISO-timestamp>.json
 *   4. Copy to fixtures/freelancers/<profileKey>/latest.json
 *   5. Resumable: skip detail fetch if latest.json < 1h old
 *
 * Budget: 4 × (1 search + 10 detail) = 44 requests @ 1 req/sec ≈ 1 minute.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";
import { CATEGORIES, type CategoryDef } from "./freelancer-categories.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

const ONE_HOUR_MS = 60 * 60 * 1000;

// ─── GraphQL: search query ─────────────────────────────────────────────────────

/** Returns ciphertext + basic info from search results (union type — we use inline fragments). */
const SEARCH_QUERY = /* GraphQL */ `
  query FreelancerSearch(
    $searchFilter: FreelancerProfileSearchFilter!
    $pagination: Pagination!
  ) {
    freelancerProfileSearchRecords(
      searchFilter: $searchFilter
      pagination: $pagination
    ) {
      totalCount
      edges {
        node {
          ... on FreelancerProfilesSearchRecord {
            ciphertext
            title
            description
            shortName
            portrait
            topRatedStatus
            avgFeedbackScore
            hourlyRate {
              rawValue
              displayValue
              currency
            }
            location {
              country
              city
              state
            }
            skills {
              preferredLabel
              ontologyId
            }
          }
          ... on UserFreelancerProfilesSearchRecord {
            ciphertext
            shortName
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// ─── GraphQL: detail query ─────────────────────────────────────────────────────

/** Full FreelancerProfile detail. Drop fields that fail at runtime and retry is handled in code. */
const DETAIL_QUERY = /* GraphQL */ `
  query FreelancerProfileDetail($profileKey: String!) {
    freelancerProfileByProfileKey(profileKey: $profileKey) {
      portrait {
        portrait
        portrait50
        portrait100
        portrait150
        portrait500
      }
      personalData {
        title
        description
        chargeRate {
          rawValue
          displayValue
          currency
        }
        profileUrl
      }
      userPreferences {
        visibilityLevel
        hideEarnings
        hideJss
      }
      aggregates {
        jobSuccessScore
        topRatedStatus
        topRatedPlusStatus
        vetted
        totalHours
        totalHoursActual
        totalRevenue {
          rawValue
          displayValue
          currency
        }
        totalEarnings {
          rawValue
          displayValue
          currency
        }
        totalHourlyJobs
        totalFixedJobs
        billedContracts
        adjustedFeedbackScore
        lastWorkedDateTime
        lastActivityDateTime
      }
      availability {
        capacity
        name
        availabilityDateTime
      }
      skills {
        edges {
          node {
            preferredLabel
            ontologyId
          }
        }
      }
      languages {
        edges {
          node {
            id
            language {
              englishName
              iso639Code
            }
            verified
          }
        }
      }
      employmentRecords {
        id
        companyName
        jobTitle
        role
        description
        startDate
        endDate
      }
      educationRecords {
        id
        institutionName
        areaOfStudy
        degree
        startDate
        endDate
        description
      }
      certificates {
        id
        earnedDate
        active
        verified
        url
        notes
      }
      jobCategories {
        edges {
          node {
            category {
              id
              preferredLabel
            }
            selectedSubCategories {
              id
              preferredLabel
            }
          }
        }
      }
    }
  }
`;

// ─── Typescript types ─────────────────────────────────────────────────────────

export interface SearchRecord {
  ciphertext: string | null;
  title: string | null;
  description: string | null;
  shortName: string | null;
  portrait: string | null;
  topRatedStatus: string | null;
  avgFeedbackScore: number | null;
  hourlyRate: {
    rawValue: string;
    displayValue: string;
    currency: string;
  } | null;
  location: {
    country: string | null;
    city: string | null;
    state: string | null;
  } | null;
  skills: Array<{
    preferredLabel: string | null;
    ontologyId: string | null;
  }> | null;
}

interface SearchResponse {
  freelancerProfileSearchRecords: {
    totalCount: number | null;
    edges: Array<{
      node: {
        ciphertext?: string | null;
        title?: string | null;
        description?: string | null;
        shortName?: string | null;
        portrait?: string | null;
        topRatedStatus?: string | null;
        avgFeedbackScore?: number | null;
        hourlyRate?: {
          rawValue: string;
          displayValue: string;
          currency: string;
        } | null;
        location?: {
          country: string | null;
          city: string | null;
          state: string | null;
        } | null;
        skills?: Array<{
          preferredLabel: string | null;
          ontologyId: string | null;
        }> | null;
      } | null;
    }> | null;
    pageInfo: { hasNextPage: boolean; endCursor: string | null } | null;
  } | null;
}

export interface FreelancerProfileDetail {
  /** Dropped: fullName/firstName/lastName are String! but API returns null (bubbles up) */
  fullName?: never;
  firstName?: never;
  lastName?: never;
  portrait: {
    portrait: string | null;
    portrait50: string | null;
    portrait100: string | null;
    portrait150: string | null;
    portrait500: string | null;
  } | null;
  /** Dropped: FreelancerProfile.countryDetails requires elevated scope */
  countryDetails?: never;
  personalData: {
    title: string | null;
    description: string | null;
    chargeRate: {
      rawValue: string;
      displayValue: string;
      currency: string;
    } | null;
    profileUrl: string | null;
  } | null;
  userPreferences: {
    visibilityLevel: string | null;
    hideEarnings: boolean | null;
    hideJss: boolean | null;
  } | null;
  aggregates: {
    jobSuccessScore: number | null;
    topRatedStatus: string | null;
    topRatedPlusStatus: string | null;
    vetted: boolean | null;
    totalHours: number | null;
    totalHoursActual: number | null;
    totalRevenue: {
      rawValue: string;
      displayValue: string;
      currency: string;
    } | null;
    totalEarnings: {
      rawValue: string;
      displayValue: string;
      currency: string;
    } | null;
    totalHourlyJobs: number | null;
    totalFixedJobs: number | null;
    billedContracts: number | null;
    adjustedFeedbackScore: number | null;
    lastWorkedDateTime: string | null;
    lastActivityDateTime: string | null;
  } | null;
  availability: {
    capacity: string | null;
    name: string | null;
    availabilityDateTime: string | null;
  } | null;
  skills: {
    edges: Array<{
      node: { preferredLabel: string; ontologyId: string };
    }>;
  } | null;
  languages: {
    edges: Array<{
      node: {
        id: string;
        language: { englishName: string; iso639Code: string };
        verified: boolean | null;
      };
    }>;
  } | null;
  employmentRecords: Array<{
    id: string;
    companyName: string;
    jobTitle: string;
    role: string | null;
    description: string | null;
    startDate: string;
    endDate: string | null;
    /** Dropped: city/country are String! but API sometimes returns null */
    city?: never;
    country?: never;
  }> | null;
  educationRecords: Array<{
    id: string;
    institutionName: string;
    areaOfStudy: string | null;
    degree: string | null;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
  }> | null;
  certificates: Array<{
    id: string;
    earnedDate: string | null;
    active: boolean | null;
    verified: boolean | null;
    url: string | null;
    notes: string | null;
  }> | null;
  jobCategories: {
    edges: Array<{
      node: {
        category: { id: string; preferredLabel: string } | null;
        selectedSubCategories: Array<{ id: string; preferredLabel: string }>;
      };
    }>;
  } | null;
}

interface DetailResponse {
  freelancerProfileByProfileKey: FreelancerProfileDetail | null;
}

export interface FreelancerSnapshot {
  profileKey: string;
  category: string;
  fetchedAt: string;
  droppedFields: string[];
  profile: FreelancerProfileDetail | null;
  searchRecord: SearchRecord | null;
}

// ─── File helpers ─────────────────────────────────────────────────────────────

function freelancersDir(): string {
  const dir = resolve(process.cwd(), "fixtures", "freelancers");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function profileDir(profileKey: string): string {
  const dir = resolve(freelancersDir(), profileKey);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function latestPath(profileKey: string): string {
  return resolve(profileDir(profileKey), "latest.json");
}

function isLatestFresh(profileKey: string): boolean {
  const p = latestPath(profileKey);
  if (!existsSync(p)) return false;
  try {
    const snap = JSON.parse(readFileSync(p, "utf8")) as FreelancerSnapshot;
    const age = Date.now() - new Date(snap.fetchedAt).getTime();
    return age < ONE_HOUR_MS;
  } catch {
    return false;
  }
}

function saveSnapshot(snap: FreelancerSnapshot): void {
  const dir = profileDir(snap.profileKey);
  const ts = snap.fetchedAt.replace(/[:.]/g, "-");
  const filePath = resolve(dir, `${ts}.json`);
  const content = JSON.stringify(snap, null, 2);
  writeFileSync(filePath, content, "utf8");
  writeFileSync(latestPath(snap.profileKey), content, "utf8");
}

// ─── Search ───────────────────────────────────────────────────────────────────

async function searchFreelancers(cat: CategoryDef): Promise<SearchRecord[]> {
  console.error(
    `[freelancers:${cat.slug}] searching keyword="${cat.skillExpression}" top=${cat.topN}`,
  );
  let data: SearchResponse;
  try {
    data = await gql<SearchResponse>(
      SEARCH_QUERY,
      {
        searchFilter: {
          userType: "Freelancer",
          keyword: cat.skillExpression,
        },
        pagination: { first: cat.topN },
      },
      { operationName: "FreelancerSearch", tenantId: null },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[freelancers:${cat.slug}] search FAILED: ${msg}`);
    return [];
  }

  const edges = data.freelancerProfileSearchRecords?.edges ?? [];
  const totalCount = data.freelancerProfileSearchRecords?.totalCount ?? 0;
  console.error(
    `[freelancers:${cat.slug}] search returned ${edges.length}/${totalCount} records`,
  );

  const results: SearchRecord[] = [];
  for (const edge of edges) {
    const node = edge.node;
    if (!node) continue;
    const cipher = node.ciphertext;
    if (!cipher) {
      console.error(
        `[freelancers:${cat.slug}] skipping result with no ciphertext`,
      );
      continue;
    }
    results.push({
      ciphertext: cipher,
      title: node.title ?? null,
      description: node.description ?? null,
      shortName: node.shortName ?? null,
      portrait: node.portrait ?? null,
      topRatedStatus: node.topRatedStatus ?? null,
      avgFeedbackScore: node.avgFeedbackScore ?? null,
      hourlyRate: node.hourlyRate ?? null,
      location: node.location ?? null,
      skills: node.skills ?? null,
    });
  }
  return results;
}

// ─── Detail fetch ─────────────────────────────────────────────────────────────

/**
 * Fetch full profile. Tries the complete query first; if scope errors occur on specific fields,
 * records which fields were dropped and returns what we have (gql() already handles partial data).
 */
async function fetchProfile(
  profileKey: string,
  catSlug: string,
  searchRecord: SearchRecord,
): Promise<FreelancerSnapshot> {
  const fetchedAt = new Date().toISOString();
  const droppedFields: string[] = [];

  let profile: FreelancerProfileDetail | null = null;

  try {
    const data = await gql<DetailResponse>(
      DETAIL_QUERY,
      { profileKey },
      { operationName: "FreelancerProfileDetail", tenantId: null },
    );
    profile = data.freelancerProfileByProfileKey;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[freelancers:${catSlug}] detail for ${profileKey} FAILED: ${msg}`,
    );
    // Check if it's a scope error — if so we still save a partial snapshot
    if (
      msg.toLowerCase().includes("scope") ||
      msg.toLowerCase().includes("permission") ||
      msg.toLowerCase().includes("forbidden")
    ) {
      droppedFields.push("FULL_PROFILE_SCOPE_ERROR");
    }
  }

  return {
    profileKey,
    category: catSlug,
    fetchedAt,
    droppedFields,
    profile,
    searchRecord,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface FetchFreelancersResult {
  category: string;
  fetched: number;
  cached: number;
  failed: number;
  snapshots: FreelancerSnapshot[];
}

export async function fetchTopFreelancers(
  categoryFilter?: string,
): Promise<FetchFreelancersResult[]> {
  const cats = categoryFilter
    ? CATEGORIES.filter((c) => c.slug === categoryFilter)
    : CATEGORIES;

  if (cats.length === 0) {
    console.error(
      `[freelancers] No category matched "${categoryFilter ?? ""}"`,
    );
    return [];
  }

  const results: FetchFreelancersResult[] = [];
  let totalNew = 0;
  let totalCached = 0;

  for (const cat of cats) {
    console.error(`\n[freelancers] === Category: ${cat.label} ===`);
    const searchRecords = await searchFreelancers(cat);

    const catResult: FetchFreelancersResult = {
      category: cat.slug,
      fetched: 0,
      cached: 0,
      failed: 0,
      snapshots: [],
    };

    for (let i = 0; i < searchRecords.length; i++) {
      const rec = searchRecords[i]!;
      const profileKey = rec.ciphertext!;

      if (isLatestFresh(profileKey)) {
        const cached = JSON.parse(
          readFileSync(latestPath(profileKey), "utf8"),
        ) as FreelancerSnapshot;
        console.error(
          `[freelancers:${cat.slug}] ${i + 1}/${searchRecords.length} ${profileKey}: cached (fresh)`,
        );
        catResult.cached += 1;
        totalCached += 1;
        catResult.snapshots.push(cached);
        continue;
      }

      try {
        const snap = await fetchProfile(profileKey, cat.slug, rec);
        saveSnapshot(snap);
        catResult.fetched += 1;
        totalNew += 1;
        catResult.snapshots.push(snap);
        const name =
          snap.profile?.personalData?.title ??
          snap.searchRecord?.shortName ??
          profileKey;
        console.error(
          `[freelancers:${cat.slug}] ${i + 1}/${searchRecords.length} ${profileKey}: fetched (${name})`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
          console.error(
            `[freelancers:${cat.slug}] 429 rate limited — stopping this category`,
          );
          catResult.failed += 1;
          break;
        }
        console.error(
          `[freelancers:${cat.slug}] ${i + 1}/${searchRecords.length} ${profileKey}: FAILED — ${msg}`,
        );
        catResult.failed += 1;
      }
    }

    console.error(
      `[freelancers:${cat.slug}] done: fetched=${catResult.fetched} cached=${catResult.cached} failed=${catResult.failed}`,
    );
    results.push(catResult);
  }

  console.error(
    `\n[freelancers] total: ${totalNew} new snapshots, ${totalCached} cached`,
  );

  // Write the per-category index to fixtures/freelancers/index.json
  const indexPath = resolve(
    process.cwd(),
    "fixtures",
    "freelancers",
    "index.json",
  );
  // Ensure the dir exists even if no profiles were fetched (e.g. search failed)
  mkdirSync(resolve(process.cwd(), "fixtures", "freelancers"), {
    recursive: true,
  });
  writeFileSync(
    indexPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        categories: results.map((r) => ({
          category: r.category,
          fetched: r.fetched,
          cached: r.cached,
          failed: r.failed,
          profileKeys: r.snapshots.map((s) => s.profileKey),
        })),
      },
      null,
      2,
    ),
    "utf8",
  );

  return results;
}

// ─── Helper: list all snapshot files for a profile ───────────────────────────

export function listSnapshots(profileKey: string): string[] {
  const dir = resolve(process.cwd(), "fixtures", "freelancers", profileKey);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "latest.json")
    .sort(); // chronological (ISO filenames)
}
