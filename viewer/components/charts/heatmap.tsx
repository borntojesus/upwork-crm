/**
 * heatmap.tsx — 7×24 activity heatmap using CSS grid.
 * No recharts; rendered server-side safe (pure divs).
 * Rows = days of week (0=Sun … 6=Sat), Columns = hours 0–23.
 */

import type { HeatmapCell } from "@/lib/analytics/types";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i % 3 === 0 ? String(i).padStart(2, "0") : "",
);

export interface HeatmapProps {
  cells: HeatmapCell[];
  /** CSS color for the highest-intensity cell. Defaults to indigo-500. */
  accentColor?: string;
}

function opacity(count: number, max: number): number {
  if (max === 0 || count === 0) return 0;
  // square-root scale so low-traffic cells are still visible
  return Math.round((Math.sqrt(count) / Math.sqrt(max)) * 100) / 100;
}

export function Heatmap({
  cells,
  accentColor = "var(--color-chart-1)",
}: HeatmapProps) {
  const max = cells.reduce((m, c) => Math.max(m, c.count), 0);

  // Build lookup: dow→hour→count
  const grid: number[][] = Array.from({ length: 7 }, () =>
    new Array(24).fill(0),
  );
  for (const c of cells) {
    if (grid[c.dow]) {
      grid[c.dow][c.hour] = c.count;
    }
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 560 }}>
        {/* Hour header row */}
        <div className="flex">
          {/* spacer for day labels */}
          <div className="w-10 shrink-0" />
          {HOUR_LABELS.map((label, h) => (
            <div
              key={h}
              className="flex-1 text-center text-[10px] text-muted-foreground select-none"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {DOW_LABELS.map((day, dow) => (
          <div key={dow} className="flex items-center gap-0 my-0.5">
            <div className="w-10 shrink-0 text-[10px] text-muted-foreground text-right pr-2 select-none">
              {day}
            </div>
            {Array.from({ length: 24 }, (_, h) => {
              const count = grid[dow]?.[h] ?? 0;
              const alpha = opacity(count, max);
              return (
                <div
                  key={h}
                  className="flex-1 aspect-square rounded-sm mx-px cursor-default border border-border/30"
                  style={{
                    backgroundColor: accentColor,
                    opacity: alpha === 0 ? 0.08 : Math.max(0.15, alpha),
                  }}
                  title={`${day} ${String(h).padStart(2, "0")}:00 UTC — ${count} messages`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
