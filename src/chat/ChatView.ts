import { ItemView, WorkspaceLeaf, Notice, Modal, App, setIcon } from "obsidian";
import type OllamaChatPlugin from "../main";
import { ChatSession } from "./ChatSession";
import { appendMessage } from "./renderMessage";
import { buildContext } from "../context/buildContext";

export const CHAT_VIEW_TYPE = "ollama-chat-view";

interface Tab {
  id: string;
  session: ChatSession;
  messageListEl: HTMLElement;
  tabEl: HTMLButtonElement;
  closeEl: HTMLButtonElement;
}

// ── Save-on-close modal ────────────────────────────────────────────────────

class SaveOnCloseModal extends Modal {
  private resolve: (result: "save" | "discard" | "cancel") => void;

  constructor(app: App, resolve: (result: "save" | "discard" | "cancel") => void) {
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
  textarea!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private abortBtn!: HTMLButtonElement;
  private modelSelect!: HTMLSelectElement;
  private isStreaming = false;
  prefillText?: string;

  private tabs: Tab[] = [];
  private activeTabIndex = 0;
  private tabBar!: HTMLElement;
  private tabsRow!: HTMLElement;
  private messageListContainer!: HTMLElement;
  private noTabsStateEl!: HTMLElement;
  private scrollBtn!: HTMLButtonElement;
  private saveBtn!: HTMLButtonElement;
  private newChatBtn!: HTMLButtonElement;

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
    return "message-square";
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

    // Tab bar
    this.tabBar = root.createEl("div", { cls: "oac-tab-bar" });
    this.tabBar.style.display = "none";
    this.tabsRow = this.tabBar.createEl("div", { cls: "oac-tabs-row" });
    const toolbarRight = this.tabBar.createEl("div", { cls: "oac-toolbar-right" });

    this.saveBtn = toolbarRight.createEl("button", {
      cls: "oac-icon-btn oac-save-btn",
    });
    setIcon(this.saveBtn, "save");
    this.saveBtn.setAttribute("aria-label", "Save as Note");
    this.saveBtn.style.display = "none";

    this.newChatBtn = toolbarRight.createEl("button", {
      cls: "oac-icon-btn oac-new-chat-btn",
    });
    setIcon(this.newChatBtn, "plus");
    this.newChatBtn.setAttribute("aria-label", "New Chat");
    this.newChatBtn.style.display = "none";

    // Message list container
    this.messageListContainer = root.createEl("div", {
      cls: "oac-message-list-container",
    });

    // No-tabs empty state (shown when all tabs are closed)
    this.noTabsStateEl = this.messageListContainer.createEl("div", {
      cls: "oac-empty-state oac-no-tabs-state",
      text: "Let's Chat",
    });
    this.noTabsStateEl.style.display = "flex";

    // Scroll-to-bottom button
    this.scrollBtn = this.messageListContainer.createEl("button", {
      cls: "oac-scroll-btn",
    });
    setIcon(this.scrollBtn, "arrow-down");
    this.scrollBtn.setAttribute("aria-label", "Scroll to bottom");
    this.scrollBtn.style.display = "none";
    this.scrollBtn.addEventListener("click", () => {
      this.scrollToBottom();
      this.hideScrollBtn();
    });

    // Input area
    const inputArea = root.createEl("div", { cls: "oac-input-area" });
    this.textarea = inputArea.createEl("textarea", {
      cls: "oac-input",
      attr: { placeholder: "Ask anything…", rows: "1" },
    }) as HTMLTextAreaElement;

    const inputActions = inputArea.createEl("div", {
      cls: "oac-input-actions",
    });
    const inputActionsLeft = inputActions.createEl("div", {
      cls: "oac-input-actions-left",
    });
    const inputActionsRight = inputActions.createEl("div", {
      cls: "oac-input-actions-right",
    });

    const uploadBtn = inputActionsLeft.createEl("button", {
      cls: "oac-icon-btn oac-upload-btn",
    });
    setIcon(uploadBtn, "upload");
    uploadBtn.setAttribute("aria-label", "Upload image");

    this.modelSelect = inputActionsLeft.createEl("select", {
      cls: "oac-model-select",
    }) as HTMLSelectElement;
    const initialOption = this.modelSelect.createEl("option", {
      text: this.plugin.settings.model,
    });
    initialOption.value = this.plugin.settings.model;
    this.modelSelect.addEventListener("change", async () => {
      this.plugin.settings.model = this.modelSelect.value;
      await this.plugin.saveSettings();
    });
    this.fetchModels().then((models) => {
      const current = this.plugin.settings.model;
      this.modelSelect.empty();
      if (!models.includes(current)) models.unshift(current);
      for (const m of models) {
        const opt = this.modelSelect.createEl("option", { text: m });
        opt.value = m;
        if (m === current) opt.selected = true;
      }
    });

    this.abortBtn = inputActionsRight.createEl("button", {
      cls: "oac-abort-btn",
      text: "Stop",
    });
    this.abortBtn.style.display = "none";
    this.sendBtn = inputActionsRight.createEl("button", {
      cls: "oac-send-btn",
      text: "Send",
    });

    // Wire up events
    this.textarea.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
    this.textarea.addEventListener("input", () => this.resizeTextarea());
    this.sendBtn.addEventListener("click", () => this.handleSend());
    this.abortBtn.addEventListener("click", () => this.activeSession.abort());
    this.saveBtn.addEventListener("click", () => this.handleSave());
    this.newChatBtn.addEventListener("click", () => this.createTab());

    this.noTabsStateEl.style.display = "flex";

    // Pre-fill if provided
    if (this.prefillText) {
      this.textarea.value = this.prefillText;
      this.resizeTextarea();
      this.prefillText = undefined;
    }

    this.textarea.focus();
  }

