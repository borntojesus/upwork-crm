import type { TenantSlug } from "@/lib/tenants";
import { TENANTS, TENANT_COLOR } from "@/lib/tenants";

interface TenantBadgeProps {
  tenants: TenantSlug[];
  size?: "sm" | "xs";
}

export function TenantBadge({ tenants, size = "sm" }: TenantBadgeProps) {
  const sizeClass =
    size === "xs" ? "h-4 px-1.5 text-[10px]" : "h-5 px-2 text-[11px]";

  return (
    <span className="inline-flex items-center gap-1">
      {tenants.map((slug) => {
        const meta = TENANTS.find((t) => t.slug === slug);
        const color = TENANT_COLOR[slug];
        return (
          <span
            key={slug}
            className={`inline-flex items-center rounded-full font-medium leading-none ${sizeClass}`}
            style={{
              background: `color-mix(in srgb, ${color} 15%, transparent)`,
              color,
              border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
            }}
          >
            {meta?.shortLabel ?? slug}
          </span>
        );
      })}
    </span>
  );
}
