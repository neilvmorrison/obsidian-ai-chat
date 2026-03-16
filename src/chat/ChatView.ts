import { ItemView, WorkspaceLeaf, Notice, setIcon } from "obsidian";
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
  private tabBarEl!: HTMLElement;
  private messageListContainer!: HTMLElement;

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

    // Tab bar (toolbar row)
    this.tabBarEl = root.createEl("div", { cls: "oac-tab-bar" });
    const tabsRow = this.tabBarEl.createEl("div", { cls: "oac-tabs-row" });
    const toolbarRight = this.tabBarEl.createEl("div", {
      cls: "oac-toolbar-right",
    });

    const saveBtn = toolbarRight.createEl("button", { cls: "oac-icon-btn oac-save-btn" });
    setIcon(saveBtn, "save");
    saveBtn.setAttribute("aria-label", "Save as Note");

    const newChatBtn = toolbarRight.createEl("button", { cls: "oac-icon-btn oac-new-chat-btn" });
    setIcon(newChatBtn, "plus");
    newChatBtn.setAttribute("aria-label", "New Chat");

    // Message list container
    this.messageListContainer = root.createEl("div", {
      cls: "oac-message-list-container",
    });

    // Input area
    const inputArea = root.createEl("div", { cls: "oac-input-area" });
    this.textarea = inputArea.createEl("textarea", {
      cls: "oac-input",
      attr: { placeholder: "Ask anything…", rows: "1" },
    }) as HTMLTextAreaElement;

    const inputActions = inputArea.createEl("div", { cls: "oac-input-actions" });
    const inputActionsLeft = inputActions.createEl("div", { cls: "oac-input-actions-left" });
    const inputActionsRight = inputActions.createEl("div", { cls: "oac-input-actions-right" });

    const uploadBtn = inputActionsLeft.createEl("button", { cls: "oac-icon-btn oac-upload-btn" });
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
    saveBtn.addEventListener("click", () => this.handleSave());
    newChatBtn.addEventListener("click", () => this.createTab(tabsRow));

    // Create initial tab
    this.createTab(tabsRow);

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

  private createTab(tabsRow: HTMLElement): void {
    const tabIndex = this.tabs.length;
    const tabId = `tab-${Date.now()}`;
    const session = new ChatSession(this.plugin.settings);

    const tabEl = tabsRow.createEl("button", { cls: "oac-tab" });
    tabEl.createEl("span", { text: `Chat ${tabIndex + 1}`, cls: "oac-tab-label" });
    const closeEl = tabEl.createEl("button", { cls: "oac-tab-close", text: "×" });

    const messageListEl = this.messageListContainer.createEl("div", {
      cls: "oac-message-list",
    });
    messageListEl.style.display = "none";
    messageListEl.createEl("div", { cls: "oac-empty-state", text: "Let's Chat" });

    const tab: Tab = { id: tabId, session, messageListEl, tabEl, closeEl };
    this.tabs.push(tab);

    tabEl.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).classList.contains("oac-tab-close")) return;
      this.switchToTab(this.tabs.indexOf(tab));
    });

    closeEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeTab(this.tabs.indexOf(tab));
    });

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
    this.textarea?.focus();
  }

  private closeTab(index: number): void {
    if (this.tabs.length <= 1) return;

    const tab = this.tabs[index];
    tab.session.abort();
    tab.messageListEl.remove();
    tab.tabEl.remove();
    this.tabs.splice(index, 1);

    const nextIndex = index >= this.tabs.length ? this.tabs.length - 1 : index;
    this.activeTabIndex = -1; // force switch to re-apply
    this.switchToTab(nextIndex);
    this.updateCloseButtons();
  }

  private updateCloseButtons(): void {
    const showClose = this.tabs.length > 1;
    this.tabs.forEach((t) => {
      t.closeEl.style.display = showClose ? "inline-flex" : "none";
    });
  }

  private async fetchModels(): Promise<string[]> {
    const tagsURL = this.plugin.settings.baseURL.replace(/\/+$/, "") + "/tags";
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
    const text = this.textarea.value.trim();
    if (!text || this.isStreaming) return;

    this.textarea.value = "";
    this.resizeTextarea();

    this.removeEmptyState();

    // Render user message
    const userHandle = appendMessage(this.messageList, "user", this.app);
    userHandle.appendChunk(text);
    await userHandle.finalise();
    this.scrollToBottom();

    // Start assistant message
    const assistantHandle = appendMessage(
      this.messageList,
      "assistant",
      this.app,
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
        this.scrollToBottom();
      });

      await assistantHandle.finalise();
    } catch (err) {
      new Notice(
        `AI Chat error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.setStreaming(false);
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    this.messageList.scrollTop = this.messageList.scrollHeight;
  }

  private async handleSave(): Promise<void> {
    if (this.activeSession.messages.length === 0) {
      new Notice("Nothing to save yet.");
      return;
    }
    const transcript = this.activeSession.serialize();
    const folder = this.plugin.settings.saveFolder;

    let title: string;
    try {
      const gen_title = await this.activeSession.generateTitle();
      title = gen_title.charAt(0).toUpperCase() + gen_title.slice(1).toLowerCase();
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
