import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";
import { TENANTS, ensureTenantDir, type TenantSlug } from "./tenants.ts";

const QUERY = /* GraphQL */ `
  query ContractBatch($ids: [ID!]) {
    contractList(ids: $ids) {
      contracts {
        id
        title
        status
        startDate
        endDate
        kind
        deliveryModel
        offerId
        freelancer {
          id
          name
        }
        clientOrganization {
          id
          name
        }
        job {
          id
          info {
            status
          }
        }
        terms {
          hourlyTerms {
            id
            hourlyRate {
              rawValue
              currency
            }
          }
          fixedPriceTerms {
            id
            fixedAmount {
              rawValue
              currency
            }
          }
        }
      }
    }
  }
`;

export interface ContractOrg {
  id: string;
  name: string | null;
}

export interface HourlyTerm {
  id: string;
  hourlyRate: { rawValue: string; currency: string } | null;
}

export interface FixedTerm {
  id: string;
  fixedAmount: { rawValue: string; currency: string } | null;
}

export interface ContractDetails {
  id: string;
  title: string | null;
  status: string | null;
  kind: string | null;
  deliveryModel: string | null;
  startDate: string | null;
  endDate: string | null;
  offerId: string | null;
  freelancer: { id: string; name: string | null } | null;
  clientOrganization: ContractOrg | null;
  job: { id: string; info: { status: string | null } | null } | null;
  terms: {
    hourlyTerms: HourlyTerm[] | null;
    fixedPriceTerms: FixedTerm[] | null;
  } | null;
}

interface ContractBatchResponse {
  contractList: {
    contracts: Array<ContractDetails | null> | null;
  } | null;
}

function contractsOutDir(tenant: TenantSlug): string {
  const base = ensureTenantDir(tenant);
  const dir = resolve(base, "contracts");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function loadSeedIds(tenant: TenantSlug): string[] {
  // Read rooms from tenant dir
  const tenantRoomsPath = resolve(
    process.cwd(),
    "fixtures",
    "tenants",
    tenant,
    "rooms",
    "all.json",
  );
  // Fallback: legacy fixtures/agent/rooms.json (agency-vendor)
  const agentRoomsPath = resolve(
    process.cwd(),
    "fixtures",
    "agent",
    "rooms.json",
  );

  let roomsArr: Array<{ contractId: string | null }> = [];

  if (existsSync(tenantRoomsPath)) {
    const data = JSON.parse(readFileSync(tenantRoomsPath, "utf8")) as {
      rooms: Array<{ contractId: string | null }>;
    };
    roomsArr = data.rooms;
  } else if (tenant === "agency-vendor" && existsSync(agentRoomsPath)) {
    const data = JSON.parse(readFileSync(agentRoomsPath, "utf8")) as {
      rooms: Array<{ contractId: string | null }>;
    };
    roomsArr = data.rooms;
  } else {
    console.error(
      `[contracts:${tenant}] No rooms fixture found — cannot extract contract IDs`,
    );
    return [];
  }

  const ids = new Set<string>();
  for (const r of roomsArr) {
    if (r.contractId) ids.add(r.contractId);
  }
  return [...ids];
}

export async function fetchAllContracts(
  tenant: TenantSlug = "agency-vendor",
): Promise<ContractDetails[]> {
  const tenantId = TENANTS[tenant].orgId;
  const dir = contractsOutDir(tenant);
  const seedIds = loadSeedIds(tenant);
  console.error(
    `[contracts:${tenant}] ${seedIds.length} contract IDs from rooms`,
  );

  const BATCH = 25;
  const all: ContractDetails[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < seedIds.length; i += BATCH) {
    const ids = seedIds.slice(i, i + BATCH);
    const batchIdx = Math.floor(i / BATCH) + 1;

    try {
      const data = await gql<ContractBatchResponse>(
        QUERY,
        { ids },
        { operationName: "ContractBatch", tenantId },
      );
      const contracts = data.contractList?.contracts ?? [];
      let added = 0;
      for (const c of contracts) {
        if (!c?.id) continue;
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        all.push(c);
        added += 1;
      }
      console.error(
        `[contracts:${tenant}] batch ${batchIdx}: +${added} (total ${all.length})`,
      );
      writeFileSync(
        resolve(dir, `batch-${batchIdx}.json`),
        JSON.stringify(
          {
            batch: batchIdx,
            fetchedAt: new Date().toISOString(),
            requestedIds: ids,
            count: contracts.length,
            contracts,
          },
          null,
          2,
        ),
        "utf8",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[contracts:${tenant}] batch ${batchIdx} FAILED: ${msg}`);
    }
  }

  // Write unified for this tenant
  const tenantBase = ensureTenantDir(tenant);
  const outPath = resolve(tenantBase, "contracts.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        count: all.length,
        contracts: all,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.error(
    `[contracts:${tenant}] wrote ${all.length} contracts → ${outPath}`,
  );

  // Backward-compat: for agency-vendor also write to fixtures/agent/contracts.json
  if (tenant === "agency-vendor") {
    const agentDir = resolve(process.cwd(), "fixtures", "agent");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(
      resolve(agentDir, "contracts.json"),
      JSON.stringify(
        {
          fetchedAt: new Date().toISOString(),
          count: all.length,
          contracts: all,
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  return all;
}
