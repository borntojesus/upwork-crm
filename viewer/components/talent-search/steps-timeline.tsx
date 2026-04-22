"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RankingEntry } from "@/lib/talent-search/types";

interface StepsTimelineProps {
  entries: RankingEntry[];
}

export function StepsTimeline({ entries }: StepsTimelineProps) {
  const withSteps = entries.filter((e) => e.steps !== null);

  const [openDates, setOpenDates] = useState<Set<string>>(
    new Set(withSteps.slice(0, 1).map((e) => e.date)),
  );

  if (withSteps.length === 0) return null;

  function toggle(date: string) {
    setOpenDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border/60">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Profile changes &amp; steps ({withSteps.length})
        </h2>
      </div>
      <div className="divide-y divide-border/60">
        {withSteps.map((entry) => {
          const isOpen = openDates.has(entry.date);
          return (
            <div key={entry.date}>
              <button
                onClick={() => toggle(entry.date)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-medium tabular-nums">
                  {entry.date}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed border-t border-border/40 pt-3">
                  {entry.steps}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
