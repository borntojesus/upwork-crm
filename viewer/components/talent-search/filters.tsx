"use client";

import { Button } from "@/components/ui/button";
import { KEYWORDS } from "@/lib/talent-search/types";
import type { Keyword, Region } from "@/lib/talent-search/types";

export type RegionFilter = "all" | Region;

interface FiltersProps {
  region: RegionFilter;
  onRegionChange: (r: RegionFilter) => void;
  selectedKeywords: Keyword[];
  onKeywordsChange: (kw: Keyword[]) => void;
}

const REGIONS: { value: RegionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "world", label: "World" },
  { value: "europe", label: "Europe" },
  { value: "ua", label: "UA" },
];

export function FiltersRow({
  region,
  onRegionChange,
  selectedKeywords,
  onKeywordsChange,
}: FiltersProps) {
  function toggleKeyword(kw: Keyword) {
    if (selectedKeywords.includes(kw)) {
      const next = selectedKeywords.filter((k) => k !== kw);
      onKeywordsChange(next.length === 0 ? [...KEYWORDS] : next);
    } else {
      onKeywordsChange([...selectedKeywords, kw]);
    }
  }

  const allSelected = selectedKeywords.length === KEYWORDS.length;

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card px-4 py-3">
      {/* Region toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-16 shrink-0">
          Region
        </span>
        <div className="flex gap-1.5">
          {REGIONS.map((r) => (
            <Button
              key={r.value}
              size="xs"
              variant={region === r.value ? "default" : "outline"}
              onClick={() => onRegionChange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Keyword chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-16 shrink-0">
          Keywords
        </span>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="xs"
            variant={allSelected ? "default" : "outline"}
            onClick={() => onKeywordsChange([...KEYWORDS])}
          >
            All
          </Button>
          {KEYWORDS.map((kw) => (
            <Button
              key={kw}
              size="xs"
              variant={
                selectedKeywords.includes(kw) && !allSelected
                  ? "secondary"
                  : "outline"
              }
              onClick={() => toggleKeyword(kw)}
            >
              {kw}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
