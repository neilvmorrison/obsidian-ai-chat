import { streamText } from "ai";
import type { LanguageModel } from "ai";
import { signal } from "../ui/signals";
import type { Signal, ReadonlySignal } from "../ui/signals";
import type { AIChatSettings, ProviderSettings } from "../types/settings";

export type Role = "user" | "assistant";

/** A single message in the conversation. */
export interface Message {
  role: Role;
  content: string;
}

/** Current streaming state of the session. */
export type StreamingState = "idle" | "streaming" | "error";

export interface ChatSessionOptions {
  /** Pre-built AI SDK language model. */
  model: LanguageModel;
  /** Provider settings — used for model name in serialization. */
  provider: ProviderSettings;
  /** Global plugin settings. */
  settings: AIChatSettings;
}

/** Filesystem-unsafe characters stripped when generating a title. */
const UNSAFE_TITLE_CHARS = /[/\\:*?"<>|#^[\]]/g;

/**
 * Manages a single chat conversation: message state, streaming, and serialization.
 * Exposes reactive state via signals for UI consumption.
 */
export class ChatSession {
  readonly messages: ReadonlySignal<Message[]>;
  readonly streamingState: ReadonlySignal<StreamingState>;
  readonly error: ReadonlySignal<string | null>;

  private _messages: Signal<Message[]>;
  private _streamingState: Signal<StreamingState>;
  private _error: Signal<string | null>;

  private _abortController: AbortController | null = null;
  private _model: LanguageModel;
  private _provider: ProviderSettings;
  private _settings: AIChatSettings;

  constructor({ model, provider, settings }: ChatSessionOptions) {
    this._model = model;
    this._provider = provider;
    this._settings = settings;

    this._messages = signal<Message[]>([]);
    this._streamingState = signal<StreamingState>("idle");
    this._error = signal<string | null>(null);

    // Expose read-only views to consumers
    this.messages = this._messages;
    this.streamingState = this._streamingState;
    this.error = this._error;
  }

  /**
   * Sends a user message and streams the assistant response.
   *
   * The messages signal is updated once per received chunk so subscribers can
   * render incremental output. `onComplete` is called with the full text when
   * streaming finishes — including when aborted mid-stream with non-empty text;
   * aborted text is suffixed with `\n\n_(aborted)_`.
   */
  async send(
    userContent: string,
    onComplete?: (fullText: string) => void,
  ): Promise<void> {
    console.log("send", { userContent });
    // Add user message and an empty assistant placeholder before streaming starts.
    this._messages.set((prev) => [
      ...prev,
      { role: "user", content: userContent },
    ]);
    this._messages.set((prev) => [...prev, { role: "assistant", content: "" }]);
    this._streamingState.set("streaming");
    this._error.set(null);

    this._abortController = new AbortController();
    let fullText = "";
    let aborted = false;

    try {
      const result = streamText({
        model: this._model,
        system: this._settings.systemPromptPrefix,
        // Slice off the placeholder so we don't echo it back to the API.
        messages: this._messages.get().slice(0, -1) as Parameters<
          typeof streamText
        >[0]["messages"],
        abortSignal: this._abortController.signal,
      });
      for await (const chunk of result.textStream) {
        // Check abort at the top of each iteration — this ensures that a
        // synchronous abort() call is honoured before any chunk is processed.
        if (this._abortController.signal.aborted) {
          aborted = true;
          break;
        }
        fullText += chunk;
        this._messages.set((prev) => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { role: "assistant", content: fullText };
          return msgs;
        });
      }
    } catch (err) {
      const isAbort =
        this._abortController.signal.aborted ||
        (err instanceof Error && err.name === "AbortError");

      if (!isAbort) {
        this._messages.set((prev) => prev.slice(0, -1)); // remove placeholder
        this._streamingState.set("error");
        this._error.set(err instanceof Error ? err.message : String(err));
        this._abortController = null;
        return;
      }
      aborted = true;
    } finally {
      this._abortController = null;
    }

    if (aborted) {
      if (fullText) {
        fullText += "\n\n_(aborted)_";
        this._messages.set((prev) => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { role: "assistant", content: fullText };
          return msgs;
        });
        onComplete?.(fullText);
      } else {
        this._messages.set((prev) => prev.slice(0, -1)); // remove empty placeholder
      }
    } else {
      onComplete?.(fullText);
    }

    this._streamingState.set("idle");
  }

  /** Replaces the language model used for future sends. Safe to call between messages. */
  setModel(model: LanguageModel): void {
    this._model = model;
  }

  /** Aborts the current stream, if one is in progress. */
  abort(): void {
    this._abortController?.abort();
  }

  /**
   * Derives a title from the first user message.
   * Strips filesystem-unsafe characters; falls back to `"Chat"` if empty.
   */
  generateTitle(): string {
    const firstUser = this._messages.get().find((m) => m.role === "user");
    if (!firstUser) return "Chat";
    const cleaned = firstUser.content.replace(UNSAFE_TITLE_CHARS, "").trim();
    return cleaned || "Chat";
  }

  /**
   * Serializes the conversation to a Markdown string with YAML frontmatter.
   * @param title - Optional override; defaults to `generateTitle()`.
   */
  serialize(title?: string): string {
    const msgs = this._messages.get();
    const resolvedTitle = title ?? this.generateTitle();
    const turns = msgs.filter((m) => m.role === "user").length;

    const frontmatter = [
      "---",
      `title: "${resolvedTitle}"`,
      `date: ${new Date().toISOString()}`,
      `model: ${this._provider.model}`,
      `turns: ${turns}`,
      `message_count: ${msgs.length}`,
      "tags: [ai-chat]",
      "---",
    ].join("\n");

    const body = msgs
      .map(
        (m) => `**${m.role === "user" ? "You" : "Assistant"}:** ${m.content}`,
      )
      .join("\n\n");

    return `${frontmatter}\n\n${body}`;
  }
}
