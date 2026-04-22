import { ExternalLinkIcon, MapPinIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  profileKey: string;
  name: string | null;
  photoUrl: string | null;
  title: string | null;
  location: { country: string | null; city: string | null } | null;
  hourlyRateDisplay: string | null;
  jobSuccessScore: number | null;
  topRatedStatus: string | null;
  totalEarningsDisplay: string | null;
  totalHours: number | null;
}

function topRatedBadge(status: string | null) {
  if (!status) return null;
  const upper = status.toUpperCase();
  if (upper.includes("PLUS"))
    return (
      <Badge
        variant="outline"
        className="border-[color:var(--color-success)] text-[color:var(--color-success)]"
      >
        Top Rated+
      </Badge>
    );
  if (upper.includes("TOP_RATED") || upper.includes("TOP RATED"))
    return <Badge variant="secondary">Top Rated</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function jssBadge(jss: number | null) {
  if (jss == null) return null;
  const tone =
    jss >= 95
      ? "text-[color:var(--color-success)]"
      : jss >= 85
        ? "text-[color:var(--color-warning)]"
        : "text-[color:var(--color-danger)]";
  return (
    <span className={`text-sm font-semibold tabular-nums ${tone}`}>
      {jss}% JSS
    </span>
  );
}

export function FreelancerCard({
  profileKey,
  name,
  photoUrl,
  title,
  location,
  hourlyRateDisplay,
  jobSuccessScore,
  topRatedStatus,
  totalEarningsDisplay,
  totalHours,
}: Props) {
  const locationStr = [location?.city, location?.country]
    .filter(Boolean)
    .join(", ");

  const upworkUrl = `https://www.upwork.com/freelancers/~01${profileKey}`;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 flex flex-col gap-5 md:flex-row md:gap-8">
      {/* Avatar */}
      <div className="shrink-0 flex items-start justify-center">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name ?? profileKey}
            className="size-24 rounded-full object-cover border border-border/60"
          />
        ) : (
          <div
            className="size-24 rounded-full flex items-center justify-center text-3xl font-semibold text-primary-foreground"
            style={{ background: "var(--color-chart-1)" }}
            aria-hidden
          >
            {(name ?? profileKey).charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-3 min-w-0">
        <div>
          <h2 className="text-xl font-semibold">{name ?? profileKey}</h2>
          {title && (
            <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {topRatedBadge(topRatedStatus)}
          {jssBadge(jobSuccessScore)}
          {hourlyRateDisplay && (
            <span className="text-sm font-medium tabular-nums">
              {hourlyRateDisplay}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {locationStr && (
            <span className="inline-flex items-center gap-1">
              <MapPinIcon className="size-3" />
              {locationStr}
            </span>
          )}
          {totalEarningsDisplay && (
            <span>
              Earned:{" "}
              <span className="text-foreground/80">{totalEarningsDisplay}</span>
            </span>
          )}
          {totalHours != null && (
            <span>
              Hours:{" "}
              <span className="text-foreground/80 tabular-nums">
                {totalHours.toLocaleString()}
              </span>
            </span>
          )}
        </div>
        <a
          href={upworkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-fit"
        >
          <ExternalLinkIcon className="size-3" />
          Open on Upwork
        </a>
      </div>
    </div>
  );
}
