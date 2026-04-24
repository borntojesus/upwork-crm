import { getTenantCounts } from "@/lib/tenant-counts";
import { TenantSwitcher } from "./tenant-switcher";

/**
 * Server component wrapper — reads fixture data to compute per-tenant counts,
 * then passes them to the client TenantSwitcher.
 */
export function TenantSwitcherWithCounts() {
  const counts = getTenantCounts();
  return <TenantSwitcher counts={counts} />;
}
