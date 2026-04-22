import { readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { z } from "zod";
import { TOKEN_FILE } from "../config.ts";
import { refreshAccessToken } from "./oauth.ts";

const TokenRecord = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  token_type: z.string().default("Bearer"),
  scope: z.string().optional(),
  expires_at: z.number(), // unix seconds when access_token expires
  obtained_at: z.number(),
});

export type TokenRecord = z.infer<typeof TokenRecord>;

const EXPIRY_SKEW_SECONDS = 60;

export function readTokens(): TokenRecord | undefined {
  if (!existsSync(TOKEN_FILE)) return undefined;
  const raw = readFileSync(TOKEN_FILE, "utf8");
  const parsed = TokenRecord.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(
      `Malformed ${TOKEN_FILE}: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
  return parsed.data;
}

export function writeTokens(record: TokenRecord): void {
  writeFileSync(TOKEN_FILE, JSON.stringify(record, null, 2), { mode: 0o600 });
  try {
    chmodSync(TOKEN_FILE, 0o600);
  } catch {
    // best-effort on non-POSIX
  }
}

export function saveFromOAuthResponse(body: {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in: number;
}): TokenRecord {
  const now = Math.floor(Date.now() / 1000);
  const record: TokenRecord = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    token_type: body.token_type ?? "Bearer",
    scope: body.scope,
    expires_at: now + body.expires_in,
    obtained_at: now,
  };
  writeTokens(record);
  return record;
}

function isExpired(record: TokenRecord): boolean {
  const now = Math.floor(Date.now() / 1000);
  return record.expires_at - now <= EXPIRY_SKEW_SECONDS;
}

// In-process token cache: once refreshed, share for the lifetime of the process.
let cachedToken: string | null = null;
let cachedExpiresAt: number = 0;
// In-process refresh lock: only one refresh request in-flight at a time.
let refreshInFlight: Promise<string> | null = null;

/**
 * Primary token accessor. Auto-refreshes when near expiry.
 * Caches the refreshed token in-memory so sequential callers don't each hit
 * the token endpoint (which causes Cloudflare rate limiting).
 * Throws if no tokens on disk — user must run `pnpm cli login` first.
 */
export async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return in-memory cached token if still valid (with skew).
  if (cachedToken && cachedExpiresAt - now > EXPIRY_SKEW_SECONDS) {
    return cachedToken;
  }

  const existing = readTokens();
  if (!existing) {
    throw new Error(
      "No tokens found. Run `pnpm cli login` to authorize via Authorization Code flow.",
    );
  }
  if (!isExpired(existing)) {
    // On-disk token is still valid; cache it in-memory.
    cachedToken = existing.access_token;
    cachedExpiresAt = existing.expires_at;
    return existing.access_token;
  }
  if (!existing.refresh_token) {
    throw new Error(
      "Access token expired and no refresh_token available. Run `pnpm cli login` again.",
    );
  }

  // Coalesce concurrent + sequential refresh attempts into one request.
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const refreshed = await refreshAccessToken(existing.refresh_token!);
      const next: TokenRecord = {
        access_token: refreshed.access_token,
        // Upwork may or may not rotate — keep the newest if present, else reuse.
        refresh_token: refreshed.refresh_token ?? existing.refresh_token,
        token_type: refreshed.token_type ?? existing.token_type,
        scope: refreshed.scope ?? existing.scope,
        expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in,
        obtained_at: Math.floor(Date.now() / 1000),
      };
      writeTokens(next);
      // Update in-process cache.
      cachedToken = next.access_token;
      cachedExpiresAt = next.expires_at;
      return next.access_token;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}
