import { notFound } from "next/navigation";
import Link from "next/link";
import { getRooms, getTranscript } from "@/lib/fixtures";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollToBottom } from "@/components/scroll-to-bottom";
import { cn } from "@/lib/utils";
import { PaperclipIcon } from "lucide-react";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const transcript = getTranscript(id);
  if (!transcript) notFound();

  const roomsFile = getRooms();
  const summary = roomsFile.rooms.find((r) => r.roomId === id);
  const roomTitle = transcript.roomName ?? transcript.topic ?? id;

  return (
    <>
      <ScrollToBottom />

      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/rooms" />}>
                Rooms
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[200px] truncate">
                {roomTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Sticky room header */}
        <div className="sticky top-14 z-30 -mx-6 border-b border-border bg-background/90 backdrop-blur-sm px-6 py-3">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-2xl font-semibold tracking-tight truncate">
              {roomTitle}
            </h1>
            {transcript.topic && transcript.roomName && (
              <p className="mt-0.5 text-sm text-muted-foreground truncate">
                {transcript.topic}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {transcript.messages.length} messages
              </Badge>
              {transcript.roomType && (
                <Badge variant="secondary">
                  {transcript.roomType.replace("_", " ")}
                </Badge>
              )}
              {transcript.contractId && (
                <Badge variant="outline">
                  contract{" "}
                  <code className="ml-1 font-mono text-[10px]">
                    {transcript.contractId}
                  </code>
                </Badge>
              )}
              {summary?.leads?.map((l) => (
                <Badge key={l.userId} variant="muted">
                  {l.name}
                  {l.orgName ? (
                    <span className="opacity-60 ml-1">({l.orgName})</span>
                  ) : null}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Message thread */}
        {transcript.messages.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No messages in this room.
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {transcript.messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2",
                  m.self ? "flex-row-reverse" : "flex-row",
                )}
              >
                {/* Avatar — only for theirs */}
                {!m.self && (
                  <Avatar className="h-7 w-7 mt-1 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {initials(m.from)}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                    m.self
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm bg-card ring-1 ring-border",
                  )}
                >
                  {/* Sender name + org */}
                  {!m.self && (
                    <div className="mb-1 flex items-baseline gap-1.5 text-xs font-medium text-foreground">
                      {m.from}
                      {m.fromOrg && (
                        <span className="font-normal opacity-60">
                          · {m.fromOrg}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message body */}
                  {m.text ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {m.text}
                    </p>
                  ) : (
                    <p className="text-xs italic opacity-60">(empty)</p>
                  )}

                  {/* Attachment indicator */}
                  {m.hasAttachment && (
                    <div
                      className={cn(
                        "mt-1.5 flex items-center gap-1 text-xs opacity-70",
                      )}
                    >
                      <PaperclipIcon className="h-3 w-3" />
                      attachment
                    </div>
                  )}

                  {/* Timestamp with tooltip */}
                  <div
                    className={cn(
                      "mt-1 text-[10px] opacity-50 tabular-nums",
                      m.self ? "text-right" : "text-left",
                    )}
                  >
                    <Tooltip>
                      <TooltipTrigger
                        render={<span className="cursor-default" />}
                      >
                        {relativeTime(m.at)}
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {fmtDateTime(m.at)}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
