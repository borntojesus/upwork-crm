import { getTransactions } from "@/lib/fixtures";
import { parseTenants, matchesFilter } from "@/lib/tenants";
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
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { DollarSignIcon } from "lucide-react";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtUSD(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtRaw(rawValue: string): string {
  return fmtUSD(parseFloat(rawValue));
}

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const sp = await searchParams;
  const activeTenants = parseTenants(sp.t);
  const {
    transactions: allTransactions,
    totalByMonth,
    count: totalCount,
    fetchedAt,
  } = getTransactions();
  const transactions = allTransactions.filter((t) =>
    matchesFilter(t, activeTenants),
  );
  const count = transactions.length;

  const totalCredit = totalByMonth.reduce((s, m) => s + m.credit, 0);
  const totalDebit = totalByMonth.reduce((s, m) => s + m.debit, 0);
  const totalNet = totalByMonth.reduce((s, m) => s + m.net, 0);

  const subtypes = [
    ...new Set(transactions.map((t) => t.accountingSubtype)),
  ].sort();

  const monthChartData = totalByMonth.map((m) => ({
    month: m.month.slice(0, 7),
    credit: parseFloat(m.credit.toFixed(2)),
    debit: Math.abs(parseFloat(m.debit.toFixed(2))),
    net: parseFloat(m.net.toFixed(2)),
  }));

  const sortedTx = [...transactions].sort((a, b) =>
    b.transactionCreationDate.localeCompare(a.transactionCreationDate),
  );

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Earnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {count} of {totalCount} transactions · {totalByMonth.length} months ·
          fetched {fmtDate(fetchedAt)}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Total credited"
          value={fmtUSD(totalCredit)}
          sub="gross inflows"
          accentColor="var(--color-chart-2)"
        />
        <Stat
          label="Total fees / debits"
          value={fmtUSD(Math.abs(totalDebit))}
          sub="gross outflows"
          accentColor="var(--color-chart-3)"
        />
        <Stat
          label="Net"
          value={fmtUSD(totalNet)}
          sub="credit + debit"
          accentColor={
            totalNet >= 0 ? "var(--color-chart-1)" : "var(--color-destructive)"
          }
        />
        <Stat
          label="Active months"
          value={totalByMonth.length}
          sub={`${count} transactions`}
          accentColor="var(--color-chart-4)"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Monthly earnings timeline</CardTitle>
          <CardDescription>
            Credit vs debit (absolute) over 25 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LineChart
            data={monthChartData}
            xKey="month"
            series={[
              { key: "credit", label: "Credit", color: "var(--color-chart-2)" },
              {
                key: "debit",
                label: "Debit (abs)",
                color: "var(--color-chart-3)",
              },
              { key: "net", label: "Net", color: "var(--color-chart-1)" },
            ]}
            height={280}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Net per month</CardTitle>
          <CardDescription>
            Positive = net income, negative = net outflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            data={monthChartData}
            xKey="month"
            yKey="net"
            label="Net USD"
            color="var(--color-chart-1)"
            height={200}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              Transactions
            </div>
          </CardTitle>
          <CardDescription>
            {count} rows · {subtypes.length} subtypes · {subtypes.join(", ")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Date</TableHead>
                <TableHead>Subtype</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTx.slice(0, 200).map((t) => {
                const amount = parseFloat(t.amountCreditedToUser.rawValue);
                return (
                  <TableRow key={t.recordId}>
                    <TableCell className="pl-4 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                      {fmtDate(t.transactionCreationDate)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-xs whitespace-nowrap"
                      >
                        {t.accountingSubtype}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <div className="truncate text-sm">{t.descriptionUI}</div>
                    </TableCell>
                    <TableCell
                      className="text-right tabular-nums text-sm font-medium"
                      style={{
                        color:
                          amount >= 0
                            ? "var(--color-chart-2)"
                            : "var(--color-destructive)",
                      }}
                    >
                      {fmtRaw(t.amountCreditedToUser.rawValue)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                      {fmtRaw(t.runningChargeableBalance.rawValue)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {count > 200 && (
            <p className="px-4 py-3 text-xs text-muted-foreground">
              Showing 200 of {count} rows (sorted by date desc).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
