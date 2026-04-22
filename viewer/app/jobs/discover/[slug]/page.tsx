import { notFound } from "next/navigation";
import Link from "next/link";
import { getScanJobs, type ScanJob } from "@/lib/fixtures";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { MapPinIcon } from "lucide-react";

const SCANNER_LABELS: Record<string, string> = {
  strapi: "Strapi",
  sanity: "Sanity",
  "next-js": "Next.js",
  astro: "Astro",
  aem: "AEM",
  wordpress: "WordPress",
  shopify: "Shopify",
  react: "React",
  "nest-js": "Nest.js",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtBudget(job: ScanJob): string {
  if (job.type === "HOURLY") {
    const min = job.hourlyBudgetMin;
    const max = job.hourlyBudgetMax;
    if (min > 0 && max > 0) return `$${min}–$${max}/hr`;
    if (min > 0) return `$${min}+/hr`;
    return "Hourly (negotiable)";
  }
  const v = parseFloat(job.amount.rawValue);
  if (v > 0)
    return v.toLocaleString("en-US", {
      style: "currency",
      currency: job.amount.currency,
      maximumFractionDigits: 0,
    });
  return "Fixed (negotiable)";
}

function avgBudget(jobs: ScanJob[]): string {
  const fixed = jobs
    .filter((j) => j.type === "FIXED")
    .map((j) => parseFloat(j.amount.rawValue))
    .filter((v) => v > 0);
  const hourly = jobs
    .filter((j) => j.type === "HOURLY")
    .map((j) => (j.hourlyBudgetMin + j.hourlyBudgetMax) / 2)
    .filter((v) => v > 0);

  if (fixed.length === 0 && hourly.length === 0) return "—";
  if (fixed.length > 0 && hourly.length === 0) {
    const avg = fixed.reduce((a, b) => a + b, 0) / fixed.length;
    return `$${Math.round(avg).toLocaleString()}`;
  }
  if (hourly.length > 0 && fixed.length === 0) {
    const avg = hourly.reduce((a, b) => a + b, 0) / hourly.length;
    return `$${Math.round(avg)}/hr avg`;
  }
  return "Mixed";
}

function avgApplicants(jobs: ScanJob[]): string {
  const vals = jobs.map((j) => j.totalApplicants).filter((v) => v > 0);
  if (vals.length === 0) return "—";
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg).toString();
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ScannerPage({ params }: PageProps) {
  const { slug } = await params;

  if (!(slug in SCANNER_LABELS)) notFound();

  const label = SCANNER_LABELS[slug]!;
  const data = getScanJobs(slug);

  if (!data) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/jobs/discover" />}>
                Discover
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{label}</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>

        <PageHeader
          eyebrow="Discover"
          title={`${label} jobs`}
          question={`What ${label} jobs are posted on Upwork right now?`}
          soWhat={`No scan data yet. Run: pnpm cli research:scans`}
        />
      </div>
    );
  }

  const jobs = data.jobs;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/jobs/discover" />}>
              Discover
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>{label}</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        eyebrow="Discover"
        title={`${label} jobs`}
        question={`What ${label} jobs are posted on Upwork right now?`}
        soWhat={`${jobs.length} open jobs · refreshed ${fmtDateTime(data.fetchedAt)}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total jobs" value={jobs.length} />
        <KpiCard label="Avg budget" value={avgBudget(jobs)} />
        <KpiCard label="Avg applicants" value={avgApplicants(jobs)} />
        <KpiCard
          label="Last refresh"
          value={fmtDate(data.fetchedAt)}
          hint="14-day window"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => (
          <Card key={job.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-semibold leading-snug line-clamp-3">
                  {job.title}
                </CardTitle>
                <Badge
                  variant={job.type === "HOURLY" ? "outline" : "secondary"}
                  className="shrink-0 text-xs"
                >
                  {job.type === "HOURLY" ? "Hourly" : "Fixed"}
                </Badge>
              </div>
              <CardDescription
                className="text-base font-semibold tabular-nums"
                style={{ color: "var(--color-chart-2)" }}
              >
                {fmtBudget(job)}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-3 pt-0 flex-1">
              <p className="text-xs text-muted-foreground line-clamp-3">
                {job.description.slice(0, 220)}
                {job.description.length > 220 ? "…" : ""}
              </p>

              {job.skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {job.skills.slice(0, 3).map((s) => (
                    <Badge
                      key={s.name}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {s.prettyName}
                    </Badge>
                  ))}
                  {job.skills.length > 3 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      +{job.skills.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <div className="mt-auto space-y-1.5 text-xs text-muted-foreground">
                {job.client.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPinIcon className="h-3 w-3 shrink-0" />
                    <span>
                      {[job.client.location.city, job.client.location.country]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px]">
                    {fmtDate(job.publishedDateTime)} · {job.totalApplicants}{" "}
                    applicants
                  </span>
                  <a
                    href={`https://www.upwork.com/jobs/${job.ciphertext}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline"
                  >
                    Apply ↗
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
