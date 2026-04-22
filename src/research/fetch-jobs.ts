/**
 * fetch-jobs.ts — fetch marketplaceJobPosting for each unique jobId from
 * offers.json and contracts.json. Resumable: skips files with complete:true.
 *
 * NOTE: The requested query shape from the spec differs from actual schema:
 *   - clientCompanyPublic is MarketplacePublicCompanyInfo, which does NOT have
 *     companyName/totalReviews/totalFeedback/totalHires/totalPostedJobs/totalSpent/location/verificationStatus.
 *     Those fields exist on MarketplaceJobPostingSearchClientInfo (search results only).
 *     We use the fields actually available: country, city, state, paymentVerification, billingType.
 *   - classification: JobCategory uses preferredLabel (not prefLabel). occupation dropped.
 *     DROPPED-FIELD: category/prefLabel, subCategory/prefLabel, occupation/prefLabel.
 *     USE: category.preferredLabel, subCategory.preferredLabel.
 *   - contractTerms: HourlyContractTerms has hourlyBudgetMin/hourlyBudgetMax (floats), NOT
 *     hourlyBudget { min max }. FixedPriceContractTerms has amount:Money, NOT
 *     fixedPriceContractTerms { amount { displayValue } }.
 *   - activityStat: has applicationsBidStats.avgRateBid and jobActivity.totalInvitedToInterview,
 *     NOT applicationsBidsTotalCount directly.
 *   - attachments: MarketplacePostingAttachment has fileName but NOT fileTypeDescription.
 *   Any remaining scope errors will be recorded as error in the per-job fixture.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";

const QUERY = /* GraphQL */ `
  query JobDetail($id: ID!) {
    marketplaceJobPosting(id: $id) {
      id
      workFlowState {
        status
      }
      clientCompanyPublic {
        id
        country {
          twoLetterAbbreviation
          name
        }
        city
        state
        billingType
        paymentVerification {
          paymentVerified
        }
        logoURL
      }
      content {
        title
        description
      }
      classification {
        category {
          preferredLabel
        }
        subCategory {
          preferredLabel
        }
      }
      contractTerms {
        contractType
        hourlyContractTerms {
          hourlyBudgetMin
          hourlyBudgetMax
          engagementDuration {
            weeks
            label
          }
        }
        fixedPriceContractTerms {
          amount {
            rawValue
            currency
            displayValue
          }
          engagementDuration {
            weeks
            label
          }
        }
      }
      activityStat {
        applicationsBidStats {
          avgRateBid {
            rawValue
            currency
          }
        }
        jobActivity {
          totalInvitedToInterview
          totalHired
          invitesSent
          totalOffered
        }
      }
      attachments {
        fileName
        fileSize
      }
      canClientReceiveContractProposal
    }
  }
`;

export interface JobDetail {
  id: string;
  workFlowState?: { status: string } | null;
  clientCompanyPublic?: {
    id: string;
    country?: { twoLetterAbbreviation: string; name: string } | null;
    city?: string | null;
    state?: string | null;
    billingType?: string | null;
    paymentVerification?: { paymentVerified: boolean | null } | null;
    logoURL?: string | null;
  } | null;
  content?: { title: string; description: string } | null;
  classification?: {
    category?: { preferredLabel: string } | null;
    subCategory?: { preferredLabel: string } | null;
  } | null;
  contractTerms?: {
    contractType: string;
    hourlyContractTerms?: {
      hourlyBudgetMin?: number | null;
      hourlyBudgetMax?: number | null;
      engagementDuration?: {
        weeks?: number | null;
        label?: string | null;
      } | null;
    } | null;
    fixedPriceContractTerms?: {
      amount?: {
        rawValue: string;
        currency: string;
        displayValue: string;
      } | null;
      engagementDuration?: {
        weeks?: number | null;
        label?: string | null;
      } | null;
    } | null;
  } | null;
  activityStat?: {
    applicationsBidStats?: {
      avgRateBid?: { rawValue: string; currency: string } | null;
    } | null;
    jobActivity?: {
      totalInvitedToInterview: number;
      totalHired: number;
      invitesSent: number;
      totalOffered: number;
    } | null;
  } | null;
  attachments?: Array<{ fileName: string; fileSize: number }> | null;
  canClientReceiveContractProposal?: boolean;
}

interface JobDetailResponse {
  marketplaceJobPosting: JobDetail | null;
}

interface PerJobFixture {
  id: string;
  fetchedAt: string;
  complete: boolean;
  job: JobDetail | null;
  error?: string;
}

function jobsDir(): string {
  const dir = resolve(process.cwd(), "fixtures", "jobs");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function loadJobIds(): string[] {
  const offersPath = resolve(process.cwd(), "fixtures", "agent", "offers.json");
  const contractsPath = resolve(
    process.cwd(),
    "fixtures",
    "agent",
    "contracts.json",
  );

  const ids = new Set<string>();

  const offersData = JSON.parse(readFileSync(offersPath, "utf8")) as {
    offers: Array<{ job: { id: string } | null }>;
  };
  for (const o of offersData.offers) {
    if (o.job?.id) ids.add(o.job.id);
  }

  const contractsData = JSON.parse(readFileSync(contractsPath, "utf8")) as {
    contracts: Array<{ job: { id: string } | null }>;
  };
  for (const c of contractsData.contracts) {
    if (c.job?.id) ids.add(c.job.id);
  }

  return [...ids];
}

export async function fetchAllJobs(): Promise<JobDetail[]> {
  const dir = jobsDir();
  const jobIds = loadJobIds();
  console.error(`[jobs] ${jobIds.length} unique job IDs from offers+contracts`);

  const all: JobDetail[] = [];
  let skipped = 0;

  for (let i = 0; i < jobIds.length; i++) {
    const id = jobIds[i]!;
    const filePath = resolve(dir, `${id}.json`);

    // Resume: if already complete, load from disk and skip
    if (existsSync(filePath)) {
      const existing = JSON.parse(
        readFileSync(filePath, "utf8"),
      ) as PerJobFixture;
      if (existing.complete && existing.job) {
        all.push(existing.job);
        skipped++;
        continue;
      }
    }

    const fetchedAt = new Date().toISOString();
    let fixture: PerJobFixture;

    try {
      const data = await gql<JobDetailResponse>(
        QUERY,
        { id },
        { operationName: "JobDetail" },
      );
      const job = data.marketplaceJobPosting ?? null;
      fixture = { id, fetchedAt, complete: true, job };
      if (job) {
        all.push(job);
        console.error(
          `[jobs] ${i + 1}/${jobIds.length} fetched ${id}: ${job.content?.title ?? "(no title)"}`,
        );
      } else {
        console.error(
          `[jobs] ${i + 1}/${jobIds.length} fetched ${id}: null (no access or deleted)`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[jobs] ${i + 1}/${jobIds.length} FAILED ${id}: ${msg}`);
      fixture = { id, fetchedAt, complete: true, job: null, error: msg };
    }

    writeFileSync(filePath, JSON.stringify(fixture, null, 2), "utf8");
  }

  console.error(
    `[jobs] done: ${all.length} fetched, ${skipped} loaded from cache`,
  );

  const outPath = resolve(process.cwd(), "fixtures", "agent", "jobs.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        count: all.length,
        jobs: all,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.error(`[jobs] wrote ${all.length} jobs → ${outPath}`);
  return all;
}
