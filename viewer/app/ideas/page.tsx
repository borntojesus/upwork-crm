import Link from "next/link";
import { listIdeas, ideaStatsByStatus, type IdeaStatus } from "@/lib/ideas";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BrainCircuitIcon,
  TimerIcon,
  UsersIcon,
  FileTextIcon,
  LayoutIcon,
  TrendingUpIcon,
  UserCheckIcon,
  BellIcon,
  RadarIcon,
  MailIcon,
} from "lucide-react";

const SLUG_ICON: Record<string, React.ElementType> = {
  "lead-scoring": BrainCircuitIcon,
  "response-time": TimerIcon,
  "client-segments": UsersIcon,
  "outreach-templates": FileTextIcon,
  "deal-pipeline": LayoutIcon,
  "earnings-forecast": TrendingUpIcon,
  "talent-matching": UserCheckIcon,
  "auto-followup": BellIcon,
  "competitor-intel": RadarIcon,
  "weekly-digest": MailIcon,
};

const STATUS_LABEL: Record<IdeaStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  wip: "In Progress",
  done: "Done",
};

const STATUS_VARIANT: Record<
  IdeaStatus,
  "outline" | "secondary" | "warning" | "success"
> = {
  idea: "outline",
  planned: "secondary",
  wip: "warning",
  done: "success",
};

const PRIORITY_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  p0: "danger",
  p1: "warning",
  p2: "neutral",
};

const IMPACT_COLOR: Record<string, string> = {
  high: "text-[color:var(--success)]",
  medium: "text-[color:var(--warning)]",
  low: "text-muted-foreground",
};

export default function IdeasPage() {
  const ideas = listIdeas();
  const byStatus = ideaStatsByStatus();

  const p0Count = ideas.filter((i) => i.priority === "p0").length;
  const wipCount = byStatus.wip;
  const plannedCount = byStatus.planned;
  const ideaCount = byStatus.idea;

  const soWhat = `${ideas.length} ideas tracked — ${p0Count} are P0 priority, ${wipCount} in progress, ${plannedCount} planned.`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="PM Knowledge Base"
        title="Ideas & Roadmap"
        question="What should we build next, and why?"
        soWhat={soWhat}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total ideas" value={ideas.length} tone="neutral" />
        <KpiCard
          label="P0 priorities"
          value={p0Count}
          hint="Must ship first"
          tone="danger"
        />
        <KpiCard
          label="In progress"
          value={wipCount}
          hint="Active development"
          tone="warning"
        />
        <KpiCard
          label="In backlog"
          value={ideaCount}
          hint="Not yet planned"
          tone="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ideas.map((idea) => {
          const Icon = SLUG_ICON[idea.slug] ?? BrainCircuitIcon;
          const statusVariant = STATUS_VARIANT[idea.status];
          const priorityTone = PRIORITY_TONE[idea.priority];

          return (
            <Link
              key={idea.slug}
              href={`/ideas/${idea.slug}`}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
            >
              {/* P0 accent glow */}
              {idea.priority === "p0" && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[color:var(--danger)]/10 to-transparent"
                  aria-hidden
                />
              )}

              <div className="relative flex items-start justify-between gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-colors group-hover:border-primary/20 group-hover:bg-primary/5 group-hover:text-primary">
                  <Icon className="size-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={statusVariant}>
                    {STATUS_LABEL[idea.status]}
                  </Badge>
                  <span
                    className={cn(
                      "inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide",
                      priorityTone === "danger" &&
                        "bg-[color:var(--danger)]/10 text-[color:var(--danger)]",
                      priorityTone === "warning" &&
                        "bg-[color:var(--warning)]/15 text-[color:var(--warning-foreground)]",
                      priorityTone === "neutral" &&
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {idea.priority.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="relative flex flex-col gap-1.5">
                <h2 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
                  {idea.title}
                </h2>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                  {idea.description}
                </p>
              </div>

              <div className="relative mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Impact:
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold",
                    IMPACT_COLOR[idea.impact],
                  )}
                >
                  {idea.impact.charAt(0).toUpperCase() + idea.impact.slice(1)}
                </span>
                <span className="mx-1 text-border">·</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Effort:
                </span>
                <span className="text-[10px] font-semibold text-foreground/70">
                  {idea.effort}
                </span>
                <div className="ml-auto flex flex-wrap gap-1">
                  {idea.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
