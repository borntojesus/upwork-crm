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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function TopClientsPage() {
  const { topClients, talkRatios } = getAnalytics();
  const ratioByRoom = new Map(talkRatios.map((r) => [r.roomId, r]));

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
            <BreadcrumbPage>Top clients</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Top clients by volume
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Leads ranked by total message count across all their rooms.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Rooms</TableHead>
            <TableHead className="text-right">Messages</TableHead>
            <TableHead>Top room</TableHead>
            <TableHead>Last contact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topClients.map((c, i) => {
            const topRoom = c.rooms
              .slice()
              .sort((a, b) => b.messageCount - a.messageCount)[0];
            const ratio = topRoom
              ? ratioByRoom.get(topRoom.roomId)?.usRatio
              : null;
            return (
              <TableRow key={c.userId}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {initials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{c.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.orgNames[0] ?? "—"}
                  {c.orgNames.length > 1 && (
                    <Badge variant="outline" className="ml-1">
                      +{c.orgNames.length - 1}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.rooms.length}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {c.messageCount}
                </TableCell>
                <TableCell className="max-w-[280px] text-sm">
                  {topRoom ? (
                    <Link
                      href={`/rooms/${topRoom.roomId}`}
                      className="block truncate hover:underline"
                    >
                      {topRoom.roomName ?? topRoom.topic ?? topRoom.roomId}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {ratio !== null && ratio !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      us {Math.round(ratio * 100)}%
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {fmtDate(c.lastAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
