/**
 * stat.tsx — Big-number stat card.
 * Server-side safe (no "use client" needed).
 */

export interface StatProps {
  label: string;
  value: string | number;
  sub?: string;
  /** Optional accent color applied to the value text via inline style. */
  accentColor?: string;
}

export function Stat({ label, value, sub, accentColor }: StatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-5 py-4">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className="text-3xl font-bold tabular-nums leading-none"
        style={accentColor ? { color: accentColor } : undefined}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}
