import { App, PluginSettingTab, Setting } from "obsidian";
import type OllamaChatPlugin from "./main";

export interface OllamaChatSettings {
  model: string;
  baseURL: string;
  contextWindowLines: number;
  systemPromptPrefix: string;
  saveFolder: string;
  hotkey: string;
}

export const DEFAULT_SETTINGS: OllamaChatSettings = {
  model: "llama3.2",
  baseURL: "http://localhost:11434/api",
  contextWindowLines: 40,
  systemPromptPrefix: "You are a helpful assistant embedded in Obsidian.",
  saveFolder: "AI Chats",
  hotkey: "Mod+Shift+A",
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
  }
}
