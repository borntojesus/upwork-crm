import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getConfig } from "../config.ts";
import type { RoomNodeRaw, RoomUserRaw } from "./fetch-rooms.ts";
import type { StoryNodeRaw } from "./fetch-stories.ts";

interface RoomStoryFile {
  roomId: string;
  count: number;
  stories: StoryNodeRaw[];
}

const ROOT = process.cwd();
const ROOMS_PATH = resolve(ROOT, "fixtures", "rooms", "all.json");
const STORIES_DIR = resolve(ROOT, "fixtures", "stories");
const AGENT_DIR = resolve(ROOT, "fixtures", "agent");
const TRANSCRIPTS_DIR = resolve(AGENT_DIR, "transcripts");
const LEADS_NOTES_DIR = resolve(ROOT, "notes", "leads");
const ROOMS_NOTES_DIR = resolve(ROOT, "notes", "rooms");

function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "unknown"
  );
}

function loadRooms(): RoomNodeRaw[] {
  if (!existsSync(ROOMS_PATH)) {
    throw new Error(`Missing ${ROOMS_PATH}. Run \`pnpm cli research:rooms\`.`);
  }
  const parsed = JSON.parse(readFileSync(ROOMS_PATH, "utf8")) as {
    rooms: RoomNodeRaw[];
  };
  return parsed.rooms;
}

function loadStories(roomId: string): StoryNodeRaw[] {
  const p = resolve(STORIES_DIR, `${roomId}.json`);
  if (!existsSync(p)) return [];
  const file = JSON.parse(readFileSync(p, "utf8")) as RoomStoryFile;
  return file.stories;
}

interface CompactMessage {
  id: string;
  at: string;
  from: string;
  fromOrg: string | null;
  self: boolean;
  text: string;
  hasAttachment: boolean;
}

interface LeadRoomRef {
  roomId: string;
  roomName: string | null;
  topic: string | null;
  contractId: string | null;
  messageCount: number;
  firstAt: string | null;
  lastAt: string | null;
}

