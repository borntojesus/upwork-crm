import Link from "next/link";
import { notFound } from "next/navigation";
import { getFreelancerById } from "@/lib/fixtures";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { Badge } from "@/components/ui/badge";
import { ExternalLinkIcon } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function tierBadge(tier: string | null) {
  if (tier === "top-rated-plus")
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-success)] text-[color:var(--color-success)]"
      >
        Top Rated+
      </Badge>
    );
  if (tier === "top-rated") return <Badge variant="secondary">Top Rated</Badge>;
  if (tier === "rising-talent")
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-warning)] text-[color:var(--color-warning)]"
      >
        Rising Talent
      </Badge>
    );
  return <Badge variant="outline">Other</Badge>;
}

export default async function ManualFreelancerDetailPage({ params }: Props) {
  const { id } = await params;
  const freelancer = getFreelancerById(decodeURIComponent(id));

  if (!freelancer) notFound();

  const {
    name,
    title,
    photoUrl,
    location,
    hourlyRate,
    totalEarnings,
    jobSuccessScore,
    totalHours,
    totalJobs,
    reviews,
    skills,
    profileUrl,
    capturedAt,
    tier,
    notes,
  } = freelancer;

  const locationStr = [location.city, location.country]
    .filter(Boolean)
    .join(", ");

  const soWhat = [
    title ?? null,
    locationStr || null,
    hourlyRate ? `$${hourlyRate.rawValue}/hr` : null,
    jobSuccessScore != null ? `${jobSuccessScore}% JSS` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link href="/freelancers" className="hover:text-foreground">
          Freelancers
        </Link>
        <span>/</span>
        <Link href="/freelancers/manual" className="hover:text-foreground">
          Manual observations
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{name}</span>
      </nav>

      <PageHeader
        eyebrow="Freelancer profile"
        title={name}
        question="Who is this freelancer and how do they compare?"
        soWhat={soWhat}
      />

      {/* Profile card */}
      <div className="rounded-xl border border-border/60 bg-card p-6 flex flex-col gap-5 md:flex-row md:gap-8">
        {/* Avatar */}
        <div className="shrink-0 flex items-start justify-center">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={name}
              className="size-24 rounded-full object-cover border border-border/60"
            />
          ) : (
            <div
              className="size-24 rounded-full flex items-center justify-center text-3xl font-semibold text-primary-foreground"
              style={{ background: "var(--color-chart-1)" }}
              aria-hidden
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-3 min-w-0">
          <div>
            <h2 className="text-xl font-semibold">{name}</h2>
            {title && (
              <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tierBadge(tier)}
            {locationStr && (
              <span className="text-xs text-muted-foreground">
                {locationStr}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-mono bg-muted/40 border border-border/60 rounded px-2 py-0.5">
              {freelancer.id}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {skills.map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-fit"
            >
              <ExternalLinkIcon className="size-3" />
              Open on Upwork
            </a>
          )}
          <p className="text-[10px] text-muted-foreground">
            Captured {fmtDate(capturedAt)}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard
          label="Hourly rate"
          value={hourlyRate ? `$${hourlyRate.rawValue}` : "—"}
          hint={hourlyRate ? `per hour · ${hourlyRate.currency}` : undefined}
          tone="neutral"
        />
        <KpiCard
          label="JSS"
          value={jobSuccessScore != null ? `${jobSuccessScore}%` : "—"}
          tone={
            jobSuccessScore != null
              ? jobSuccessScore >= 95
                ? "positive"
                : jobSuccessScore >= 85
                  ? "warning"
                  : "danger"
              : "neutral"
          }
        />
        <KpiCard
          label="Total earnings"
          value={
            totalEarnings
              ? `$${Number(totalEarnings.rawValue).toLocaleString()}`
              : "—"
          }
          tone="neutral"
        />
        <KpiCard
          label="Total hours"
          value={totalHours != null ? totalHours.toLocaleString() : "—"}
          tone="neutral"
        />
        <KpiCard
          label="Jobs completed"
          value={totalJobs != null ? totalJobs : "—"}
          hint={
            reviews
              ? `${reviews.count} reviews · avg ${reviews.average}`
              : undefined
          }
          tone="neutral"
        />
      </div>

      {/* Notes */}
      {notes && (
        <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </h2>
          </div>
          <div className="px-5 py-4 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {notes}
          </div>
        </section>
      )}

      {/* Edit hint */}
      <p className="text-xs text-muted-foreground border border-border/60 rounded-lg px-4 py-3 bg-muted/30">
        Edit this profile in{" "}
        <code className="font-mono bg-muted px-1 py-0.5 rounded">
          fixtures/agent/freelancers.json
        </code>{" "}
        and reload to update.
      </p>
    </div>
  );
}
