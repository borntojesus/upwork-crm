import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CAP_PATH = resolve(process.cwd(), "..", "schema", "capabilities.md");

export type ProbeStatus =
  | "ok"
  | "empty"
  | "blocked-scope"
  | "blocked-error"
  | "untried";

export interface ApiField {
  /** e.g. "Query.roomList" */
  fqn: string;
  /** root: "Query" | "Mutation" */
  root: "Query" | "Mutation";
  /** field name only */
  name: string;
  /** full signature line from capabilities.md */
  signature: string;
  /** one-line description from capabilities.md */
  description: string | null;
  /** our probe result for this field */
  status: ProbeStatus;
  /** short human note about the status */
  note: string | null;
}

export interface ApiTheme {
  id: string;
  title: string;
  blurb: string;
  queries: ApiField[];
  mutations: ApiField[];
}

export interface ApiSummary {
  totalQueries: number;
  totalMutations: number;
  totalTypes: number;
  generatedAt: string;
  themes: ApiTheme[];
  statusCounts: Record<ProbeStatus, number>;
}

interface StatusEntry {
  status: ProbeStatus;
  note: string;
}

/**
 * Probe results we know about. All other fields default to "untried".
 */
const STATUS_MAP: Record<string, StatusEntry> = {
  "Query.user": { status: "ok", note: "probe 01-me" },
  "Query.organization": { status: "ok", note: "probe 01-me" },
  "Query.companySelector": { status: "ok", note: "probe 01-me" },
  "Query.userDetails": { status: "untried", note: "" },
  "Query.accountingEntity": {
    status: "ok",
    note: "probe 05-accounting-entity · aceId 62837810",
  },
  "Query.roomList": { status: "ok", note: "231 rooms via research:rooms" },
  "Query.roomStories": {
    status: "ok",
    note: "9301 stories via research:stories",
  },
  "Query.room": { status: "untried", note: "covered via roomList" },
  "Query.roomStory": { status: "untried", note: "" },
  "Query.contract": { status: "ok", note: "verified via probe 06" },
  "Query.contractList": {
    status: "ok",
    note: "79 contracts via research:contracts",
  },
  "Query.vendorContracts": {
    status: "empty",
    note: "returns 0 rows despite 79 known contracts — likely vendorId filter mismatch; contractList fallback used",
  },
  "Query.contractDetails": { status: "untried", note: "" },
  "Query.contractByTerm": { status: "untried", note: "" },
  "Query.contractTerm": { status: "untried", note: "" },
  "Query.contractProposal": { status: "untried", note: "" },
  "Query.contractTimeReport": { status: "untried", note: "" },
  "Query.snapshotsByContractId": { status: "untried", note: "" },
  "Query.offersByAttribute": {
    status: "ok",
    note: "112 offers via research:offers",
  },
  "Query.offersByAttributes": {
    status: "untried",
    note: "modernized alt endpoint",
  },
  "Query.offer": { status: "untried", note: "covered via offersByAttribute" },
  "Query.transactionHistory": {
    status: "ok",
    note: "1222 rows / 25 months via research:transactions",
  },
  "Query.vendorProposals": {
    status: "blocked-scope",
    note: "VJCA-6 'Input parameter provided has incorrect value' on all 8 status enum values; likely missing scope",
  },
  "Query.vendorProposal": { status: "untried", note: "" },
  "Query.clientProposals": {
    status: "untried",
    note: "requires jobPostingId; not yet exercised",
  },
  "Query.clientProposal": { status: "untried", note: "" },
  "Query.proposalMetadata": { status: "untried", note: "" },
  "Query.marketplaceJobPostingsSearch": {
    status: "blocked-error",
    note: "HTTP 200 but GraphQL 500 (VJCA-ish) for this key; use publicMarketplaceJobPostingsSearch",
  },
  "Query.marketplaceJobPostings": { status: "untried", note: "legacy alt" },
  "Query.marketplaceJobPosting": { status: "untried", note: "" },
  "Query.publicMarketplaceJobPostingsSearch": {
    status: "ok",
    note: "20 jobs via probe 05-jobs-public (searchExpression=next.js, daysPosted=14)",
  },
  "Query.jobPosting": { status: "untried", note: "" },
  "Query.marketplaceJobPostingsContents": { status: "untried", note: "" },
  "Query.workDiaryCompany": {
    status: "untried",
    note: "screenshots have short-lived URLs — see ROADMAP §8",
  },
  "Query.workDiaryContract": { status: "untried", note: "" },
};

