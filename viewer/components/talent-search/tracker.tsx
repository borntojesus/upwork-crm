"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { ChartFrame } from "@/components/app/chart-frame";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { MOCK_DATASET } from "@/lib/talent-search/mock";
import { parseCsv } from "@/lib/talent-search/parse";
import { KEYWORDS } from "@/lib/talent-search/types";
import type {
  Keyword,
  RankingEntry,
  TalentRankingDataset,
} from "@/lib/talent-search/types";
import { FiltersRow } from "./filters";
import type { RegionFilter } from "./filters";
import { Onboarding } from "./onboarding";
import { RankingTable } from "./ranking-table";
import { SourceBadgeBar } from "./source-badge";
import { StepsTimeline } from "./steps-timeline";

interface TrackerProps {
  initialDataset: TalentRankingDataset | null;
  initialStage: "api" | "csv" | "none";
}

function getRegionVal(
  r: RankingEntry["rankings"][number],
  region: RegionFilter,
): number | null {
  if (region === "world" || region === "all") return r.world;
  if (region === "europe") return r.europe;
  if (region === "ua") return r.ua;
  return null;
}

function buildSoWhat(dataset: TalentRankingDataset): string {
  if (!dataset.entries.length) return "No entries yet.";
  const latest = dataset.entries[dataset.entries.length - 1];
  const positions = latest.rankings
    .map((r) => r.world)
    .filter((v): v is number => v !== null);
  const best = positions.length ? Math.min(...positions) : null;
  const top1Count = latest.rankings.filter(
    (r) => r.world === 1 || r.europe === 1 || r.ua === 1,
  ).length;
  const parts = [
    `${dataset.entries.length} snapshots`,
    best != null ? `best #${best} worldwide` : null,
    top1Count > 0
      ? `${top1Count} keyword${top1Count > 1 ? "s" : ""} at #1`
      : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function TalentSearchTracker({
  initialDataset,
  initialStage,
}: TrackerProps) {
  const [dataset, setDataset] = useState<TalentRankingDataset | null>(
    initialDataset,
  );
  const [region, setRegion] = useState<RegionFilter>("world");
  const [selectedKeywords, setSelectedKeywords] = useState<Keyword[]>([
    ...KEYWORDS,
  ]);

  // On mount: try localStorage if no server dataset
  useEffect(() => {
    if (dataset) return;
    try {
      const raw = localStorage.getItem("talent-search-csv");
      if (raw) {
        const parsed = parseCsv(raw);
        parsed.source = "localstorage";
        setDataset(parsed);
      }
    } catch {
      // ignore
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClear() {
    localStorage.removeItem("talent-search-csv");
    setDataset(null);
  }

  function handleRefresh() {
    window.location.reload();
  }

  // Show onboarding if still no data
  if (!dataset) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Market research"
          title="Profile ranking"
          question="How do we rank in Upwork Talent Search over time?"
          soWhat="Connect a data source to get started."
        />
        <Onboarding onDataReady={setDataset} />
      </div>
    );
  }

  const entries = dataset.entries;
  const latest = entries.length ? entries[entries.length - 1] : null;
  const prev = entries.length > 1 ? entries[entries.length - 2] : null;

  // KPIs
  const currentViews = latest?.weekViews ?? null;
  const prevViews = prev?.weekViews ?? null;
  const viewsDelta =
    currentViews != null && prevViews != null && prevViews !== 0
      ? Math.round(((currentViews - prevViews) / prevViews) * 100)
      : null;

  const currentInbound = latest?.weekInbound ?? null;

  const allPositions =
    latest?.rankings
      .map((r) => getRegionVal(r, region))
      .filter((v): v is number => v !== null) ?? [];
  const bestPos = allPositions.length ? Math.min(...allPositions) : null;

  const top1Count = latest
    ? latest.rankings.filter((r) => {
        if (region === "all" || region === "world") return r.world === 1;
        if (region === "europe") return r.europe === 1;
        if (region === "ua") return r.ua === 1;
        return false;
      }).length
    : 0;

  // Line chart: top 3 keywords by best latest position (world)
  const kwScores = KEYWORDS.map((kw) => {
    const r = latest?.rankings.find((r) => r.keyword === kw);
    return { kw, pos: r?.world ?? Infinity };
  });
  kwScores.sort((a, b) => a.pos - b.pos);
  const top3 = kwScores.slice(0, 3).map((x) => x.kw);

  const lineData = entries.map((entry) => {
    const row: Record<string, unknown> = { date: entry.date };
    for (const kw of top3) {
      const r = entry.rankings.find((r) => r.keyword === kw);
      row[kw] =
        getRegionVal(
          r ?? { keyword: kw, world: null, europe: null, ua: null },
          region,
        ) ?? null;
    }
    return row;
  });

  const CHART_COLORS = [
    "var(--color-chart-1)",
    "var(--color-chart-2)",
    "var(--color-chart-3)",
  ];
  const lineSeries = top3.map((kw, i) => ({
    key: kw,
    label: kw,
    color: CHART_COLORS[i],
  }));

  // Bar chart: last snapshot, active keywords, active region
  const barData = selectedKeywords.map((kw) => {
    const r = latest?.rankings.find((r) => r.keyword === kw);
    const pos = r ? getRegionVal(r, region === "all" ? "world" : region) : null;
    return { keyword: kw.replace(" developer", " dev"), position: pos };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Market research"
        title={dataset.profileTitle ?? "Profile ranking"}
        question="How do we rank in Upwork Talent Search over time?"
        soWhat={buildSoWhat(dataset)}
      />

      <SourceBadgeBar
        source={dataset.source}
        fetchedAt={dataset.fetchedAt}
        onRefresh={handleRefresh}
        onClear={dataset.source === "localstorage" ? handleClear : undefined}
      />

      <FiltersRow
        region={region}
        onRegionChange={setRegion}
        selectedKeywords={selectedKeywords}
        onKeywordsChange={setSelectedKeywords}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Week views"
          value={currentViews ?? "—"}
          tone="neutral"
          delta={
            viewsDelta != null
              ? {
                  value: `${Math.abs(viewsDelta)}%`,
                  direction:
                    viewsDelta > 0 ? "up" : viewsDelta < 0 ? "down" : "flat",
                }
              : undefined
          }
        />
        <KpiCard
          label="Week inbound"
          value={currentInbound ?? "—"}
          hint={latest?.date ?? undefined}
          tone="neutral"
        />
        <KpiCard
          label="Best position"
          value={bestPos != null ? `#${bestPos}` : "—"}
          hint={region === "all" ? "worldwide" : region}
          tone={
            bestPos != null && bestPos <= 2
              ? "positive"
              : bestPos != null && bestPos <= 5
                ? "warning"
                : "neutral"
          }
        />
        <KpiCard
          label="#1 keywords"
          value={top1Count}
          hint={`in ${region === "all" ? "world" : region}`}
          tone={top1Count > 0 ? "positive" : "neutral"}
        />
      </div>

      {/* Ranking table */}
      <RankingTable
        entries={entries}
        keywords={selectedKeywords}
        region={region}
      />

      {/* Line chart */}
      {entries.length > 1 && (
        <ChartFrame
          hypothesis={`Top 3 keywords over time (${region === "all" ? "worldwide" : region})`}
          soWhat="Lower = better. Gaps mean no data for that snapshot."
        >
          <LineChart
            data={lineData}
            xKey="date"
            series={lineSeries}
            height={260}
          />
        </ChartFrame>
      )}

      {/* Bar chart */}
      {latest && (
        <ChartFrame
          hypothesis={`Latest snapshot by keyword — ${region === "all" ? "worldwide" : region}`}
          soWhat={`As of ${latest.date}. Lower = better ranking.`}
        >
          <BarChart
            data={barData}
            xKey="keyword"
            yKey="position"
            label="Position"
            color="var(--color-chart-2)"
            height={240}
          />
        </ChartFrame>
      )}

      {/* Steps timeline */}
      <StepsTimeline entries={entries} />
    </div>
  );
}
