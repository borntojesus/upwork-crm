"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FileTextIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IdeaNode } from "@/lib/ideas";

interface TreeNodeProps {
  node: IdeaNode;
  depth: number;
  currentSlug: string;
}

function TreeNode({ node, depth, currentSlug }: TreeNodeProps) {
  const router = useRouter();
  const [open, setOpen] = useState(() => {
    // Auto-open if current path is inside this folder
    if (node.type === "folder" && currentSlug.startsWith(node.slug)) {
      return true;
    }
    return depth === 0;
  });

  const indentPx = depth * 16;

  if (node.type === "folder") {
    const isRootFolder = node.slug === "";
    const folderSlug = isRootFolder ? "" : node.slug;
    const href = `/ideas${folderSlug ? `/${folderSlug}` : ""}`;
    const isActive =
      currentSlug === folderSlug || currentSlug === `${folderSlug}/_index`;

    return (
      <div>
        <button
          onClick={() => {
            setOpen((v) => !v);
            router.push(href);
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            isActive
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
          style={{ paddingLeft: `${indentPx + 8}px` }}
        >
          {open ? (
            <FolderOpenIcon className="size-3.5 shrink-0" />
          ) : (
            <FolderIcon className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children && node.children.length > 0 && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.slug}
                node={child}
                depth={depth + 1}
                currentSlug={currentSlug}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node
  const href = `/ideas/${node.slug}`;
  const isActive = currentSlug === node.slug;

  return (
    <button
      onClick={() => router.push(href)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
      style={{ paddingLeft: `${indentPx + 8}px` }}
    >
      <FileTextIcon className="size-3.5 shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

interface IdeaTreeProps {
  tree: IdeaNode;
  currentSlug: string;
}

export function IdeaTree({ tree, currentSlug }: IdeaTreeProps) {
  return (
    <nav className="flex flex-col gap-0.5 py-1">
      {/* Root index link */}
      <RootLink currentSlug={currentSlug} />
      {tree.children?.map((node) => (
        <TreeNode
          key={node.slug}
          node={node}
          depth={0}
          currentSlug={currentSlug}
        />
      ))}
    </nav>
  );
}

function RootLink({ currentSlug }: { currentSlug: string }) {
  const router = useRouter();
  const isActive = currentSlug === "";
  return (
    <button
      onClick={() => router.push("/ideas")}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
      style={{ paddingLeft: "8px" }}
    >
      <FolderOpenIcon className="size-3.5 shrink-0" />
      <span className="truncate">Ideas KB</span>
    </button>
  );
}
