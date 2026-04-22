import { probe01Me } from "./01-me.ts";

export const PROBES: Record<string, () => Promise<unknown>> = {
  "01-me": probe01Me,
  "03-messages": async () => {
    const { probe03Messages } = await import("./03-messages.ts");
    return probe03Messages();
  },
  "04-jobs": async () => {
    const { probe04Jobs } = await import("./04-jobs.ts");
    return probe04Jobs();
  },
  "scout-rooms": async () => {
    const { scoutRooms } = await import("./scout-rooms.ts");
    return scoutRooms();
  },
  "05-accounting-entity": async () => {
    const { probe05AccountingEntity } =
      await import("./05-accounting-entity.ts");
    return probe05AccountingEntity();
  },
  "05-jobs-public": async () => {
    const { probe05JobsPublic } = await import("./05-jobs-public.ts");
    return probe05JobsPublic();
  },
  "06-contract-try": async () => {
    const { probe06ContractTry } = await import("./06-contract-try.ts");
    return probe06ContractTry();
  },
  "07-vendorproposal-try": async () => {
    const { probe07VendorProposalTry } =
      await import("./07-vendorproposal-try.ts");
    return probe07VendorProposalTry();
  },
};

export async function runProbe(name: string): Promise<void> {
  const fn = (PROBES as Record<string, () => Promise<unknown>>)[name];
  if (!fn) {
    throw new Error(
      `Unknown probe: ${name}. Known: ${Object.keys(PROBES).join(", ")}`,
    );
  }
  console.error(`[probe] ${name} → running`);
  const result = await fn();
  const preview =
    result === undefined ? "" : JSON.stringify(result).slice(0, 200);
  console.error(`[probe] ${name} → done${preview ? ` (${preview}…)` : ""}`);
}

export async function runAllProbes(): Promise<void> {
  for (const name of Object.keys(PROBES)) {
    try {
      await runProbe(name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[probe] ${name} → FAILED: ${msg}`);
    }
  }
}
