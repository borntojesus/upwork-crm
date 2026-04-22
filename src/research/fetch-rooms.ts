import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";
import { TENANTS, ensureTenantDir, type TenantSlug } from "./tenants.ts";

const QUERY = /* GraphQL */ `
  query AllRooms($pagination: Pagination, $filter: RoomFilter) {
    roomList(pagination: $pagination, filter: $filter) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          roomName
          topic
          roomType
          numUnread
          numUsers
          createdAtDateTime
          lastVisitedDateTime
          lastReadDateTime
          contractId
          favorite
          hidden
          muted
          public
          readOnly
          roomUsers {
            role
            user {
              id
              nid
              name
              photoUrl
            }
            organization {
              id
              name
            }
          }
        }
      }
    }
  }
`;

export interface RoomUserRaw {
  role: string | null;
  user: {
    id: string;
    nid: string;
    name: string | null;
    photoUrl: string | null;
  } | null;
  organization: { id: string; name: string | null } | null;
}

export interface RoomNodeRaw {
  id: string;
  roomName: string | null;
  topic: string | null;
  roomType: string | null;
  numUnread: number | null;
  numUsers: number | null;
  createdAtDateTime: string | null;
  lastVisitedDateTime: string | null;
  lastReadDateTime: string | null;
  contractId: string | null;
  favorite: boolean | null;
  hidden: boolean | null;
  muted: boolean;
  public: boolean | null;
  readOnly: boolean | null;
  roomUsers: RoomUserRaw[] | null;
}

interface AllRoomsResponse {
  roomList: {
    totalCount: number | null;
    pageInfo: { hasNextPage: boolean | null; endCursor: string | null } | null;
    edges: Array<{ node: RoomNodeRaw }> | null;
  };
}

type RoomFilter = Record<string, unknown>;

interface PassConfig {
  label: string;
  filter: RoomFilter;
}

const PASSES: PassConfig[] = [
  { label: "defaults (no filter)", filter: {} },
  { label: "subscribed_eq: false", filter: { subscribed_eq: false } },
  { label: "includeHidden_eq: true", filter: { includeHidden_eq: true } },
  { label: "unreadRoomsOnly_eq: true", filter: { unreadRoomsOnly_eq: true } },
  { label: "roomType ONE_ON_ONE", filter: { roomType_eq: "ONE_ON_ONE" } },
  { label: "roomType GROUP", filter: { roomType_eq: "GROUP" } },
  { label: "roomType INTERVIEW", filter: { roomType_eq: "INTERVIEW" } },
];

async function fetchRoomsForFilter(
  filter: RoomFilter,
  seen: Set<string>,
  tenantId: string,
): Promise<{ rooms: RoomNodeRaw[]; addedCount: number }> {
  const rooms: RoomNodeRaw[] = [];
  let after: string | undefined;
  let page = 0;

  while (true) {
    page += 1;
    const pagination: { first: number; after?: string } = { first: 100 };
    if (after) pagination.after = after;

    const variables: { pagination: typeof pagination; filter?: RoomFilter } = {
      pagination,
    };
    if (Object.keys(filter).length > 0) variables.filter = filter;

    const data = await gql<AllRoomsResponse>(QUERY, variables, {
      operationName: "AllRooms",
      tenantId,
    });

    const edges = data.roomList.edges ?? [];
    let addedThisPage = 0;
    for (const edge of edges) {
      if (!edge?.node) continue;
      if (seen.has(edge.node.id)) continue;
      seen.add(edge.node.id);
      rooms.push(edge.node);
      addedThisPage += 1;
    }

    // Stop if first page returned 0 new rooms (all duplicates or empty)
    if (page === 1 && addedThisPage === 0) break;
    if (addedThisPage === 0) break;

    const next = data.roomList.pageInfo?.endCursor ?? null;
    if (next === null || next === after) break;
    after = next;
    if (page >= 50) {
      console.error(`[rooms] hit safety cap at page ${page}`);
      break;
    }
  }

  return { rooms, addedCount: rooms.length };
}

export async function fetchAllRooms(
  tenant: TenantSlug = "agency-vendor",
): Promise<RoomNodeRaw[]> {
  const tenantId = TENANTS[tenant].orgId;
  const allRooms: RoomNodeRaw[] = [];
  const seen = new Set<string>();

  // Track which pass found which rooms
  const passResults: Array<{
    pass: number;
    label: string;
    filter: RoomFilter;
    newRooms: number;
    totalAfter: number;
    roomIds: string[];
  }> = [];

  for (let i = 0; i < PASSES.length; i++) {
    const pass = PASSES[i];
    if (!pass) continue;
    const { label, filter } = pass;
    const beforeSize = seen.size;

    let result: { rooms: RoomNodeRaw[]; addedCount: number };
    try {
      result = await fetchRoomsForFilter(filter, seen, tenantId);
    } catch (err) {
      console.error(`[rooms:${tenant}] pass ${i + 1} (${label}) error: ${err}`);
      passResults.push({
        pass: i + 1,
        label,
        filter,
        newRooms: 0,
        totalAfter: allRooms.length,
        roomIds: [],
      });
      continue;
    }

    allRooms.push(...result.rooms);
    const added = seen.size - beforeSize;
    console.error(
      `[rooms:${tenant}] pass ${i + 1}/${PASSES.length} (${label}): +${added} new rooms (total ${allRooms.length})`,
    );

    passResults.push({
      pass: i + 1,
      label,
      filter,
      newRooms: added,
      totalAfter: allRooms.length,
      roomIds: result.rooms.map((r) => r.id),
    });
  }

  // Write to per-tenant dir
  const tenantBase = ensureTenantDir(tenant);
  const outDir = resolve(tenantBase, "rooms");
  mkdirSync(outDir, { recursive: true });

  const outPath = resolve(outDir, "all.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        count: allRooms.length,
        rooms: allRooms,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.error(
    `[rooms:${tenant}] wrote ${allRooms.length} rooms → ${outPath}`,
  );

  const passesPath = resolve(outDir, "_passes.json");
  writeFileSync(
    passesPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalRooms: allRooms.length,
        passes: passResults,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.error(`[rooms:${tenant}] wrote pass metadata → ${passesPath}`);

  // Backward-compat alias for agency-vendor: also write to legacy fixtures/rooms/
  if (tenant === "agency-vendor") {
    const legacyDir = resolve(process.cwd(), "fixtures", "rooms");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(
      resolve(legacyDir, "all.json"),
      JSON.stringify(
        {
          fetchedAt: new Date().toISOString(),
          count: allRooms.length,
          rooms: allRooms,
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  return allRooms;
}
