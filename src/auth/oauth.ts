import { getConfig, UPWORK_TOKEN_URL, UPWORK_AUTH_URL } from "../config.ts";

export interface UpworkTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in: number;
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  const b64 = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString(
    "base64",
  );
  return `Basic ${b64}`;
}

async function tokenRequest(
  body: URLSearchParams,
): Promise<UpworkTokenResponse> {
  const cfg = getConfig();
  const res = await fetch(UPWORK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: basicAuthHeader(
        cfg.UPWORK_CLIENT_ID,
        cfg.UPWORK_CLIENT_SECRET,
      ),
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `OAuth token endpoint returned ${res.status}: ${text.slice(0, 500)}`,
    );
  }
  const parsed = JSON.parse(text) as UpworkTokenResponse;
  if (!parsed.access_token || typeof parsed.expires_in !== "number") {
    throw new Error(`Unexpected token response shape: ${text.slice(0, 500)}`);
  }
  return parsed;
}

export function buildAuthorizeUrl(state: string): string {
  const cfg = getConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.UPWORK_CLIENT_ID,
    redirect_uri: cfg.UPWORK_REDIRECT_URI,
    state,
  });
  if (cfg.UPWORK_SCOPES && cfg.UPWORK_SCOPES.trim().length > 0) {
    params.set("scope", cfg.UPWORK_SCOPES.trim());
  }
  return `${UPWORK_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<UpworkTokenResponse> {
  const cfg = getConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.UPWORK_REDIRECT_URI,
  });
  return tokenRequest(body);
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<UpworkTokenResponse> {
  const cfg = getConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: cfg.UPWORK_CLIENT_ID,
    client_secret: cfg.UPWORK_CLIENT_SECRET,
  });
  return tokenRequest(body);
}

export async function clientCredentialsToken(): Promise<UpworkTokenResponse> {
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  return tokenRequest(body);
}