/** Parse capabilities.md into structured themes. */
export function getApiSummary(): ApiSummary {
  const md = readFileSync(CAP_PATH, "utf8");

  const counters = { queries: 0, mutations: 0, types: 0 };
  const qMatch = md.match(/^- Queries: \*\*(\d+)\*\*/m);
  const mMatch = md.match(/^- Mutations: \*\*(\d+)\*\*/m);
  const tMatch = md.match(
    /^- Types \(excluding introspection\): \*\*(\d+)\*\*/m,
  );
  counters.queries = qMatch ? parseInt(qMatch[1]!, 10) : 0;
  counters.mutations = mMatch ? parseInt(mMatch[1]!, 10) : 0;
  counters.types = tMatch ? parseInt(tMatch[1]!, 10) : 0;

  const themes: ApiTheme[] = [];
  const themeChunks = md.split(/^## /m).slice(1); // skip preamble

  for (const chunk of themeChunks) {
    const lines = chunk.split("\n");
    const title = lines[0]?.trim() ?? "Untitled";
    const blurbMatch = chunk.match(/^_(.+?)_$/m);
    const blurb = blurbMatch ? blurbMatch[1]!.trim() : "";

    const queries = parseFields(chunk, "### Queries");
    const mutations = parseFields(chunk, "### Mutations");
    if (queries.length === 0 && mutations.length === 0) continue;

    themes.push({
      id: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      title,
      blurb,
      queries,
      mutations,
    });
  }

  const statusCounts: Record<ProbeStatus, number> = {
    ok: 0,
    empty: 0,
    "blocked-scope": 0,
    "blocked-error": 0,
    untried: 0,
  };
  for (const t of themes) {
    for (const f of [...t.queries, ...t.mutations]) {
      statusCounts[f.status] += 1;
    }
  }

  return {
    totalQueries: counters.queries,
    totalMutations: counters.mutations,
    totalTypes: counters.types,
    generatedAt: new Date().toISOString(),
    themes,
    statusCounts,
  };
}

function parseFields(chunk: string, sectionHeading: string): ApiField[] {
  const idx = chunk.indexOf(sectionHeading);
  if (idx < 0) return [];
  const after = chunk.slice(idx + sectionHeading.length);
  // Stop at next ### or ## section boundary.
  const endIdx = after.search(/\n##+ /);
  const body = endIdx < 0 ? after : after.slice(0, endIdx);
  const lines = body.split("\n");
  const out: ApiField[] = [];
  for (const raw of lines) {
    const m = raw.match(
      /^- \[ \] `(Query|Mutation)\.([^`]+)`(?:\s+—\s+(.+))?$/,
    );
    if (!m) continue;
    const root = m[1] as "Query" | "Mutation";
    const sigBody = m[2]!; // e.g. roomList(filter: ..., pagination: ...): RoomConnection!
    const description = m[3]?.trim() ?? null;
    const nameMatch = sigBody.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
    const name = nameMatch ? nameMatch[1]! : sigBody;
    const fqn = `${root}.${name}`;
    const entry = STATUS_MAP[fqn];
    out.push({
      fqn,
      root,
      name,
      signature: `${root}.${sigBody}`,
      description,
      status: entry?.status ?? "untried",
      note: entry?.note ?? null,
    });
  }
  return out;
}
