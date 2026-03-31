import { useState, useRef, useCallback } from "react";
import { streamText } from "ai";
import { ollama } from "@/lib/ollama";
import type { ChatMessage } from "@/hooks/useStreamChat";

interface IModalStreamState {
  response: string;
  isLoading: boolean;
  error: string | null;
}

interface IUseModalStreamReturn extends IModalStreamState {
  start: (messages: ChatMessage[], model: string, systemPrompt?: string) => Promise<void>;
  stop: () => void;
}

export function useModalStream(): IUseModalStreamReturn {
  const [state, setState] = useState<IModalStreamState>({
    response: "",
    isLoading: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const start = useCallback(async (messages: ChatMessage[], model: string, systemPrompt?: string) => {
    setState({ response: "", isLoading: true, error: null });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = streamText({
        model: ollama(model),
        system: systemPrompt,
        messages: messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
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
            setState((prev) => ({ ...prev, response: snapshot }));
            rafPending = false;
          });
        }
      }

      const finalContent = accumulated;
      setState({ response: finalContent, isLoading: false, error: null });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setState((prev) => ({ ...prev, isLoading: false }));
      } else {
        setState({
          response: "",
          isLoading: false,
          error: "Failed to get a response. Is Ollama running?",
        });
      }
    } finally {
      abortRef.current = null;
    }
  }, []);

  return { ...state, start, stop };
}
