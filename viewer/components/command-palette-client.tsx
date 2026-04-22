"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { MessageSquareIcon, UserIcon } from "lucide-react";

interface LeadEntry {
  id: string;
  name: string;
  org: string | null;
}

interface RoomEntry {
  id: string;
  name: string;
  lead: string | null;
}

interface Props {
  leads: LeadEntry[];
  rooms: RoomEntry[];
}

export function CommandPaletteClient({ leads, rooms }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggle]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search leads and rooms"
    >
      <CommandInput placeholder="Search leads and rooms…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Rooms">
          {rooms.slice(0, 100).map((r) => (
            <CommandItem
              key={r.id}
              value={`room ${r.name} ${r.lead ?? ""}`}
              onSelect={() => navigate(`/rooms/${r.id}`)}
            >
              <MessageSquareIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{r.name}</span>
              {r.lead && (
                <span className="ml-auto shrink-0 text-xs text-muted-foreground pl-4">
                  {r.lead}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Leads">
          {leads.slice(0, 100).map((l) => (
            <CommandItem
              key={l.id}
              value={`lead ${l.name} ${l.org ?? ""}`}
              onSelect={() => navigate(`/leads`)}
            >
              <UserIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{l.name}</span>
              {l.org && (
                <span className="ml-auto shrink-0 text-xs text-muted-foreground pl-4">
                  {l.org}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
