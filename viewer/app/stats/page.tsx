import {
  getContracts,
  getLeads,
  getOffers,
  getRooms,
  getTransactions,
} from "@/lib/fixtures";
import { parseTenants, matchesFilter } from "@/lib/tenants";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";

function fmtUSD(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sub: string;
  accent: string;
}

function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div
      className="rounded-xl border border-border bg-card px-6 py-5 flex flex-col gap-1"
      style={{ borderLeftWidth: 3, borderLeftColor: accent }}
    >
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className="text-4xl font-extrabold tabular-nums leading-none"
        style={{ color: accent }}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const sp = await searchParams;
  const activeTenants = parseTenants(sp.t);

  const leads = getLeads();
  const rooms = getRooms();
  const { contracts: allContracts } = getContracts();
  const { offers: allOffers } = getOffers();
  const { transactions: allTransactions, totalByMonth } = getTransactions();

  const filteredLeads = leads.leads.filter((l) =>
    matchesFilter(l, activeTenants),
  );
  const filteredRooms = rooms.rooms.filter((r) =>
    matchesFilter(r, activeTenants),
  );
  const contracts = allContracts.filter((c) => matchesFilter(c, activeTenants));
  const offers = allOffers.filter((o) => matchesFilter(o, activeTenants));
  const transactions = allTransactions.filter((t) =>
    matchesFilter(t, activeTenants),
  );

  // KPI values
  const totalMessages = filteredLeads.reduce((s, l) => s + l.messageCount, 0);
  const activeContracts = contracts.filter((c) => c.status === "ACTIVE").length;
  const acceptedOffers = offers.filter((o) => o.state === "ACCEPTED").length;
  const totalCredit = totalByMonth.reduce((s, m) => s + m.credit, 0);
  const totalNet = totalByMonth.reduce((s, m) => s + m.net, 0);

  // Top 5 clients by contract count
  const clientMap = new Map<string, { name: string; count: number }>();
  for (const c of contracts) {
    if (!c.clientOrganization) continue;
    const { id, name } = c.clientOrganization;
    const existing = clientMap.get(id);
    if (existing) existing.count++;
    else clientMap.set(id, { name, count: 1 });
  }
  const top5Clients = [...clientMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Contract status breakdown
  const statusBreakdown = [
    {
      status: "ACTIVE",
      count: contracts.filter((c) => c.status === "ACTIVE").length,
    },
    {
      status: "CLOSED",
      count: contracts.filter((c) => c.status === "CLOSED").length,
    },
    {
      status: "PAUSED",
      count: contracts.filter((c) => c.status === "PAUSED").length,
    },
  ];

  // Messaging timeline: monthly message counts derived from rooms
  // Use transactions monthly as proxy for activity sparkline
  const earningsSparkline = totalByMonth.map((m) => ({
    month: m.month.slice(0, 7),
    credit: parseFloat(m.credit.toFixed(0)),
    net: parseFloat(m.net.toFixed(0)),
  }));

  // Rooms by first-message month (use rooms data)
  const roomsByMonth = filteredRooms.reduce<Record<string, number>>(
    (acc, r) => {
      if (!r.firstAt) return acc;
      const month = r.firstAt.slice(0, 7);
      acc[month] = (acc[month] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const messagingTimeline = Object.entries(roomsByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rooms]) => ({ month, rooms }));

  return (
    <div data-testid="stats-root" className="space-y-8 pb-8">
      {/* Hero */}
      <section className="rounded-xl border border-border bg-card px-8 py-7">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              Alpina Tech
              <span className="text-muted-foreground font-light mx-3">·</span>
              Upwork Intelligence
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Discovery MVP snapshot · Phase 1 data ·{" "}
              {new Date().toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "2-digit",
              })}
            </p>
          </div>
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-2xl font-black text-primary-foreground"
            style={{ background: "var(--color-chart-1)" }}
          >
            U
          </div>
        </div>
      </section>

      {/* 6-up KPI grid */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard
          label="Leads"
          value={filteredLeads.length.toLocaleString("en-US")}
          sub="unique client contacts"
          accent="var(--color-chart-1)"
        />
        <KpiCard
          label="Rooms"
          value={filteredRooms.length.toLocaleString("en-US")}
          sub="conversation threads"
          accent="var(--color-chart-2)"
        />
        <KpiCard
          label="Messages"
          value={totalMessages.toLocaleString("en-US")}
          sub="total across all rooms"
          accent="var(--color-chart-3)"
        />
        <KpiCard
          label="Contracts"
          value={contracts.length}
          sub={`${activeContracts} active now`}
          accent="var(--color-chart-4)"
        />
        <KpiCard
          label="Offers"
          value={offers.length}
          sub={`${acceptedOffers} accepted`}
          accent="var(--color-chart-5)"
        />
        <KpiCard
          label="Transactions"
          value={transactions.length.toLocaleString("en-US")}
          sub={`${fmtUSD(totalCredit)} credited · net ${fmtUSD(totalNet)}`}
          accent="var(--color-chart-1)"
        />
      </section>

      {/* 2-col charts */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card px-6 py-5">
          <p className="text-sm font-semibold mb-1">New rooms per month</p>
          <p className="text-xs text-muted-foreground mb-4">
            Conversation intake over time
          </p>
          <BarChart
            data={messagingTimeline}
            xKey="month"
            yKey="rooms"
            label="rooms"
            color="var(--color-chart-2)"
            height={180}
          />
        </div>
        <div className="rounded-xl border border-border bg-card px-6 py-5">
          <p className="text-sm font-semibold mb-1">Earnings timeline</p>
          <p className="text-xs text-muted-foreground mb-4">
            Monthly credit vs net over 25 months
          </p>
          <LineChart
            data={earningsSparkline}
            xKey="month"
            series={[
              {
                key: "credit",
                label: "Credit",
                color: "var(--color-chart-2)",
              },
              { key: "net", label: "Net", color: "var(--color-chart-1)" },
            ]}
            height={180}
          />
        </div>
      </section>

      {/* Bottom: top clients + contract status */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card px-6 py-5">
          <p className="text-sm font-semibold mb-4">
            Top 5 clients by contracts
          </p>
          <ol className="space-y-3">
            {top5Clients.map((client, i) => (
              <li key={client.name} className="flex items-center gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
                  style={{ background: "var(--color-chart-1)" }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium">
                  {client.name}
                </span>
                <span
                  className="text-sm tabular-nums font-semibold"
                  style={{ color: "var(--color-chart-1)" }}
                >
                  {client.count}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-border bg-card px-6 py-5">
          <p className="text-sm font-semibold mb-4">
            Contract status breakdown
          </p>
          <BarChart
            data={statusBreakdown}
            xKey="status"
            yKey="count"
            label="contracts"
            color="var(--color-chart-4)"
            height={140}
          />
          <div className="mt-4 flex gap-6 text-sm">
            {statusBreakdown.map((s) => (
              <div key={s.status} className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.status}
                </span>
                <span className="text-xl font-bold tabular-nums">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
