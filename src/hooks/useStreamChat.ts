import { type Dispatch, type SetStateAction, useState, useRef, useCallback, useEffect } from "react";
import { streamText } from "ai";
import { ollama, OLLAMA_BASE_URL, DEFAULT_MODEL } from "@/lib/ollama";

export { DEFAULT_MODEL };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export interface UseStreamChatOptions {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: (value: string) => void;
  model: string;
  setModel: (value: string) => void;
  setTokenUsage: (value: number) => void;
}

export function useStreamChat({ messages, setMessages, input, setInput, model, setModel, setTokenUsage }: UseStreamChatOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([DEFAULT_MODEL]);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch available models from Ollama
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        const data = await res.json();
        const models: string[] = data.models?.map((m: { name: string }) => m.name) ?? [];
        if (models.length > 0) {
          setAvailableModels(models);
        }
      } catch {
        // Ollama not reachable — keep default
      }
    }
    fetchModels();
  }, []);

  const changeModel = useCallback((newModel: string) => {
    if (newModel === model) return;
    setModel(newModel);
    const systemMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "system",
      content: `Model changed to ${newModel}`,
    };
    setMessages((prev) => [...prev, systemMsg]);
  }, [model, setModel, setMessages]);

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
        model: ollama(model),
        messages: history
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content })),
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

      const usage = await result.usage;
      setTokenUsage((usage.inputTokens ?? 0) + (usage.outputTokens ?? 0));

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
  }, [input, isLoading, messages, model, setMessages, setInput, setTokenUsage]);

  return { handleSubmit, isLoading, stop, changeModel, availableModels };
}
