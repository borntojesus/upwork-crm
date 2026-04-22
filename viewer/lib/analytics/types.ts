/**
 * types.ts — Analytics payload types (mirrors src/research/analytics-compute.ts)
 * Stable shape; duplicated here so viewer has no dependency on src/.
 */

export interface WeekBucket {
  weekStart: string; // YYYY-MM-DD (Monday)
  count: number;
  usCount: number;
  themCount: number;
}

export interface DayBucket {
  day: string; // YYYY-MM-DD
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
  dow: number; // 0 = Sunday … 6 = Saturday (UTC)
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

/** Lead (mirrors viewer/lib/fixtures.ts Lead) */
export interface LeadRoomRef {
  roomId: string;
  roomName: string | null;
  topic: string | null;
  contractId: string | null;
  messageCount: number;
  firstAt: string | null;
  lastAt: string | null;
}

export interface Lead {
  userId: string;
  name: string;
  nid: string;
  orgIds: string[];
  orgNames: string[];
  rooms: LeadRoomRef[];
  messageCount: number;
  firstAt: string | null;
  lastAt: string | null;
}

export interface AnalyticsPayload {
  generatedAt: string;
  inputs: {
    leads: number;
    rooms: number;
    messages: number;
  };
  timeline: {
    weekly: WeekBucket[];
    daily: DayBucket[];
  };
  responseTimes: RoomResponseStats[];
  topClients: Lead[];
  talkRatios: RoomTalkRatio[];
  heatmap: HeatmapCell[];
  conversationLengths: LengthBucket[];
  inboxGrowth: GrowthPoint[];
}
