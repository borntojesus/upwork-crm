import Link from "next/link";
import { notFound } from "next/navigation";
import { getTalentSearchEntryById } from "@/lib/fixtures";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function competitionBadge(level: "low" | "medium" | "high" | null) {
  if (level === "low")
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-success)] text-[color:var(--color-success)]"
      >
        Low
      </Badge>
    );
  if (level === "medium") return <Badge variant="secondary">Medium</Badge>;
  if (level === "high")
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-warning)] text-[color:var(--color-warning)]"
      >
        High
      </Badge>
    );
  return <span className="text-xs text-muted-foreground">—</span>;
}

function pct(v: number | null): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

export default async function TalentSearchObservationEntryPage({
  params,
}: Props) {
  const { id } = await params;
  const entry = getTalentSearchEntryById(id);

  if (!entry) notFound();

  const {
    query,
    capturedAt,
    filters,
    totalResults,
    sampleSize,
    observations,
    notes,
  } = entry;

  const soWhat = [
    `${totalResults.toLocaleString()} results`,
    `${sampleSize} inspected`,
    observations?.competition
      ? `competition: ${observations.competition}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link href="/talent-search-stats" className="hover:text-foreground">
          Talent search
        </Link>
        <span>/</span>
        <Link
          href="/talent-search-stats/observations"
          className="hover:text-foreground"
        >
          Observations
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[240px]">{query}</span>
      </nav>

      <PageHeader
        eyebrow="Talent search · market research"
        title={`"${query}"`}
        question="What does this search segment look like on Upwork?"
        soWhat={soWhat}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard
          label="Total results"
          value={totalResults.toLocaleString()}
          hint="Upwork reported"
          tone="neutral"
        />
        <KpiCard label="Sample inspected" value={sampleSize} tone="neutral" />
        <KpiCard
          label="Median rate"
          value={
            observations?.medianRate != null
              ? `$${observations.medianRate}/hr`
              : "—"
          }
          tone="neutral"
        />
        <KpiCard
          label="Avg JSS"
          value={observations?.avgJss != null ? `${observations.avgJss}%` : "—"}
          tone={
            observations?.avgJss != null
              ? observations.avgJss >= 95
                ? "positive"
                : observations.avgJss >= 85
                  ? "warning"
                  : "danger"
              : "neutral"
          }
        />
        <KpiCard
          label="Competition"
          value={observations?.competition ?? "—"}
          tone={
            observations?.competition === "low"
              ? "positive"
              : observations?.competition === "high"
                ? "danger"
                : "warning"
          }
        />
      </div>

      {/* Details card */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Search details
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-0 divide-y divide-border/60 md:grid-cols-2 md:divide-y-0 md:divide-x">
          {/* Filters */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Filters applied
            </p>
            <dl className="space-y-2 text-sm">
              {[
                ["Location", filters?.location],
                [
                  "Rate range",
                  filters?.hourlyRateMin != null ||
                  filters?.hourlyRateMax != null
                    ? `$${filters?.hourlyRateMin ?? "—"}–$${filters?.hourlyRateMax ?? "—"}/hr`
                    : null,
                ],
                ["Tier", filters?.tier],
                ["English level", filters?.englishLevel],
                ["Hours/week", filters?.hoursPerWeek],
              ].map(([label, val]) => (
                <div key={String(label)} className="flex gap-3">
                  <dt className="w-28 shrink-0 text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="font-medium">{val ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Observations */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Observations
            </p>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-3">
                <dt className="w-36 shrink-0 text-muted-foreground">
                  Median rate
                </dt>
                <dd className="font-medium tabular-nums">
                  {observations?.medianRate != null
                    ? `$${observations.medianRate}/hr`
                    : "—"}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-36 shrink-0 text-muted-foreground">
                  Top-rated share
                </dt>
                <dd className="font-medium tabular-nums">
                  {pct(observations?.topRatedShare ?? null)}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-36 shrink-0 text-muted-foreground">Avg JSS</dt>
                <dd className="font-medium tabular-nums">
                  {observations?.avgJss != null
                    ? `${observations.avgJss}%`
                    : "—"}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-36 shrink-0 text-muted-foreground">
                  Avg total earnings
                </dt>
                <dd className="font-medium tabular-nums">
                  {observations?.avgTotalEarnings != null
                    ? `$${observations.avgTotalEarnings.toLocaleString()}`
                    : "—"}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-36 shrink-0 text-muted-foreground">
                  Competition
                </dt>
                <dd>{competitionBadge(observations?.competition ?? null)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border/60 text-xs text-muted-foreground">
          Captured on {fmtDate(capturedAt)} · ID:{" "}
          <span className="font-mono">{entry.id}</span>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </h2>
          </div>
          <div className="px-5 py-4 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {notes}
          </div>
        </section>
      )}

      {/* Edit hint */}
      <p className="text-xs text-muted-foreground border border-border/60 rounded-lg px-4 py-3 bg-muted/30">
        Edit this entry in{" "}
        <code className="font-mono bg-muted px-1 py-0.5 rounded">
          fixtures/agent/talent-search-stats.json
        </code>{" "}
        and reload to update.
      </p>
    </div>
  );
}
