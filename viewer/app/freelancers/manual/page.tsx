import Link from "next/link";
import { getFreelancers } from "@/lib/fixtures";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLinkIcon } from "lucide-react";

function tierBadge(tier: string | null) {
  if (tier === "top-rated-plus")
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-success)] text-[color:var(--color-success)] whitespace-nowrap"
      >
        Top Rated+
      </Badge>
    );
  if (tier === "top-rated")
    return (
      <Badge variant="secondary" className="whitespace-nowrap">
        Top Rated
      </Badge>
    );
  if (tier === "rising-talent")
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-warning)] text-[color:var(--color-warning)] whitespace-nowrap"
      >
        Rising Talent
      </Badge>
    );
  return (
    <Badge variant="outline" className="whitespace-nowrap">
      Other
    </Badge>
  );
}

function fmtRate(rate: { rawValue: string; currency: string } | null): string {
  if (!rate) return "—";
  return `$${rate.rawValue}/hr`;
}

function median(vals: number[]): number | null {
  if (!vals.length) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export default function ManualFreelancersPage() {
  const { freelancers, count } = getFreelancers();

  const topRatedPlus = freelancers.filter((f) => f.tier === "top-rated-plus");
  const rates = freelancers
    .map((f) => (f.hourlyRate ? parseFloat(f.hourlyRate.rawValue) : null))
    .filter((v): v is number => v !== null);
  const medianRate = median(rates);
  const jssList = freelancers
    .map((f) => f.jobSuccessScore)
    .filter((v): v is number => v !== null);
  const medianJss = median(jssList);

  const soWhat = [
    `${count} profiles captured`,
    medianRate != null ? `median rate $${medianRate}/hr` : null,
    `${topRatedPlus.length} top-rated-plus`,
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
        <Link href="/freelancers" className="hover:text-foreground">
          Freelancers
        </Link>
        <span>/</span>
        <span className="text-foreground">Manual observations</span>
      </nav>

      <PageHeader
        eyebrow="Market research"
        title="Manual observations"
        question="Who's competing for the same jobs we chase?"
        soWhat={soWhat}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total profiles" value={count} tone="neutral" />
        <KpiCard
          label="Top Rated+"
          value={topRatedPlus.length}
          hint="of captured profiles"
          tone={topRatedPlus.length > 0 ? "positive" : "neutral"}
        />
        <KpiCard
          label="Median rate"
          value={medianRate != null ? `$${medianRate}/hr` : "—"}
          tone="neutral"
        />
        <KpiCard
          label="Median JSS"
          value={medianJss != null ? `${medianJss}%` : "—"}
          tone={
            medianJss != null
              ? medianJss >= 95
                ? "positive"
                : medianJss >= 85
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
            Profiles ({count})
          </h2>
        </div>
        {freelancers.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No profiles yet. Add them to{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              fixtures/agent/freelancers.json
            </code>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>JSS</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="pr-5"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {freelancers.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="pl-5">
                    <Link
                      href={`/freelancers/manual/${encodeURIComponent(f.id)}`}
                      className="font-medium hover:underline whitespace-nowrap"
                    >
                      {f.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {f.title ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {[f.location.city, f.location.country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums whitespace-nowrap">
                    {fmtRate(f.hourlyRate)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {f.jobSuccessScore != null ? `${f.jobSuccessScore}%` : "—"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                    {f.totalEarnings
                      ? `$${Number(f.totalEarnings.rawValue).toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {f.skills.slice(0, 3).map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {s}
                        </Badge>
                      ))}
                      {f.skills.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{f.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{tierBadge(f.tier)}</TableCell>
                  <TableCell className="pr-5">
                    {f.profileUrl && (
                      <a
                        href={f.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLinkIcon className="size-3" />
                        Upwork
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit hint */}
      <p className="text-xs text-muted-foreground border border-border/60 rounded-lg px-4 py-3 bg-muted/30">
        Add more profiles by editing{" "}
        <code className="font-mono bg-muted px-1 py-0.5 rounded">
          fixtures/agent/freelancers.json
        </code>{" "}
        and reloading the page.
      </p>
    </div>
  );
}
