import { getLeadsEnriched, getRooms, getContracts } from "./fixtures";
import { ALL_TENANTS, tenantOf } from "./tenants";
import type { TenantSlug } from "./tenants";

export type TenantCounts = Record<TenantSlug, number>;

/**
 * Compute per-tenant counts across leads, rooms, and contracts.
 * Returns the sum of unique items per tenant (leads + rooms).
 * Server-only — reads fixture files from disk.
 */
export function getTenantCounts(): TenantCounts {
  const counts: TenantCounts = Object.fromEntries(
    ALL_TENANTS.map((t) => [t, 0]),
  ) as TenantCounts;

  const { leads } = getLeadsEnriched();
  for (const lead of leads) {
    for (const t of tenantOf(lead)) {
      if (t in counts) counts[t]++;
    }
  }

  return counts;
}
