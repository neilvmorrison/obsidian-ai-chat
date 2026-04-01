import { type Dispatch, type SetStateAction, useState, useRef, useCallback, useEffect } from "react";
import { streamText, type ModelMessage, type ImagePart } from "ai";
import { ollama, OLLAMA_BASE_URL, DEFAULT_MODEL } from "@/lib/ollama";

export { DEFAULT_MODEL };

function dataUrlToImagePart(dataUrl: string): ImagePart {
  const [header, base64] = dataUrl.split(",");
  const mediaType = header.replace(/^data:/, "").replace(/;base64$/, "");
  return { type: "image", image: base64, mediaType };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
  thinkingDuration?: number;
  imageData?: string;
}

export interface UseStreamChatOptions {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: (value: string) => void;
  model: string;
  setModel: (value: string) => void;
  setTokenUsage: (value: number) => void;
  pendingImage: string | null;
  setPendingImage: (value: string | null) => void;
}

export function useStreamChat({ messages, setMessages, input, setInput, model, setModel, setTokenUsage, pendingImage, setPendingImage }: UseStreamChatOptions) {
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
      timestamp: Date.now(),
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
      timestamp: Date.now(),
      ...(pendingImage ? { imageData: pendingImage } : {}),
    };
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    const history = [...messages, userMsg];
    setMessages([...history, assistantMsg]);
    setInput("");
    setPendingImage(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const systemMsg = history.find((m) => m.role === "system");
      const result = streamText({
        model: ollama(model),
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: history
          .filter((m) => m.role !== "system")
          .map((m): ModelMessage => {
            if (m.role === "user" && m.imageData) {
              return {
                role: "user",
                content: [
                  dataUrlToImagePart(m.imageData),
                  { type: "text", text: m.content },
                ],
              };
            }
            return { role: m.role as "user" | "assistant", content: m.content };
          }),
        abortSignal: controller.signal,
      });

      let accumulated = "";
      let rafPending = false;
      let thinkStartTime: number | null = null;
      let thinkingDuration: number | null = null;
      let seenOpenTag = false;
      let seenCloseTag = false;

      for await (const delta of result.textStream) {
        accumulated += delta;

        if (!seenOpenTag && accumulated.includes("<think>")) {
          seenOpenTag = true;
          thinkStartTime = Date.now();
        }
        if (!seenCloseTag && seenOpenTag && accumulated.includes("</think>")) {
          seenCloseTag = true;
          thinkingDuration = Date.now() - thinkStartTime!;
        }

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

      const finalContent = accumulated;
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          content: finalContent,
          ...(thinkingDuration !== null ? { thinkingDuration } : {}),
        };
        return copy;
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled — keep partial response
      } else {
        console.error("[useStreamChat] streamText error:", err);
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (!last.content) {
            const detail = err instanceof Error ? err.message : String(err);
            copy[copy.length - 1] = {
              ...last,
              content: `Failed to get a response. Is Ollama running?\n\n_${detail}_`,
            };
          }
          return copy;
        });
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages, model, pendingImage, setMessages, setInput, setPendingImage, setTokenUsage]);

  return { handleSubmit, isLoading, stop, changeModel, availableModels };
}
