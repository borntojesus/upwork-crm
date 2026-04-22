import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";
import { TENANTS, ensureTenantDir, type TenantSlug } from "./tenants.ts";

const QUERY = /* GraphQL */ `
  query RoomStories($filter: RoomStoryFilter) {
    roomStories(filter: $filter) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          createdDateTime
          updatedDateTime
          message
          user {
            id
            nid
            name
          }
          organization {
            id
            name
          }
          attachments {
            ... on MessageAttachments {
              __typename
            }
          }
        }
      }
    }
  }
`;

export interface StoryNodeRaw {
  id: string;
  createdDateTime: string;
  updatedDateTime: string;
  message: string | null;
  user: { id: string; nid: string; name: string | null } | null;
  organization: { id: string; name: string | null } | null;
  attachments: Array<{ __typename: string }> | null;
}

interface StoriesResponse {
  roomStories: {
    totalCount: number | null;
    pageInfo: { hasNextPage: boolean | null; endCursor: string | null } | null;
    edges: Array<{ node: StoryNodeRaw | null }> | null;
  } | null;
}

interface RoomStoryFile {
  roomId: string;
  fetchedAt: string;
  pages: number;
  count: number;
  complete: boolean;
  stories: StoryNodeRaw[];
}

function storiesDir(tenant: TenantSlug): string {
  const base = ensureTenantDir(tenant);
  const dir = resolve(base, "stories");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function storyPath(tenant: TenantSlug, roomId: string): string {
  return resolve(storiesDir(tenant), `${roomId}.json`);
}

function readExisting(
  tenant: TenantSlug,
  roomId: string,
): RoomStoryFile | null {
  const p = storyPath(tenant, roomId);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as RoomStoryFile;
  } catch {
    return null;
  }
}

export async function fetchStoriesForRoom(
  roomId: string,
  opts: { skipComplete?: boolean; tenant?: TenantSlug } = {},
): Promise<RoomStoryFile> {
  const tenant: TenantSlug = opts.tenant ?? "agency-vendor";
  const tenantId = TENANTS[tenant].orgId;
  const existing = readExisting(tenant, roomId);
  if (opts.skipComplete !== false && existing?.complete) {
    return existing;
  }

  const stories: StoryNodeRaw[] = existing?.stories?.slice() ?? [];
  const seen = new Set(stories.map((s) => s.id));
  let after: string | undefined;
  let pages = existing?.pages ?? 0;

  while (true) {
    pages += 1;
    const pagination: { first: number; after?: string } = { first: 100 };
    if (after) pagination.after = after;

    const data = await gql<StoriesResponse>(
      QUERY,
      {
        filter: {
          roomId_eq: roomId,
          storyFilter: { pagination },
        },
      },
      { operationName: "RoomStories", tenantId },
    );

    const edges = data.roomStories?.edges ?? [];
    let added = 0;
    for (const edge of edges) {
      if (!edge?.node) continue;
      if (seen.has(edge.node.id)) continue;
      seen.add(edge.node.id);
      stories.push(edge.node);
      added += 1;
    }

    const endCursor = data.roomStories?.pageInfo?.endCursor ?? null;
    if (added === 0) break;
    if (endCursor === null || endCursor === after) break;
    after = endCursor;

    if (pages >= 50) {
      console.error(
        `[stories:${tenant}] ${roomId}: safety cap at page ${pages}, saving partial`,
      );
      break;
    }
  }

  const file: RoomStoryFile = {
    roomId,
    fetchedAt: new Date().toISOString(),
    pages,
    count: stories.length,
    complete: true,
    stories,
  };
  writeFileSync(
    storyPath(tenant, roomId),
    JSON.stringify(file, null, 2),
    "utf8",
  );

  // Backward-compat alias for agency-vendor: also write to legacy fixtures/stories/
  if (tenant === "agency-vendor") {
    const legacyDir = resolve(process.cwd(), "fixtures", "stories");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(
      resolve(legacyDir, `${roomId}.json`),
      JSON.stringify(file, null, 2),
      "utf8",
    );
  }

  return file;
}

export async function fetchAllStories(
  tenant: TenantSlug = "agency-vendor",
  roomIds?: string[],
): Promise<void> {
  // If roomIds not provided, read from tenant's rooms fixture
  let ids = roomIds;
  if (!ids) {
    const roomsPath = resolve(
      process.cwd(),
      "fixtures",
      "tenants",
      tenant,
      "rooms",
      "all.json",
    );
    if (!existsSync(roomsPath)) {
      // fallback to legacy path for agency-vendor
      const legacyPath = resolve(
        process.cwd(),
        "fixtures",
        "rooms",
        "all.json",
      );
      if (tenant === "agency-vendor" && existsSync(legacyPath)) {
        const data = JSON.parse(readFileSync(legacyPath, "utf8")) as {
          rooms: Array<{ id: string }>;
        };
        ids = data.rooms.map((r) => r.id);
      } else {
        console.error(
          `[stories:${tenant}] No rooms fixture found. Run research:rooms --tenant=${tenant} first.`,
        );
        return;
      }
    } else {
      const data = JSON.parse(readFileSync(roomsPath, "utf8")) as {
        rooms: Array<{ id: string }>;
      };
      ids = data.rooms.map((r) => r.id);
    }
  }

  console.error(`[stories:${tenant}] fetching for ${ids.length} rooms`);
  let done = 0;
  let skipped = 0;
  let totalStories = 0;
  for (const roomId of ids) {
    const existing = readExisting(tenant, roomId);
    if (existing?.complete) {
      skipped += 1;
      totalStories += existing.count;
      done += 1;
      continue;
    }
    try {
      const file = await fetchStoriesForRoom(roomId, { tenant });
      totalStories += file.count;
      done += 1;
      console.error(
        `[stories:${tenant}] ${done}/${ids.length} ${roomId}: ${file.count} stories (${file.pages} pages)`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[stories:${tenant}] ${roomId} FAILED: ${msg}`);
    }
  }
  console.error(
    `[stories:${tenant}] done: ${done}/${ids.length} rooms, ${totalStories} stories total, ${skipped} skipped (already fetched)`,
  );
}
