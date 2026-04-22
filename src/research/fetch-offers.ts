import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";
import { TENANTS, ensureTenantDir, type TenantSlug } from "./tenants.ts";

const QUERY = /* GraphQL */ `
  query OffersByAttribute($filter: SearchOffersInput!) {
    offersByAttribute(filter: $filter) {
      offers {
        id
        title
        type
        state
        client {
          id
          name
        }
        freelancer {
          userDetails {
            id
            nid
            name
          }
        }
        offerTerms {
          expectedStartDate
          expectedEndDate
          fixedPriceTerm {
            budget {
              rawValue
              currency
            }
          }
          hourlyTerms {
            rate {
              rawValue
              currency
            }
            weeklyHoursLimit
          }
        }
        job {
          id
        }
        vendorProposal {
          id
        }
      }
    }
  }
`;

export interface OfferFreelancer {
  userDetails: {
    id: string;
    nid: string;
    name: string | null;
  };
}

export interface OfferClient {
  id: string;
  name: string | null;
}

export interface OfferTerms {
  expectedStartDate: string | null;
  expectedEndDate: string | null;
  fixedPriceTerm: {
    budget: { rawValue: string; currency: string } | null;
  } | null;
  hourlyTerms: {
    rate: { rawValue: string; currency: string } | null;
    weeklyHoursLimit: number | null;
  } | null;
}

export interface Offer {
  id: string;
  title: string;
  type: string;
  state: string | null;
  client: OfferClient;
  freelancer: OfferFreelancer;
  offerTerms: OfferTerms;
  job: { id: string } | null;
  vendorProposal: { id: string } | null;
}

interface OffersByAttributeResponse {
  offersByAttribute: {
    offers: Offer[] | null;
  } | null;
}

function offersOutDir(tenant: TenantSlug): string {
  const base = ensureTenantDir(tenant);
  const dir = resolve(base, "offers");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export async function fetchAllOffers(
  tenant: TenantSlug = "agency-vendor",
): Promise<Offer[]> {
  const tenantData = TENANTS[tenant];
  const orgId = tenantData.orgId;
  const tenantId = orgId;

  const allOffers: Offer[] = [];
  const seen = new Set<string>();
  const dir = offersOutDir(tenant);

  const LIMIT = 50;
  let page = 1;

  while (true) {
    let data: OffersByAttributeResponse;
    try {
      data = await gql<OffersByAttributeResponse>(
        QUERY,
        {
          filter: {
            id: orgId,
            searchAttribute: "VendorOrg",
            limit: LIMIT,
            page,
          },
        },
        { operationName: "OffersByAttribute", tenantId },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[offers:${tenant}] page ${page} ERROR: ${msg}`);
      break;
    }

    const offers = data.offersByAttribute?.offers ?? [];
    let added = 0;
    for (const o of offers) {
      if (!o?.id) continue;
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      allOffers.push(o);
      added += 1;
    }

    const chunkPath = resolve(dir, `page-${page}.json`);
    writeFileSync(
      chunkPath,
      JSON.stringify(
        {
          page,
          fetchedAt: new Date().toISOString(),
          count: offers.length,
          offers,
        },
        null,
        2,
      ),
      "utf8",
    );

    console.error(
      `[offers:${tenant}] page ${page}: +${added} offers (total ${allOffers.length})`,
    );

    if (added === 0) break;
    if (offers.length < LIMIT) break;

    page += 1;

    if (page > 20) {
      console.error(`[offers:${tenant}] hit safety cap at page ${page}`);
      break;
    }
  }

  // Write unified for this tenant
  const tenantBase = ensureTenantDir(tenant);
  const outPath = resolve(tenantBase, "offers.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        count: allOffers.length,
        offers: allOffers,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.error(
    `[offers:${tenant}] wrote ${allOffers.length} offers → ${outPath}`,
  );

  // Backward-compat: for agency-vendor also write to fixtures/agent/offers.json
  if (tenant === "agency-vendor") {
    const agentDir = resolve(process.cwd(), "fixtures", "agent");
    if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
    writeFileSync(
      resolve(agentDir, "offers.json"),
      JSON.stringify(
        {
          fetchedAt: new Date().toISOString(),
          count: allOffers.length,
          offers: allOffers,
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  return allOffers;
}
