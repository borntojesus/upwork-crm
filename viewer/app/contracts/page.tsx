import Link from "next/link";
import { getContracts } from "@/lib/fixtures";
import { parseTenants, matchesFilter } from "@/lib/tenants";
import { TenantBadge } from "@/components/tenant-badge";
import { tenantOf } from "@/lib/tenants";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Stat } from "@/components/charts/stat";
import { BriefcaseIcon } from "lucide-react";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtMoney(rawValue: string, currency: string): string {
  const v = parseFloat(rawValue);
  return v.toLocaleString("en-US", { style: "currency", currency });
}

function statusVariant(
  status: string | null,
): "success" | "destructive" | "secondary" | "outline" {
  if (status === "ACTIVE") return "success";
  if (status === "CLOSED") return "secondary";
  if (status === "PAUSED") return "outline";
  return "secondary";
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const sp = await searchParams;
  const activeTenants = parseTenants(sp.t);
  const { contracts, count: totalCount, fetchedAt } = getContracts();
  const contracts_filtered = contracts.filter((c) =>
    matchesFilter(c, activeTenants),
  );
  const count = contracts_filtered.length;

  const active = contracts_filtered.filter((c) => c.status === "ACTIVE").length;
  const closed = contracts_filtered.filter((c) => c.status === "CLOSED").length;
  const paused = contracts_filtered.filter((c) => c.status === "PAUSED").length;

  const uniqueClients = new Set(
    contracts_filtered
      .map((c) => c.clientOrganization?.id)
      .filter((id): id is string => !!id),
  ).size;

  const sorted = [...contracts_filtered].sort((a, b) =>
    (b.startDate ?? "").localeCompare(a.startDate ?? ""),
  );

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Contracts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {count} of {totalCount} contracts · fetched {fmtDate(fetchedAt)}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Total"
          value={count}
          sub="all contracts"
          accentColor="var(--color-chart-1)"
        />
        <Stat
          label="Active"
          value={active}
          sub={`${paused} paused`}
          accentColor="var(--color-chart-2)"
        />
        <Stat
          label="Closed"
          value={closed}
          sub="completed"
          accentColor="var(--color-chart-3)"
        />
        <Stat
          label="Clients"
          value={uniqueClients}
          sub="unique organizations"
          accentColor="var(--color-chart-4)"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
              All contracts
            </div>
          </CardTitle>
          <CardDescription>
            Sorted by start date descending. Click title for full detail.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Rate / Budget</TableHead>
                <TableHead className="text-right">Terms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c) => {
                const hourlyRate = c.terms.hourlyTerms[0]?.hourlyRate;
                const fixedAmount = c.terms.fixedPriceTerms[0]?.fixedAmount;
                const termCount =
                  c.terms.hourlyTerms.length + c.terms.fixedPriceTerms.length;

                return (
                  <TableRow key={c.id}>
                    <TableCell className="pl-4 max-w-[280px]">
                      <Link
                        href={`/contracts/${c.id}`}
                        className="block font-medium hover:underline truncate"
                      >
                        {c.title}
                      </Link>
                      <div className="text-xs text-muted-foreground font-mono">
                        #{c.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.status)}>
                        {c.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TenantBadge tenants={tenantOf(c)} size="xs" />
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate text-sm">
                        {c.clientOrganization?.name ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.deliveryModel === "CATALOG_PROJECT"
                        ? "Catalog"
                        : c.deliveryModel === "TALENT_MARKETPLACE"
                          ? "Marketplace"
                          : "—"}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {fmtDate(c.startDate)}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {fmtDate(c.endDate)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {hourlyRate
                        ? `${fmtMoney(hourlyRate.rawValue, hourlyRate.currency)}/hr`
                        : fixedAmount
                          ? fmtMoney(fixedAmount.rawValue, fixedAmount.currency)
                          : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {termCount > 0 ? (
                        <Badge variant="secondary">{termCount}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
