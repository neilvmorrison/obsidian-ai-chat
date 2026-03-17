import { App, PluginSettingTab, Setting } from 'obsidian';
import type { OllamaChatSettings } from './types/settings';

/** Minimal plugin interface required by the settings tab. */
interface PluginRef {
  settings: OllamaChatSettings;
  saveData(data: OllamaChatSettings): Promise<void>;
}

/** Factory default values — deep-merged with persisted data on load. */
export const DEFAULT_SETTINGS: OllamaChatSettings = {
  model: 'llama3.2',
  baseURL: 'http://localhost:11434/api',
  contextWindowLines: 40,
  systemPromptPrefix: 'You are a helpful assistant embedded in Obsidian.',
  saveFolder: 'AI Chats',
  promptSaveOnClose: true,
  hotkey: 'Mod+Shift+A',
  agentModel: '',
  agentSystemPrompt: 'You are a precise file-system agent. Complete tasks using only the tools provided.',
};

/**
 * Settings tab rendered under Obsidian → Settings → Community Plugins.
 * Each field delegates persistence to the atomic change methods below so
 * that the onChange callbacks are easy to unit-test independently.
 */
export class OllamaChatSettingTab extends PluginSettingTab {
  private plugin: PluginRef;

  constructor(app: App, plugin: PluginRef) {
    super(app, plugin as never);
    this.plugin = plugin;
  }

  // -------------------------------------------------------------------------
  // Atomic change handlers (public for unit testing)
  // -------------------------------------------------------------------------

  /** Updates a string-typed setting field and persists. */
  async onTextChange(key: keyof OllamaChatSettings, value: string): Promise<void> {
    (this.plugin.settings as Record<string, unknown>)[key] = value;
    await this.plugin.saveData(this.plugin.settings);
  }

  /** Updates a boolean-typed setting field and persists. */
  async onToggleChange(key: keyof OllamaChatSettings, value: boolean): Promise<void> {
    (this.plugin.settings as Record<string, unknown>)[key] = value;
    await this.plugin.saveData(this.plugin.settings);
  }

  /**
   * Updates a number-typed setting field and persists.
   * Silently ignores the change when `value` cannot be parsed as an integer.
   */
  async onNumberChange(key: keyof OllamaChatSettings, value: string): Promise<void> {
    const n = parseInt(value, 10);
    if (isNaN(n)) return;
    (this.plugin.settings as Record<string, unknown>)[key] = n;
    await this.plugin.saveData(this.plugin.settings);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Model')
      .setDesc('Ollama model name (e.g. llama3.2)')
      .addText(text =>
        text
          .setValue(this.plugin.settings.model)
          .onChange(v => this.onTextChange('model', v)),
      );

    new Setting(containerEl)
      .setName('Base URL')
      .setDesc('Ollama API base URL')
      .addText(text =>
        text
          .setValue(this.plugin.settings.baseURL)
          .onChange(v => this.onTextChange('baseURL', v)),
      );

    new Setting(containerEl)
      .setName('Context window lines')
      .setDesc('Lines of active note context included with each message')
      .addText(text =>
        text
          .setValue(String(this.plugin.settings.contextWindowLines))
          .onChange(v => this.onNumberChange('contextWindowLines', v)),
      );

    new Setting(containerEl)
      .setName('System prompt prefix')
      .setDesc('Prepended to every chat session')
      .addText(text =>
        text
          .setValue(this.plugin.settings.systemPromptPrefix)
          .onChange(v => this.onTextChange('systemPromptPrefix', v)),
      );

    new Setting(containerEl)
      .setName('Save folder')
      .setDesc('Vault folder where chat transcripts are saved')
      .addText(text =>
        text
          .setValue(this.plugin.settings.saveFolder)
          .onChange(v => this.onTextChange('saveFolder', v)),
      );

    new Setting(containerEl)
      .setName('Prompt to save on close')
      .setDesc('Ask to save the chat when the panel is closed')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.promptSaveOnClose)
          .onChange(v => this.onToggleChange('promptSaveOnClose', v)),
      );

    new Setting(containerEl)
      .setName('Hotkey')
      .setDesc('Keyboard shortcut to open the chat panel')
      .addText(text =>
        text
          .setValue(this.plugin.settings.hotkey)
          .onChange(v => this.onTextChange('hotkey', v)),
      );

    new Setting(containerEl)
      .setName('Agent model')
      .setDesc('Model used for the agent session (blank = use chat model)')
      .addText(text =>
        text
          .setValue(this.plugin.settings.agentModel)
          .onChange(v => this.onTextChange('agentModel', v)),
      );

    new Setting(containerEl)
      .setName('Agent system prompt')
      .setDesc('System prompt for the file-system agent')
      .addText(text =>
        text
          .setValue(this.plugin.settings.agentSystemPrompt)
          .onChange(v => this.onTextChange('agentSystemPrompt', v)),
      );
  }
}
