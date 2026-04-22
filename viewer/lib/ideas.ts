import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, relative, extname, basename, dirname } from "node:path";
import matter from "gray-matter";

const IDEAS_ROOT = resolve(process.cwd(), "..", "fixtures", "ideas");

export interface IdeaFrontmatter {
  title: string;
  slug?: string;
  status?: "idea" | "planned" | "in-progress" | "shipped";
  priority?: "p0" | "p1" | "p2";
  impact?: "high" | "medium" | "low";
  effort?: "S" | "M" | "L" | "XL";
  audience?: string[];
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IdeaFile {
  slug: string; // relative path without extension, e.g. "00-roadmap/01-lead-scoring"
  title: string;
  frontmatter: IdeaFrontmatter;
  body: string; // markdown body (after frontmatter)
  isIndex: boolean; // true if basename is _index
  dir: string; // parent dir slug (relative)
}

export interface IdeaNode {
  name: string; // folder or file display name
  slug: string; // relative to ideas root (no extension)
  type: "folder" | "file";
  children?: IdeaNode[];
  frontmatter?: IdeaFrontmatter;
}

function parseFrontmatter(filePath: string): {
  frontmatter: IdeaFrontmatter;
  body: string;
} {
  const raw = readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  const fm = parsed.data as IdeaFrontmatter;
  return { frontmatter: fm, body: parsed.content.trim() };
}

function slugFrom(absPath: string): string {
  const rel = relative(IDEAS_ROOT, absPath);
  // Remove extension
  return rel.replace(/\.md$/, "").replace(/\\/g, "/");
}

function displayName(slug: string): string {
  const base = slug.split("/").pop() ?? slug;
  // Strip leading number prefix (e.g. "01-lead-scoring-engine" → "Lead Scoring Engine")
  const withoutPrefix = base.replace(/^\d+-/, "");
  // Replace hyphens with spaces and title-case
  return withoutPrefix
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildNode(absPath: string): IdeaNode | null {
  const stat = statSync(absPath);
  const base = basename(absPath);

  if (stat.isDirectory()) {
    // Read children, sorted by name
    let entries: string[] = [];
    try {
      entries = readdirSync(absPath).sort();
    } catch {
      return null;
    }

    const children: IdeaNode[] = [];
    let folderFrontmatter: IdeaFrontmatter | undefined;

    for (const entry of entries) {
      const childPath = join(absPath, entry);
      if (entry === "_index.md") {
        try {
          const { frontmatter } = parseFrontmatter(childPath);
          folderFrontmatter = frontmatter;
        } catch {
          /* ignore */
        }
        continue; // _index handled as folder metadata, not a child node
      }
      const node = buildNode(childPath);
      if (node) children.push(node);
    }

    const slug = slugFrom(absPath);
    const name = folderFrontmatter?.title ?? displayName(slug);

    return {
      name,
      slug,
      type: "folder",
      children,
      frontmatter: folderFrontmatter,
    };
  }

  if (stat.isFile() && base.endsWith(".md") && base !== "_index.md") {
    const slug = slugFrom(absPath);
    try {
      const { frontmatter } = parseFrontmatter(absPath);
      const name = frontmatter.title ?? displayName(slug);
      return { name, slug, type: "file", frontmatter };
    } catch {
      return null;
    }
  }

  return null;
}

export function readIdeaTree(): IdeaNode {
  if (!existsSync(IDEAS_ROOT)) {
    return { name: "Ideas", slug: "", type: "folder", children: [] };
  }

  const entries = readdirSync(IDEAS_ROOT).sort();
  const children: IdeaNode[] = [];
  let rootFrontmatter: IdeaFrontmatter | undefined;

  for (const entry of entries) {
    const absPath = join(IDEAS_ROOT, entry);
    if (entry === "_index.md") {
      try {
        const { frontmatter } = parseFrontmatter(absPath);
        rootFrontmatter = frontmatter;
      } catch {
        /* ignore */
      }
      continue;
    }
    const node = buildNode(absPath);
    if (node) children.push(node);
  }

  return {
    name: rootFrontmatter?.title ?? "Ideas",
    slug: "",
    type: "folder",
    children,
    frontmatter: rootFrontmatter,
  };
}

export function readIdea(slug: string): IdeaFile | null {
  // slug can be "00-roadmap/01-lead-scoring-engine" or "" (root index)
  let absPath: string;

  if (slug === "" || slug === "_index") {
    absPath = join(IDEAS_ROOT, "_index.md");
  } else {
    // Could be a file or a folder index
    const direct = join(IDEAS_ROOT, `${slug}.md`);
    const indexPath = join(IDEAS_ROOT, slug, "_index.md");

    if (existsSync(direct)) {
      absPath = direct;
    } else if (existsSync(indexPath)) {
      absPath = indexPath;
    } else {
      return null;
    }
  }

  if (!existsSync(absPath)) return null;

  try {
    const { frontmatter, body } = parseFrontmatter(absPath);
    const isIndex = basename(absPath) === "_index.md";
    const relDir = relative(IDEAS_ROOT, dirname(absPath));
    const dir = relDir === "." ? "" : relDir.replace(/\\/g, "/");

    const fileSlug =
      slug === "" || slug === "_index"
        ? ""
        : isIndex
          ? slug.replace(/\/_index$/, "")
          : slug;

    return {
      slug: fileSlug,
      title: frontmatter.title ?? displayName(fileSlug),
      frontmatter,
      body,
      isIndex,
      dir,
    };
  } catch {
    return null;
  }
}

function collectFiles(dir: string): IdeaFile[] {
  if (!existsSync(dir)) return [];
  const results: IdeaFile[] = [];
  const entries = readdirSync(dir).sort();

  for (const entry of entries) {
    const absPath = join(dir, entry);
    const stat = statSync(absPath);

    if (stat.isDirectory()) {
      results.push(...collectFiles(absPath));
    } else if (
      stat.isFile() &&
      entry.endsWith(".md") &&
      entry !== "_index.md"
    ) {
      const slug = slugFrom(absPath);
      try {
        const { frontmatter, body } = parseFrontmatter(absPath);
        const relDir = relative(IDEAS_ROOT, dirname(absPath)).replace(
          /\\/g,
          "/",
        );
        results.push({
          slug,
          title: frontmatter.title ?? displayName(slug),
          frontmatter,
          body,
          isIndex: false,
          dir: relDir === "." ? "" : relDir,
        });
      } catch {
        /* skip malformed */
      }
    }
  }

  return results;
}

export function listAllIdeas(): IdeaFile[] {
  return collectFiles(IDEAS_ROOT);
}

export function ideaStats(): {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
} {
  const ideas = listAllIdeas();
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  for (const idea of ideas) {
    const status = idea.frontmatter.status ?? "idea";
    byStatus[status] = (byStatus[status] ?? 0) + 1;

    const priority = idea.frontmatter.priority;
    if (priority) {
      byPriority[priority] = (byPriority[priority] ?? 0) + 1;
    }
  }

  return { total: ideas.length, byStatus, byPriority };
}
