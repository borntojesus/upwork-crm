import { getRooms } from "@/lib/fixtures";
import { RoomsTable } from "@/components/rooms-table";
import { parseTenants, matchesFilter } from "@/lib/tenants";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const sp = await searchParams;
  const activeTenants = parseTenants(sp.t);
  const { rooms, count } = getRooms();
  const filtered = rooms.filter((r) => matchesFilter(r, activeTenants));
  return <RoomsTable rooms={filtered} count={count} />;
}
