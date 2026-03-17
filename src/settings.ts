import { App, PluginSettingTab, Setting } from "obsidian";
import type OllamaChatPlugin from "./main";

export interface OllamaChatSettings {
  // Connection
  model: string;
  baseURL: string;
  // Context
  contextWindowLines: number;
  systemPromptPrefix: string;
  // Notes
  saveFolder: string;
  // Behaviour
  promptSaveOnClose: boolean;
  // Internal
  hotkey: string;
  // Agent
  agentModel: string;
  agentSystemPrompt: string;
}

export const DEFAULT_SETTINGS: OllamaChatSettings = {
  model: "llama3.2",
  baseURL: "http://localhost:11434/api",
  contextWindowLines: 40,
  systemPromptPrefix: "You are a helpful assistant embedded in Obsidian.",
  saveFolder: "AI Chats",
  promptSaveOnClose: true,
  hotkey: "Mod+Shift+A",
  agentModel: "",
  agentSystemPrompt:
    "You are a precise file-system agent for Obsidian. Use the provided tools to fulfill requests exactly. Always create parent folders before notes. Never invent tools that aren't listed.",
};

export class OllamaChatSettingTab extends PluginSettingTab {
  plugin: OllamaChatPlugin;

  constructor(app: App, plugin: OllamaChatPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ── Connection ────────────────────────────────────────────
    new Setting(containerEl).setName("Connection").setHeading();

    new Setting(containerEl)
      .setName("Model")
      .setDesc("Ollama model name to use (e.g. llama3.2, mistral, codellama)")
      .addText((text) =>
        text
          .setPlaceholder("llama3.2")
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Base URL")
      .setDesc("URL of your local Ollama instance")
      .addText((text) =>
        text
          .setPlaceholder("http://localhost:11434/api")
          .setValue(this.plugin.settings.baseURL)
          .onChange(async (value) => {
            this.plugin.settings.baseURL = value;
            await this.plugin.saveSettings();
          }),
      );

    // ── Context ───────────────────────────────────────────────
    new Setting(containerEl).setName("Context").setHeading();

    new Setting(containerEl)
      .setName("Context window lines")
      .setDesc(
        "Total lines of file context to include (lines before + after cursor)",
      )
      .addSlider((slider) =>
        slider
          .setLimits(0, 200, 10)
          .setValue(this.plugin.settings.contextWindowLines)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.contextWindowLines = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("System prompt prefix")
      .setDesc("Prepended to every system prompt sent to the model")
      .addTextArea((text) =>
        text
          .setPlaceholder("You are a helpful assistant embedded in Obsidian.")
          .setValue(this.plugin.settings.systemPromptPrefix)
          .onChange(async (value) => {
            this.plugin.settings.systemPromptPrefix = value;
            await this.plugin.saveSettings();
          }),
      );

    // ── Notes ─────────────────────────────────────────────────
    new Setting(containerEl).setName("Notes").setHeading();

    new Setting(containerEl)
      .setName("Save folder")
      .setDesc("Vault folder where saved chat notes are created")
      .addText((text) =>
        text
          .setPlaceholder("AI Chats")
          .setValue(this.plugin.settings.saveFolder)
          .onChange(async (value) => {
            this.plugin.settings.saveFolder = value;
            await this.plugin.saveSettings();
          }),
      );

    // ── Agent ─────────────────────────────────────────────────
    new Setting(containerEl).setName("Agent").setHeading();

    new Setting(containerEl)
      .setName("Agent model")
      .setDesc("Model used for the AI Agent (leave blank to use the chat model above). Pick one with tool-call support: qwen2.5, llama3.1, mistral-nemo.")
      .addText((text) =>
        text
          .setPlaceholder("e.g. qwen2.5 (blank = same as chat model)")
          .setValue(this.plugin.settings.agentModel)
          .onChange(async (value) => {
            this.plugin.settings.agentModel = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Agent system prompt")
      .setDesc("Injected as the system message at the start of every agent run.")
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.agentSystemPrompt)
          .onChange(async (value) => {
            this.plugin.settings.agentSystemPrompt = value;
            await this.plugin.saveSettings();
          }),
      );

    // ── Behaviour ─────────────────────────────────────────────
    new Setting(containerEl).setName("Behaviour").setHeading();

    new Setting(containerEl)
      .setName("Prompt to save on close")
      .setDesc(
        "Ask whether to save a chat as a note when closing a tab that has messages",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.promptSaveOnClose)
          .onChange(async (value) => {
            this.plugin.settings.promptSaveOnClose = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
