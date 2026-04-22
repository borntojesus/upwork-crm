import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  chmodSync,
} from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { keychainAvailable, keychainGet, keychainSet } from "./keychain.ts";

const ENV_PATH = resolve(process.cwd(), ".env");
const BACKUP_DIR = resolve(homedir(), "Documents", ".secrets");
const BACKUP_PATH = resolve(BACKUP_DIR, "upwork-crm.env");

const SECRET_KEYS = ["UPWORK_CLIENT_ID", "UPWORK_CLIENT_SECRET"] as const;

function parseEnv(raw: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out.set(key, val);
  }
  return out;
}

function renderEnv(env: Map<string, string>): string {
  return (
    Array.from(env.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n"
  );
}

export async function keysBackup(): Promise<void> {
  if (!keychainAvailable()) {
    throw new Error("keychain: requires macOS (darwin)");
  }
  if (!existsSync(ENV_PATH)) {
    throw new Error(`.env not found at ${ENV_PATH}`);
  }
  const env = parseEnv(readFileSync(ENV_PATH, "utf8"));

  const saved: string[] = [];
  const missing: string[] = [];
  for (const key of SECRET_KEYS) {
    const val = env.get(key);
    if (!val) {
      missing.push(key);
      continue;
    }
    keychainSet(key, val);
    saved.push(key);
  }

  if (!existsSync(BACKUP_DIR))
    mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  chmodSync(BACKUP_DIR, 0o700);
  copyFileSync(ENV_PATH, BACKUP_PATH);
  chmodSync(BACKUP_PATH, 0o600);

  console.error(
    `[keys:backup] Keychain (service upwork-crm): saved ${saved.join(", ") || "<none>"}${missing.length ? ` (missing in .env: ${missing.join(", ")})` : ""}`,
  );
  console.error(`[keys:backup] Filesystem backup: ${BACKUP_PATH}`);
}

export async function keysRestore(opts: { force?: boolean }): Promise<void> {
  if (!keychainAvailable()) {
    throw new Error("keychain: requires macOS (darwin)");
  }
  const existing = existsSync(ENV_PATH)
    ? parseEnv(readFileSync(ENV_PATH, "utf8"))
    : new Map<string, string>();
  const before = renderEnv(existing);

  let changes = 0;
  for (const key of SECRET_KEYS) {
    const val = keychainGet(key);
    if (!val) {
      console.error(
        `[keys:restore] Keychain has no entry for ${key} — skipped.`,
      );
      continue;
    }
    const prior = existing.get(key);
    if (prior && prior === val) continue;
    if (prior && !opts.force) {
      console.error(
        `[keys:restore] ${key} already set in .env and differs from Keychain. Pass --force to overwrite.`,
      );
      continue;
    }
    existing.set(key, val);
    changes += 1;
  }

  const after = renderEnv(existing);
  if (after === before) {
    console.error(
      "[keys:restore] .env already in sync with Keychain. No changes.",
    );
    return;
  }

  writeFileSync(ENV_PATH, after, { mode: 0o600 });
  chmodSync(ENV_PATH, 0o600);
  console.error(
    `[keys:restore] Updated ${changes} key(s) in .env from Keychain.`,
  );
}
