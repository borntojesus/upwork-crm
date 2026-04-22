/**
 * analytics-compute.ts
 * Pure functions — no I/O, no external deps. All types exported.
 */

import type {
  Lead,
  RoomSummary,
  Transcript,
} from "../../viewer/lib/fixtures.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeekBucket {
  weekStart: string; // ISO date of Monday (YYYY-MM-DD)
  count: number;
  usCount: number;
  themCount: number;
}

export interface DayBucket {
  day: string; // YYYY-MM-DD (UTC)
  count: number;
  usCount: number;
  themCount: number;
}

export interface RoomResponseStats {
  roomId: string;
  roomName: string | null;
  medianReplyMs: number | null;
  p90ReplyMs: number | null;
  replyCount: number;
  unansweredCount: number;
}

export interface RoomTalkRatio {
  roomId: string;
  roomName: string | null;
  usCount: number;
  themCount: number;
  usRatio: number;
}

export interface HeatmapCell {
  dow: number; // 0 = Sunday, 6 = Saturday (UTC)
  hour: number; // 0–23 UTC
  count: number;
}

export interface LengthBucket {
  bucket: "1-5" | "6-20" | "21-100" | "100+";
  count: number;
}

export interface GrowthPoint {
  month: string; // YYYY-MM
  newRooms: number;
  cumulativeRooms: number;
}

// Re-export input types for convenience
export type { Lead, RoomSummary, Transcript };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Monday of the ISO week containing the given date (UTC). */
function mondayOf(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dow = d.getUTCDay(); // 0=Sun, 1=Mon, …
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] ?? null)
    : Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? null;
}

// ─── 1. messagesPerWeek / messagesPerDay ─────────────────────────────────────

export function messagesPerWeek(transcripts: Transcript[]): WeekBucket[] {
  const buckets = new Map<string, WeekBucket>();

  for (const t of transcripts) {
    for (const m of t.messages) {
      const d = new Date(m.at);
      const key = toDateStr(mondayOf(d));
      let b = buckets.get(key);
      if (!b) {
        b = { weekStart: key, count: 0, usCount: 0, themCount: 0 };
        buckets.set(key, b);
      }
      b.count++;
      if (m.self) b.usCount++;
      else b.themCount++;
    }
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart),
  );
}

export function messagesPerDay(transcripts: Transcript[]): DayBucket[] {
  const buckets = new Map<string, DayBucket>();

  for (const t of transcripts) {
    for (const m of t.messages) {
      const d = new Date(m.at);
      const key = toDateStr(d);
      let b = buckets.get(key);
      if (!b) {
        b = { day: key, count: 0, usCount: 0, themCount: 0 };
        buckets.set(key, b);
      }
      b.count++;
      if (m.self) b.usCount++;
      else b.themCount++;
    }
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.day.localeCompare(b.day),
  );
}

// ─── 2. responseTimes ────────────────────────────────────────────────────────

export function responseTimes(transcripts: Transcript[]): RoomResponseStats[] {
  return transcripts.map((t) => {
    const msgs = t.messages;
    const replyDelaysMs: number[] = [];
    let unansweredCount = 0;

    // Find consecutive them→us pairs
    for (let i = 1; i < msgs.length; i++) {
      const prev = msgs[i - 1];
      const curr = msgs[i];
      if (!prev || !curr) continue;
      if (!prev.self && curr.self) {
        const delta = new Date(curr.at).getTime() - new Date(prev.at).getTime();
        if (delta >= 0) replyDelaysMs.push(delta);
      }
    }

    // Unanswered: trailing lead messages after the last us-message
    let lastUsIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.self) {
        lastUsIdx = i;
        break;
      }
    }
    if (lastUsIdx === -1) {
      // We never replied in this room — all lead messages are unanswered
      unansweredCount = msgs.filter((m) => !m.self).length;
    } else {
      // Count lead messages after lastUsIdx
      for (let i = lastUsIdx + 1; i < msgs.length; i++) {
        if (!msgs[i]?.self) unansweredCount++;
      }
    }

    const sorted = replyDelaysMs.slice().sort((a, b) => a - b);

    return {
      roomId: t.roomId,
      roomName: t.roomName,
      medianReplyMs: median(sorted),
      p90ReplyMs: percentile(sorted, 90),
      replyCount: sorted.length,
      unansweredCount,
    };
  });
}

// ─── 3. topClientsByVolume ───────────────────────────────────────────────────

export function topClientsByVolume(leads: Lead[], n = 20): Lead[] {
  return leads
    .slice()
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, n);
}

// ─── 4. talkRatios ───────────────────────────────────────────────────────────

export function talkRatios(transcripts: Transcript[]): RoomTalkRatio[] {
  return transcripts.map((t) => {
    let usCount = 0;
    let themCount = 0;
    for (const m of t.messages) {
      if (m.self) usCount++;
      else themCount++;
    }
    const total = usCount + themCount;
    return {
      roomId: t.roomId,
      roomName: t.roomName,
      usCount,
      themCount,
      usRatio: total === 0 ? 0 : usCount / total,
    };
  });
}

// ─── 5. activityHeatmap ──────────────────────────────────────────────────────

export function activityHeatmap(transcripts: Transcript[]): HeatmapCell[] {
  // Initialise all 168 cells
  const cells = new Map<string, HeatmapCell>();
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${dow}:${hour}`;
      cells.set(key, { dow, hour, count: 0 });
    }
  }

  for (const t of transcripts) {
    for (const m of t.messages) {
      const d = new Date(m.at);
      const dow = d.getUTCDay();
      const hour = d.getUTCHours();
      const key = `${dow}:${hour}`;
      const cell = cells.get(key);
      if (cell) cell.count++;
    }
  }

  // Return sorted: dow asc, hour asc
  return Array.from(cells.values()).sort((a, b) =>
    a.dow !== b.dow ? a.dow - b.dow : a.hour - b.hour,
  );
}

// ─── 6. conversationLengthBuckets ───────────────────────────────────────────

export function conversationLengthBuckets(
  rooms: RoomSummary[],
): LengthBucket[] {
  const buckets: Record<LengthBucket["bucket"], number> = {
    "1-5": 0,
    "6-20": 0,
    "21-100": 0,
    "100+": 0,
  };

  for (const r of rooms) {
    const n = r.messageCount;
    if (n <= 5) buckets["1-5"]++;
    else if (n <= 20) buckets["6-20"]++;
    else if (n <= 100) buckets["21-100"]++;
    else buckets["100+"]++;
  }

  const order: LengthBucket["bucket"][] = ["1-5", "6-20", "21-100", "100+"];
  return order.map((bucket) => ({ bucket, count: buckets[bucket] }));
}

// ─── 7. inboxGrowth ──────────────────────────────────────────────────────────

export function inboxGrowth(rooms: RoomSummary[]): GrowthPoint[] {
  const withDate = rooms
    .filter((r) => r.firstAt !== null)
    .map((r) => ({ month: r.firstAt!.slice(0, 7) }));

  const monthCounts = new Map<string, number>();
  for (const { month } of withDate) {
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }

  const sorted = Array.from(monthCounts.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  let cumulative = 0;
  return sorted.map(([month, newRooms]) => {
    cumulative += newRooms;
    return { month, newRooms, cumulativeRooms: cumulative };
  });
}
