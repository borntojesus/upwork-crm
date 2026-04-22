"use client";

import * as React from "react";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export function HudBar({ className }: { className?: string }) {
  const [rtt, setRtt] = React.useState<string>("—");

  React.useEffect(() => {
    // Simulate RTT measurement
    const measure = () => {
      const t0 = performance.now();
      fetch("/api", { method: "HEAD" })
        .then(() => {
          const ms = Math.round(performance.now() - t0);
          setRtt(`${ms}ms`);
        })
        .catch(() => setRtt("—"));
    };
    measure();
    const id = setInterval(measure, 30_000);
    return () => clearInterval(id);
  }, []);

  const build = process.env.NEXT_PUBLIC_GIT_HASH?.slice(0, 7) ?? "dev";

  return (
    <div
      className={cn(
        "flex h-6 items-center gap-4 border-b border-border/40 bg-card/40 px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur-sm md:px-6",
        className,
      )}
      aria-label="System status"
    >
      <span className="inline-flex items-center gap-1.5 text-[color:var(--success)]">
        <span className="relative flex size-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--success)] opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-[color:var(--success)]" />
        </span>
        Live
      </span>
      <HudCell label="region" value="local" />
      <HudCell label="rtt" value={rtt} />
      <HudCell label="build" value={build} />
      <HudCell label="store" value="fixture" className="hidden sm:flex" />
      <div className="ml-auto hidden items-center gap-1.5 md:inline-flex">
        <Radio className="size-3" />
        <span>alpina · upwork-crm.v1</span>
      </div>
    </div>
  );
}

function HudCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="text-muted-foreground/60">{label}</span>
      <span className="text-foreground/80">{value}</span>
    </span>
  );
}
