import { MarkdownView, Plugin, PluginSettingTab, App, Setting, TFile, WorkspaceLeaf } from "obsidian";
import { ReactView, VIEW_TYPE } from "./view";
import { parseChatNote } from "./utils/parseChatNote";
import { InlineCommandSuggest } from "./editor/InlineCommandSuggest";
import { createInlinePromptExtension, type IPendingCommand } from "./editor/inlinePromptExtension";

export interface IPluginSettings {
  tokenLimit: number;
}

const DEFAULT_SETTINGS: IPluginSettings = {
  tokenLimit: 8192,
};

class ChatSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: ReactPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Token limit")
      .setDesc("Maximum number of tokens allowed in the chat context window.")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.tokenLimit))
          .onChange(async (value) => {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed > 0) {
              this.plugin.settings.tokenLimit = parsed;
              await this.plugin.saveSettings();
              this.plugin.refreshView();
            }
          })
      );
  }
}

export default class ReactPlugin extends Plugin {
  settings: IPluginSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ChatSettingTab(this.app, this));
    this.registerView(VIEW_TYPE, (leaf) => new ReactView(leaf, this));

    const pendingRef: { current: IPendingCommand | null } = { current: null };
    this.registerEditorSuggest(new InlineCommandSuggest(this.app, pendingRef));
    this.registerEditorExtension(createInlinePromptExtension(pendingRef, this));
    this.addRibbonIcon("bot-message-square", "Open Chat", () => {
      this.activateView();
    });
    this.addCommand({
      id: "toggle-chat-sidebar",
      name: "Toggle Chat Sidebar",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "a" }],
      callback: () => {
        const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        if (existing.length > 0) {
          existing[0].detach();
        } else {
          this.activateView();
        }
      },
    });
    // When a chat note is opened, force reading view and inject "Open in Chat" button
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (!file) return;
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache?.frontmatter?.type !== "obsidian-chat") return;

        // Force reading (preview) mode
        const markdownView =
          this.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
          const viewState = markdownView.leaf.getViewState();
          if (viewState.state?.mode !== "preview") {
            markdownView.leaf.setViewState({
              ...viewState,
              state: { ...viewState.state, mode: "preview" },
            });
          }

          // Inject "Open in Chat" button if not already present
          const container = markdownView.containerEl;
          if (!container.querySelector(".oac-open-in-chat-btn")) {
            const btn = container.createEl("button", {
              cls: "oac-open-in-chat-btn",
            });
            btn.createEl("span", { text: "Open in Chat" });
            btn.addEventListener("click", () => {
              this.openChatFromFile(file);
            });
          }
        }
      }),
    );

    // Clean up the button when navigating away from a chat note
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        // Remove any stale buttons from non-chat views
        document.querySelectorAll(".oac-open-in-chat-btn").forEach((btn) => {
          const markdownView =
            this.app.workspace.getActiveViewOfType(MarkdownView);
          if (!markdownView) {
            btn.remove();
            return;
          }
          const file = markdownView.file;
          if (!file) {
            btn.remove();
            return;
          }
          const cache = this.app.metadataCache.getFileCache(file);
          if (cache?.frontmatter?.type !== "obsidian-chat") {
            btn.remove();
          }
        });
      }),
    );
  }

  async activateView(): Promise<WorkspaceLeaf | null> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null =
      workspace.getLeavesOfType(VIEW_TYPE)[0] ?? null;

    if (!leaf) {
      const rightLeaf =
        workspace.getRightLeaf(false) ?? workspace.getRightLeaf(true);
      if (rightLeaf) {
        await rightLeaf.setViewState({ type: VIEW_TYPE, active: true });
        leaf = rightLeaf;
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }

    return leaf;
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  refreshView(): void {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length > 0) {
      (leaves[0].view as ReactView).renderApp();
    }
  }

  async openChatFromFile(file: TFile): Promise<void> {
    const content = await this.app.vault.read(file);
    const parsed = parseChatNote(content);
    if (!parsed) return;

    const leaf = await this.activateView();
    if (!leaf) return;

    // Set the chat state on the view to restore the conversation
    await leaf.setViewState({
      type: VIEW_TYPE,
      active: true,
      state: {
        initialMessages: parsed.messages,
        initialModel: parsed.model,
      },
    });
  }
}
