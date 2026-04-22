import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 h-14">
        <Link href="/" className="font-semibold tracking-tight text-sm">
          upwork-crm
          <span className="ml-2 text-muted-foreground text-xs font-mono font-normal">
            :4417
          </span>
        </Link>

        <nav className="flex gap-1 text-sm text-muted-foreground">
          <Link
            href="/leads"
            className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-accent transition-colors"
          >
            Leads
          </Link>
          <Link
            href="/rooms"
            className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-accent transition-colors"
          >
            Rooms
          </Link>
          <Link
            href="/contracts"
            className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-accent transition-colors"
          >
            Contracts
          </Link>
          <Link
            href="/analytics"
            className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-accent transition-colors"
          >
            Analytics
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground font-mono select-none">
            <span>⌘</span>K
          </kbd>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
