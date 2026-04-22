"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SOURCE_LABELS: Record<string, string> = {
  api: "Google Sheets API",
  csv: "Local CSV",
  localstorage: "Pasted CSV",
  mock: "Mock data",
};

const SOURCE_VARIANTS: Record<
  string,
  "success" | "secondary" | "outline" | "warning"
> = {
  api: "success",
  csv: "secondary",
  localstorage: "outline",
  mock: "warning",
};

interface SourceBadgeBarProps {
  source: string;
  fetchedAt: string;
  onRefresh?: () => void;
  onClear?: () => void;
}

export function SourceBadgeBar({
  source,
  fetchedAt,
  onRefresh,
  onClear,
}: SourceBadgeBarProps) {
  const label = SOURCE_LABELS[source] ?? source;
  const variant = SOURCE_VARIANTS[source] ?? "outline";

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-2.5">
      <span className="text-xs text-muted-foreground">Data source:</span>
      <Badge variant={variant}>{label}</Badge>
      <span className="text-xs text-muted-foreground">
        fetched {fmtTime(fetchedAt)}
      </span>
      <div className="ml-auto flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRefresh}
            title="Refresh"
          >
            <RefreshCw className="size-3" />
          </Button>
        )}
        {onClear && source === "localstorage" && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClear}
            title="Clear pasted data"
          >
            <Trash2 className="size-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
