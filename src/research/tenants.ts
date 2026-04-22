/**
 * tenants.ts — Registry of known Upwork tenants.
 * Hard-coded from fixtures/01-me.json companySelector.items[].
 */

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

export const TENANTS = {
  personal: {
    slug: "personal" as const,
    orgId: "1595645935288676353",
    label: "Personal (Dmytro Antonyuk)",
  },
  "agency-vendor": {
    slug: "agency-vendor" as const,
    orgId: "1599670040955277312",
    label: "Alpina Tech (agency vendor)",
  },
} as const;

export type TenantSlug = keyof typeof TENANTS;

export const ALL_TENANTS: TenantSlug[] = ["personal", "agency-vendor"];

export function getTenantByOrgId(orgId: string): TenantSlug | null {
  for (const [slug, t] of Object.entries(TENANTS) as Array<
    [TenantSlug, (typeof TENANTS)[TenantSlug]]
  >) {
    if (t.orgId === orgId) return slug;
  }
  return null;
}

const ROOT = process.cwd();

export function tenantDir(slug: TenantSlug): string {
  return resolve(ROOT, "fixtures", "tenants", slug);
}

/** Ensures fixtures/tenants/<slug> exists and returns the path. */
export function ensureTenantDir(slug: TenantSlug): string {
  const dir = tenantDir(slug);
  mkdirSync(dir, { recursive: true });
  return dir;
}
