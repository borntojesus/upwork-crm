import { CheckCircle, AlertCircle } from "lucide-react";

interface Props {
  improvements: string[];
}

export function ImprovementsChecklist({ improvements }: Props) {
  if (!improvements.length) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No improvement suggestions recorded.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {improvements.map((item, i) => {
        const isPositive = /add|includ|expand|highlight/i.test(item);
        return (
          <li
            key={i}
            className="flex items-start gap-3 rounded-lg border border-border/60 bg-card px-4 py-3"
          >
            {isPositive ? (
              <CheckCircle className="mt-0.5 size-4 shrink-0 text-[color:var(--color-success)]" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-[color:var(--color-warning)]" />
            )}
            <span className="text-sm leading-snug">{item}</span>
          </li>
        );
      })}
    </ul>
  );
}
