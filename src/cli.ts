import { cliLogin } from "./auth/cli-login.ts";

const USAGE = `upwork-crm CLI

Usage:
  pnpm cli login                  Authorize via OAuth2 Authorization Code flow
  pnpm cli whoami                 Print token status (expiry, scope)
  pnpm cli keys:backup            Save .env secrets to macOS Keychain + ~/Documents/.secrets
  pnpm cli keys:restore [--force] Rewrite .env secrets from macOS Keychain
  pnpm cli refresh-schema         [Phase 0.4] Introspect GraphQL schema
  pnpm cli probe <name>           [Phase 1]   Run a single probe
  pnpm cli probe-all              [Phase 1]   Run every probe in sequence
  pnpm cli research:rooms         [Phase 1]   Fetch all conversation rooms (paginated)
  pnpm cli research:stories       [Phase 1]   Fetch all messages for every known room (resumable)
  pnpm cli research:all           [Phase 1]   research:rooms + research:stories
  pnpm cli research:export        [Phase 1]   Build leads index + per-lead MD/JSON for agents
  pnpm cli research:analytics     [Phase 1]   Compute analytics from fixtures → analytics.json
  pnpm cli research:contracts     [Phase 1]   Fetch all vendor contracts (offset-paginated)
  pnpm cli research:offers        [Phase 1]   Fetch all offers for agency org (page-paginated)
  pnpm cli research:proposals     [Phase 1]   Fetch vendor proposals across all statuses
  pnpm cli research:transactions  [Phase 1]   Fetch 24 months of transaction history (resumable)
  pnpm cli research:jobs          [Phase 1]   Fetch job details for all known jobIds (resumable)
  pnpm cli research:graph         [Phase 1]   Build leads-enriched + jobs-enriched from fixtures
  pnpm cli research:scans         [Phase 1]   Fetch public job scans for 9 tech slugs (resumable)
  pnpm cli research:freelancers   [Phase 1]   Fetch top freelancers per category + analyze (--category=<slug>)
  pnpm cli sample-report          [Phase 1]   Summarize fixtures into SAMPLE_REPORT.md
  pnpm cli export-to-notes        [Phase 2]   Emit notes/**/*.md from fixtures
`;

async function whoami(): Promise<void> {
  const { readTokens } = await import("./auth/token-store.ts");
  const t = readTokens();
  if (!t) {
    console.error("No tokens.json. Run `pnpm cli login` first.");
    process.exitCode = 1;
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  const remaining = t.expires_at - now;
  console.log(
    JSON.stringify(
      {
        token_type: t.token_type,
        scope: t.scope,
        has_refresh_token: Boolean(t.refresh_token),
        expires_in_seconds: remaining,
        expired: remaining <= 0,
        obtained_at_iso: new Date(t.obtained_at * 1000).toISOString(),
      },
      null,
      2,
    ),
  );
}

async function notImplemented(phase: string, name: string): Promise<void> {
  console.error(
    `[cli] \`${name}\` is not implemented yet — coming in ${phase}.`,
  );
  process.exitCode = 2;
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case undefined:
    case "help":
    case "--help":
    case "-h":
      process.stdout.write(USAGE);
      return;
    case "login":
      await cliLogin();
      return;
    case "whoami":
      await whoami();
      return;
    case "keys:backup": {
      const { keysBackup } = await import("./auth/keys-cli.ts");
      await keysBackup();
      return;
    }
    case "keys:restore": {
      const { keysRestore } = await import("./auth/keys-cli.ts");
      await keysRestore({ force: rest.includes("--force") });
      return;
    }
    case "refresh-schema": {
      const { refreshSchema } = await import("./introspect/cli.ts");
      await refreshSchema();
      return;
    }
    case "probe": {
      const name = rest[0];
      if (!name) {
        console.error("Usage: pnpm cli probe <name>");
        process.exitCode = 1;
        return;
      }
      const { runProbe } = await import("./probes/registry.ts");
      await runProbe(name);
      return;
    }
    case "probe-all": {
      const { runAllProbes } = await import("./probes/registry.ts");
      await runAllProbes();
      return;
    }
    case "research:rooms": {
      const { researchRooms } = await import("./research/cli.ts");
      await researchRooms();
      return;
    }
    case "research:stories": {
      const { researchStories } = await import("./research/cli.ts");
      await researchStories();
      return;
    }
    case "research:all": {
      const { researchAll } = await import("./research/cli.ts");
      await researchAll();
      return;
    }
    case "research:export": {
      const { researchExport } = await import("./research/export.ts");
      await researchExport();
      return;
    }
    case "research:contracts": {
      const { fetchAllContracts } =
        await import("./research/fetch-contracts.ts");
      const contracts = await fetchAllContracts();
      console.error(`[cli] contracts fetched: ${contracts.length}`);
      return;
    }
    case "research:offers": {
      const { fetchAllOffers } = await import("./research/fetch-offers.ts");
      const offers = await fetchAllOffers();
      console.error(`[cli] offers fetched: ${offers.length}`);
      return;
    }
    case "research:proposals": {
      const { fetchAllVendorProposals } =
        await import("./research/fetch-proposals.ts");
      const proposals = await fetchAllVendorProposals();
      console.error(`[cli] proposals fetched: ${proposals.length}`);
      return;
    }
    case "research:transactions": {
      const { fetchAllTransactions } =
        await import("./research/fetch-transactions.ts");
      await fetchAllTransactions();
      return;
    }
    case "research:analytics": {
      const { researchAnalytics } = await import("./research/analytics-cli.ts");
      await researchAnalytics();
      return;
    }
    case "research:jobs": {
      const { fetchAllJobs } = await import("./research/fetch-jobs.ts");
      const jobs = await fetchAllJobs();
      console.error(`[cli] jobs fetched: ${jobs.length}`);
      return;
    }
    case "research:graph": {
      const { runGraph } = await import("./research/graph.ts");
      await runGraph();
      return;
    }
    case "research:scans": {
      const { fetchAllScans } = await import("./research/fetch-scans.ts");
      const scanners = await fetchAllScans();
      console.error(`[cli] scans done: ${scanners.length} scanners`);
      return;
    }
    case "research:freelancers": {
      const catArg = rest.find((a) => a.startsWith("--category="));
      const catSlug = catArg ? catArg.split("=")[1] : undefined;
      const { fetchTopFreelancers } =
        await import("./research/fetch-top-freelancers.ts");
      const { analyzeFreelancers } =
        await import("./research/freelancers-analyze.ts");
      const fetchResults = await fetchTopFreelancers(catSlug);
      const newSnapshots = fetchResults.reduce((s, r) => s + r.fetched, 0);
      console.error(
        `[cli] research:freelancers: ${newSnapshots} new snapshots across ${fetchResults.length} categories`,
      );
      analyzeFreelancers();
      return;
    }
    case "sample-report":
      await notImplemented("Phase 1", command);
      return;
    case "export-to-notes":
      await notImplemented("Phase 2", command);
      return;
    default:
      console.error(`Unknown command: ${command}\n`);
      process.stdout.write(USAGE);
      process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error(`[cli] error: ${msg}`);
  process.exit(1);
});
