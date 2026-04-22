import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopFreelancers } from "@/lib/fixtures";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { ChartFrame } from "@/components/app/chart-frame";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KeywordDensityBar } from "@/components/freelancers/keyword-density-bar";
import type { FreelancerSummary } from "@/lib/fixtures";

interface Props {
  params: Promise<{ category: string }>;
}

function jssBadge(jss: number | null) {
  if (jss == null)
    return <span className="text-muted-foreground text-sm">—</span>;
  const cls =
    jss >= 95
      ? "border-[color:var(--color-success)] text-[color:var(--color-success)]"
      : jss >= 85
        ? ""
        : "border-[color:var(--color-warning)] text-[color:var(--color-warning)]";
  return (
    <Badge variant="outline" className={cls}>
      {jss}%
    </Badge>
  );
}

function topRatedBadge(status: string | null) {
  if (!status) return null;
  const upper = status.toUpperCase();
  if (upper.includes("PLUS"))
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-success)] text-[color:var(--color-success)] text-[10px]"
      >
        Top Rated+
      </Badge>
    );
  if (upper.includes("TOP_RATED") || upper.includes("TOP RATED"))
    return (
      <Badge variant="secondary" className="text-[10px]">
        Top Rated
      </Badge>
    );
  return null;
}

function primaryScore(f: FreelancerSummary, keyword: string): number {
  const kd = f.keywordDensity.find(
    (k) => k.keyword.toLowerCase() === keyword.toLowerCase(),
  );
  return kd?.weighted ?? 0;
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const data = getTopFreelancers();

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Market research"
          title={category}
          question="Who are the top performers in this category?"
          soWhat="No data yet — run the pipeline agent first."
        />
        <div className="rounded-xl border border-border/60 bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No data yet. Run the pipeline agent to generate{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              fixtures/agent/top-freelancers.json
            </code>
          </p>
        </div>
      </div>
    );
  }

  const cat = data.categories.find((c) => c.slug === category);
  if (!cat) notFound();

  const top10 = cat.freelancers.slice(0, 10);
  const jssList = top10
    .map((f) => f.jobSuccessScore)
    .filter((v): v is number => v !== null);
  const avgJss =
    jssList.length > 0
      ? jssList.reduce((s, v) => s + v, 0) / jssList.length
      : null;

  const rank1 = top10[0];
  const rank1Score = rank1 ? primaryScore(rank1, cat.primaryKeyword) : 0;

  const chartData = top10.map((f) => ({
    name: f.name ?? f.profileKey.slice(0, 8),
    weighted: Math.round(primaryScore(f, cat.primaryKeyword) * 100) / 100,
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link href="/freelancers" className="hover:text-foreground">
          Freelancers
        </Link>
        <span>/</span>
        <span className="text-foreground">{cat.label}</span>
      </nav>

      <PageHeader
        eyebrow="Market research"
        title={`Top ${cat.label} freelancers`}
        question={`Who leads in ${cat.primaryKeyword} and what makes them stand out?`}
        soWhat={`${top10.length} profiles · avg rate ${cat.avgHourlyRate != null ? `$${cat.avgHourlyRate.toFixed(0)}/hr` : "n/a"} · top score ${cat.topPrimaryScore.toFixed(2)}`}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Top weighted score"
          value={rank1Score.toFixed(2)}
          hint={`${cat.primaryKeyword} · rank #1`}
          tone="positive"
        />
        <KpiCard
          label="Avg hourly rate"
          value={
            cat.avgHourlyRate != null ? `$${cat.avgHourlyRate.toFixed(0)}` : "—"
          }
          hint="per hour"
          tone="neutral"
        />
        <KpiCard
          label="Avg overview words"
          value={Math.round(cat.avgOverviewWords)}
          hint="overview length"
          tone="neutral"
        />
        <KpiCard
          label="Avg JSS"
          value={avgJss != null ? `${avgJss.toFixed(1)}%` : "—"}
          tone={
            avgJss != null
              ? avgJss >= 95
                ? "positive"
                : avgJss >= 85
                  ? "warning"
                  : "danger"
              : "neutral"
          }
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Top {top10.length} profiles
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5 w-10">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>JSS</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead>{cat.primaryKeyword} score</TableHead>
              <TableHead>Stats</TableHead>
              <TableHead>Improvements</TableHead>
              <TableHead className="pr-5"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {top10.map((f) => {
              const score = primaryScore(f, cat.primaryKeyword);
              return (
                <TableRow key={f.profileKey}>
                  <TableCell className="pl-5 font-mono text-xs text-muted-foreground">
                    {f.rank}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {f.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={f.photoUrl}
                          alt=""
                          className="size-7 rounded-full object-cover border border-border/60 shrink-0"
                        />
                      ) : (
                        <div
                          className="size-7 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0"
                          style={{ background: "var(--color-chart-1)" }}
                          aria-hidden
                        >
                          {(f.name ?? f.profileKey).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate max-w-[120px]">
                        {f.name ?? f.profileKey}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                    {f.title
                      ? f.title.slice(0, 50) + (f.title.length > 50 ? "…" : "")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums whitespace-nowrap">
                    {f.hourlyRateDisplay ?? "—"}
                  </TableCell>
                  <TableCell>{jssBadge(f.jobSuccessScore)}</TableCell>
                  <TableCell>{topRatedBadge(f.topRatedStatus)}</TableCell>
                  <TableCell className="text-sm tabular-nums font-mono">
                    {score.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {f.skillsCount}sk · {f.portfolioCount}po ·{" "}
                    {f.employmentCount}ex
                  </TableCell>
                  <TableCell>
                    {f.improvements.length > 0 ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {f.improvements.length}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-5">
                    <Link
                      href={`/freelancers/${cat.slug}/${encodeURIComponent(f.profileKey)}`}
                      className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Chart */}
      <ChartFrame
        hypothesis={`${cat.primaryKeyword} keyword weighted score — top ${top10.length}`}
        soWhat="Higher score = deeper keyword integration across title, overview, skills, employment, portfolio"
      >
        <KeywordDensityBar
          data={chartData.map((d) => ({
            keyword: d.name,
            title: 0,
            overview: 0,
            skills: 0,
            employment: 0,
            portfolio: 0,
            weighted: d.weighted,
          }))}
          height={280}
        />
      </ChartFrame>
    </div>
  );
}
