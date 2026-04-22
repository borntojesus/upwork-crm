/**
 * analytics-cli.ts
 * Loads fixtures, runs all compute functions, writes fixtures/agent/analytics.json.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import type {
  Lead,
  RoomSummary,
  Transcript,
} from "../../viewer/lib/fixtures.ts";
import {
  activityHeatmap,
  conversationLengthBuckets,
  inboxGrowth,
  messagesPerDay,
  messagesPerWeek,
  responseTimes,
  talkRatios,
  topClientsByVolume,
} from "./analytics-compute.ts";

const ROOT = process.cwd();
const AGENT_DIR = resolve(ROOT, "fixtures", "agent");
const TRANSCRIPTS_DIR = resolve(AGENT_DIR, "transcripts");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function loadLeads(): { leads: Lead[]; count: number; totalMessages: number } {
  const p = resolve(AGENT_DIR, "leads.json");
  if (!existsSync(p))
    throw new Error(`Missing ${p}. Run \`pnpm cli research:export\`.`);
  const f = readJson<{ leads: Lead[]; count: number; totalMessages: number }>(
    p,
  );
  return f;
}

function loadRooms(): RoomSummary[] {
  const p = resolve(AGENT_DIR, "rooms.json");
  if (!existsSync(p))
    throw new Error(`Missing ${p}. Run \`pnpm cli research:export\`.`);
  const f = readJson<{ rooms: RoomSummary[] }>(p);
  return f.rooms;
}

function loadTranscripts(): Transcript[] {
  if (!existsSync(TRANSCRIPTS_DIR)) return [];
  const files = readdirSync(TRANSCRIPTS_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => readJson<Transcript>(resolve(TRANSCRIPTS_DIR, f)));
}

export async function researchAnalytics(): Promise<void> {
  console.error("[analytics] Loading fixtures…");
  const {
    leads,
    count: leadCount,
    totalMessages: totalMsgFromFile,
  } = loadLeads();
  const rooms = loadRooms();
  const transcripts = loadTranscripts();

  const actualMessages = transcripts.reduce((s, t) => s + t.messages.length, 0);

  console.error(
    `[analytics] Loaded: ${leadCount} leads · ${rooms.length} rooms · ${actualMessages} messages (${transcripts.length} transcripts)`,
  );

  // Run all compute functions
  const weekly = messagesPerWeek(transcripts);
  const daily = messagesPerDay(transcripts);
  const rtStats = responseTimes(transcripts);
  const topClients = topClientsByVolume(leads, 20);
  const ratios = talkRatios(transcripts);
  const heatmap = activityHeatmap(transcripts);
  const convLengths = conversationLengthBuckets(rooms);
  const growth = inboxGrowth(rooms);

  // Brief stats for stderr
  const allMedians = rtStats
    .map((r) => r.medianReplyMs)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const overallMedianMs =
    allMedians.length > 0
      ? (allMedians[Math.floor(allMedians.length / 2)] ?? null)
      : null;

  const busiestCell = heatmap.reduce(
    (best, c) => (c.count > best.count ? c : best),
    heatmap[0] ?? { dow: 0, hour: 0, count: 0 },
  );

  console.error(
    `[analytics] Overall median reply: ${overallMedianMs !== null ? Math.round(overallMedianMs / 60000) + " min" : "n/a"}`,
  );
  console.error(
    `[analytics] Busiest slot: DOW=${busiestCell.dow} hour=${busiestCell.hour}UTC count=${busiestCell.count}`,
  );
  console.error(`[analytics] Top 3 clients by volume:`);
  for (const lead of topClients.slice(0, 3)) {
    console.error(`[analytics]   ${lead.name} — ${lead.messageCount} messages`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    inputs: {
      leads: leadCount,
      rooms: rooms.length,
      messages: actualMessages,
    },
    timeline: {
      weekly,
      daily,
    },
    responseTimes: rtStats,
    topClients,
    talkRatios: ratios,
    heatmap,
    conversationLengths: convLengths,
    inboxGrowth: growth,
  };

  mkdirSync(AGENT_DIR, { recursive: true });
  const outPath = resolve(AGENT_DIR, "analytics.json");
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.error(`[analytics] Written → ${outPath}`);
}
