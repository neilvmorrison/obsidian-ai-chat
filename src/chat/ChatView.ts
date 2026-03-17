import { ItemView, WorkspaceLeaf, Notice, Modal, App, setIcon } from "obsidian";
import type OllamaChatPlugin from "../main";
import { ChatSession } from "./ChatSession";
import { appendMessage } from "./renderMessage";
import { buildContext } from "../context/buildContext";
import {
  createInputArea,
  createMessageList,
  createTabBar,
  createEmptyState,
  createModelSelect,
  createIconButton,
} from "../ui";
import type {
  InputAreaHandle,
  MessageListHandle,
  TabBarHandle,
  EmptyStateHandle,
} from "../ui";

export const CHAT_VIEW_TYPE = "ollama-chat-view";

interface Tab {
  id: string;
  session: ChatSession;
  messageListEl: HTMLElement;
  tabEl: HTMLButtonElement;
  closeEl: HTMLButtonElement;
  emptyState: EmptyStateHandle;
}

// ── Save-on-close modal ────────────────────────────────────────────────────

class SaveOnCloseModal extends Modal {
  private resolve: (result: "save" | "discard" | "cancel") => void;

  constructor(
    app: App,
    resolve: (result: "save" | "discard" | "cancel") => void,
  ) {
    super(app);
    this.resolve = resolve;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Save chat before closing?" });
    contentEl.createEl("p", {
      text: "This chat has messages. Would you like to save it as a note?",
      cls: "oac-modal-desc",
    });

    const btnRow = contentEl.createEl("div", { cls: "oac-modal-btn-row" });

    const saveBtn = btnRow.createEl("button", {
      text: "Save & Close",
      cls: "mod-cta",
    });
    saveBtn.addEventListener("click", () => {
      this.resolve("save");
      this.close();
    });

    const discardBtn = btnRow.createEl("button", { text: "Discard" });
    discardBtn.addEventListener("click", () => {
      this.resolve("discard");
      this.close();
    });

    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => {
      this.resolve("cancel");
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// ── ChatView ───────────────────────────────────────────────────────────────

export class ChatView extends ItemView {
  plugin: OllamaChatPlugin;
  private inputArea!: InputAreaHandle;
  private msgList!: MessageListHandle;
  private tabBarHandle!: TabBarHandle;
  private noTabsEmptyState!: EmptyStateHandle;
  private isStreaming = false;
  prefillText?: string;

  private tabs: Tab[] = [];
  private activeTabIndex = 0;

  constructor(leaf: WorkspaceLeaf, plugin: OllamaChatPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "AI Chat";
  }

  getIcon(): string {
    return "bot-message-square";
  }

  get textarea(): HTMLTextAreaElement {
    return this.inputArea.textarea;
  }

  private get messageList(): HTMLElement {
    return this.tabs[this.activeTabIndex].messageListEl;
  }

  private get activeSession(): ChatSession {
    return this.tabs[this.activeTabIndex].session;
  }

  async onOpen(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    root.addClass("oac-chat-root");

    // Close button (top-right corner)
    const closeViewBtn = root.createEl("button", { cls: "oac-close-view-btn" });
    setIcon(closeViewBtn, "x");
    closeViewBtn.setAttribute("aria-label", "Close Chat");
    closeViewBtn.addEventListener("click", () => {
      (this.app.workspace as any).rightSplit?.collapse();
    });

    // Tab bar
    this.tabBarHandle = createTabBar(root, {
      onSave: () => this.handleSave(),
      onNewChat: () => this.createTab(),
    });

    // Message list container (with scroll button)
    this.msgList = createMessageList(root, { withScrollBtn: true });

    // No-tabs empty state (shown when all tabs are closed)
    this.noTabsEmptyState = createEmptyState(this.msgList.el, {
      text: "Let's Chat!",
    });

    // Input area
    this.inputArea = createInputArea(root, {
      onSend: () => this.handleSend(),
      onAbort: () => this.activeSession.abort(),
    });

    // Upload button + model select in the left action slot
    createIconButton(this.inputArea.actionsLeftEl, {
      icon: "upload",
      label: "Upload image",
      cls: ["oac-icon-btn", "oac-upload-btn"],
      onClick: () => { /* placeholder */ },
    });

    createModelSelect(this.inputArea.actionsLeftEl, {
      currentModel: this.plugin.settings.model,
      baseURL: this.plugin.settings.baseURL,
      onModelChange: async (model) => {
        this.plugin.settings.model = model;
        await this.plugin.saveSettings();
      },
    });

    // Pre-fill if provided
    if (this.prefillText) {
      this.inputArea.textarea.value = this.prefillText;
      this.inputArea.resizeTextarea();
      this.prefillText = undefined;
    }

    this.inputArea.textarea.focus();
  }

  async onClose(): Promise<void> {
    this.tabs.forEach((t) => t.session.abort());
  }

  private createTab(): void {
    const tabIndex = this.tabs.length;
    const session = new ChatSession(this.plugin.settings);

    const tabEl = this.tabBarHandle.tabsRow.createEl("button", { cls: "oac-tab" }) as HTMLButtonElement;
    tabEl.createEl("span", {
      text: `Chat ${tabIndex + 1}`,
      cls: "oac-tab-label",
    });
    const closeEl = tabEl.createEl("button", {
      cls: "oac-tab-close",
      text: "×",
    }) as HTMLButtonElement;

    const messageListEl = this.msgList.el.createEl("div", {
      cls: "oac-message-list",
    });
    messageListEl.addClass("oac-hidden");

    const emptyState = createEmptyState(messageListEl, { text: "Let's Chat!" });

    messageListEl.addEventListener("scroll", () => {
      if (this.tabs[this.activeTabIndex]?.messageListEl === messageListEl) {
        const atBottom =
          messageListEl.scrollHeight - messageListEl.scrollTop - messageListEl.clientHeight < 80;
        if (atBottom) this.msgList.hideScrollBtn();
      }
    });

    const tab: Tab = {
      id: `tab-${Date.now()}`,
      session,
      messageListEl,
      tabEl,
      closeEl,
      emptyState,
    };
    this.tabs.push(tab);

    tabEl.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).classList.contains("oac-tab-close")) return;
      this.switchToTab(this.tabs.indexOf(tab));
    });

    closeEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeTab(this.tabs.indexOf(tab));
    });

    this.noTabsEmptyState.hide();
    this.switchToTab(this.tabs.length - 1);
    this.updateCloseButtons();
  }

  private switchToTab(index: number): void {
    if (this.tabs[this.activeTabIndex]) {
      this.tabs[this.activeTabIndex].messageListEl.addClass("oac-hidden");
      this.tabs[this.activeTabIndex].tabEl.removeClass("oac-tab--active");
    }
    this.activeTabIndex = index;
    this.tabs[index].messageListEl.removeClass("oac-hidden");
    this.tabs[index].tabEl.addClass("oac-tab--active");
    this.updateToolbar();
    this.inputArea?.textarea.focus();
  }

  private async closeTab(index: number): Promise<void> {
    const tab = this.tabs[index];

    if (
      tab.session.messages.length > 0 &&
      this.plugin.settings.promptSaveOnClose
    ) {
      const result = await this.promptSaveOnClose();
      if (result === "cancel") return;
      if (result === "save") await this.saveTabSession(tab);
    }

    tab.session.abort();
    tab.messageListEl.remove();
    tab.tabEl.remove();
    this.tabs.splice(index, 1);

    if (this.tabs.length === 0) {
      this.activeTabIndex = 0;
      this.noTabsEmptyState.show();
      this.tabBarHandle.setVisible(false);
      this.tabBarHandle.setSaveVisible(false);
      this.tabBarHandle.setNewChatVisible(false);
    } else {
      const nextIndex = Math.min(index, this.tabs.length - 1);
      this.activeTabIndex = -1;
      this.switchToTab(nextIndex);
    }

    this.updateCloseButtons();
  }

  private updateToolbar(): void {
    const hasTabs = this.tabs.length > 0;
    const hasContent = hasTabs && this.activeSession.messages.length > 0;
    this.tabBarHandle.setVisible(hasTabs);
    this.tabBarHandle.setSaveVisible(hasContent);
    this.tabBarHandle.setNewChatVisible(hasContent);
  }

  private updateCloseButtons(): void {
    this.tabs.forEach((t) => {
      t.closeEl.removeClass("oac-hidden");
    });
  }

  private promptSaveOnClose(): Promise<"save" | "discard" | "cancel"> {
    return new Promise((resolve) => {
      new SaveOnCloseModal(this.app, resolve).open();
    });
  }

  private removeEmptyState(): void {
    this.tabs[this.activeTabIndex].emptyState.hide();
  }

  private async handleSend(): Promise<void> {
    if (this.tabs.length === 0) {
      this.createTab();
    }

    const text = this.inputArea.textarea.value.trim();
    if (!text || this.isStreaming) return;

    this.inputArea.textarea.value = "";
    this.inputArea.resizeTextarea();
    this.removeEmptyState();

    const sourcePath = this.app.workspace.getActiveFile()?.path ?? "";
    const userHandle = appendMessage(
      this.messageList,
      "user",
      this.app,
      this,
      sourcePath,
    );
    userHandle.appendChunk(text);
    await userHandle.finalise();
    this.scrollToBottom();

    const assistantHandle = appendMessage(
      this.messageList,
      "assistant",
      this.app,
      this,
      sourcePath,
      (selectedText, parentMessage) =>
        this.openElaborateView(selectedText, parentMessage, true),
      (selectedText, parentMessage) =>
        this.openElaborateView(selectedText, parentMessage, false),
    );
    this.scrollToBottom();
    this.isStreaming = true;
    this.inputArea.controls.setStreaming(true);

    try {
      const context = await buildContext(
        this.app,
        this.plugin.settings.contextWindowLines,
      );
      const systemPrompt = [this.plugin.settings.systemPromptPrefix, context]
        .filter(Boolean)
        .join("\n\n");

      await this.activeSession.send(
        text,
        systemPrompt,
        (chunk) => {
          assistantHandle.appendChunk(chunk);
          this.smartScroll();
        },
        async () => {
          await assistantHandle.finalise();
          this.updateToolbar();
        },
      );
    } catch (err) {
      new Notice(
        `AI Chat error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.isStreaming = false;
      this.inputArea.controls.setStreaming(false);
      if (!this.isNearBottom()) this.msgList.showScrollBtn();
    }
  }

  private scrollToBottom(): void {
    this.messageList.scrollTop = this.messageList.scrollHeight;
  }

  private isNearBottom(): boolean {
    const el = this.messageList;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  private smartScroll(): void {
    if (this.isNearBottom()) {
      this.scrollToBottom();
    } else {
      this.msgList.showScrollBtn();
    }
  }

  private async saveTabSession(tab: Tab): Promise<void> {
    if (tab.session.messages.length === 0) return;

    const transcript = tab.session.serialize();
    const folder = this.plugin.settings.saveFolder;

    let title: string;
    try {
      const gen = await tab.session.generateTitle();
      title = gen.charAt(0).toUpperCase() + gen.slice(1).toLowerCase();
    } catch {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      title = `Chat ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}`;
    }

    const fileName = `${folder}/${title}.md`;
    try {
      if (!this.app.vault.getAbstractFileByPath(folder)) {
        await this.app.vault.createFolder(folder);
      }
      await this.app.vault.create(fileName, transcript);
      await this.app.workspace.openLinkText(fileName, "", true);
      new Notice(`Saved to ${fileName}`);
    } catch (err) {
      new Notice(
        `Save failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async handleSave(): Promise<void> {
    if (this.tabs.length === 0 || this.activeSession.messages.length === 0) {
      new Notice("Nothing to save yet.");
      return;
    }
    await this.saveTabSession(this.tabs[this.activeTabIndex]);
  }

  private openElaborateView(
    selectedText: string,
    parentMessage: string,
    autoSend: boolean,
  ): void {
    const prefill = autoSend
      ? `Please elaborate on the following:\n\n${selectedText}`
      : `Regarding: ${selectedText}\n\n`;

    this.plugin.openElaborateView({
      prefillText: prefill,
      systemContext: parentMessage,
      autoSend,
    });
  }
}
