/**
 * freelancer-categories.ts — registry of tech categories for top-freelancer research.
 */

export interface CategoryDef {
  slug: string; // "react" / "next-js" / "node-js" / "fullstack"
  label: string;
  skillExpression: string; // passed to keyword searchFilter
  primaryKeyword: string; // "React" — for density calc
  keywords: string[]; // all related keywords to count
  topN: number; // how many freelancers to fetch
}

export const CATEGORIES: CategoryDef[] = [
  {
    slug: "react",
    label: "React.js",
    skillExpression: "React.js",
    primaryKeyword: "React",
    keywords: [
      "React",
      "ReactJS",
      "React.js",
      "Redux",
      "Next.js",
      "hooks",
      "TSX",
      "JSX",
    ],
    topN: 10,
  },
  {
    slug: "next-js",
    label: "Next.js",
    skillExpression: "Next.js",
    primaryKeyword: "Next.js",
    keywords: [
      "Next.js",
      "NextJS",
      "Next 13",
      "Next 14",
      "App Router",
      "RSC",
      "Vercel",
    ],
    topN: 10,
  },
  {
    slug: "node-js",
    label: "Node.js",
    skillExpression: "Node.js",
    primaryKeyword: "Node.js",
    keywords: [
      "Node.js",
      "NodeJS",
      "Express",
      "NestJS",
      "Fastify",
      "TypeScript",
      "GraphQL",
    ],
    topN: 10,
  },
  {
    slug: "fullstack",
    label: "Fullstack Developer",
    skillExpression: "Full Stack Developer",
    primaryKeyword: "Fullstack",
    keywords: [
      "Full Stack",
      "Fullstack",
      "React",
      "Node.js",
      "TypeScript",
      "PostgreSQL",
      "MongoDB",
    ],
    topN: 10,
  },
];
