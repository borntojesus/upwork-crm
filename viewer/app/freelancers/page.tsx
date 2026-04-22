import Link from "next/link";
import { getTopFreelancers } from "@/lib/fixtures";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";

function jssBadge(jss: number | null) {
  if (jss == null) return null;
  const cls =
    jss >= 95
      ? "border-[color:var(--color-success)] text-[color:var(--color-success)]"
      : jss >= 85
        ? "border-[color:var(--color-warning)] text-[color:var(--color-warning)]"
        : "border-[color:var(--color-danger)] text-[color:var(--color-danger)]";
  return (
    <Badge variant="outline" className={cls}>
      {jss}% JSS
    </Badge>
  );
}

export default function FreelancersHubPage() {
  const data = getTopFreelancers();

  const totalProfiles = data
    ? data.categories.reduce((s, c) => s + c.freelancers.length, 0)
    : 0;

  const soWhat = data
    ? `${data.categories.length} categories · ${totalProfiles} profiles captured · updated ${new Date(data.generatedAt).toLocaleDateString("en-GB", { month: "short", day: "2-digit" })}`
    : "No data yet — run the pipeline agent to populate fixtures/agent/top-freelancers.json";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Market research"
        title="Top freelancers"
        question="Who's winning in each stack and why?"
        soWhat={soWhat}
      />

      {data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.categories.map((cat) => {
            const rank1 =
              cat.freelancers.find((f) => f.rank === 1) ??
              cat.freelancers[0] ??
              null;
            return (
              <Link
                key={cat.slug}
                href={`/freelancers/${cat.slug}`}
                className="group rounded-xl border border-border/60 bg-card p-5 flex flex-col gap-4 hover:border-primary/40 hover:bg-card/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {cat.primaryKeyword}
                    </p>
                    <h2 className="mt-0.5 text-lg font-semibold group-hover:text-primary transition-colors">
                      {cat.label}
                    </h2>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-mono tabular-nums text-muted-foreground">
                    {cat.freelancers.length} profiles
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Avg rate
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums">
                      {cat.avgHourlyRate != null
                        ? `$${cat.avgHourlyRate.toFixed(0)}/hr`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Top score
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums">
                      {cat.topPrimaryScore.toFixed(2)}
                    </p>
                  </div>
                </div>

                {rank1 && (
                  <div className="border-t border-border/60 pt-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        #1 ranked
                      </p>
                      <p className="text-sm font-medium truncate">
                        {rank1.name ?? rank1.profileKey}
                      </p>
                    </div>
                    {jssBadge(rank1.jobSuccessScore)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No data yet. Run the pipeline agent to generate{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              fixtures/agent/top-freelancers.json
            </code>
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground border border-border/60 rounded-lg px-4 py-3 bg-muted/30">
        <Link
          href="/freelancers/manual"
          className="underline hover:text-foreground transition-colors"
        >
          Legacy manual observations →
        </Link>
      </p>
    </div>
  );
}
