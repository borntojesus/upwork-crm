import { notFound } from "next/navigation";
import Link from "next/link";
import { getIdea, listIdeas, type IdeaStatus } from "@/lib/ideas";
import { IdeaMarkdown } from "@/components/ideas/markdown";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, ArrowLeftIcon } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

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

const EFFORT_CLASS: Record<string, string> = {
  S: "text-[color:var(--success)] bg-[color:var(--success)]/10",
  M: "text-[color:var(--warning)] bg-[color:var(--warning)]/10",
  L: "text-orange-400 bg-orange-400/10",
  XL: "text-[color:var(--danger)] bg-[color:var(--danger)]/10",
};

const IMPACT_CLASS: Record<string, string> = {
  high: "text-[color:var(--success)] bg-[color:var(--success)]/10",
  medium: "text-[color:var(--warning)] bg-[color:var(--warning)]/10",
  low: "text-muted-foreground bg-muted",
};

const PRIORITY_CLASS: Record<string, string> = {
  p0: "text-[color:var(--danger)] bg-[color:var(--danger)]/10",
  p1: "text-[color:var(--warning)] bg-[color:var(--warning)]/10",
  p2: "text-muted-foreground bg-muted",
};

function Chip({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className,
      )}
    >
      <span className="font-normal opacity-70">{label}:</span>
      {value}
    </span>
  );
}

export default async function IdeaDetailPage({ params }: PageProps) {
  const { slug: slugParts } = await params;
  const slug = slugParts.join("/");

  const idea = getIdea(slug);
  if (!idea) notFound();

  const allIdeas = listIdeas();
  const currentIndex = allIdeas.findIndex((i) => i.slug === slug);
  const prevIdea = currentIndex > 0 ? allIdeas[currentIndex - 1] : null;
  const nextIdea =
    currentIndex < allIdeas.length - 1 ? allIdeas[currentIndex + 1] : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/ideas" className="hover:text-foreground transition-colors">
          Ideas
        </Link>
        <ChevronRightIcon className="size-3.5" />
        <span className="text-foreground">{idea.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar nav */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              All ideas
            </p>
            <nav className="flex flex-col gap-0.5">
              {allIdeas.map((item) => (
                <Link
                  key={item.slug}
                  href={`/ideas/${item.slug}`}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    item.slug === slug
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      item.priority === "p0" && "bg-[color:var(--danger)]",
                      item.priority === "p1" && "bg-[color:var(--warning)]",
                      item.priority === "p2" && "bg-muted-foreground/40",
                    )}
                  />
                  <span className="truncate">{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0 rounded-xl border border-border/60 bg-card p-6 md:p-8">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[26px]">
              {idea.title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {idea.description}
            </p>

            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant={STATUS_VARIANT[idea.status]}>
                {STATUS_LABEL[idea.status]}
              </Badge>
              <Chip
                label="Priority"
                value={idea.priority.toUpperCase()}
                className={PRIORITY_CLASS[idea.priority]}
              />
              <Chip
                label="Impact"
                value={
                  idea.impact.charAt(0).toUpperCase() + idea.impact.slice(1)
                }
                className={IMPACT_CLASS[idea.impact]}
              />
              <Chip
                label="Effort"
                value={idea.effort}
                className={EFFORT_CLASS[idea.effort]}
              />
              {idea.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-sm bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <hr className="mb-6 border-border/40" />

          {/* Markdown body */}
          <IdeaMarkdown body={idea.body} />

          {/* Prev / Next navigation */}
          {(prevIdea || nextIdea) && (
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-border/40 pt-6">
              {prevIdea ? (
                <Link
                  href={`/ideas/${prevIdea.slug}`}
                  className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium uppercase tracking-wider">
                      Previous
                    </span>
                    <span className="font-medium">{prevIdea.title}</span>
                  </div>
                </Link>
              ) : (
                <div />
              )}
              {nextIdea && (
                <Link
                  href={`/ideas/${nextIdea.slug}`}
                  className="group flex items-center gap-2 text-right text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium uppercase tracking-wider">
                      Next
                    </span>
                    <span className="font-medium">{nextIdea.title}</span>
                  </div>
                  <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Back link */}
      <Link
        href="/ideas"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to all ideas
      </Link>
    </div>
  );
}
