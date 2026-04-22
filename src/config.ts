import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
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
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv(resolve(process.cwd(), ".env"));

const schema = z.object({
  UPWORK_CLIENT_ID: z.string().min(1, "UPWORK_CLIENT_ID is required"),
  UPWORK_CLIENT_SECRET: z.string().min(1, "UPWORK_CLIENT_SECRET is required"),
  UPWORK_REDIRECT_URI: z
    .string()
    .url()
    .default("http://127.0.0.1:8765/callback"),
  UPWORK_ORG_ID: z.string().optional(),
  UPWORK_SCOPES: z.string().optional(),
  OAUTH_CALLBACK_PORT: z
    .string()
    .regex(/^\d+$/)
    .default("8765")
    .transform((v) => Number.parseInt(v, 10)),
  UPWORK_RPS: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .default("1")
    .transform((v) => Number.parseFloat(v)),
});

export type Config = z.infer<typeof schema>;

let cached: Config | undefined;

export function getConfig(): Config {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid env configuration. Copy .env.example to .env and fill it in.\n${issues}`,
    );
  }
  cached = parsed.data;
  return cached;
}

export const UPWORK_AUTH_URL =
  "https://www.upwork.com/ab/account-security/oauth2/authorize";
export const UPWORK_TOKEN_URL = "https://www.upwork.com/api/v3/oauth2/token";
export const UPWORK_GRAPHQL_URL = "https://api.upwork.com/graphql";

export const TOKEN_FILE = resolve(process.cwd(), "tokens.json");
