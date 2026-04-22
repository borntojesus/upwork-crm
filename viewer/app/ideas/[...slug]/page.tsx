import { notFound } from "next/navigation";
import { readIdeaTree, readIdea } from "@/lib/ideas";
import { IdeaTree } from "@/components/ideas/idea-tree";
import { IdeaMarkdown } from "@/components/ideas/markdown";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

const priorityVariant: Record<
  string,
  "destructive" | "default" | "secondary" | "outline"
> = {
  p0: "destructive",
  p1: "default",
  p2: "secondary",
};

const effortColor: Record<string, string> = {
  S: "text-[color:var(--success)] bg-[color:var(--success)]/10",
  M: "text-[color:var(--warning)] bg-[color:var(--warning)]/10",
  L: "text-orange-400 bg-orange-400/10",
  XL: "text-[color:var(--danger)] bg-[color:var(--danger)]/10",
};

const impactColor: Record<string, string> = {
  high: "text-[color:var(--success)] bg-[color:var(--success)]/10",
  medium: "text-[color:var(--warning)] bg-[color:var(--warning)]/10",
  low: "text-muted-foreground bg-muted",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function IdeaSlugPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slugParts = resolvedParams.slug;
  const slug = slugParts.join("/");

  let idea;
  try {
    idea = readIdea(slug);
  } catch {
    notFound();
  }
  if (!idea) notFound();

  let tree;
  try {
    tree = readIdeaTree();
  } catch {
    tree = { name: "Ideas", slug: "", type: "folder" as const, children: [] };
  }

  // Build breadcrumb from slug segments
  const segments = slug.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [
    { label: "Ideas", href: "/ideas" },
  ];
  let accumulated = "";
  for (let i = 0; i < segments.length - 1; i++) {
    accumulated = accumulated ? `${accumulated}/${segments[i]}` : segments[i];
    let node = null;
    try {
      node = readIdea(accumulated);
    } catch {
      // ignore
    }
    const label = node?.title ?? capitalize(segments[i].replace(/^\d+-/, ""));
    crumbs.push({ label, href: `/ideas/${accumulated}` });
  }

  const fm = idea.frontmatter;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRightIcon className="size-3.5" />}
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          </span>
        ))}
        <ChevronRightIcon className="size-3.5" />
        <span className="text-foreground">{idea.title}</span>
      </nav>

      <div className="grid grid-cols-[260px_1fr] gap-6 items-start">
        <aside className="rounded-xl border border-border/60 bg-card p-3 sticky top-24">
          <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Navigation
          </p>
          <IdeaTree tree={tree} currentSlug={slug} />
        </aside>

        <section className="min-w-0 rounded-xl border border-border/60 bg-card p-6">
          {/* Frontmatter chips */}
          {(fm.priority ||
            fm.effort ||
            fm.impact ||
            fm.status ||
            (fm.tags && fm.tags.length > 0)) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {fm.priority && (
                <Badge variant={priorityVariant[fm.priority] ?? "secondary"}>
                  {fm.priority.toUpperCase()}
                </Badge>
              )}
              {fm.effort && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold",
                    effortColor[fm.effort] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  Effort: {fm.effort}
                </span>
              )}
              {fm.impact && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold",
                    impactColor[fm.impact] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  Impact: {capitalize(fm.impact)}
                </span>
              )}
              {fm.status && (
                <Badge variant="outline">{capitalize(fm.status)}</Badge>
              )}
              {fm.tags?.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="font-mono text-[10px]"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Audience */}
          {fm.audience && fm.audience.length > 0 && (
            <p className="mb-4 text-xs text-muted-foreground">
              <span className="font-medium">Audience:</span>{" "}
              {fm.audience.join(", ")}
            </p>
          )}

          {/* Created date */}
          {fm.createdAt && (
            <p className="mb-6 text-xs text-muted-foreground">
              Created {fm.createdAt}
            </p>
          )}

          <IdeaMarkdown body={idea.body} />
        </section>
      </div>
    </div>
  );
}
