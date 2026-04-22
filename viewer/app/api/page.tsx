import { getApiSummary, type ProbeStatus } from "@/lib/api-summary";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Stat } from "@/components/charts/stat";
import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotIcon,
  CircleOffIcon,
  ShieldAlertIcon,
} from "lucide-react";

const STATUS_META: Record<
  ProbeStatus,
  {
    label: string;
    variant: "success" | "destructive" | "warning" | "muted" | "outline";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  ok: {
    label: "working",
    variant: "success",
    icon: CircleCheckIcon,
  },
  empty: {
    label: "empty",
    variant: "warning",
    icon: CircleDotIcon,
  },
  "blocked-scope": {
    label: "scope missing",
    variant: "destructive",
    icon: ShieldAlertIcon,
  },
  "blocked-error": {
    label: "server 500",
    variant: "destructive",
    icon: CircleOffIcon,
  },
  untried: {
    label: "untried",
    variant: "muted",
    icon: CircleDashedIcon,
  },
};

const STATUS_ORDER: ProbeStatus[] = [
  "ok",
  "empty",
  "blocked-scope",
  "blocked-error",
  "untried",
];

export default function ApiSummaryPage() {
  const summary = getApiSummary();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">
          What the Upwork API can return
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capability map from <code>schema/capabilities.md</code> overlaid with
          our probe results. Queries we exercised are marked <em>working</em>;
          everything else is still a backlog item.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        <Stat
          label="Queries"
          value={summary.totalQueries}
          sub="root Query fields"
          accentColor="var(--color-chart-1)"
        />
        <Stat
          label="Mutations"
          value={summary.totalMutations}
          sub="root Mutation fields"
          accentColor="var(--color-chart-2)"
        />
        <Stat
          label="Types"
          value={summary.totalTypes.toLocaleString("en-US")}
          sub="excluding introspection"
          accentColor="var(--color-chart-3)"
        />
        <Stat
          label="Working"
          value={summary.statusCounts.ok}
          sub="exercised successfully"
          accentColor="var(--color-success)"
        />
        <Stat
          label="Blocked"
          value={
            summary.statusCounts["blocked-scope"] +
            summary.statusCounts["blocked-error"]
          }
          sub={`${summary.statusCounts["blocked-scope"]} scope · ${summary.statusCounts["blocked-error"]} server`}
          accentColor="var(--color-destructive)"
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Status legend
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {STATUS_ORDER.map((s) => {
            const meta = STATUS_META[s];
            const Icon = meta.icon;
            return (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1"
              >
                <Icon className="h-3 w-3" />
                <Badge variant={meta.variant}>{meta.label}</Badge>
                <span className="tabular-nums text-muted-foreground">
                  {summary.statusCounts[s]}
                </span>
              </span>
            );
          })}
        </div>
      </section>

      {summary.themes.map((theme) => (
        <Card key={theme.id}>
          <CardHeader>
            <CardTitle>{theme.title}</CardTitle>
            {theme.blurb && <CardDescription>{theme.blurb}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-6">
            {theme.queries.length > 0 && (
              <FieldGroup
                heading={`Queries · ${theme.queries.length}`}
                fields={theme.queries}
              />
            )}
            {theme.mutations.length > 0 && (
              <FieldGroup
                heading={`Mutations · ${theme.mutations.length}`}
                fields={theme.mutations}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FieldGroup({
  heading,
  fields,
}: {
  heading: string;
  fields: import("@/lib/api-summary").ApiField[];
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {heading}
      </div>
      <ul className="divide-y divide-border rounded-md border border-border">
        {fields.map((f) => {
          const meta = STATUS_META[f.status];
          const Icon = meta.icon;
          return (
            <li
              key={f.fqn}
              className="flex items-start gap-3 p-3 text-sm hover:bg-accent/30 transition-colors"
            >
              <Icon
                className={
                  f.status === "ok"
                    ? "h-4 w-4 mt-0.5 shrink-0 text-success"
                    : f.status === "blocked-scope" ||
                        f.status === "blocked-error"
                      ? "h-4 w-4 mt-0.5 shrink-0 text-destructive"
                      : f.status === "empty"
                        ? "h-4 w-4 mt-0.5 shrink-0 text-warning-foreground"
                        : "h-4 w-4 mt-0.5 shrink-0 text-muted-foreground"
                }
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <code className="font-mono text-[12px] text-foreground break-all">
                    {f.signature}
                  </code>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                {f.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {f.description}
                  </p>
                )}
                {f.note && (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    {f.note}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
