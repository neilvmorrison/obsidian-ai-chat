import { Plugin, Notice } from 'obsidian';
import type { AIChatSettings } from './types/settings';
import { SettingsStore, AIChatSettingTab } from './settings';
import { ChatView, CHAT_VIEW_TYPE } from './ui/components/views/ChatView';
import { ElaborateView, ELABORATE_VIEW_TYPE } from './ui/components/views/ElaborateView';
import { registerCommands, toggleChatView } from './commands/registerCommands';
import { buildModel } from './providers/buildModel';
import { ChatManager } from './storage/ChatManager';

export default class AIChatPlugin extends Plugin {
  settings!: AIChatSettings;
  chatManager!: ChatManager;
  private store!: SettingsStore;

  async onload(): Promise<void> {
    this.store = new SettingsStore(this);
    this.settings = await this.store.load();

    const provider = this.settings.providers[this.settings.defaultProviderId];
    const model = buildModel(provider);
    this.chatManager = new ChatManager(
      this.app,
      this.manifest.dir ?? '.obsidian/plugins/ai-chat-plugin',
      this.settings.saveFolder,
      model,
    );

    try {
      await this.chatManager.initializeStorage();
    } catch (err) {
      new Notice(
        `AI Chat: storage init failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const deps = { settings: this.settings, buildModel, chatManager: this.chatManager };

    this.registerView(CHAT_VIEW_TYPE, leaf => new ChatView(leaf, deps));
    this.registerView(ELABORATE_VIEW_TYPE, leaf => new ElaborateView(leaf, deps));

    const ribbonIcon = this.addRibbonIcon('bot-message-square', 'AI Chat', () => {
      toggleChatView(this.app);
    });
    ribbonIcon.style.color = '#ff4a55';

    this.addSettingTab(new AIChatSettingTab(this.app, this));

    registerCommands(this, deps);
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(CHAT_VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(ELABORATE_VIEW_TYPE);
  }
}
