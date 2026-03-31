import { memo, useMemo } from "react";
import { parse_thinking_content } from "@/utils/parse_thinking_content";
import { MarkdownMessage } from "./MarkdownMessage";
import { ThinkingBlock } from "./ThinkingBlock";

interface IAssistantMessageProps {
  content: string;
  thinkingDuration?: number;
}

export const AssistantMessage = memo(function AssistantMessage({
  content,
  thinkingDuration,
}: IAssistantMessageProps) {
  const segments = useMemo(() => parse_thinking_content(content), [content]);

  const lastThinkingIdx = useMemo(
    () =>
      segments.reduce<number>(
        (last, seg, i) => (seg.type === "thinking" ? i : last),
        -1
      ),
    [segments]
  );

  return (
    <>
      {segments.map((segment, i) =>
        segment.type === "thinking" ? (
          <ThinkingBlock
            key={`thinking-${i}`}
            content={segment.content}
            isStreaming={segment.isStreaming}
            thinkingDuration={i === lastThinkingIdx ? thinkingDuration : undefined}
          />
        ) : (
          <MarkdownMessage key={`text-${i}`} content={segment.content} />
        )
      )}
    </>
  );
});
