import { Plugin, WorkspaceLeaf } from 'obsidian';
import { OllamaChatSettings, OllamaChatSettingTab, DEFAULT_SETTINGS } from './settings';
import { ChatView, CHAT_VIEW_TYPE } from './chat/ChatView';
import { ElaborateView, ELABORATE_VIEW_TYPE, ElaborateOptions } from './chat/ElaborateView';
import { registerCommands } from './commands/registerCommands';

export default class OllamaChatPlugin extends Plugin {
  settings!: OllamaChatSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Register view types
    this.registerView(CHAT_VIEW_TYPE, leaf => new ChatView(leaf, this));
    this.registerView(ELABORATE_VIEW_TYPE, leaf => new ElaborateView(leaf, this));

    // Register commands, ribbon, context menu
    registerCommands(this);

    // Settings tab
    this.addSettingTab(new OllamaChatSettingTab(this.app, this));

    // Persist the chat leaf in the right sidebar across sessions
    this.app.workspace.onLayoutReady(async () => {
      if (this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE).length === 0) {
        await this.app.workspace.getRightLeaf(false)?.setViewState({ type: CHAT_VIEW_TYPE });
      }
    });
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(ELABORATE_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async openChatView(prefillText?: string, toggle = false): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);

    if (toggle && existing.length > 0) {
      const rightSplit = (this.app.workspace as any).rightSplit;
      // If already active, collapse the sidebar (toggle off)
      if (this.app.workspace.getActiveViewOfType(ChatView) != null) {
        rightSplit?.collapse();
        return;
      }
      // Expand if collapsed, then reveal
      rightSplit?.expand();
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    let leaf: WorkspaceLeaf;
    if (existing.length > 0) {
      leaf = existing[0];
    } else {
      leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: CHAT_VIEW_TYPE, active: true });
    }

    this.app.workspace.revealLeaf(leaf);

    if (prefillText && leaf.view instanceof ChatView) {
      const view = leaf.view as ChatView;
      if (view.textarea) {
        view.textarea.value = prefillText;
        // Trigger resize
        view.textarea.dispatchEvent(new Event('input'));
        view.textarea.focus();
      } else {
        view.prefillText = prefillText;
      }
    }
  }

  async openElaborateView(opts: ElaborateOptions): Promise<void> {
    // Always open a fresh leaf for ElaborateView alongside ChatView
    const existingElaborate = this.app.workspace.getLeavesOfType(ELABORATE_VIEW_TYPE);

    let leaf: WorkspaceLeaf;
    if (existingElaborate.length > 0) {
      leaf = existingElaborate[0];
      this.app.workspace.revealLeaf(leaf);
    } else {
      // Open as a new right leaf (does not replace ChatView)
      leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: ELABORATE_VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }

    if (leaf.view instanceof ElaborateView) {
      await (leaf.view as ElaborateView).applyOptions(opts);
    }
  }
}
