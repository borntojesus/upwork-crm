/**
 * index.ts — Disk-read bridge for precomputed analytics.json.
 * Reads fixtures/agent/analytics.json (produced by `pnpm cli research:analytics`).
 * All functions are synchronous and cheap — file is cached after first read.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  AnalyticsPayload,
  DayBucket,
  GrowthPoint,
  HeatmapCell,
  Lead,
  LengthBucket,
  RoomResponseStats,
  RoomTalkRatio,
  WeekBucket,
} from "./types.ts";

export type {
  AnalyticsPayload,
  DayBucket,
  GrowthPoint,
  HeatmapCell,
  Lead,
  LengthBucket,
  RoomResponseStats,
  RoomTalkRatio,
  WeekBucket,
} from "./types.ts";

const ANALYTICS_PATH = resolve(
  process.cwd(),
  "..",
  "fixtures",
  "agent",
  "analytics.json",
);

let _cache: AnalyticsPayload | null = null;

export function getAnalytics(): AnalyticsPayload {
  if (_cache) return _cache;
  const raw = readFileSync(ANALYTICS_PATH, "utf8");
  _cache = JSON.parse(raw) as AnalyticsPayload;
  return _cache;
}

export function getTimeline(): AnalyticsPayload["timeline"] {
  return getAnalytics().timeline;
}

export function getWeekly(): WeekBucket[] {
  return getAnalytics().timeline.weekly;
}

export function getDaily(): DayBucket[] {
  return getAnalytics().timeline.daily;
}

export function getResponseTimes(): RoomResponseStats[] {
  return getAnalytics().responseTimes;
}

export function getTopClients(): Lead[] {
  return getAnalytics().topClients;
}

export function getTalkRatios(): RoomTalkRatio[] {
  return getAnalytics().talkRatios;
}

export function getHeatmap(): HeatmapCell[] {
  return getAnalytics().heatmap;
}

export function getConversationLengths(): LengthBucket[] {
  return getAnalytics().conversationLengths;
}

export function getInboxGrowth(): GrowthPoint[] {
  return getAnalytics().inboxGrowth;
}

export function getInputs(): AnalyticsPayload["inputs"] {
  return getAnalytics().inputs;
}
