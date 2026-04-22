import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { HudBar } from "@/components/app/hud-bar";
import { CommandPalette } from "@/components/command-palette";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getLeads, getOffers, getRooms } from "@/lib/fixtures";
import { TenantSwitcher } from "@/components/tenant-switcher";
import { Suspense } from "react";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Upwork CRM by Alpina Tech",
  description: "Upwork CRM by Alpina Tech — local viewer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const leads = getLeads();
  const rooms = getRooms();
  const contracts = rooms.rooms.filter((r) => r.contractId).length;
  const offers = getOffers();

  return (
    <html
      lang="en"
      className={cn(geistSans.variable, geistMono.variable, "dark")}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider>
            <CommandPalette />
            <HudBar />
            <SidebarProvider>
              <AppSidebar
                counts={{
                  leads: leads.count,
                  rooms: rooms.count,
                  contracts,
                  offers: offers.count,
                  generatedAt: leads.generatedAt,
                }}
              />
              <SidebarInset>
                <header className="sticky top-6 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mx-1 h-5" />
                  <Suspense fallback={null}>
                    <TenantSwitcher />
                  </Suspense>
                  <Separator orientation="vertical" className="mx-1 h-5" />
                  <span className="text-sm text-muted-foreground">
                    {rooms.count} rooms · {leads.count} leads ·{" "}
                    {leads.totalMessages.toLocaleString("en-US")} messages
                  </span>
                  <kbd className="ml-auto hidden items-center gap-1 rounded border border-border/60 bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground select-none sm:inline-flex">
                    <span>⌘</span>K
                  </kbd>
                </header>
                <main className="flex-1 px-4 py-6 md:px-8">
                  <div className="mx-auto w-full max-w-[1500px]">
                    {children}
                  </div>
                </main>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
