import { memo, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { useModalStream } from "@/hooks/useModalStream";
import type { ChatMessage } from "@/hooks/useStreamChat";

const MAX_CONTEXT_MESSAGES = 10;
const SYSTEM_PROMPT =
  "You are a helpful assistant. The user is reviewing a chat conversation and wants clarification on a specific excerpt. Use the conversation context provided to give a focused, concise explanation.";

interface IAskAIModalProps {
  selectedText: string;
  contextMessages: ChatMessage[];
  model: string;
  onClose: () => void;
  onContinueInNewChat: (messages: ChatMessage[]) => void;
}

export const AskAIModal = memo(function AskAIModal({
  selectedText,
  contextMessages,
  model,
  onClose,
  onContinueInNewChat,
}: IAskAIModalProps) {
  const { response, isLoading, error, start, stop } = useModalStream();

  const contextSlice = useMemo(
    () =>
      contextMessages
        .filter((m) => m.role !== "system")
        .slice(-MAX_CONTEXT_MESSAGES),
    [contextMessages]
  );

  const userMessage = useMemo<ChatMessage>(
    () => ({
      id: crypto.randomUUID(),
      role: "user",
      content: `Please explain or expand on the following excerpt from our conversation:\n\n"${selectedText}"`,
    }),
    [selectedText]
  );

  useEffect(() => {
    start([...contextSlice, userMessage], model, SYSTEM_PROMPT);
    return () => stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleContinueInNewChat = useCallback(() => {
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: response,
    };
    onContinueInNewChat([...contextSlice, userMessage, assistantMsg]);
  }, [contextSlice, userMessage, response, onContinueInNewChat]);

  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return createPortal(
    <div className="oac-ask-modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="oac-ask-modal">
        <div className="oac-ask-modal__header">
          <span className="oac-ask-modal__title">Ask AI</span>
          <button className="oac-ask-modal__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="oac-ask-modal__selected-text">
          <span className="oac-ask-modal__selected-label">About:</span>
          <blockquote className="oac-ask-modal__blockquote">{selectedText}</blockquote>
        </div>

        <div className="oac-ask-modal__body">
          {error ? (
            <div className="oac-ask-modal__error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ) : isLoading && !response ? (
            <div className="oac-typing-indicator">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <MarkdownMessage content={response} />
          )}
        </div>

        {!isLoading && !error && response && (
          <div className="oac-ask-modal__footer">
            <Button
              size="sm"
              variant="outline"
              onClick={handleContinueInNewChat}
            >
              <ExternalLink size={14} />
              Continue in New Chat
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});