  async onClose(): Promise<void> {
    this.tabs.forEach((t) => t.session.abort());
  }

  private createTab(): void {
    const tabIndex = this.tabs.length;
    const session = new ChatSession(this.plugin.settings);

    const tabEl = this.tabsRow.createEl("button", { cls: "oac-tab" });
    tabEl.createEl("span", {
      text: `Chat ${tabIndex + 1}`,
      cls: "oac-tab-label",
    });
    const closeEl = tabEl.createEl("button", {
      cls: "oac-tab-close",
      text: "×",
    });

    const messageListEl = this.messageListContainer.createEl("div", {
      cls: "oac-message-list",
    });
    messageListEl.style.display = "none";
    messageListEl.createEl("div", {
      cls: "oac-empty-state",
      text: "Let's Chat",
    });

    const tab: Tab = {
      id: `tab-${Date.now()}`,
      session,
      messageListEl,
      tabEl,
      closeEl,
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

    messageListEl.addEventListener("scroll", () => {
      if (this.tabs[this.activeTabIndex]?.messageListEl === messageListEl && this.isNearBottom(messageListEl)) {
        this.hideScrollBtn();
      }
    });

    this.noTabsStateEl.style.display = "none";
    this.switchToTab(this.tabs.length - 1);
    this.updateCloseButtons();
  }

  private switchToTab(index: number): void {
    if (this.tabs[this.activeTabIndex]) {
      this.tabs[this.activeTabIndex].messageListEl.style.display = "none";
      this.tabs[this.activeTabIndex].tabEl.removeClass("oac-tab--active");
    }
    this.activeTabIndex = index;
    this.tabs[index].messageListEl.style.display = "flex";
    this.tabs[index].tabEl.addClass("oac-tab--active");
    this.updateToolbar();
    this.textarea?.focus();
  }

  private async closeTab(index: number): Promise<void> {
    const tab = this.tabs[index];

    // Prompt to save if there are messages and the setting is on
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
      this.noTabsStateEl.style.display = "flex";
      this.tabBar.style.display = "none";
      this.saveBtn.style.display = "none";
      this.newChatBtn.style.display = "none";
    } else {
      const nextIndex = Math.min(index, this.tabs.length - 1);
      this.activeTabIndex = -1; // force switchToTab to re-apply
      this.switchToTab(nextIndex);
    }

    this.updateCloseButtons();
  }

