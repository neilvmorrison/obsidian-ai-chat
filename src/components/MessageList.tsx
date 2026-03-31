import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/hooks/useStreamChat";
import { format_timestamp } from "@/utils/format_timestamp";
import { AssistantMessage } from "./AssistantMessage";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Track whether user has scrolled away from the bottom
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

  // Auto-scroll when messages change (new message or streaming content)
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
              <AssistantMessage
                content={msg.content}
                thinkingDuration={msg.thinkingDuration}
              />
            )}
            <span className="oac-message__timestamp">
              {msg.timestamp ? format_timestamp(msg.timestamp) : null}
            </span>
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
}
