import Link from "next/link";
import { getScansIndex } from "@/lib/fixtures";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SCANNERS = [
  { slug: "strapi", label: "Strapi" },
  { slug: "sanity", label: "Sanity" },
  { slug: "next-js", label: "Next.js" },
  { slug: "astro", label: "Astro" },
  { slug: "aem", label: "AEM" },
  { slug: "wordpress", label: "WordPress" },
  { slug: "shopify", label: "Shopify" },
  { slug: "react", label: "React" },
  { slug: "nest-js", label: "Nest.js" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DiscoverHubPage() {
  const index = getScansIndex();

  const countMap = new Map<string, { count: number; fetchedAt: string }>();
  if (index) {
    for (const s of index.scanners) {
      countMap.set(s.slug, { count: s.count, fetchedAt: s.fetchedAt });
    }
  }

  const totalJobs = index
    ? index.scanners.reduce((acc, s) => acc + s.count, 0)
    : 0;

  const soWhat = index
    ? `${totalJobs} open jobs across ${index.scanners.length} scanners · last refreshed ${fmtDate(index.fetchedAt)}`
    : "Run `pnpm cli research:scans` to populate scanner data.";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Scanners"
        title="Tech scanners"
        question="What's the pulse of my stack on Upwork?"
        soWhat={soWhat}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SCANNERS.map(({ slug, label }) => {
          const info = countMap.get(slug);
          return (
            <Link key={slug} href={`/jobs/discover/${slug}`}>
              <Card className="flex flex-col h-full transition-colors hover:border-primary/50 cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold">
                      {label}
                    </CardTitle>
                    {info ? (
                      <Badge variant="secondary" className="tabular-nums">
                        {info.count} jobs
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        no data
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    {info
                      ? `Refreshed ${fmtDate(info.fetchedAt)}`
                      : "Run research:scans to fetch"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
