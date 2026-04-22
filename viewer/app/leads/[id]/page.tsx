import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadById } from "@/lib/fixtures";
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

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function jobStatusBadge(
  status: "contracted" | "offered" | "rejected" | "pending",
) {
  if (status === "contracted")
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-success)] text-[color:var(--color-success)]"
      >
        contracted
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
  if (status === "rejected") return <Badge variant="secondary">rejected</Badge>;
  return <Badge variant="outline">pending</Badge>;
}

export default async function LeadProfilePage({ params }: Props) {
  const { id } = await params;
  const lead = getLeadById(id);

  if (!lead) notFound();

  const {
    name,
    nid,
    orgNames,
    rooms,
    contracts,
    offers,
    jobs,
    messageCount,
    firstAt,
    lastAt,
    hasActiveContract,
  } = lead;

  const activeContracts = contracts.filter(
    (c) => c.status?.toUpperCase() === "ACTIVE",
  );

  const soWhat = [
    `${rooms.length} room${rooms.length !== 1 ? "s" : ""}`,
    `${contracts.length} contract${contracts.length !== 1 ? "s" : ""}`,
    `last contact ${relativeTime(lastAt)}`,
  ].join(" · ");

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link href="/leads" className="hover:text-foreground">
          Leads
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{name}</span>
      </nav>

      <PageHeader
        eyebrow="Lead profile"
        title={name}
        question="What's our history with this person?"
        soWhat={soWhat}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Messages" value={messageCount} tone="neutral" />
        <KpiCard label="Rooms" value={rooms.length} tone="neutral" />
        <KpiCard
          label="Contracts"
          value={contracts.length}
          hint={
            hasActiveContract ? `${activeContracts.length} active` : undefined
          }
          tone={hasActiveContract ? "positive" : "neutral"}
        />
        <KpiCard
          label="Offers"
          value={offers.slice(0, 5).length}
          hint={offers.length > 5 ? `+${offers.length - 5} more` : undefined}
          tone={offers.length > 0 ? "warning" : "neutral"}
        />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {nid && (
          <span className="font-mono bg-muted/40 border border-border/60 rounded px-2 py-0.5">
            {nid}
          </span>
        )}
        {orgNames.map((o) => (
          <Badge key={o} variant="secondary">
            {o}
          </Badge>
        ))}
        <span>
          first contact {fmtDate(firstAt)} · last {fmtDate(lastAt)}
        </span>
      </div>

      {/* Jobs section */}
      <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Jobs ({jobs.length})
          </h2>
        </div>
        {jobs.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No jobs linked to this lead.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {jobs.map((j) => (
              <div key={j.jobId} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/jobs/${j.jobId}`}
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {j.title ?? j.jobId}
                  </Link>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {j.jobId}
                  </span>
                </div>
                {jobStatusBadge(j.status)}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contracts section */}
      <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Contracts ({contracts.length})
          </h2>
        </div>
        {contracts.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No contracts with this lead.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.contractId}>
                  <TableCell className="pl-4 max-w-[240px]">
                    <Link
                      href={`/contracts/${c.contractId}`}
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {c.title ?? c.contractId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {c.status ? (
                      <Badge
                        variant={
                          c.status.toUpperCase() === "ACTIVE"
                            ? "outline"
                            : "secondary"
                        }
                        className={
                          c.status.toUpperCase() === "ACTIVE"
                            ? "border-[color:var(--color-success)] text-[color:var(--color-success)]"
                            : ""
                        }
                      >
                        {c.status}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">
                    {c.clientOrgName ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {fmtDate(c.startDate)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {fmtDate(c.endDate)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {c.rateDisplay ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Offers section */}
      <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Offers ({offers.length})
          </h2>
        </div>
        {offers.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No offers for this lead.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Title</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((o) => (
                <TableRow key={o.offerId}>
                  <TableCell className="pl-4 max-w-[240px]">
                    <span className="text-sm font-medium truncate block">
                      {o.title ?? o.offerId}
                    </span>
                  </TableCell>
                  <TableCell>
                    {o.state ? (
                      <Badge variant="secondary">{o.state}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {o.type ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">
                    {o.clientName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {o.rateDisplay ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Rooms section */}
      <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Rooms ({rooms.length})
          </h2>
        </div>
        {rooms.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No rooms with this lead.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {rooms.map((r) => (
              <div key={r.roomId} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/rooms/${r.roomId}`}
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {r.roomName ?? r.topic ?? r.roomId}
                  </Link>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {r.roomId}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary">{r.messageCount} msgs</Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {fmtDate(r.lastAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
