import Link from "next/link";
import { getAnalytics } from "@/lib/analytics";
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Stat } from "@/components/charts/stat";

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

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "muted"
  | "success"
  | "warning"
  | "destructive";

function speedBadge(ms: number | null): {
  variant: BadgeVariant;
  label: string;
} {
  if (ms === null) return { variant: "muted", label: "—" };
  if (ms < 10 * 60_000) return { variant: "success", label: "fast" };
  if (ms < 60 * 60_000) return { variant: "default", label: "ok" };
  if (ms < 24 * 60 * 60_000) return { variant: "warning", label: "slow" };
  return { variant: "destructive", label: "cold" };
}

export default function ResponseTimesPage() {
  const { responseTimes } = getAnalytics();

  const rows = responseTimes
    .slice()
    .filter((r) => r.replyCount > 0 || r.unansweredCount > 0)
    .sort((a, b) => {
      // sort by median asc; nulls last
      if (a.medianReplyMs === null) return 1;
      if (b.medianReplyMs === null) return -1;
      return a.medianReplyMs - b.medianReplyMs;
    });

  const medians = responseTimes
    .map((r) => r.medianReplyMs)
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);
  const overallMedian =
    medians.length > 0
      ? (medians[Math.floor(medians.length / 2)] ?? null)
      : null;
  const overallP90 =
    medians.length > 0
      ? (medians[Math.floor(medians.length * 0.9)] ?? null)
      : null;
  const totalReplies = responseTimes.reduce((s, r) => s + r.replyCount, 0);
  const totalUnanswered = responseTimes.reduce(
    (s, r) => s + r.unansweredCount,
    0,
  );

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/analytics" />}>
              Analytics
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Response times</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Response times
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How fast the agency replies to leads, per room. A “reply” = our
          message immediately after a lead message in the same room.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Overall median"
          value={fmtMs(overallMedian)}
          sub="across all rooms"
        />
        <Stat
          label="P90 of medians"
          value={fmtMs(overallP90)}
          sub="slowest 10% of rooms"
        />
        <Stat
          label="Replies"
          value={totalReplies.toLocaleString("en-US")}
          sub="total matched pairs"
        />
        <Stat
          label="Unanswered"
          value={totalUnanswered.toLocaleString("en-US")}
          sub="trailing lead messages"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Room</TableHead>
            <TableHead className="text-right">Replies</TableHead>
            <TableHead className="text-right">Median</TableHead>
            <TableHead className="text-right">P90</TableHead>
            <TableHead className="text-right">Unanswered</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const badge = speedBadge(r.medianReplyMs);
            return (
              <TableRow key={r.roomId}>
                <TableCell className="max-w-[340px]">
                  <Link
                    href={`/rooms/${r.roomId}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {r.roomName ?? r.roomId}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.replyCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtMs(r.medianReplyMs)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {fmtMs(r.p90ReplyMs)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {r.unansweredCount || ""}
                </TableCell>
                <TableCell>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
