import { useEffect, useRef, forwardRef, useImperativeHandle, memo } from "react";
import type { ChatMessage } from "@/hooks/useStreamChat";
import { MarkdownMessage } from "./MarkdownMessage";

interface IMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export const MessageList = memo(
  forwardRef<HTMLDivElement, IMessageListProps>(function MessageList(
    { messages, isLoading },
    forwardedRef
  ) {
    const listRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardedRef, () => listRef.current!);
    const shouldAutoScroll = useRef(true);

    useEffect(() => {
      const el = listRef.current;
      if (!el) return;

      const handleScroll = () => {
        const threshold = 100;
        const atBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
        shouldAutoScroll.current = atBottom;
      };

      el.addEventListener("scroll", handleScroll, { passive: true });
      return () => el.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
      if (shouldAutoScroll.current && listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, [messages]);

    return (
      <div ref={listRef} className="oac-message-list">
        {messages.map((msg) =>
          msg.role === "system" ? (
            <div key={msg.id} className="oac-system-message">
              <span className="oac-system-message__text">{msg.content}</span>
            </div>
          ) : (
            <div
              key={msg.id}
              className={`oac-message oac-message--${msg.role}`}
            >
              {msg.role === "user" ? (
                msg.content
              ) : (
                <MarkdownMessage content={msg.content} />
              )}
            </div>
          )
        )}
        {isLoading && messages[messages.length - 1]?.content === "" && (
          <div className="oac-typing-indicator">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
    );
  })
);
