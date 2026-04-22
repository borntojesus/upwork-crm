"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BarChart3Icon,
  BookOpenIcon,
  BriefcaseIcon,
  ClockIcon,
  DollarSignIcon,
  HandshakeIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  PlugIcon,
  RadarIcon,
  SearchIcon,
  SparklesIcon,
  TableIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";

interface SidebarCounts {
  leads: number;
  rooms: number;
  contracts: number;
  offers: number;
  generatedAt: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

// Sub-paths that have their own sidebar entry — parent should not highlight
const EXACT_ONLY_PREFIXES: Record<string, string[]> = {
  "/freelancers": ["/freelancers/manual"],
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  // If a more-specific sibling entry covers this path, don't highlight parent
  const exclusions = EXACT_ONLY_PREFIXES[href] ?? [];
  if (exclusions.some((ex) => pathname === ex || pathname.startsWith(`${ex}/`)))
    return false;
  return true;
}

export function AppSidebar({ counts }: { counts: SidebarCounts }) {
  const pathname = usePathname();

  const main: NavItem[] = [
    { label: "Dashboard", href: "/", icon: LayoutDashboardIcon },
    { label: "Leads", href: "/leads", icon: UsersIcon, badge: counts.leads },
    {
      label: "Rooms",
      href: "/rooms",
      icon: MessageSquareIcon,
      badge: counts.rooms,
    },
    {
      label: "Contracts",
      href: "/contracts",
      icon: BriefcaseIcon,
      badge: counts.contracts,
    },
    {
      label: "Offers",
      href: "/offers",
      icon: HandshakeIcon,
      badge: counts.offers,
    },
    {
      label: "Earnings",
      href: "/earnings",
      icon: DollarSignIcon,
    },
    {
      label: "Jobs (applied)",
      href: "/jobs/applied",
      icon: BriefcaseIcon,
    },
    {
      label: "Jobs (discover)",
      href: "/jobs/discover",
      icon: SearchIcon,
    },
    {
      label: "Stats",
      href: "/stats",
      icon: TableIcon,
    },
  ];

  const analytics: NavItem[] = [
    { label: "Overview", href: "/analytics", icon: BarChart3Icon },
    {
      label: "Top clients",
      href: "/analytics/clients",
      icon: TrendingUpIcon,
    },
    {
      label: "Response times",
      href: "/analytics/response-times",
      icon: ClockIcon,
    },
  ];

  const marketResearch: NavItem[] = [
    { label: "Top freelancers", href: "/freelancers", icon: SparklesIcon },
    {
      label: "Manual observations",
      href: "/freelancers/manual",
      icon: UsersIcon,
    },
    {
      label: "Talent search",
      href: "/talent-search-stats",
      icon: RadarIcon,
    },
  ];

  const platform: NavItem[] = [
    { label: "API summary", href: "/api", icon: PlugIcon },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-primary-foreground"
            style={{ background: "var(--color-chart-1)" }}
            aria-hidden
          >
            U
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold tracking-tight">
              Upwork CRM
            </span>
            <span className="truncate text-[10px] font-mono text-muted-foreground">
              by Alpina Tech · :4417
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(pathname, item.href)}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.badge !== undefined && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analytics.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(pathname, item.href)}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Market research</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {marketResearch.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(pathname, item.href)}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {platform.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(pathname, item.href)}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Docs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive(pathname, "/ideas")}
                  tooltip="Ideas"
                  render={<Link href="/ideas" />}
                >
                  <BookOpenIcon />
                  <span>Ideas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Quick search (⌘K)"
              onClick={() => {
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true }),
                );
              }}
            >
              <SearchIcon />
              <span>Search</span>
              <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] group-data-[collapsible=icon]:hidden md:inline-flex">
                ⌘K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-0">
          <ThemeToggle />
          <div className="flex min-w-0 flex-1 flex-col text-[10px] leading-tight text-muted-foreground group-data-[collapsible=icon]:hidden">
            <span className="truncate">data fresh</span>
            <span className="truncate font-mono tabular-nums">
              {new Date(counts.generatedAt).toLocaleDateString("en-GB", {
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
