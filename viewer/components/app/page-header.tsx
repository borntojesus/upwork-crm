import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface PageHeaderProps {
  eyebrow?: string;
  audiences?: string[];
  cadence?: string;
  title: string;
  question: string;
  soWhat: string;
  bannerSrc?: string;
  className?: string;
}

export function PageHeader({
  eyebrow,
  audiences,
  cadence,
  title,
  question,
  soWhat,
  bannerSrc,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-card px-6 py-7 md:px-8",
        className,
      )}
    >
      {/* Banner image with gradient fade */}
      {bannerSrc && (
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: `url(${bannerSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage:
              "linear-gradient(to right, transparent 0%, black 40%, black 60%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 40%, black 60%, transparent 100%)",
          }}
          aria-hidden
        />
      )}

      {/* Grid background overlay */}
      <div
        className="grid-bg pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
      />

      {/* Glow */}
      <div
        className="glow-primary pointer-events-none absolute -top-20 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full opacity-30"
        aria-hidden
      />

      <div className="relative flex flex-col gap-4">
        {/* Eyebrow row */}
        {(eyebrow || audiences || cadence) && (
          <div className="flex flex-wrap items-center gap-2">
            {eyebrow && (
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {eyebrow}
              </span>
            )}
            {audiences?.map((a) => (
              <Badge
                key={a}
                variant="secondary"
                className="text-[10px] uppercase tracking-wider"
              >
                {a}
              </Badge>
            ))}
            {cadence && (
              <Badge
                variant="outline"
                className="gap-1 text-[10px] uppercase tracking-wider"
              >
                <span className="relative flex size-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--success)] opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[color:var(--success)]" />
                </span>
                {cadence}
              </Badge>
            )}
          </div>
        )}

        {/* Title */}
        <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-[28px] md:leading-tight">
          {title}
        </h1>

        {/* Question + so-what pinned lines */}
        <div className="flex flex-col gap-1.5 border-l-2 border-primary/40 pl-4">
          <p className="text-sm font-medium text-foreground/80">
            <span className="text-muted-foreground">Q: </span>
            {question}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground/60">A: </span>
            {soWhat}
          </p>
        </div>
      </div>
    </div>
  );
}
