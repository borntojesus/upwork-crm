/**
 * 07-vendorproposal-try.ts — probe vendorProposal(id) with a single known ID.
 * If the probe succeeds, bulk-fetches all vendorProposal IDs from offers.json.
 * Saves to fixtures/07-vendorproposal-try.json and fixtures/agent/vendor-proposals.json.
 */

import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";

const QUERY = /* GraphQL */ `
  query OneVendorProposal($id: ID!) {
    vendorProposal(id: $id) {
      id
      status {
        status
      }
      terms {
        chargeRate {
          rawValue
          currency
        }
        upfrontPaymentPercent
      }
      proposalCoverLetter
      marketplaceJobPosting {
        id
      }
    }
  }
`;

interface VendorProposalResult {
  id: string;
  status?: { status: string } | null;
  terms?: {
    chargeRate?: { rawValue: string; currency: string } | null;
    upfrontPaymentPercent?: number | null;
  } | null;
  proposalCoverLetter?: string | null;
  marketplaceJobPosting?: { id: string } | null;
}

interface OneVendorProposalResponse {
  vendorProposal: VendorProposalResult | null;
}

function loadVendorProposalIds(): string[] {
  const offersPath = resolve(process.cwd(), "fixtures", "agent", "offers.json");
  const offersData = JSON.parse(readFileSync(offersPath, "utf8")) as {
    offers: Array<{ vendorProposal: { id: string } | null }>;
  };
  const ids = new Set<string>();
  for (const o of offersData.offers) {
    if (o.vendorProposal?.id) ids.add(o.vendorProposal.id);
  }
  return [...ids];
}

export async function probe07VendorProposalTry(): Promise<unknown> {
  const allIds = loadVendorProposalIds();
  if (allIds.length === 0) {
    const result = {
      probeAt: new Date().toISOString(),
      error: "No vendorProposal IDs found in offers.json",
      result: null,
    };
    writeFileSync(
      resolve(process.cwd(), "fixtures", "07-vendorproposal-try.json"),
      JSON.stringify(result, null, 2),
      "utf8",
    );
    console.error("[07-vendorproposal-try] No vendorProposal IDs found");
    return result;
  }

  const firstId = allIds[0];
  console.error(
    `[07-vendorproposal-try] Probing vendorProposal id=${firstId} (${allIds.length} total IDs found)`,
  );

  let probeResult: VendorProposalResult | null = null;
  let probeError: string | undefined;

  try {
    const data = await gql<OneVendorProposalResponse>(
      QUERY,
      { id: firstId },
      { operationName: "OneVendorProposal" },
    );
    probeResult = data.vendorProposal ?? null;
    console.error(
      `[07-vendorproposal-try] Probe succeeded: ${JSON.stringify(probeResult).slice(0, 200)}`,
    );
  } catch (err) {
    probeError = err instanceof Error ? err.message : String(err);
    console.error(`[07-vendorproposal-try] Probe FAILED: ${probeError}`);
  }

  const probeFixture = {
    probeAt: new Date().toISOString(),
    probeId: firstId,
    totalIdsAvailable: allIds.length,
    error: probeError ?? null,
    result: probeResult,
  };

  writeFileSync(
    resolve(process.cwd(), "fixtures", "07-vendorproposal-try.json"),
    JSON.stringify(probeFixture, null, 2),
    "utf8",
  );
  console.error(
    "[07-vendorproposal-try] Saved → fixtures/07-vendorproposal-try.json",
  );

  // If probe succeeded, bulk-fetch all vendor proposals
  if (!probeError) {
    console.error(
      `[07-vendorproposal-try] Probe OK — bulk fetching ${allIds.length} vendor proposals`,
    );
    const all: VendorProposalResult[] = [];
    if (probeResult) all.push(probeResult);

    for (let i = 1; i < allIds.length; i++) {
      const id = allIds[i];
      try {
        const data = await gql<OneVendorProposalResponse>(
          QUERY,
          { id },
          { operationName: "OneVendorProposal" },
        );
        const vp = data.vendorProposal ?? null;
        if (vp) all.push(vp);
        console.error(
          `[07-vendorproposal-try] ${i + 1}/${allIds.length} fetched id=${id} status=${vp?.status?.status ?? "null"}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[07-vendorproposal-try] ${i + 1}/${allIds.length} FAILED id=${id}: ${msg}`,
        );
      }
    }

    const outPath = resolve(
      process.cwd(),
      "fixtures",
      "agent",
      "vendor-proposals.json",
    );
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          fetchedAt: new Date().toISOString(),
          count: all.length,
          vendorProposals: all,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.error(
      `[07-vendorproposal-try] Wrote ${all.length} vendor proposals → ${outPath}`,
    );
  } else {
    console.error(
      "[07-vendorproposal-try] Probe failed — skipping bulk fetch (VJCA-6 scope block likely)",
    );
  }

  return probeFixture;
}
