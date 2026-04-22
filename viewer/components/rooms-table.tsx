"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { RoomSummary } from "@/lib/fixtures";
import { TenantBadge } from "@/components/tenant-badge";
import { tenantOf } from "@/lib/tenants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

const PAGE_SIZE = 50;

const ROOM_TYPES = ["ALL", "INTERVIEW", "ONE_ON_ONE", "GROUP"] as const;
type RoomTypeFilter = (typeof ROOM_TYPES)[number];
type SortKey = "name" | "messageCount" | "lastAt";
type SortDir = "asc" | "desc";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function isRecent(iso: string | null) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function relativeTime(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Props {
  rooms: RoomSummary[];
  count: number;
}

export function RoomsTable({ rooms, count }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<RoomTypeFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("lastAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rooms.filter((r) => {
      const matchesType =
        typeFilter === "ALL" ||
        (r as RoomSummary & { roomType?: string }).roomType === typeFilter;
      const name = (r.roomName ?? r.topic ?? r.roomId).toLowerCase();
      const leadName = r.leads.map((l) => l.name.toLowerCase()).join(" ");
      const matchesQuery = !q || name.includes(q) || leadName.includes(q);
      return matchesType && matchesQuery;
    });
  }, [rooms, query, typeFilter]);

  const sorted = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = (a.roomName ?? a.topic ?? a.roomId).localeCompare(
          b.roomName ?? b.topic ?? b.roomId,
        );
      } else if (sortKey === "messageCount") {
        cmp = a.messageCount - b.messageCount;
      } else {
        cmp = (a.lastAt ?? "").localeCompare(b.lastAt ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.ceil(sorted.length / PAGE_SIZE);
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k)
      return <ArrowUpDownIcon className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUpIcon className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDownIcon className="ml-1 inline h-3 w-3" />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Rooms</h1>
        <p className="text-sm text-muted-foreground">
          {count} conversations · sorted by last activity
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by title or lead name…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          className="max-w-sm"
        />
        <div className="flex gap-1">
          {ROOM_TYPES.map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setTypeFilter(t);
                setPage(0);
              }}
            >
              {t === "ALL" ? "All" : t.replace("_", " ")}
            </Button>
          ))}
        </div>
        {filtered.length !== rooms.length && (
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {rooms.length}
          </span>
        )}
      </div>

      {/* Table */}
      {pageRows.length === 0 ? (
        <div className="rounded-lg border border-border py-12 text-center text-sm text-muted-foreground">
          No rooms match your filters.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Room <SortIcon k="name" />
                  </button>
                </TableHead>
                <TableHead className="w-[110px]">Tenant</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead className="w-[120px]">
                  <button
                    onClick={() => toggleSort("messageCount")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Messages <SortIcon k="messageCount" />
                  </button>
                </TableHead>
                <TableHead className="w-[140px]">
                  <button
                    onClick={() => toggleSort("lastAt")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Last active <SortIcon k="lastAt" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => {
                const roomType = (r as RoomSummary & { roomType?: string })
                  .roomType;
                return (
                  <TableRow key={r.roomId}>
                    <TableCell>
                      <Link
                        href={`/rooms/${r.roomId}`}
                        className="block hover:underline"
                      >
                        <span className="truncate block font-medium text-sm max-w-[280px]">
                          {r.roomName ?? r.topic ?? r.roomId}
                        </span>
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {roomType && (
                          <Badge variant="outline" className="text-[10px] h-4">
                            {roomType.replace("_", " ")}
                          </Badge>
                        )}
                        {r.contractId && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {r.contractId.slice(0, 8)}…
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TenantBadge tenants={tenantOf(r)} size="xs" />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {r.leads.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                        {r.leads.slice(0, 2).map((l) => (
                          <div
                            key={l.userId}
                            className="flex items-center gap-1"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px]">
                                {initials(l.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs truncate max-w-[100px]">
                              {l.name}
                            </span>
                          </div>
                        ))}
                        {r.leads.length > 2 && (
                          <Badge variant="muted">+{r.leads.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isRecent(r.lastAt) ? "default" : "secondary"}
                      >
                        {r.messageCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {r.lastAt ? (
                        <Tooltip>
                          <TooltipTrigger className="cursor-default">
                            <span
                              className={
                                isRecent(r.lastAt)
                                  ? "text-orange-400 dark:text-orange-300 font-medium"
                                  : ""
                              }
                            >
                              {relativeTime(r.lastAt)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{fmtDate(r.lastAt)}</TooltipContent>
                        </Tooltip>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page + 1} of {pageCount} · {sorted.length} results
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              aria-label="Next page"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
