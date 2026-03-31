import { memo, useState, useEffect, useCallback, useMemo } from "react";
import { MarkdownMessage } from "./MarkdownMessage";
import { format_thinking_duration } from "@/utils/format_timestamp";

interface IThinkingBlockProps {
  content: string;
  isStreaming: boolean;
  thinkingDuration?: number;
}

export const ThinkingBlock = memo(function ThinkingBlock({
  content,
  isStreaming,
  thinkingDuration,
}: IThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(isStreaming);

  useEffect(() => {
    setIsOpen(isStreaming);
  }, [isStreaming]);

  const handleSummaryClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    },
    []
  );

  const summaryLabel = useMemo(() => {
    if (isStreaming) return "Thinking\u2026";
    if (thinkingDuration !== undefined) {
      return `Thought for ${format_thinking_duration(thinkingDuration)}`;
    }
    return "Thought";
  }, [isStreaming, thinkingDuration]);

  return (
    <details className="oac-thinking-block" open={isOpen}>
      <summary className="oac-thinking-summary" onClick={handleSummaryClick}>
        {summaryLabel}
      </summary>
      <div className="oac-thinking-body">
        <MarkdownMessage content={content} />
      </div>
    </details>
  );
});