  private updateToolbar(): void {
    const hasTabs = this.tabs.length > 0;
    const hasContent = hasTabs && this.activeSession.messages.length > 0;
    this.tabBar.style.display = hasTabs ? "flex" : "none";
    this.saveBtn.style.display = hasContent ? "inline-flex" : "none";
    this.newChatBtn.style.display = hasContent ? "inline-flex" : "none";
  }

  private updateCloseButtons(): void {
    // Always show close buttons so any tab (including the last) can be closed
    this.tabs.forEach((t) => {
      t.closeEl.style.display = "inline-flex";
    });
  }

  private promptSaveOnClose(): Promise<"save" | "discard" | "cancel"> {
    return new Promise((resolve) => {
      new SaveOnCloseModal(this.app, resolve).open();
    });
  }

  private async fetchModels(): Promise<string[]> {
    const tagsURL =
      this.plugin.settings.baseURL.replace(/\/+$/, "") + "/tags";
    const response = await fetch(tagsURL);
    if (!response.ok) throw new Error("Failed to fetch models");
    const data = await response.json();
    return (data.models ?? []).map((m: { name: string }) => m.name);
  }

  private resizeTextarea(): void {
    this.textarea.style.height = "auto";
    const lineHeight =
      parseInt(getComputedStyle(this.textarea).lineHeight) || 20;
    const maxHeight = lineHeight * 6;
    this.textarea.style.height =
      Math.min(this.textarea.scrollHeight, maxHeight) + "px";
  }

  private setStreaming(streaming: boolean): void {
    this.isStreaming = streaming;
    this.sendBtn.disabled = streaming;
    this.abortBtn.style.display = streaming ? "inline-flex" : "none";
  }

  private removeEmptyState(): void {
    const emptyState = this.messageList.querySelector(".oac-empty-state");
    if (emptyState) emptyState.remove();
  }

  private async handleSend(): Promise<void> {
    if (this.tabs.length === 0) {
      this.createTab();
    }

    const text = this.textarea.value.trim();
    if (!text || this.isStreaming) return;

    this.textarea.value = "";
    this.resizeTextarea();
    this.removeEmptyState();

    const sourcePath = this.app.workspace.getActiveFile()?.path ?? '';
    const userHandle = appendMessage(this.messageList, "user", this.app, this, sourcePath);
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
    this.setStreaming(true);

    try {
      const context = await buildContext(
        this.app,
        this.plugin.settings.contextWindowLines,
      );
      const systemPrompt = [this.plugin.settings.systemPromptPrefix, context]
        .filter(Boolean)
        .join("\n\n");

      await this.activeSession.send(text, systemPrompt, (chunk) => {
        assistantHandle.appendChunk(chunk);
        this.smartScroll();
      }, async () => {
        await assistantHandle.finalise();
        this.updateToolbar();
      });
    } catch (err) {
      new Notice(
        `AI Chat error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.setStreaming(false);
      if (!this.isNearBottom()) this.showScrollBtn();
    }
  }

  private scrollToBottom(): void {
    this.messageList.scrollTop = this.messageList.scrollHeight;
  }

  private isNearBottom(el: HTMLElement = this.messageList): boolean {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  private showScrollBtn(): void {
    this.scrollBtn.style.display = "flex";
  }

  private hideScrollBtn(): void {
    this.scrollBtn.style.display = "none";
  }

  private smartScroll(): void {
    if (this.isNearBottom()) {
      this.scrollToBottom();
    } else {
      this.showScrollBtn();
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