interface Lead {
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

interface SelfIdentity {
  orgIds: Set<string>;
  userIds: Set<string>;
}

function loadSelfIdentity(rooms: RoomNodeRaw[]): SelfIdentity {
  const cfg = getConfig();
  const orgIds = new Set<string>();
  const userIds = new Set<string>();
  if (cfg.UPWORK_ORG_ID) orgIds.add(cfg.UPWORK_ORG_ID);

  // Also read 01-me.json (OAuth'd user + all orgs from companySelector)
  const mePath = resolve(ROOT, "fixtures", "01-me.json");
  if (existsSync(mePath)) {
    try {
      const me = JSON.parse(readFileSync(mePath, "utf8")) as {
        user?: { id?: string | null };
        organization?: { id?: string | null };
        companySelector?: {
          items?: Array<{ organizationId?: string | null }>;
        };
      };
      if (me.user?.id) userIds.add(me.user.id);
      if (me.organization?.id) orgIds.add(me.organization.id);
      for (const item of me.companySelector?.items ?? []) {
        if (item.organizationId) orgIds.add(item.organizationId);
      }
    } catch {
      // ignore — .env fallback already set above
    }
  }

  // Expand: anyone whose participant record maps them to a known self-org is
  // also "us" (teammates in the agency). Collect their user ids so we don't
  // misclassify teammates as leads when they message from a different org.
  for (const room of rooms) {
    for (const ru of room.roomUsers ?? []) {
      const oid = ru.organization?.id;
      const uid = ru.user?.id;
      if (oid && uid && orgIds.has(oid)) userIds.add(uid);
    }
  }
  return { orgIds, userIds };
}

function isSelf(
  orgId: string | null | undefined,
  userId: string | null | undefined,
  self: SelfIdentity,
): boolean {
  if (userId && self.userIds.has(userId)) return true;
  if (orgId && self.orgIds.has(orgId)) return true;
  return false;
}

function compactMessage(s: StoryNodeRaw, self: SelfIdentity): CompactMessage {
  return {
    id: s.id,
    at: s.createdDateTime,
    from: s.user?.name ?? "(unknown)",
    fromOrg: s.organization?.name ?? null,
    self: isSelf(s.organization?.id ?? null, s.user?.id ?? null, self),
    text: (s.message ?? "").replace(/\r\n/g, "\n"),
    hasAttachment: Array.isArray(s.attachments) && s.attachments.length > 0,
  };
}

function minMaxAt(stories: StoryNodeRaw[]): [string | null, string | null] {
  if (stories.length === 0) return [null, null];
  let min = stories[0]!.createdDateTime;
  let max = stories[0]!.createdDateTime;
  for (const s of stories) {
    if (s.createdDateTime < min) min = s.createdDateTime;
    if (s.createdDateTime > max) max = s.createdDateTime;
  }
  return [min, max];
}

function renderTranscriptMd(
  room: RoomNodeRaw,
  stories: StoryNodeRaw[],
  self: SelfIdentity,
): string {
  const sorted = stories
    .slice()
    .sort((a, b) => a.createdDateTime.localeCompare(b.createdDateTime));
  const leadParticipants = (room.roomUsers ?? []).filter(
    (ru) => !isSelf(ru.organization?.id ?? null, ru.user?.id ?? null, self),
  );
  const leadWikis = leadParticipants
    .map((ru) => ru.user?.name)
    .filter((n): n is string => !!n)
    .map((n) => `[[${n}]]`)
    .join(", ");

  const lines: string[] = [];
  lines.push(`# ${room.roomName ?? room.topic ?? room.id}`);
  lines.push("");
  lines.push(`- Room ID: \`${room.id}\``);
  lines.push(`- Type: ${room.roomType ?? "?"}`);
  lines.push(`- Created: ${room.createdAtDateTime ?? "?"}`);
  if (room.contractId) lines.push(`- Contract: \`${room.contractId}\``);
  if (leadWikis) lines.push(`- Leads: ${leadWikis}`);
  if (room.topic) lines.push(`- Topic: ${room.topic}`);
  lines.push("");
  lines.push(`## Transcript (${sorted.length} messages)`);
  lines.push("");
  for (const s of sorted) {
    const who = s.user?.name ?? "(unknown)";
    const org = s.organization?.name ? ` (${s.organization.name})` : "";
    const isUs = isSelf(s.organization?.id ?? null, s.user?.id ?? null, self)
      ? " **[us]**"
      : "";
    lines.push(`### ${who}${org}${isUs} — ${s.createdDateTime}`);
    lines.push("");
    const text = (s.message ?? "").trim();
    if (text) {
      for (const line of text.split("\n")) lines.push(`> ${line}`);
    } else {
      lines.push(`> _(empty)_`);
    }
    if (Array.isArray(s.attachments) && s.attachments.length > 0) {
      lines.push("");
      lines.push(`_Attachments: ${s.attachments.length}_`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function renderLeadMd(lead: Lead): string {
  const lines: string[] = [];
  lines.push(`# ${lead.name}`);
  lines.push("");
  lines.push(`- User ID: \`${lead.userId}\``);
  if (lead.nid) lines.push(`- Nickname: \`${lead.nid}\``);
  if (lead.orgNames.length > 0) {
    lines.push(
      `- Organizations: ${lead.orgNames.map((n) => `**${n}**`).join(", ")}`,
    );
  }
  lines.push(`- Messages: ${lead.messageCount}`);
  lines.push(`- First contact: ${lead.firstAt ?? "?"}`);
  lines.push(`- Last contact: ${lead.lastAt ?? "?"}`);
  lines.push("");
  lines.push(`## Rooms (${lead.rooms.length})`);
  lines.push("");
  for (const r of lead.rooms) {
    const title = r.roomName ?? r.topic ?? r.roomId;
    lines.push(
      `- [[${r.roomId}|${title}]] — ${r.messageCount} msg · ${r.firstAt ?? "?"} → ${r.lastAt ?? "?"}${r.contractId ? ` · contract \`${r.contractId}\`` : ""}`,
    );
  }
  return lines.join("\n");
}

export async function researchExport(): Promise<void> {
  mkdirSync(AGENT_DIR, { recursive: true });
  mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
  mkdirSync(LEADS_NOTES_DIR, { recursive: true });
  mkdirSync(ROOMS_NOTES_DIR, { recursive: true });

  const rooms = loadRooms();
  const self = loadSelfIdentity(rooms);

  const leadsByUser = new Map<string, Lead>();
  let totalMessages = 0;

  const roomSummaries: Array<{
    roomId: string;
    roomName: string | null;
    topic: string | null;
    contractId: string | null;
    messageCount: number;
    firstAt: string | null;
    lastAt: string | null;
    leads: Array<{ userId: string; name: string; orgName: string | null }>;
  }> = [];

  for (const room of rooms) {
    const stories = loadStories(room.id);
    totalMessages += stories.length;
    const [firstAt, lastAt] = minMaxAt(stories);

    const compactMessages = stories
      .slice()
      .sort((a, b) => a.createdDateTime.localeCompare(b.createdDateTime))
      .map((s) => compactMessage(s, self));
    writeFileSync(
      resolve(TRANSCRIPTS_DIR, `${room.id}.json`),
      JSON.stringify(
        {
          roomId: room.id,
          roomName: room.roomName,
          topic: room.topic,
          contractId: room.contractId,
          roomType: room.roomType,
          messages: compactMessages,
        },
        null,
        2,
      ),
      "utf8",
    );
    writeFileSync(
      resolve(ROOMS_NOTES_DIR, `${room.id}.md`),
      renderTranscriptMd(room, stories, self),
      "utf8",
    );

    const leadUsers: Array<{
      userId: string;
      name: string;
      orgName: string | null;
    }> = [];
    const leadParticipants = (room.roomUsers ?? []).filter(
      (ru: RoomUserRaw) =>
        !isSelf(ru.organization?.id ?? null, ru.user?.id ?? null, self) &&
        ru.user?.id &&
        ru.user?.name,
    );
    for (const ru of leadParticipants) {
      const uid = ru.user!.id;
      const name = ru.user!.name!;
      const orgId = ru.organization?.id ?? null;
      const orgName = ru.organization?.name ?? null;
      leadUsers.push({ userId: uid, name, orgName });

      let lead = leadsByUser.get(uid);
      if (!lead) {
        lead = {
          userId: uid,
          name,
          nid: ru.user!.nid ?? "",
          orgIds: [],
          orgNames: [],
          rooms: [],
          messageCount: 0,
          firstAt: null,
          lastAt: null,
        };
        leadsByUser.set(uid, lead);
      }
      if (orgId && !lead.orgIds.includes(orgId)) lead.orgIds.push(orgId);
      if (orgName && !lead.orgNames.includes(orgName))
        lead.orgNames.push(orgName);
      lead.rooms.push({
        roomId: room.id,
        roomName: room.roomName,
        topic: room.topic,
        contractId: room.contractId,
        messageCount: stories.length,
        firstAt,
        lastAt,
      });
      lead.messageCount += stories.length;
      if (firstAt && (lead.firstAt === null || firstAt < lead.firstAt))
        lead.firstAt = firstAt;
      if (lastAt && (lead.lastAt === null || lastAt > lead.lastAt))
        lead.lastAt = lastAt;
    }

    roomSummaries.push({
      roomId: room.id,
      roomName: room.roomName,
      topic: room.topic,
      contractId: room.contractId,
      messageCount: stories.length,
      firstAt,
      lastAt,
      leads: leadUsers,
    });
  }

  const leads = Array.from(leadsByUser.values()).sort((a, b) =>
    (b.lastAt ?? "").localeCompare(a.lastAt ?? ""),
  );

  writeFileSync(
    resolve(AGENT_DIR, "leads.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: leads.length,
        totalMessages,
        leads,
      },
      null,
      2,
    ),
    "utf8",
  );
  writeFileSync(
    resolve(AGENT_DIR, "rooms.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: roomSummaries.length,
        rooms: roomSummaries,
      },
      null,
      2,
    ),
    "utf8",
  );

  for (const lead of leads) {
    const slug = `${slugify(lead.name)}-${lead.userId.slice(-6)}`;
    writeFileSync(
      resolve(LEADS_NOTES_DIR, `${slug}.md`),
      renderLeadMd(lead),
      "utf8",
    );
  }

  console.error(
    `[export] ${leads.length} leads · ${rooms.length} rooms · ${totalMessages} messages`,
  );
  console.error(`[export]   fixtures/agent/leads.json`);
  console.error(`[export]   fixtures/agent/rooms.json`);
  console.error(`[export]   fixtures/agent/transcripts/*.json`);
  console.error(`[export]   notes/leads/*.md`);
  console.error(`[export]   notes/rooms/*.md`);
}
