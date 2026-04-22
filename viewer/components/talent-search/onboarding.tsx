"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MOCK_DATASET } from "@/lib/talent-search/mock";
import type { TalentRankingDataset } from "@/lib/talent-search/types";
import { parseCsv } from "@/lib/talent-search/parse";

interface OnboardingProps {
  onDataReady: (dataset: TalentRankingDataset) => void;
}

export function Onboarding({ onDataReady }: OnboardingProps) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleLoad() {
    if (!raw.trim()) {
      setError("Paste CSV or TSV data first.");
      return;
    }
    try {
      const dataset = parseCsv(raw);
      dataset.source = "localstorage";
      localStorage.setItem("talent-search-csv", raw);
      onDataReady(dataset);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse error");
    }
  }

  function handleMock() {
    onDataReady({ ...MOCK_DATASET, source: "mock" });
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 space-y-5 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold">Connect ranking data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No data source is active. Set{" "}
          <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
            GOOGLE_SHEETS_API_KEY
          </code>{" "}
          in{" "}
          <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
            .env.local
          </code>{" "}
          to pull live data, or paste a CSV export below.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          How to export from Google Sheets
        </p>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>
            Open{" "}
            <span className="font-medium text-foreground">
              Alpina Worksheet → Ранжування профілю у Talent Search
            </span>
          </li>
          <li>File → Download → Comma Separated Values (.csv)</li>
          <li>Open the downloaded file, select all, copy, paste below</li>
        </ol>
        <p className="text-xs text-muted-foreground">
          You can also paste TSV directly from clipboard (auto-detected).
        </p>
      </div>

      <div className="space-y-2">
        <textarea
          className="w-full h-36 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-y"
          placeholder="Paste CSV or TSV here…"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setError(null);
          }}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex gap-3">
        <Button onClick={handleLoad} disabled={!raw.trim()}>
          Load from clipboard
        </Button>
        <Button variant="outline" onClick={handleMock}>
          Load mock data
        </Button>
      </div>
    </div>
  );
}
