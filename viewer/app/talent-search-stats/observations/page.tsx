// market research — talent search observations (manual fixture data)
import Link from "next/link";
import { getTalentSearchStats } from "@/lib/fixtures";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { BarChart } from "@/components/charts/bar-chart";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function competitionBadge(level: "low" | "medium" | "high" | null) {
  if (level === "low")
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-success)] text-[color:var(--color-success)]"
      >
        low
      </Badge>
    );
  if (level === "medium") return <Badge variant="secondary">medium</Badge>;
  if (level === "high")
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-warning)] text-[color:var(--color-warning)]"
      >
        high
      </Badge>
    );
  return <span className="text-xs text-muted-foreground">—</span>;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function slugify(query: string): string {
  return query.length > 24 ? query.slice(0, 22) + "…" : query;
}

function median(vals: number[]): number | null {
  if (!vals.length) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export default function TalentSearchObservationsPage() {
  const { entries, count } = getTalentSearchStats();

  const mostRecent =
    entries.length > 0
      ? entries.reduce((a, b) =>
          new Date(a.capturedAt) > new Date(b.capturedAt) ? a : b,
        )
      : null;

  const rates = entries
    .map((e) => e.observations?.medianRate ?? null)
    .filter((v): v is number => v !== null);
  const medianRate = median(rates);

  const competitionScores: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
  };
  const compValues = entries
    .map((e) =>
      e.observations?.competition
        ? competitionScores[e.observations.competition]
        : null,
    )
    .filter((v): v is number => v !== null);
  const medianCompScore = median(compValues);
  const medianCompLabel =
    medianCompScore != null
      ? medianCompScore < 1.5
        ? "low"
        : medianCompScore < 2.5
          ? "medium"
          : "high"
      : null;

  const lastDays = mostRecent ? daysAgo(mostRecent.capturedAt) : null;

  const soWhat = [
    `${count} searches recorded`,
    lastDays != null ? `last ${lastDays}d ago` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const chartData = entries
    .filter((e) => e.observations?.medianRate != null)
    .map((e) => ({
      query: slugify(e.query),
      rate: e.observations!.medianRate!,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Market research"
        title="Talent search observations"
        question="What does the supply side of the market look like?"
        soWhat={soWhat}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Searches recorded" value={count} tone="neutral" />
        <KpiCard
          label="Most recent query"
          value={mostRecent ? slugify(mostRecent.query) : "—"}
          hint={mostRecent ? fmtDate(mostRecent.capturedAt) : undefined}
          tone="neutral"
        />
        <KpiCard
          label="Median competition"
          value={medianCompLabel ?? "—"}
          tone={
            medianCompLabel === "low"
              ? "positive"
              : medianCompLabel === "high"
                ? "danger"
                : "warning"
          }
        />
        <KpiCard
          label="Median rate"
          value={medianRate != null ? `$${medianRate}/hr` : "—"}
          tone="neutral"
        />
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Median rate by query ($/hr)
            </h2>
          </div>
          <div className="px-4 py-4">
            <BarChart
              data={chartData}
              xKey="query"
              yKey="rate"
              label="Median rate ($/hr)"
              color="var(--color-chart-2)"
              height={260}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recorded searches ({count})
          </h2>
        </div>
        {entries.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No searches yet. Add records to{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              fixtures/agent/talent-search-stats.json
            </code>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Date</TableHead>
                <TableHead>Query</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>Sample</TableHead>
                <TableHead>Median rate</TableHead>
                <TableHead>Competition</TableHead>
                <TableHead className="pr-5">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="pl-5 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                    {fmtDate(entry.capturedAt)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/talent-search-stats/observations/${entry.id}`}
                      className="text-sm font-medium hover:underline max-w-[220px] truncate block"
                    >
                      {entry.query}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {entry.totalResults.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {entry.sampleSize}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {entry.observations?.medianRate != null
                      ? `$${entry.observations.medianRate}/hr`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {competitionBadge(entry.observations?.competition ?? null)}
                  </TableCell>
                  <TableCell className="pr-5 text-xs text-muted-foreground max-w-[200px] truncate">
                    {entry.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit hint */}
      <p className="text-xs text-muted-foreground border border-border/60 rounded-lg px-4 py-3 bg-muted/30">
        Add records by editing{" "}
        <code className="font-mono bg-muted px-1 py-0.5 rounded">
          fixtures/agent/talent-search-stats.json
        </code>
        . This page is read-only.
      </p>
    </div>
  );
}
