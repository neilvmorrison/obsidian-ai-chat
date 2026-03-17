import { createOllama } from "ollama-ai-provider";
import { streamText } from "ai";
import type { OllamaChatSettings } from "../settings";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export class ChatSession {
  messages: Message[] = [];
  private abortController: AbortController | null = null;
  private settings: OllamaChatSettings;

  constructor(settings: OllamaChatSettings) {
    this.settings = settings;
  }

  abort(): void {
    this.abortController?.abort();
  }

  async send(
    userContent: string,
    systemPrompt: string,
    onChunk: (chunk: string) => void,
    onComplete: () => Promise<void>,
  ): Promise<void> {
    this.messages.push({ role: "user", content: userContent });

    this.abortController = new AbortController();

    const ollama = createOllama({ baseURL: this.settings.baseURL });

    let fullText = "";

    try {
      const result = await streamText({
        model: ollama(this.settings.model),
        system: systemPrompt,
        messages: this.messages,
        abortSignal: this.abortController.signal,
      });

      for await (const chunk of result.textStream) {
        fullText += chunk;
        onChunk(chunk);
      }

      await onComplete();
      this.messages.push({ role: "assistant", content: fullText });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // Aborted by user — still record whatever was streamed
        if (fullText) {
          await onComplete();
          this.messages.push({
            role: "assistant",
            content: fullText + "\n\n_(aborted)_",
          });
        }
      } else {
        throw err;
      }
    } finally {
      this.abortController = null;
    }
  }

  async generateTitle(): Promise<string> {
    const ollama = createOllama({ baseURL: this.settings.baseURL });
    const summary = this.messages
      .slice(0, 6)
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join("\n");

    const result = await streamText({
      model: ollama(this.settings.model),
      messages: [
        {
          role: "user",
          content: `Generate a concise 3-5 word title for this chat. Reply with only the title, no punctuation, no quotes.\n\n${summary}`,
        },
      ],
    });

    let title = "";
    for await (const chunk of result.textStream) {
      title += chunk;
    }
    return (
      title
        .trim()
        .replace(/[/\\:*?"<>|#^[\]]/g, "")
        .trim() || "Chat"
    );
  }

  serialize(): string {
    const lines: string[] = [];

    for (const msg of this.messages) {
      const label = msg.role === "user" ? "**User:**" : "**Assistant:**";
      lines.push(label);
      lines.push("");
      lines.push(msg.content);
      lines.push("");
    }

    return lines.join("\n");
  }

  clear(): void {
    this.abortController?.abort();
    this.messages = [];
    this.abortController = null;
  }
}
