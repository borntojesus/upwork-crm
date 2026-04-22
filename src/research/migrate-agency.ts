/**
 * migrate-agency.ts — One-off migration: copy existing raw fixtures into
 * fixtures/tenants/agency-vendor/ so we have per-tenant structure without
 * re-fetching. Safe to re-run: only copies if target dir doesn't already exist.
 */

import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ensureTenantDir } from "./tenants.ts";

const ROOT = process.cwd();

interface MigrationEntry {
  src: string;
  dest: string;
}

export function migrateAgencyVendorFixtures(): void {
  const destBase = ensureTenantDir("agency-vendor");

  const entries: MigrationEntry[] = [
    {
      src: resolve(ROOT, "fixtures", "rooms"),
      dest: resolve(destBase, "rooms"),
    },
    {
      src: resolve(ROOT, "fixtures", "stories"),
      dest: resolve(destBase, "stories"),
    },
    {
      src: resolve(ROOT, "fixtures", "contracts"),
      dest: resolve(destBase, "contracts"),
    },
    {
      src: resolve(ROOT, "fixtures", "offers"),
      dest: resolve(destBase, "offers"),
    },
    {
      src: resolve(ROOT, "fixtures", "transactions"),
      dest: resolve(destBase, "transactions"),
    },
    {
      src: resolve(ROOT, "fixtures", "jobs"),
      dest: resolve(destBase, "jobs"),
    },
  ];

  // Copy 05-accounting-entity.json
  const aceOld = resolve(ROOT, "fixtures", "05-accounting-entity.json");
  const aceDest = resolve(destBase, "05-accounting-entity.json");
  if (existsSync(aceOld) && !existsSync(aceDest)) {
    cpSync(aceOld, aceDest);
    console.error(`[migrate] copied 05-accounting-entity.json → ${aceDest}`);
  } else if (existsSync(aceDest)) {
    console.error(`[migrate] 05-accounting-entity.json already at dest — skip`);
  }

  for (const { src, dest } of entries) {
    if (!existsSync(src)) {
      console.error(`[migrate] src not found, skipping: ${src}`);
      continue;
    }
    if (existsSync(dest)) {
      console.error(`[migrate] dest already exists, skipping: ${dest}`);
      continue;
    }
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
    console.error(`[migrate] copied ${src} → ${dest}`);
  }

  console.error("[migrate] agency-vendor migration complete.");
}
