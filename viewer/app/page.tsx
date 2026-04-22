import Link from "next/link";
import { getLeads, getRooms, getContracts, getOffers } from "@/lib/fixtures";
import { parseTenants, matchesFilter } from "@/lib/tenants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function isRecent(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const sp = await searchParams;
  const activeTenants = parseTenants(sp.t);

  const leads = getLeads();
  const rooms = getRooms();
  const contracts = getContracts();
  const offers = getOffers();

  const filteredLeads = leads.leads.filter((l) =>
    matchesFilter(l, activeTenants),
  );
  const filteredRooms = rooms.rooms.filter((r) =>
    matchesFilter(r, activeTenants),
  );

  const activeContracts = contracts.contracts.filter(
    (c) => c.status === "ACTIVE",
  ).length;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const unreadRecent = filteredRooms.filter(
    (r) => r.lastAt && new Date(r.lastAt).getTime() > cutoff,
  ).length;
  const lastAt = filteredLeads
    .map((l) => l.lastAt)
    .filter((v): v is string => !!v)
    .sort()
    .pop();
  const daysSinceLast = lastAt
    ? Math.round((Date.now() - new Date(lastAt).getTime()) / 86400000)
    : 0;

  const topLeads = filteredLeads
    .slice()
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""))
    .slice(0, 8);

  const recentRooms = filteredRooms
    .slice()
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""))
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        audiences={["Agency owners", "Ops"]}
        cadence="live"
        title="Agency Upwork cockpit"
        question="Where should my attention go today?"
        soWhat={`${unreadRecent} rooms touched this week · ${activeContracts} active contracts · last lead ${daysSinceLast}d ago.`}
      />

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard
          label="Leads"
          value={filteredLeads.length}
          hint="distinct non-agency participants"
          tone="neutral"
        />
        <KpiCard
          label="Rooms"
          value={filteredRooms.length}
          hint="active + archived"
          tone="neutral"
        />
        <KpiCard
          label="Messages"
          value={filteredLeads
            .reduce((s, l) => s + l.messageCount, 0)
            .toLocaleString("en-US")}
          hint="across all transcripts"
          tone="neutral"
        />
        <KpiCard
          label="Contracts"
          value={contracts.count}
          hint={`${activeContracts} active`}
          tone="positive"
        />
        <KpiCard
          label="Offers"
          value={offers.count}
          hint="vendor-side offers"
          tone="neutral"
        />
      </section>

      {/* Lists */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent leads</CardTitle>
            <CardDescription>
              <Link href="/leads" className="hover:underline">
                See all {filteredLeads.length} →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {topLeads.length === 0 ? (
              <div className="px-4 pb-4 text-sm text-muted-foreground">
                No leads found.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {topLeads.map((l) => (
                  <li
                    key={l.userId}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">
                        {initials(l.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {l.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {l.orgNames[0] ?? "—"}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={isRecent(l.lastAt) ? "default" : "muted"}>
                        {l.messageCount}
                      </Badge>
                      <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
                        {fmtDate(l.lastAt).split(",")[0]}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent conversations</CardTitle>
            <CardDescription>
              <Link href="/rooms" className="hover:underline">
                See all {filteredRooms.length} →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {recentRooms.length === 0 ? (
              <div className="px-4 pb-4 text-sm text-muted-foreground">
                No rooms found.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentRooms.map((r) => (
                  <li key={r.roomId}>
                    <Link
                      href={`/rooms/${r.roomId}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">
                          {initials(r.leads[0]?.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {r.roomName ?? r.topic ?? r.roomId}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {r.leads[0]?.name ?? "—"} ·{" "}
                          {fmtDate(r.lastAt).split(",")[0]}
                        </div>
                      </div>
                      <Badge variant="muted">{r.messageCount}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
