"use client";

import { cn } from "@/lib/utils";
import type { Keyword, RankingEntry, Region } from "@/lib/talent-search/types";
import type { RegionFilter } from "./filters";

interface RankingTableProps {
  entries: RankingEntry[];
  keywords: Keyword[];
  region: RegionFilter;
}

function cellBg(pos: number | null): string {
  if (pos === null) return "bg-muted/40";
  if (pos <= 2) return "bg-[color:var(--color-success)]/15";
  if (pos <= 5) return "bg-[color:var(--color-warning)]/15";
  return "bg-[color:var(--color-destructive)]/15";
}

function cellText(pos: number | null): string {
  if (pos === null) return "—";
  return String(pos);
}

function RegionStack({
  world,
  europe,
  ua,
}: {
  world: number | null;
  europe: number | null;
  ua: number | null;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 leading-none">
      <span
        className={cn(
          "text-[10px] tabular-nums px-1 rounded-sm w-full text-center",
          cellBg(world),
        )}
      >
        {cellText(world)}
      </span>
      <span
        className={cn(
          "text-[10px] tabular-nums px-1 rounded-sm w-full text-center",
          cellBg(europe),
        )}
      >
        {cellText(europe)}
      </span>
      <span
        className={cn(
          "text-[10px] tabular-nums px-1 rounded-sm w-full text-center",
          cellBg(ua),
        )}
      >
        {cellText(ua)}
      </span>
    </div>
  );
}

function getPos(
  r: RankingEntry["rankings"][number],
  region: RegionFilter,
): number | null {
  if (region === "world") return r.world;
  if (region === "europe") return r.europe;
  if (region === "ua") return r.ua;
  return null; // "all" — handled via RegionStack
}

export function RankingTable({ entries, keywords, region }: RankingTableProps) {
  // Latest first
  const sorted = [...entries].reverse();

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ranking by date
        </h2>
        {region === "all" && (
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm bg-[color:var(--color-success)]/40" />
              1–2
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm bg-[color:var(--color-warning)]/40" />
              3–5
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm bg-[color:var(--color-destructive)]/40" />
              6+
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              W / EU / UA per cell
            </span>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20">
              <th className="sticky left-0 bg-card/95 backdrop-blur px-4 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                Date
              </th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap text-right">
                Views
              </th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap text-right">
                Inbound
              </th>
              {keywords.map((kw) => (
                <th
                  key={kw}
                  className="px-2 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap text-center max-w-[72px]"
                  title={kw}
                >
                  <span className="block truncate max-w-[72px]">{kw}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {sorted.map((entry, i) => (
              <tr
                key={entry.date}
                className={cn(
                  "hover:bg-muted/20 transition-colors",
                  i === 0 && "font-medium",
                )}
              >
                <td className="sticky left-0 bg-card/95 backdrop-blur px-4 py-2 text-xs tabular-nums whitespace-nowrap">
                  {entry.date}
                </td>
                <td className="px-3 py-2 text-xs tabular-nums text-right text-muted-foreground">
                  {entry.weekViews ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs tabular-nums text-right text-muted-foreground">
                  {entry.weekInbound ?? "—"}
                </td>
                {keywords.map((kw) => {
                  const r = entry.rankings.find((r) => r.keyword === kw);
                  if (!r)
                    return (
                      <td
                        key={kw}
                        className="px-2 py-2 text-center text-muted-foreground/40 text-xs"
                      >
                        —
                      </td>
                    );

                  if (region === "all") {
                    return (
                      <td key={kw} className="px-2 py-1.5 text-center">
                        <RegionStack
                          world={r.world}
                          europe={r.europe}
                          ua={r.ua}
                        />
                      </td>
                    );
                  }

                  const pos = getPos(r, region);
                  return (
                    <td
                      key={kw}
                      className={cn(
                        "px-2 py-2 text-center text-xs tabular-nums",
                        cellBg(pos),
                      )}
                    >
                      {cellText(pos)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
