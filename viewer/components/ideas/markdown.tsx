"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-8 text-2xl font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-6 text-xl font-semibold tracking-tight text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-base font-semibold text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-7 text-foreground/80">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc pl-6 text-foreground/80 [&>li]:mb-1.5 [&>li]:leading-7">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal pl-6 text-foreground/80 [&>li]:mb-1.5 [&>li]:leading-7">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-2 border-primary/40 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <code className="block whitespace-pre-wrap font-mono text-sm text-foreground/90">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded-sm border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[0.8em] text-foreground/90">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-md border border-border/60 bg-muted/50 p-4 font-mono text-sm">
      {children}
    </pre>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-primary hover:underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border/60 bg-muted/30">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border/40 last:border-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-medium text-foreground/70">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-foreground/80">{children}</td>
  ),
  hr: () => <hr className="my-6 border-border/40" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-foreground/80">{children}</em>
  ),
};

export function IdeaMarkdown({ body }: { body: string }) {
  return (
    <div className="min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
