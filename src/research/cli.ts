import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetchAllRooms, type RoomNodeRaw } from "./fetch-rooms.ts";
import { fetchAllStories } from "./fetch-stories.ts";

const ROOMS_PATH = resolve(process.cwd(), "fixtures", "rooms", "all.json");

function loadRoomsFromDisk(): RoomNodeRaw[] | null {
  if (!existsSync(ROOMS_PATH)) return null;
  try {
    const parsed = JSON.parse(readFileSync(ROOMS_PATH, "utf8")) as {
      rooms?: RoomNodeRaw[];
    };
    return parsed.rooms ?? null;
  } catch {
    return null;
  }
}

export async function researchRooms(): Promise<void> {
  await fetchAllRooms();
}

export async function researchStories(): Promise<void> {
  const rooms = loadRoomsFromDisk();
  if (!rooms || rooms.length === 0) {
    console.error(
      "[research] No rooms on disk. Run `pnpm cli research:rooms` first.",
    );
    process.exitCode = 1;
    return;
  }
  const ids = rooms.map((r) => r.id);
  await fetchAllStories("agency-vendor", ids);
}

export async function researchAll(): Promise<void> {
  const rooms = await fetchAllRooms();
  await fetchAllStories(
    "agency-vendor",
    rooms.map((r) => r.id),
  );
}
