export const TENANTS = [
  { slug: "personal", label: "Personal", shortLabel: "Personal" },
  {
    slug: "agency-vendor",
    label: "Alpina Tech (agency)",
    shortLabel: "Agency",
  },
] as const;

export type TenantSlug = (typeof TENANTS)[number]["slug"];

export const ALL_TENANTS: TenantSlug[] = ["personal", "agency-vendor"];

export function parseTenants(
  searchParam: string | string[] | undefined,
): TenantSlug[] {
  if (!searchParam) return ALL_TENANTS;
  const raw = Array.isArray(searchParam) ? searchParam.join(",") : searchParam;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is TenantSlug => ALL_TENANTS.includes(s as TenantSlug));
  return parts.length > 0 ? parts : ALL_TENANTS;
}

export function tenantOf(r: {
  tenant?: TenantSlug;
  tenants?: TenantSlug[];
}): TenantSlug[] {
  if (r.tenants) return r.tenants;
  if (r.tenant) return [r.tenant];
  return ["agency-vendor"];
}

export function matchesFilter(
  record: { tenant?: TenantSlug; tenants?: TenantSlug[] },
  active: TenantSlug[],
): boolean {
  const ts = tenantOf(record);
  return ts.some((t) => active.includes(t));
}

export const TENANT_COLOR: Record<TenantSlug, string> = {
  personal: "var(--color-chart-1)",
  "agency-vendor": "var(--color-chart-2)",
};
