import { cn } from "@/lib/utils";

export interface ChartFrameProps {
  hypothesis: string;
  soWhat?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartFrame({
  hypothesis,
  soWhat,
  children,
  className,
}: ChartFrameProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card px-6 py-5",
        className,
      )}
    >
      <h2 className="text-sm font-semibold leading-snug">{hypothesis}</h2>
      {soWhat && (
        <p className="mt-1 mb-4 text-xs text-muted-foreground">{soWhat}</p>
      )}
      {!soWhat && <div className="mb-4" />}
      {children}
    </div>
  );
}
