import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomBytes } from "node:crypto";
import { URL } from "node:url";
import open from "open";
import { getConfig } from "../config.ts";
import { buildAuthorizeUrl, exchangeCodeForTokens } from "./oauth.ts";
import { saveFromOAuthResponse } from "./token-store.ts";

const CALLBACK_PATH = "/callback";

const SUCCESS_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>upwork-crm: authorized</title>
<style>body{font-family:ui-sans-serif,system-ui,sans-serif;background:#0b0b0f;color:#e7e7ea;display:grid;place-items:center;min-height:100vh;margin:0}main{text-align:center;max-width:420px;padding:32px;border:1px solid #222;border-radius:12px}h1{margin:0 0 8px;font-size:18px}p{margin:0;color:#9a9aa3;font-size:14px}</style>
</head><body><main><h1>Authorized</h1><p>You can close this tab and return to the terminal.</p></main></body></html>`;

const FAILURE_HTML = (msg: string) => `<!doctype html>
<html><head><meta charset="utf-8"><title>upwork-crm: error</title>
<style>body{font-family:ui-sans-serif,system-ui,sans-serif;background:#0b0b0f;color:#e7e7ea;display:grid;place-items:center;min-height:100vh;margin:0}main{text-align:center;max-width:520px;padding:32px;border:1px solid #4a2020;border-radius:12px}h1{margin:0 0 8px;font-size:18px;color:#ff8080}pre{white-space:pre-wrap;text-align:left;color:#d0d0d5;font-size:12px}</style>
</head><body><main><h1>Authorization failed</h1><pre>${msg.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c)}</pre></main></body></html>`;

interface CallbackResult {
  code: string;
  state: string;
}

function waitForCallback(
  port: number,
  expectedState: string,
): Promise<CallbackResult> {
  return new Promise((resolveResult, rejectResult) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (!req.url) {
        res.statusCode = 400;
        res.end("Bad request");
        return;
      }
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname !== CALLBACK_PATH) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
      const error = url.searchParams.get("error");
      const errDesc = url.searchParams.get("error_description");
      if (error) {
        const msg = `${error}${errDesc ? `: ${errDesc}` : ""}`;
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(FAILURE_HTML(msg));
        server.close();
        rejectResult(new Error(`Authorization returned error: ${msg}`));
        return;
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(FAILURE_HTML("Missing `code` or `state` in callback."));
        server.close();
        rejectResult(new Error("Missing code or state in callback"));
        return;
      }
      if (state !== expectedState) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(FAILURE_HTML("State mismatch — possible CSRF."));
        server.close();
        rejectResult(new Error("OAuth state mismatch"));
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(SUCCESS_HTML);
      server.close();
      resolveResult({ code, state });
    });
    server.on("error", rejectResult);
    server.listen(port, "127.0.0.1");
  });
}

export async function cliLogin(): Promise<void> {
  const cfg = getConfig();
  const state = randomBytes(16).toString("hex");
  const authUrl = buildAuthorizeUrl(state);

  const pending = waitForCallback(cfg.OAUTH_CALLBACK_PORT, state);

  console.error(`[login] Opening browser for Upwork authorization…`);
  console.error(`[login] If it doesn't open, visit:\n  ${authUrl}`);
  try {
    await open(authUrl);
  } catch {
    // ignore — user can copy/paste the URL manually.
  }

  const { code } = await pending;
  console.error(`[login] Received authorization code. Exchanging for tokens…`);
  const tokens = await exchangeCodeForTokens(code);
  const saved = saveFromOAuthResponse(tokens);

  const scopeSummary = saved.scope ? ` (scopes: ${saved.scope})` : "";
  const expiresIn = Math.max(
    0,
    saved.expires_at - Math.floor(Date.now() / 1000),
  );
  console.error(
    `[login] Saved tokens.json (access expires in ${expiresIn}s${scopeSummary}).`,
  );
  if (!cfg.UPWORK_ORG_ID) {
    console.error(
      `[login] Note: UPWORK_ORG_ID is not set. Agency probes will return the personal freelancer context until you run \`pnpm cli probe 01-me\` and copy your organization id into .env.`,
    );
  }
}
