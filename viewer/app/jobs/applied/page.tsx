import Link from "next/link";
import { getJobsEnriched } from "@/lib/fixtures";
import { parseTenants, matchesFilter, tenantOf } from "@/lib/tenants";
import { TenantBadge } from "@/components/tenant-badge";
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

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function statusBadge(status: "active" | "closed" | "offered" | "unknown") {
  if (status === "active")
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-success)] text-[color:var(--color-success)]"
      >
        active
      </Badge>
    );
  if (status === "offered")
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-warning)] text-[color:var(--color-warning)]"
      >
        offered
      </Badge>
    );
  if (status === "closed") return <Badge variant="secondary">closed</Badge>;
  return <Badge variant="outline">unknown</Badge>;
}

export default async function JobsAppliedPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const sp = await searchParams;
  const activeTenants = parseTenants(sp.t);
  const { jobs: allJobs, generatedAt } = getJobsEnriched();
  const jobs = allJobs.filter((j) => matchesFilter(j, activeTenants));
  const count = jobs.length;

  const active = jobs.filter((j) => j.status === "active").length;
  const closed = jobs.filter((j) => j.status === "closed").length;
  const offered = jobs.filter((j) => j.status === "offered").length;

  const soWhat =
    count === 0
      ? "No enriched jobs data yet — run the pipeline agent."
      : `${active} active · ${offered} offered · ${closed} closed across ${count} jobs`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Jobs"
        title="Jobs we've worked on"
        question="What's the portfolio of engagements?"
        soWhat={soWhat}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total jobs" value={count} tone="neutral" />
        <KpiCard
          label="Active"
          value={active}
          tone={active > 0 ? "positive" : "neutral"}
        />
        <KpiCard label="Closed" value={closed} tone="neutral" />
        <KpiCard
          label="Offered"
          value={offered}
          tone={offered > 0 ? "warning" : "neutral"}
        />
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card py-16 text-center text-sm text-muted-foreground">
          No jobs data yet. Run the pipeline agent to generate{" "}
          <code className="font-mono text-xs">
            fixtures/agent/jobs-enriched.json
          </code>
          .
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Title</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="text-center">Offers</TableHead>
                <TableHead className="text-center">Contracts</TableHead>
                <TableHead className="text-center">Rooms</TableHead>
                <TableHead>First activity</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.jobId}>
                  <TableCell className="pl-4 max-w-[260px]">
                    <Link
                      href={`/jobs/${job.jobId}`}
                      className="font-medium hover:underline text-sm line-clamp-2 block"
                    >
                      {job.title ?? job.jobId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <TenantBadge tenants={tenantOf(job)} size="xs" />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                    {job.clientName ?? "—"}
                  </TableCell>
                  <TableCell>{statusBadge(job.status)}</TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {job.budget ?? "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {job.offerIds.length > 0 ? (
                      <Badge variant="secondary">{job.offerIds.length}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {job.contractIds.length > 0 ? (
                      <Badge variant="secondary">
                        {job.contractIds.length}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {job.roomIds.length > 0 ? (
                      <Badge variant="secondary">{job.roomIds.length}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {fmtDate(job.firstAt)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {fmtDate(job.lastAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {generatedAt && (
            <div className="border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground font-mono">
              generated {fmtDate(generatedAt)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
