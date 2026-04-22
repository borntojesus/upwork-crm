import { getOffers } from "@/lib/fixtures";
import { parseTenants, matchesFilter, tenantOf } from "@/lib/tenants";
import { TenantBadge } from "@/components/tenant-badge";
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
import { BarChart } from "@/components/charts/bar-chart";
import { HandshakeIcon } from "lucide-react";

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

function stateVariant(
  state: string,
): "success" | "destructive" | "warning" | "secondary" | "outline" {
  switch (state) {
    case "ACCEPTED":
      return "success";
    case "DECLINED":
      return "destructive";
    case "WITHDRAWN":
      return "warning";
    case "EXPIRED":
      return "secondary";
    default:
      return "outline";
  }
}

function fmtType(type: string): string {
  if (type === "MARKET_PLACE_HOURLY") return "Hourly";
  if (type === "MARKET_PLACE_FIXED") return "Fixed";
  return type.replace(/_/g, " ").toLowerCase();
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const sp = await searchParams;
  const activeTenants = parseTenants(sp.t);
  const { offers: allOffers, count: totalCount, fetchedAt } = getOffers();
  const offers = allOffers.filter((o) => matchesFilter(o, activeTenants));
  const count = offers.length;

  const byState = Object.entries(
    offers.reduce<Record<string, number>>((acc, o) => {
      acc[o.state] = (acc[o.state] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([state, value]) => ({ state, value }))
    .sort((a, b) => b.value - a.value);

  const accepted = offers.filter((o) => o.state === "ACCEPTED").length;
  const declined = offers.filter((o) => o.state === "DECLINED").length;
  const withdrawn = offers.filter((o) => o.state === "WITHDRAWN").length;
  const expired = offers.filter((o) => o.state === "EXPIRED").length;

  const acceptRate = count > 0 ? Math.round((accepted / count) * 100) : 0;

  const sorted = [...offers].sort((a, b) =>
    (b.offerTerms.expectedStartDate ?? "").localeCompare(
      a.offerTerms.expectedStartDate ?? "",
    ),
  );

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Offers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {count} of {totalCount} offers · fetched {fmtDate(fetchedAt)}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Total"
          value={count}
          sub="all offers"
          accentColor="var(--color-chart-1)"
        />
        <Stat
          label="Accepted"
          value={accepted}
          sub={`${acceptRate}% accept rate`}
          accentColor="var(--color-chart-2)"
        />
        <Stat
          label="Declined"
          value={declined}
          sub={`${withdrawn} withdrawn`}
          accentColor="var(--color-chart-3)"
        />
        <Stat
          label="Expired"
          value={expired}
          sub="no response"
          accentColor="var(--color-chart-4)"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Offer state breakdown</CardTitle>
          <CardDescription>Count by state</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            data={byState}
            xKey="state"
            yKey="value"
            label="offers"
            color="var(--color-chart-1)"
            height={200}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <HandshakeIcon className="h-4 w-4 text-muted-foreground" />
              All offers
            </div>
          </CardTitle>
          <CardDescription>
            Sorted by expected start date descending.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Title</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Rate / Budget</TableHead>
                <TableHead>Start date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((o) => {
                const hourlyRate = o.offerTerms.hourlyTerms?.rate;
                const fixedBudget = o.offerTerms.fixedPriceTerm?.budget;
                return (
                  <TableRow key={o.id}>
                    <TableCell className="pl-4 max-w-[280px]">
                      <div className="font-medium truncate">{o.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        #{o.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={stateVariant(o.state)}>{o.state}</Badge>
                    </TableCell>
                    <TableCell>
                      <TenantBadge tenants={tenantOf(o)} size="xs" />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtType(o.type)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate text-sm">
                        {o.client?.name ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {hourlyRate
                        ? `${fmtMoney(hourlyRate.rawValue, hourlyRate.currency)}/hr`
                        : fixedBudget
                          ? fmtMoney(fixedBudget.rawValue, fixedBudget.currency)
                          : "—"}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {fmtDate(o.offerTerms.expectedStartDate)}
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
