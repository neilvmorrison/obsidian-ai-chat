import { useState, useRef, useCallback } from "react";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const ollama = createOpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

export function useStreamChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    const history = [...messages, userMsg];
    setMessages([...history, assistantMsg]);
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = streamText({
        model: ollama("llama3.2:latest"),
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        abortSignal: controller.signal,
      });

      let accumulated = "";
      let rafPending = false;

      for await (const delta of result.textStream) {
        accumulated += delta;

        if (!rafPending) {
          rafPending = true;
          const snapshot = accumulated;
          requestAnimationFrame(() => {
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                content: snapshot,
              };
              return copy;
            });
            rafPending = false;
          });
        }
      }

      // Final flush to ensure last tokens are rendered
      const finalContent = accumulated;
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          content: finalContent,
        };
        return copy;
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled — keep partial response
      } else {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (!last.content) {
            copy[copy.length - 1] = {
              ...last,
              content: "Failed to get a response. Is Ollama running?",
            };
          }
          return copy;
        });
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages]);

  return { messages, input, setInput, handleSubmit, isLoading, stop };
}
