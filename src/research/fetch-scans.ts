/**
 * fetch-scans.ts — run publicMarketplaceJobPostingsSearch for 9 tech slugs.
 * Resumable: skips <slug>.json files that are less than 6 hours old.
 * Saves per-slug to fixtures/jobs/scans/<slug>.json and summary to
 * fixtures/agent/scans.json.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

interface Scanner {
  slug: string;
  query: string;
}

const SCANNERS: Scanner[] = [
  { slug: "strapi", query: "strapi" },
  { slug: "sanity", query: "sanity" },
  { slug: "next-js", query: "next.js" },
  { slug: "astro", query: "astro" },
  { slug: "aem", query: "AEM Adobe Experience Manager" },
  { slug: "wordpress", query: "wordpress" },
  { slug: "shopify", query: "shopify" },
  { slug: "react", query: "react" },
  { slug: "nest-js", query: "nest.js" },
];

const QUERY = /* GraphQL */ `
  query PublicJobsScan($filter: PublicMarketplaceJobPostingsSearchFilter!) {
    publicMarketplaceJobPostingsSearch(marketPlaceJobFilter: $filter) {
      jobs {
        id
        ciphertext
        title
        description
        createdDateTime
        publishedDateTime
        type
        engagement
        duration
        durationLabel
        contractorTier
        category
        subcategory
        freelancersToHire
        totalApplicants
        amount {
          rawValue
          currency
          displayValue
        }
        hourlyBudgetType
        hourlyBudgetMin
        hourlyBudgetMax
        skills {
          name
          prettyName
        }
        client {
          totalHires
          totalPostedJobs
          totalReviews
          totalFeedback
          location {
            country
            city
          }
        }
      }
      paging {
        hasNextPage
        endCursor
      }
    }
  }
`;

interface PublicJobsResponse {
  publicMarketplaceJobPostingsSearch: {
    jobs: unknown[];
    paging: { hasNextPage: boolean; endCursor: string | null };
  };
}

export interface ScanFile {
  slug: string;
  query: string;
  fetchedAt: string;
  count: number;
  jobs: unknown[];
}

interface ScanSummaryEntry {
  slug: string;
  query: string;
  count: number;
  fetchedAt: string;
}

function scansDir(): string {
  const dir = resolve(process.cwd(), "fixtures", "jobs", "scans");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function isFresh(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  try {
    const data = JSON.parse(readFileSync(filePath, "utf8")) as ScanFile;
    const age = Date.now() - new Date(data.fetchedAt).getTime();
    return age < SIX_HOURS_MS;
  } catch {
    return false;
  }
}

export async function fetchAllScans(): Promise<ScanSummaryEntry[]> {
  const dir = scansDir();
  const summary: ScanSummaryEntry[] = [];

  for (let i = 0; i < SCANNERS.length; i++) {
    const scanner = SCANNERS[i]!;
    const filePath = resolve(dir, `${scanner.slug}.json`);

    if (isFresh(filePath)) {
      const cached = JSON.parse(readFileSync(filePath, "utf8")) as ScanFile;
      console.error(
        `[scans] ${i + 1}/${SCANNERS.length} ${scanner.slug}: skipped, fresh (${cached.count} jobs)`,
      );
      summary.push({
        slug: scanner.slug,
        query: scanner.query,
        count: cached.count,
        fetchedAt: cached.fetchedAt,
      });
      continue;
    }

    const fetchedAt = new Date().toISOString();
    try {
      const data = await gql<PublicJobsResponse>(
        QUERY,
        {
          filter: {
            searchExpression_eq: scanner.query,
            daysPosted_eq: 14,
            pagination: { pageOffset: 0, pageSize: 30 },
          },
        },
        { operationName: "PublicJobsScan", tenantId: null },
      );

      const jobs = data.publicMarketplaceJobPostingsSearch.jobs;
      const scanFile: ScanFile = {
        slug: scanner.slug,
        query: scanner.query,
        fetchedAt,
        count: jobs.length,
        jobs,
      };

      writeFileSync(filePath, JSON.stringify(scanFile, null, 2), "utf8");
      console.error(
        `[scans] ${i + 1}/${SCANNERS.length} ${scanner.slug}: ${jobs.length} jobs`,
      );

      summary.push({
        slug: scanner.slug,
        query: scanner.query,
        count: jobs.length,
        fetchedAt,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
        console.error(
          `[scans] ${i + 1}/${SCANNERS.length} ${scanner.slug}: 429 rate limited — stopping`,
        );
        break;
      }
      console.error(
        `[scans] ${i + 1}/${SCANNERS.length} ${scanner.slug}: FAILED — ${msg}`,
      );
      // Still add to summary with count 0 so partial runs are recorded
      summary.push({
        slug: scanner.slug,
        query: scanner.query,
        count: 0,
        fetchedAt,
      });
    }
  }

  const scansPath = resolve(process.cwd(), "fixtures", "agent", "scans.json");
  writeFileSync(
    scansPath,
    JSON.stringify(
      { fetchedAt: new Date().toISOString(), scanners: summary },
      null,
      2,
    ),
    "utf8",
  );
  console.error(
    `[scans] wrote summary → ${scansPath} (${summary.length} scanners)`,
  );

  return summary;
}
