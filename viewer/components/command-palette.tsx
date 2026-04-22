import { getLeads, getRooms } from "@/lib/fixtures";
import { CommandPaletteClient } from "@/components/command-palette-client";

export function CommandPalette() {
  const leadsFile = getLeads();
  const roomsFile = getRooms();

  const leads = leadsFile.leads.map((l) => ({
    id: l.userId,
    name: l.name,
    org: l.orgNames[0] ?? null,
  }));

  const rooms = roomsFile.rooms.map((r) => ({
    id: r.roomId,
    name: r.roomName ?? r.topic ?? r.roomId,
    lead: r.leads[0]?.name ?? null,
  }));

  return <CommandPaletteClient leads={leads} rooms={rooms} />;
}
