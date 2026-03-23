import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { MermaidBlock } from "./MermaidBlock";

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex, rehypeHighlight];

interface MarkdownMessageProps {
  content: string;
}

export const MarkdownMessage = memo(function MarkdownMessage({
  content,
}: MarkdownMessageProps) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={{
        pre({ children }) {
          return <>{children}</>;
        },
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const lang = match?.[1];
          const codeString = String(children).replace(/\n$/, "");

          // Inline code (no language class, no block context)
          if (!className) {
            return (
              <code className="oac-inline-code" {...props}>
                {children}
              </code>
            );
          }

          if (lang === "mermaid") {
            return <MermaidBlock code={codeString} />;
          }

          return (
            <pre className="oac-code-block">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
});
