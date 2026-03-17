import { ItemView, WorkspaceLeaf, Notice, Modal, App, setIcon } from "obsidian";
import type OllamaChatPlugin from "../main";
import { ChatSession, type Message } from "./ChatSession";
import { appendMessage } from "./renderMessage";
import { createOllama } from "ollama-ai-provider";
import { streamText } from "ai";
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
  saveEl: HTMLElement;
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

  private createTab(priorMessages?: Message[]): void {
    const tabIndex = this.tabs.length;
    const session = new ChatSession(this.plugin.settings, priorMessages);

    const tabEl = this.tabBarHandle.tabsRow.createEl("button", { cls: "oac-tab" }) as HTMLButtonElement;
    tabEl.createEl("span", {
      text: `Chat ${tabIndex + 1}`,
      cls: "oac-tab-label",
    });
    const { el: saveEl } = createIconButton(tabEl, {
      icon: "save",
      label: "Save as Note",
      cls: ["oac-icon-btn", "oac-tab-save-btn"],
      onClick: () => this.handleSave(),
    });
    saveEl.addClass("oac-hidden");
    const closeEl = tabEl.createEl("button", {
      cls: "oac-tab-close",
      text: "×",
    }) as HTMLButtonElement;

    const messageListEl = this.msgList.el.createEl("div", {
      cls: "oac-message-list",
    });
    messageListEl.addClass("oac-hidden");

    const emptyState = createEmptyState(messageListEl, { text: "Let's Chat!" });

    if (priorMessages && priorMessages.length > 0) {
      messageListEl.createEl("div", {
        cls: "oac-context-banner",
        text: `↑ Continued from previous chat (${priorMessages.length} messages)`,
      });
    }

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
      saveEl,
      closeEl,
      emptyState,
    };
    this.tabs.push(tab);

    tabEl.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("oac-tab-close")) return;
      if (target.closest(".oac-tab-save-btn")) return;
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
    this.tabBarHandle.setNewChatVisible(hasContent);
    // Show save only on the active tab when it has content
    this.tabs.forEach((t, i) => {
      const isActive = i === this.activeTabIndex;
      const tabHasContent = t.session.messages.length > 0;
      if (isActive && tabHasContent) {
        t.saveEl.removeClass("oac-hidden");
      } else {
        t.saveEl.addClass("oac-hidden");
      }
    });
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
      (selectedText) => this.handleOpenInNewChat(selectedText),
      (selectedText, fullText) => this.handleLookup(selectedText, fullText),
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
        sourcePath || undefined,
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

    const transcript = tab.session.serialize(title);
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

  private handleOpenInNewChat(selectedText: string): void {
    this.createTab(this.activeSession.messages.slice());
    this.inputArea.textarea.value = selectedText;
    this.inputArea.resizeTextarea();
    this.inputArea.textarea.focus();
  }

  private async handleLookup(selectedText: string, fullText: string): Promise<void> {
    const modal = new LookupModal(this.app);
    modal.open();

    const abortController = new AbortController();
    modal.onClose = () => abortController.abort();

    try {
      const ollama = createOllama({ baseURL: this.plugin.settings.baseURL });
      const result = streamText({
        model: ollama(this.plugin.settings.model),
        messages: [{
          role: 'user',
          content: `Write a 2-3 paragraph explanation or summary of the following, using the surrounding context to inform your answer.\n\nSelected text: "${selectedText}"\n\nFull context: "${fullText}"`,
        }],
        abortSignal: abortController.signal,
      });
      for await (const chunk of result.textStream) {
        modal.appendChunk(chunk);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        modal.setError(err.message);
      }
    }
  }
}

class LookupModal extends Modal {
  private contentDiv!: HTMLElement;
  private text = '';

  onOpen(): void {
    this.titleEl.setText('Look up');
    this.contentEl.addClass('oac-lookup-modal');
    this.contentDiv = this.contentEl.createEl('div', { cls: 'oac-lookup-modal-content' });
    this.contentDiv.textContent = 'Loading…';
  }

  appendChunk(chunk: string): void {
    this.text += chunk;
    this.contentDiv.textContent = this.text;
  }

  setError(msg: string): void {
    this.contentDiv.textContent = `Error: ${msg}`;
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
