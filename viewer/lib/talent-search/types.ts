export type Region = "world" | "europe" | "ua";

export const KEYWORDS = [
  "Next.js",
  "Next.js developer",
  "React",
  "React developer",
  "Astro",
  "Astro developer",
  "Astro CMS",
  "Headless",
  "Headless developer",
  "Headless CMS",
  "Strapi",
  "Strapi developer",
  "Payload",
  "Sanity",
] as const;

export type Keyword = (typeof KEYWORDS)[number];

export interface RankingEntry {
  date: string; // e.g. "13.03.26" (DD.MM.YY)
  weekViews: number | null;
  weekInbound: string | null;
  rankings: Array<{
    keyword: Keyword;
    world: number | null;
    europe: number | null;
    ua: number | null;
  }>;
  steps: string | null;
}

export interface TalentRankingDataset {
  source: "api" | "csv" | "localstorage" | "mock";
  fetchedAt: string;
  profileTitle: string | null;
  entries: RankingEntry[];
}
