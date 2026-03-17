/**
 * Persisted settings for the Ollama Chat plugin.
 * Shape must be preserved exactly as defined here — downstream code
 * (ChatSession, AgentSession, PluginSettingTab) depends on every field.
 */
export interface OllamaChatSettings {
  /** Ollama model name used for chat (e.g. "llama3.2"). */
  model: string;

  /** Base URL of the Ollama HTTP API (e.g. "http://localhost:11434/api"). */
  baseURL: string;

  /** Number of lines of active-note context sent with each message. */
  contextWindowLines: number;

  /** System prompt prepended to every chat session. */
  systemPromptPrefix: string;

  /** Vault folder where chat transcripts are saved. */
  saveFolder: string;

  /** When true, prompt the user to save the chat on close. */
  promptSaveOnClose: boolean;

  /** Keyboard shortcut that opens the chat panel (Obsidian hotkey format). */
  hotkey: string;

  /** Ollama model used for the agent session. Empty string means use `model`. */
  agentModel: string;

  /** System prompt for the file-system agent session. */
  agentSystemPrompt: string;
}
