import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTopFreelancers,
  getFreelancerSnapshot,
  listFreelancerSnapshots,
} from "@/lib/fixtures";
import { PageHeader } from "@/components/app/page-header";
import { ChartFrame } from "@/components/app/chart-frame";
import { Badge } from "@/components/ui/badge";
import { FreelancerCard } from "@/components/freelancers/freelancer-card";
import { KeywordDensityBar } from "@/components/freelancers/keyword-density-bar";
import { ImprovementsChecklist } from "@/components/freelancers/improvements-checklist";
import { HistoryTimeline } from "@/components/freelancers/history-timeline";

interface Props {
  params: Promise<{ category: string; profileKey: string }>;
}

export default async function FreelancerDetailPage({ params }: Props) {
  const { category, profileKey } = await params;
  const decodedKey = decodeURIComponent(profileKey);

  const data = getTopFreelancers();
  const snapshot = getFreelancerSnapshot(decodedKey);
  const snapshots = listFreelancerSnapshots(decodedKey);

  const cat = data?.categories.find((c) => c.slug === category);
  const summary = cat?.freelancers.find((f) => f.profileKey === decodedKey);

  // Need at least one of: snapshot or summary
  if (!snapshot && !summary) notFound();

  const profile = snapshot?.profile;
  const name = profile?.user?.name ?? summary?.name ?? decodedKey;
  const photoUrl = profile?.user?.photoUrl ?? summary?.photoUrl ?? null;
  const title = profile?.title ?? summary?.title ?? null;
  const location = profile?.user?.location ?? summary?.location ?? null;
  const hourlyRateDisplay =
    profile?.hourlyRate?.displayValue ?? summary?.hourlyRateDisplay ?? null;
  const jss = profile?.jobSuccessScore ?? summary?.jobSuccessScore ?? null;
  const topRatedStatus =
    profile?.topRatedStatus ?? summary?.topRatedStatus ?? null;
  const totalEarningsDisplay =
    profile?.totalEarnings?.displayValue ??
    summary?.totalEarningsDisplay ??
    null;
  const totalHours = profile?.totalHours ?? summary?.totalHours ?? null;

  const catLabel = cat?.label ?? category;

  const soWhat = [
    title,
    hourlyRateDisplay,
    jss != null ? `${jss}% JSS` : null,
    summary ? `rank #${summary.rank}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link href="/freelancers" className="hover:text-foreground">
          Freelancers
        </Link>
        <span>/</span>
        <Link
          href={`/freelancers/${category}`}
          className="hover:text-foreground"
        >
          {catLabel}
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{name}</span>
      </nav>

      <PageHeader
        eyebrow={`Market research · ${catLabel}`}
        title={name}
        question="What makes this freelancer rank high, and what can we learn?"
        soWhat={soWhat || "Profile captured — see details below"}
      />

      {/* Header card */}
      <FreelancerCard
        profileKey={decodedKey}
        name={name}
        photoUrl={photoUrl}
        title={title}
        location={location ?? null}
        hourlyRateDisplay={hourlyRateDisplay}
        jobSuccessScore={jss}
        topRatedStatus={topRatedStatus}
        totalEarningsDisplay={totalEarningsDisplay}
        totalHours={totalHours}
      />

      {profile ? (
        <>
          {/* Overview */}
          {profile.overview && (
            <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Overview
                </h2>
              </div>
              <div className="px-5 py-4 max-w-3xl text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                {profile.overview}
              </div>
            </section>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Skills ({profile.skills.length})
                </h2>
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <Badge key={s.name} variant="secondary" className="text-xs">
                    {s.name}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Employment */}
          {profile.employment && profile.employment.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Employment
                </h2>
              </div>
              <div className="divide-y divide-border/60">
                {profile.employment.map((e, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{e.role ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.company ?? "Unknown company"}
                        </p>
                      </div>
                      {(e.from || e.to) && (
                        <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {e.from ?? "?"} – {e.to ?? "present"}
                        </p>
                      )}
                    </div>
                    {e.description && (
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {e.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {profile.education && profile.education.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Education
                </h2>
              </div>
              <div className="divide-y divide-border/60">
                {profile.education.map((e, i) => (
                  <div
                    key={i}
                    className="px-5 py-3 flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{e.degree ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.institution ?? "Unknown"}
                      </p>
                    </div>
                    {(e.from || e.to) && (
                      <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {e.from ?? "?"} – {e.to ?? "present"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {profile.certifications && profile.certifications.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Certifications
                </h2>
              </div>
              <div className="divide-y divide-border/60">
                {profile.certifications.map((c, i) => (
                  <div
                    key={i}
                    className="px-5 py-3 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.issuer ?? ""}
                      </p>
                    </div>
                    {c.year && (
                      <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {c.year}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Portfolio */}
          {profile.portfolio && profile.portfolio.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Portfolio ({profile.portfolio.length})
                </h2>
              </div>
              <div className="p-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.portfolio.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/60 bg-muted/20 p-4 flex flex-col gap-1"
                  >
                    <p className="text-sm font-medium line-clamp-1">
                      {p.title ?? "Untitled"}
                    </p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {p.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Languages */}
          {profile.languages && profile.languages.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Languages
                </h2>
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-2">
                {profile.languages.map((l, i) => (
                  <Badge key={i} variant="outline" className="text-xs gap-1">
                    {l.name}
                    {l.proficiency && (
                      <span className="text-muted-foreground">
                        · {l.proficiency}
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Detailed snapshot not yet captured for this profile.
          </p>
        </div>
      )}

      {/* Analysis */}
      {summary && summary.keywordDensity.length > 0 && (
        <ChartFrame
          hypothesis="Keyword density — weighted score per tracked keyword"
          soWhat="Measures how deeply each keyword is woven through title, overview, skills, employment, and portfolio"
        >
          <KeywordDensityBar data={summary.keywordDensity} height={260} />
        </ChartFrame>
      )}

      {snapshot && (
        <ChartFrame
          hypothesis="Snapshot history"
          soWhat="Changes detected between successive captures"
        >
          <div className="pt-1">
            <HistoryTimeline snapshots={snapshots} latest={snapshot} />
          </div>
        </ChartFrame>
      )}

      {summary && summary.improvements.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              What to improve ({summary.improvements.length})
            </h2>
          </div>
          <div className="px-5 py-4">
            <ImprovementsChecklist improvements={summary.improvements} />
          </div>
        </section>
      )}
    </div>
  );
}
