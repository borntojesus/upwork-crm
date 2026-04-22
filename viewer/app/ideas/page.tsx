import { readIdeaTree, readIdea, ideaStats } from "@/lib/ideas";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { IdeaTree } from "@/components/ideas/idea-tree";
import { IdeaMarkdown } from "@/components/ideas/markdown";

export default function IdeasPage() {
  const tree = readIdeaTree();
  const root = readIdea("");
  const stats = ideaStats();

  const p0Count = stats.byPriority["p0"] ?? 0;
  const shippedCount =
    (stats.byStatus["planned"] ?? 0) + (stats.byStatus["shipped"] ?? 0);
  const inboxCount = stats.byStatus["idea"] ?? 0;

  const soWhat = `${stats.total} ideas tracked — ${p0Count} are p0 priority, ${shippedCount} planned or shipped.`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Docs"
        title="Ideas & Roadmap"
        question="What should we build next, and why?"
        soWhat={soWhat}
      />

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total ideas" value={stats.total} tone="neutral" />
        <KpiCard
          label="P0 ideas"
          value={p0Count}
          hint="Ship this sprint"
          tone="danger"
        />
        <KpiCard
          label="Planned / shipped"
          value={shippedCount}
          tone="positive"
        />
        <KpiCard
          label="In backlog"
          value={inboxCount}
          hint="status: idea"
          tone="neutral"
        />
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-6 items-start">
        <aside className="rounded-xl border border-border/60 bg-card p-3 sticky top-24">
          <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Navigation
          </p>
          <IdeaTree tree={tree} currentSlug="" />
        </aside>

        <section className="min-w-0 rounded-xl border border-border/60 bg-card p-6">
          {root ? (
            <IdeaMarkdown body={root.body} />
          ) : (
            <p className="text-muted-foreground text-sm">
              No root index found. Create{" "}
              <code className="font-mono text-xs">
                fixtures/ideas/_index.md
              </code>
              .
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
