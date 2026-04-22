import { spawnSync } from "node:child_process";

const SERVICE = "upwork-crm";

/**
 * macOS Keychain wrapper for storing OAuth client credentials.
 * Uses `security` CLI with argv (not shell), so values with special chars are safe.
 * Darwin-only — callers should check platform before using.
 */

export function keychainAvailable(): boolean {
  return process.platform === "darwin";
}

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  const res = spawnSync("security", args, { encoding: "utf8" });
  return {
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
    code: res.status ?? 1,
  };
}

export function keychainSet(account: string, value: string): void {
  const { code, stderr } = run([
    "add-generic-password",
    "-U", // update if exists
    "-s",
    SERVICE,
    "-a",
    account,
    "-w",
    value,
  ]);
  if (code !== 0) {
    throw new Error(`keychain: failed to set ${account}: ${stderr.trim()}`);
  }
}

export function keychainGet(account: string): string | undefined {
  const { code, stdout } = run([
    "find-generic-password",
    "-s",
    SERVICE,
    "-a",
    account,
    "-w",
  ]);
  if (code !== 0) return undefined;
  return stdout.replace(/\n$/, "");
}

export function keychainDelete(account: string): boolean {
  const { code } = run([
    "delete-generic-password",
    "-s",
    SERVICE,
    "-a",
    account,
  ]);
  return code === 0;
}
