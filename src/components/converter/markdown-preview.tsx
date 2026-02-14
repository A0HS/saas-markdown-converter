"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkSupersub from "remark-supersub";
import remarkGemoji from "remark-gemoji";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";

interface MarkdownPreviewProps {
  content: string;
  fontSize: number;
}

export function MarkdownPreview({ content, fontSize }: MarkdownPreviewProps) {
  return (
    <div className="h-full overflow-auto p-6 hide-scrollbar">
      <article
        className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-4 prose-pre:bg-muted prose-code:before:content-none prose-code:after:content-none prose-li:text-foreground"
        style={{ fontSize: `${fontSize}px` }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkSupersub, remarkGemoji]}
          rehypePlugins={[rehypeRaw, rehypeHighlight]}
          components={{
            a: ({ children, ...props }) => (
              <a {...props} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
