import { getAnalytics } from "@/lib/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { Stat } from "@/components/charts/stat";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export default function AnalyticsPage() {
  const a = getAnalytics();

  // Median of medians across rooms (only rooms that have data)
  const medians = a.responseTimes
    .map((r) => r.medianReplyMs)
    .filter((x): x is number => x !== null)
    .sort((x, y) => x - y);
  const overallMedian =
    medians.length > 0
      ? (medians[Math.floor(medians.length / 2)] ?? null)
      : null;

  const totalReplies = a.responseTimes.reduce((s, r) => s + r.replyCount, 0);
  const totalUnanswered = a.responseTimes.reduce(
    (s, r) => s + r.unansweredCount,
    0,
  );

  const busiestCell = a.heatmap.reduce(
    (max, c) => (c.count > max.count ? c : max),
    { dow: 0, hour: 0, count: 0 },
  );
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {a.inputs.leads} leads · {a.inputs.rooms} rooms ·{" "}
          {a.inputs.messages.toLocaleString("en-US")} messages · computed{" "}
          {new Date(a.generatedAt).toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </section>

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Median reply"
          value={fmtMs(overallMedian)}
          sub="across rooms with replies"
          accentColor="var(--color-chart-2)"
        />
        <Stat
          label="Replies total"
          value={totalReplies.toLocaleString("en-US")}
          sub={`${totalUnanswered.toLocaleString("en-US")} unanswered`}
          accentColor="var(--color-chart-1)"
        />
        <Stat
          label="Busiest hour"
          value={`${DOW[busiestCell.dow]} ${String(busiestCell.hour).padStart(2, "0")}:00`}
          sub={`${busiestCell.count} messages · UTC`}
          accentColor="var(--color-chart-3)"
        />
        <Stat
          label="Active weeks"
          value={String(a.timeline.weekly.length)}
          sub={`${a.inboxGrowth.length} months of activity`}
          accentColor="var(--color-chart-5)"
        />
      </section>

      {/* Messaging timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Messaging timeline (weekly)</CardTitle>
          <CardDescription>
            Agency vs lead messages per ISO week, UTC
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LineChart
            data={a.timeline.weekly.map((b) => ({
              week: b.weekStart.slice(0, 10),
              us: b.usCount,
              them: b.themCount,
              total: b.count,
            }))}
            xKey="week"
            series={[
              { key: "us", label: "Us" },
              { key: "them", label: "Leads" },
            ]}
            height={260}
          />
        </CardContent>
      </Card>

      {/* 2-column: heatmap + inbox growth */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activity heatmap</CardTitle>
            <CardDescription>
              Day-of-week × hour-of-day (UTC). Darker = more messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Heatmap cells={a.heatmap} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inbox growth</CardTitle>
            <CardDescription>
              Cumulative room count by month of first message
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={a.inboxGrowth.map((g) => ({
                month: g.month,
                cumulative: g.cumulativeRooms,
                "new this month": g.newRooms,
              }))}
              xKey="month"
              series={[
                { key: "cumulative", label: "Cumulative" },
                { key: "new this month", label: "New" },
              ]}
              height={260}
            />
          </CardContent>
        </Card>
      </section>

      {/* Conversation length + top clients */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversation length distribution</CardTitle>
            <CardDescription>
              How many rooms fall into each message-count bucket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={a.conversationLengths.map((b) => ({
                bucket: b.bucket,
                rooms: b.count,
              }))}
              xKey="bucket"
              yKey="rooms"
              color="var(--color-chart-4)"
              height={260}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top clients by volume</CardTitle>
            <CardDescription>
              <Link href="/analytics/clients" className="hover:underline">
                See full list →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {a.topClients.slice(0, 10).map((c) => (
                <li
                  key={c.userId}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.orgNames[0] ?? "—"}
                    </div>
                  </div>
                  <Badge variant="secondary">{c.messageCount} msg</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Response time per room */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Link href="/analytics/response-times" className="hover:underline">
              Response time distribution →
            </Link>
          </CardTitle>
          <CardDescription>Fastest rooms (median reply)</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            data={a.responseTimes
              .filter((r) => r.medianReplyMs !== null && r.replyCount >= 3)
              .sort((x, y) => (x.medianReplyMs ?? 0) - (y.medianReplyMs ?? 0))
              .slice(0, 12)
              .map((r) => ({
                room: (r.roomName ?? r.roomId).slice(0, 28),
                medianMinutes: Math.round((r.medianReplyMs ?? 0) / 60000),
              }))}
            xKey="room"
            yKey="medianMinutes"
            label="median reply (min)"
            height={260}
          />
        </CardContent>
      </Card>
    </div>
  );
}
