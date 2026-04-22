import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";
import { getConfig } from "../config.ts";

const QUERY = /* GraphQL */ `
  query VendorProposals(
    $filter: VendorProposalFilter!
    $sortAttribute: VendorProposalSortAttribute!
    $pagination: Pagination!
  ) {
    vendorProposals(
      filter: $filter
      sortAttribute: $sortAttribute
      pagination: $pagination
    ) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
        node {
          id
          user {
            id
            nid
            name
          }
          organization {
            id
            name
          }
          marketplaceJobPosting {
            id
          }
          terms {
            chargeRate {
              rawValue
              currency
            }
            estimatedDuration {
              label
            }
            upfrontPaymentPercent
          }
          proposalCoverLetter
          status {
            status
            reason {
              id
              reason
              description
            }
          }
          auditDetails {
            createdDateTime {
              rawValue
              displayValue
            }
            modifiedDateTime {
              rawValue
              displayValue
            }
          }
        }
      }
    }
  }
`;

export interface ProposalUser {
  id: string;
  nid: string;
  name: string | null;
}

export interface ProposalOrg {
  id: string;
  name: string | null;
}

export interface ProposalTerms {
  chargeRate: { rawValue: string; currency: string };
  estimatedDuration: { label: string | null } | null;
  upfrontPaymentPercent: number | null;
}

export interface ProposalStatus {
  status: string;
  reason: {
    id: string;
    reason: string;
    description: string | null;
  } | null;
}

export interface UpworkDateTime {
  rawValue: string;
  displayValue: string;
}

export interface ProposalAuditDetails {
  createdDateTime: UpworkDateTime;
  modifiedDateTime: UpworkDateTime | null;
}

export interface VendorProposal {
  id: string;
  user: ProposalUser;
  organization: ProposalOrg;
  marketplaceJobPosting: { id: string };
  terms: ProposalTerms;
  proposalCoverLetter: string | null;
  status: ProposalStatus;
  auditDetails: ProposalAuditDetails;
}

interface VendorProposalsResponse {
  vendorProposals: {
    totalCount: number | null;
    pageInfo: { hasNextPage: boolean | null; endCursor: string | null } | null;
    edges: Array<{ cursor: string | null; node: VendorProposal | null }> | null;
  };
}

// All status values to try if initial fetch returns nothing
const ALL_STATUSES = [
  "Accepted",
  "Declined",
  "Withdrawn",
  "Offered",
  "Activated",
  "Archived",
  "Hired",
  "Pending",
] as const;

type ProposalStatus2 = (typeof ALL_STATUSES)[number];

function proposalsDir(): string {
  const dir = resolve(process.cwd(), "fixtures", "proposals");
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function fetchForStatus(
  orgId: string,
  status: ProposalStatus2,
  dir: string,
): Promise<VendorProposal[]> {
  const results: VendorProposal[] = [];
  const seen = new Set<string>();
  let after: string | undefined;
  let page = 0;

  while (true) {
    page += 1;
    const pagination: { first: number; after?: string } = { first: 50 };
    if (after) pagination.after = after;

    let data: VendorProposalsResponse;
    try {
      data = await gql<VendorProposalsResponse>(
        QUERY,
        {
          filter: {
            status_eq: status,
          },
          sortAttribute: {
            field: "CREATEDDATETIME",
            sortOrder: "DESC",
          },
          pagination,
        },
        { operationName: "VendorProposals" },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[proposals] ${status} page ${page} ERROR: ${msg}`);
      break;
    }

    const edges = data.vendorProposals?.edges ?? [];
    let added = 0;
    for (const edge of edges) {
      if (!edge?.node) continue;
      if (seen.has(edge.node.id)) continue;
      seen.add(edge.node.id);
      results.push(edge.node);
      added += 1;
    }

    const chunkPath = resolve(
      dir,
      `vendor-${status.toLowerCase()}-page-${page}.json`,
    );
    writeFileSync(
      chunkPath,
      JSON.stringify(
        {
          status,
          page,
          fetchedAt: new Date().toISOString(),
          count: edges.length,
          proposals: edges.map((e) => e.node),
        },
        null,
        2,
      ),
      "utf8",
    );

    console.error(
      `[proposals] ${status} page ${page}: +${added} proposals (total for status: ${results.length})`,
    );

    const endCursor = data.vendorProposals?.pageInfo?.endCursor ?? null;
    if (added === 0) break;
    if (endCursor === null || endCursor === after) break;
    after = endCursor;

    if (page >= 20) {
      console.error(`[proposals] ${status} hit safety cap at page ${page}`);
      break;
    }
  }

  return results;
}

export async function fetchAllVendorProposals(): Promise<VendorProposal[]> {
  const cfg = getConfig();
  const orgId = cfg.UPWORK_ORG_ID;
  if (!orgId) {
    throw new Error("UPWORK_ORG_ID is not set in .env");
  }

  const dir = proposalsDir();
  const allProposals: VendorProposal[] = [];
  const seen = new Set<string>();

  for (const status of ALL_STATUSES) {
    const results = await fetchForStatus(orgId, status, dir);
    for (const p of results) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      allProposals.push(p);
    }
    console.error(`[proposals] ${status}: ${results.length} proposals fetched`);
  }

  const agentDir = resolve(process.cwd(), "fixtures", "agent");
  if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });

  const outPath = resolve(agentDir, "proposals.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        count: allProposals.length,
        vendorProposals: allProposals,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.error(
    `[proposals] wrote ${allProposals.length} proposals → ${outPath}`,
  );
  return allProposals;
}
