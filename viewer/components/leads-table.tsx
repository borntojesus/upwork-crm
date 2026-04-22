"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { EnrichedLead } from "@/lib/fixtures";
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

type SortKey = "name" | "messageCount" | "lastAt" | "rooms";
type SortDir = "asc" | "desc";
type FilterChip = "all" | "customers" | "cold" | "active";

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

function isTouchedThisMonth(iso: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
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
  leads: EnrichedLead[];
  count: number;
}

const CHIP_LABELS: Record<FilterChip, string> = {
  all: "All",
  customers: "Customers (had contract)",
  cold: "Cold leads (no contract)",
  active: "Active (touched this month)",
};

const SORT_LABELS: Record<SortKey, string> = {
  lastAt: "Last contact",
  messageCount: "Most messages",
  rooms: "Most rooms",
  name: "Name",
};

export function LeadsTable({ leads, count }: Props) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<FilterChip>("all");
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

  function selectChip(c: FilterChip) {
    setChip(c);
    setPage(0);
  }

  const chipFiltered = useMemo(() => {
    if (chip === "all") return leads;
    if (chip === "customers") return leads.filter((l) => l.hasAnyContract);
    if (chip === "cold") return leads.filter((l) => !l.hasAnyContract);
    if (chip === "active")
      return leads.filter((l) => isTouchedThisMonth(l.lastAt));
    return leads;
  }, [leads, chip]);

  const searchFiltered = useMemo(() => {
    const q = query.toLowerCase();
    return chipFiltered.filter(
      (l) =>
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.orgNames.some((o) => o.toLowerCase().includes(q)),
    );
  }, [chipFiltered, query]);

  const sorted = useMemo(() => {
    return searchFiltered.slice().sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "messageCount")
        cmp = a.messageCount - b.messageCount;
      else if (sortKey === "rooms") cmp = a.rooms.length - b.rooms.length;
      else cmp = (a.lastAt ?? "").localeCompare(b.lastAt ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [searchFiltered, sortKey, sortDir]);

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
        <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          {count} distinct non-agency participants · sorted by most recent
          contact
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CHIP_LABELS) as FilterChip[]).map((c) => (
          <Button
            key={c}
            variant={chip === c ? "default" : "outline"}
            size="sm"
            onClick={() => selectChip(c)}
          >
            {CHIP_LABELS[c]}
          </Button>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search by name or organization…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          className="max-w-sm"
        />
        {/* Sort selector */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">Sort:</span>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <Button
              key={k}
              variant={sortKey === k ? "secondary" : "ghost"}
              size="sm"
              onClick={() => toggleSort(k)}
              className="gap-1"
            >
              {SORT_LABELS[k]}
              {sortKey === k &&
                (sortDir === "asc" ? (
                  <ArrowUpIcon className="h-3 w-3" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3" />
                ))}
            </Button>
          ))}
        </div>
        {(searchFiltered.length !== leads.length || chip !== "all") && (
          <span className="text-sm text-muted-foreground">
            {sorted.length} of {leads.length}
          </span>
        )}
      </div>

      {/* Table */}
      {pageRows.length === 0 ? (
        <div className="rounded-lg border border-border py-12 text-center text-sm text-muted-foreground">
          No leads match your search.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[240px]">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Name <SortIcon k="name" />
                  </button>
                </TableHead>
                <TableHead className="w-[120px]">Tenant</TableHead>
                <TableHead>Organizations</TableHead>
                <TableHead className="w-[120px]">
                  <button
                    onClick={() => toggleSort("messageCount")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Messages <SortIcon k="messageCount" />
                  </button>
                </TableHead>
                <TableHead className="w-[160px]">
                  <button
                    onClick={() => toggleSort("lastAt")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Last active <SortIcon k="lastAt" />
                  </button>
                </TableHead>
                <TableHead className="w-[120px]">
                  <button
                    onClick={() => toggleSort("rooms")}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Rooms <SortIcon k="rooms" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((l) => (
                <TableRow key={l.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-xs">
                          {initials(l.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/leads/${l.userId}`}
                            className="truncate font-medium text-sm hover:underline"
                          >
                            {l.name}
                          </Link>
                          {l.hasAnyContract && (
                            <Badge variant="success" className="shrink-0">
                              customer
                            </Badge>
                          )}
                          {l.hasActiveContract && (
                            <Tooltip>
                              <TooltipTrigger
                                render={<span />}
                                className="h-2 w-2 rounded-full bg-green-500 shrink-0 inline-block"
                                aria-label="Active contract"
                              />
                              <TooltipContent>Active contract</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        {l.nid && (
                          <div className="truncate text-xs text-muted-foreground font-mono">
                            {l.nid}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TenantBadge tenants={tenantOf(l)} size="xs" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[280px]">
                      {l.orgNames.length === 0 && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {l.orgNames.slice(0, 3).map((o) => (
                        <Badge
                          key={o}
                          variant="muted"
                          className="truncate max-w-[160px]"
                        >
                          {o}
                        </Badge>
                      ))}
                      {l.orgNames.length > 3 && (
                        <Badge variant="outline">
                          +{l.orgNames.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={isRecent(l.lastAt) ? "default" : "secondary"}
                    >
                      {l.messageCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {l.lastAt ? (
                      <Tooltip>
                        <TooltipTrigger className="cursor-default">
                          <span
                            className={
                              isRecent(l.lastAt)
                                ? "text-orange-400 dark:text-orange-300 font-medium"
                                : ""
                            }
                          >
                            {relativeTime(l.lastAt)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{fmtDate(l.lastAt)}</TooltipContent>
                      </Tooltip>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {l.rooms.slice(0, 3).map((r) => (
                        <Link
                          key={r.roomId}
                          href={`/rooms/${r.roomId}`}
                          className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-xs hover:bg-accent transition-colors tabular-nums"
                          title={r.roomName ?? r.topic ?? r.roomId}
                        >
                          {r.messageCount}
                        </Link>
                      ))}
                      {l.rooms.length > 3 && (
                        <Badge variant="outline">+{l.rooms.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
