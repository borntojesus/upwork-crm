"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { TENANTS, ALL_TENANTS, parseTenants } from "@/lib/tenants";
import type { TenantSlug } from "@/lib/tenants";

export function TenantSwitcher() {
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

  function handleAll(e: React.MouseEvent) {
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

  const baseClass =
    "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer select-none";
  const activeClass = "bg-primary/15 text-primary";
  const inactiveClass =
    "border border-border text-muted-foreground hover:text-foreground hover:border-border/80";

  return (
    <div className="flex items-center gap-1">
      <button
        className={`${baseClass} ${isAll ? activeClass : inactiveClass}`}
        onClick={handleAll}
        title="Show all tenants"
      >
        All
      </button>
      {TENANTS.map(({ slug, shortLabel }) => {
        const isSoleActive = active.length === 1 && active[0] === slug;
        const isPartialActive = !isAll && active.includes(slug);
        const isActive = isSoleActive || isPartialActive;
        return (
          <button
            key={slug}
            className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
            onClick={(e) => handleTenant(slug, e)}
            title={`Shift-click to toggle without clearing others`}
          >
            {shortLabel}
          </button>
        );
      })}
    </div>
  );
}
