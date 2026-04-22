import Link from "next/link";
import { notFound } from "next/navigation";
import { getJobById, getJobEnriched } from "@/lib/fixtures";
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
import { MapPinIcon, ShieldCheckIcon } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtBudget(
  contractType: "HOURLY" | "FIXED" | null,
  hourly:
    | { hourlyBudget: { min: number | null; max: number | null } | null }
    | null
    | undefined,
  fixed: { amount: { displayValue: string } | null } | null | undefined,
): string {
  if (contractType === "HOURLY") {
    const min = hourly?.hourlyBudget?.min;
    const max = hourly?.hourlyBudget?.max;
    if (min && max) return `$${min}–$${max}/hr`;
    if (min) return `$${min}+/hr`;
    return "Hourly";
  }
  if (contractType === "FIXED") {
    return fixed?.amount?.displayValue ?? "Fixed";
  }
  return "—";
}

function enrichedStatusBadge(
  status: "active" | "closed" | "offered" | "unknown",
) {
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

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const job = getJobById(id);
  const enriched = getJobEnriched(id);

  // If neither raw nor enriched data exists, 404
  if (!job && !enriched) notFound();

  const title = job?.content?.title ?? enriched?.title ?? id;
  const budget = job?.contractTerms
    ? fmtBudget(
        job.contractTerms.contractType,
        job.contractTerms.hourlyContractTerms,
        job.contractTerms.fixedPriceContractTerms,
      )
    : (enriched?.budget ?? "—");

  const enrichedStatus = enriched?.status ?? "unknown";
  const applications = job?.activityStat?.applicationsBidsTotalCount;
  const totalHires = job?.clientCompanyPublic?.totalHires;
  const client = job?.clientCompanyPublic;
  const location = client?.location;

  const soWhat = [
    enrichedStatus,
    budget !== "—" ? budget : null,
    enriched
      ? `${enriched.offerIds.length} offers · ${enriched.contractIds.length} contracts`
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
        <Link href="/jobs/applied" className="hover:text-foreground">
          Jobs
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{title}</span>
      </nav>

      <PageHeader
        eyebrow="Job"
        title={title}
        question="Who's involved and what's the status?"
        soWhat={soWhat || "No enriched data yet."}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Status"
          value={enrichedStatus}
          tone={
            enrichedStatus === "active"
              ? "positive"
              : enrichedStatus === "offered"
                ? "warning"
                : "neutral"
          }
        />
        <KpiCard label="Budget" value={budget} tone="neutral" />
        {applications != null && (
          <KpiCard label="Applicants" value={applications} tone="neutral" />
        )}
        {totalHires != null && (
          <KpiCard label="Client hires" value={totalHires} tone="neutral" />
        )}
      </div>

      {/* Description */}
      {job?.content?.description && (
        <section className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </h2>
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none">
              Show / hide
            </summary>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
              {job.content.description}
            </p>
          </details>
        </section>
      )}

      {/* Client company */}
      {client && (
        <section className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Client
          </h2>
          <div className="flex flex-wrap items-start gap-4">
            <div>
              <div className="text-base font-semibold">
                {client.companyName ?? "Unknown company"}
              </div>
              {location && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <MapPinIcon className="h-3 w-3 shrink-0" />
                  {[location.city, location.state, location.country]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}
              {client.verificationStatus && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <ShieldCheckIcon className="h-3 w-3 shrink-0" />
                  {client.verificationStatus}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {client.totalHires != null && (
                <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-center">
                  <div className="text-lg font-semibold tabular-nums">
                    {client.totalHires}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    hires
                  </div>
                </div>
              )}
              {client.totalPostedJobs != null && (
                <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-center">
                  <div className="text-lg font-semibold tabular-nums">
                    {client.totalPostedJobs}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    jobs posted
                  </div>
                </div>
              )}
              {client.totalSpent && (
                <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-center">
                  <div className="text-lg font-semibold tabular-nums">
                    {client.totalSpent.displayValue}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    total spent
                  </div>
                </div>
              )}
              {client.totalFeedback != null && (
                <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-center">
                  <div className="text-lg font-semibold tabular-nums">
                    {client.totalFeedback.toFixed(1)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    feedback
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Linked offers */}
      {enriched && enriched.offerIds.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Linked offers ({enriched.offerIds.length})
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Offer ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enriched.offerIds.map((oid) => (
                <TableRow key={oid}>
                  <TableCell className="pl-4 font-mono text-xs">
                    {oid}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {/* Linked contracts */}
      {enriched && enriched.contractIds.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Linked contracts ({enriched.contractIds.length})
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Contract ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enriched.contractIds.map((cid) => (
                <TableRow key={cid}>
                  <TableCell className="pl-4">
                    <Link
                      href={`/contracts/${cid}`}
                      className="font-mono text-xs hover:underline"
                    >
                      {cid}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {/* Linked rooms */}
      {enriched && enriched.roomIds.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Linked rooms ({enriched.roomIds.length})
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {enriched.roomIds.map((rid) => (
              <Link
                key={rid}
                href={`/rooms/${rid}`}
                className="inline-flex items-center rounded-lg border border-border/60 px-2.5 py-1 text-xs font-mono hover:bg-accent transition-colors"
              >
                {rid}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Lead chips */}
      {enriched && enriched.leadIds.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Linked leads ({enriched.leadIds.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {enriched.leadIds.map((lid) => (
              <Link
                key={lid}
                href={`/leads/${lid}`}
                className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-xs hover:bg-accent transition-colors"
              >
                {lid}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state when no enriched data */}
      {!enriched && (
        <div className="rounded-xl border border-border/60 bg-card py-12 text-center text-sm text-muted-foreground">
          No enriched data for this job. Run the pipeline agent to generate{" "}
          <code className="font-mono text-xs">
            fixtures/agent/jobs-enriched.json
          </code>
          .
        </div>
      )}
    </div>
  );
}
