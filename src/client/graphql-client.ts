import { getConfig, UPWORK_GRAPHQL_URL } from "../config.ts";
import { getAccessToken } from "../auth/token-store.ts";
import { RateLimiter } from "./rate-limiter.ts";

export interface GraphQLErrorEntry {
  message: string;
  path?: readonly (string | number)[];
  extensions?: Record<string, unknown>;
  locations?: readonly { line: number; column: number }[];
}

export class UpworkGraphQLError extends Error {
  readonly errors: GraphQLErrorEntry[];
  readonly data: unknown;
  readonly operationName: string | undefined;

  constructor(
    errors: GraphQLErrorEntry[],
    data: unknown,
    operationName: string | undefined,
  ) {
    const firstMessages = errors
      .slice(0, 3)
      .map((e) => e.message)
      .join("; ");
    super(
      `Upwork GraphQL error${operationName ? ` in ${operationName}` : ""}: ${firstMessages}`,
    );
    this.name = "UpworkGraphQLError";
    this.errors = errors;
    this.data = data;
    this.operationName = operationName;
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLErrorEntry[];
}

export interface GqlOptions {
  /** Override tenant header. Defaults to UPWORK_ORG_ID from env. Pass `null` to omit. */
  tenantId?: string | null;
  /** Operation name for diagnostics + the request body. */
  operationName?: string;
}

const limiter = new RateLimiter(getConfig().UPWORK_RPS);

export async function gql<TData = unknown, TVars = Record<string, unknown>>(
  query: string,
  variables?: TVars,
  opts: GqlOptions = {},
): Promise<TData> {
  const cfg = getConfig();
  await limiter.acquire();
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  const tenantId =
    opts.tenantId === null
      ? undefined
      : (opts.tenantId ?? cfg.UPWORK_ORG_ID ?? undefined);
  if (tenantId && tenantId.length > 0) {
    headers["X-Upwork-API-TenantId"] = tenantId;
  }

  const body = JSON.stringify({
    query,
    variables: variables ?? {},
    ...(opts.operationName ? { operationName: opts.operationName } : {}),
  });

  const res = await fetch(UPWORK_GRAPHQL_URL, {
    method: "POST",
    headers,
    body,
  });

  const text = await res.text();
  // Upwork returns HTTP 200 for GraphQL errors. Non-200 is a transport issue.
  if (!res.ok) {
    throw new Error(
      `Upwork GraphQL transport error ${res.status}: ${text.slice(0, 500)}`,
    );
  }

  let parsed: GraphQLResponse<TData>;
  try {
    parsed = JSON.parse(text) as GraphQLResponse<TData>;
  } catch {
    throw new Error(
      `Upwork GraphQL response was not JSON: ${text.slice(0, 500)}`,
    );
  }

  if (parsed.errors && parsed.errors.length > 0) {
    if (process.env.UPWORK_GQL_DEBUG === "1") {
      console.error(
        `[gql] ${opts.operationName ?? "anon"} full errors: ${JSON.stringify(parsed.errors, null, 2)}`,
      );
    }
    // Upwork returns partial data alongside field-level errors (e.g. a single
    // room's roomUsers being blocked should not fail the whole batch).
    // Throw only if there is no usable data to return.
    if (parsed.data === undefined || parsed.data === null) {
      throw new UpworkGraphQLError(
        parsed.errors,
        parsed.data,
        opts.operationName,
      );
    }
    const summary = parsed.errors
      .slice(0, 3)
      .map((e) => e.message)
      .join("; ");
    console.error(
      `[gql] ${opts.operationName ?? "anon"} partial errors (returning data): ${summary}${parsed.errors.length > 3 ? ` (+${parsed.errors.length - 3} more)` : ""}`,
    );
    return parsed.data;
  }
  if (parsed.data === undefined) {
    throw new Error(
      `Upwork GraphQL response had no data and no errors: ${text.slice(0, 500)}`,
    );
  }
  return parsed.data;
}
