export type ProviderType = 'openai-compat' | 'anthropic' | 'gemini';

export interface ProviderSettings {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface AIChatSettings {
  version: number;
  defaultProviderId: string;
  providers: Record<string, ProviderSettings>;

  // Global settings — not provider-specific
  contextWindowLines: number;
  systemPromptPrefix: string;
  saveFolder: string;
  promptSaveOnClose: boolean;
  hotkey: string;

  // Agent settings — preserved from prototype, fully wired in a later phase
  agentProviderId: string;  // replaces agentModel — ID of provider to use for agent sessions
  agentModel: string;       // model override for agent sessions; empty string means use provider default
  agentSystemPrompt: string;
}
