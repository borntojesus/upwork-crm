"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  TENANTS,
  ALL_TENANTS,
  parseTenants,
  TENANT_COLOR,
} from "@/lib/tenants";
import type { TenantSlug } from "@/lib/tenants";
import type { TenantCounts } from "@/lib/tenant-counts";

interface TenantSwitcherProps {
  counts?: TenantCounts;
}

export function TenantSwitcher({ counts }: TenantSwitcherProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const active = parseTenants(searchParams.get("t") ?? undefined);
  const isAll = active.length === ALL_TENANTS.length;

  function buildUrl(tenants: TenantSlug[]): string {
    const params = new URLSearchParams(searchParams.toString());
    if (tenants.length === ALL_TENANTS.length) {
      params.delete("t");
    } else {
      params.set("t", tenants.join(","));
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function handleAll() {
    router.push(buildUrl(ALL_TENANTS));
  }

  function handleTenant(slug: TenantSlug, e: React.MouseEvent) {
    if (e.shiftKey) {
      // shift-click: toggle without clearing others
      const next = active.includes(slug)
        ? active.filter((t) => t !== slug)
        : [...active, slug];
      router.push(buildUrl(next.length === 0 ? ALL_TENANTS : next));
    } else {
      // plain click: if already the sole selection, go back to all; else isolate
      if (active.length === 1 && active[0] === slug) {
        router.push(buildUrl(ALL_TENANTS));
      } else {
        router.push(buildUrl([slug]));
      }
    }
  }

  const totalCount = counts
    ? ALL_TENANTS.reduce((sum, t) => sum + (counts[t] ?? 0), 0)
    : null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* All pill */}
      <button
        className={[
          "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all cursor-pointer select-none",
          isAll
            ? "bg-foreground/10 text-foreground ring-1 ring-foreground/20"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        ].join(" ")}
        onClick={handleAll}
        title="Show all tenants"
      >
        All
        {totalCount !== null && (
          <span
            className={[
              "inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums leading-none",
              isAll
                ? "bg-foreground/15 text-foreground/80"
                : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {totalCount}
          </span>
        )}
      </button>

      {/* Per-tenant pills */}
      {TENANTS.map(({ slug, shortLabel }) => {
        const isSoleActive = active.length === 1 && active[0] === slug;
        const isPartialActive = !isAll && active.includes(slug);
        const isActive = isSoleActive || isPartialActive;
        const color = TENANT_COLOR[slug];
        const count = counts?.[slug] ?? null;

        return (
          <button
            key={slug}
            className={[
              "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all cursor-pointer select-none",
              isActive
                ? "ring-1"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            ].join(" ")}
            style={
              isActive
                ? {
                    background: `color-mix(in srgb, ${color} 12%, transparent)`,
                    color,
                    // ring via box-shadow since inline style can't use Tailwind ring util
                    boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 35%, transparent)`,
                  }
                : undefined
            }
            onClick={(e) => handleTenant(slug, e)}
            title="Shift-click to add to selection"
          >
            {/* Colored dot */}
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: color }}
              aria-hidden
            />
            {shortLabel}
            {count !== null && (
              <span
                className="inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums leading-none"
                style={
                  isActive
                    ? {
                        background: `color-mix(in srgb, ${color} 20%, transparent)`,
                        color,
                      }
                    : undefined
                }
                aria-label={`${count} leads`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
