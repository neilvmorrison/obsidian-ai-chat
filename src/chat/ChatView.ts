import { ItemView, WorkspaceLeaf, Notice } from "obsidian";
import type OllamaChatPlugin from "../main";
import { ChatSession } from "./ChatSession";
import { appendMessage } from "./renderMessage";
import { buildContext } from "../context/buildContext";

export const CHAT_VIEW_TYPE = "ollama-chat-view";

export class ChatView extends ItemView {
  plugin: OllamaChatPlugin;
  session: ChatSession;
  private messageList!: HTMLElement;
  textarea!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private abortBtn!: HTMLButtonElement;
  private isStreaming = false;
  prefillText?: string;

  constructor(leaf: WorkspaceLeaf, plugin: OllamaChatPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.session = new ChatSession(plugin.settings);
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

  async onOpen(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    root.addClass("oac-chat-root");

    // Toolbar
    const toolbar = root.createEl("div", { cls: "oac-toolbar" });
    toolbar.createEl("span", { cls: "oac-title", text: "AI Chat" });
    const saveBtn = toolbar.createEl("button", {
      cls: "oac-save-btn",
      text: "Save as Note",
    });
    const clearBtn = toolbar.createEl("button", {
      cls: "oac-clear-btn",
      text: "Clear",
    });

    // Message list
    this.messageList = root.createEl("div", { cls: "oac-message-list" });

    // Input area
    const inputArea = root.createEl("div", { cls: "oac-input-area" });
    this.textarea = inputArea.createEl("textarea", {
      cls: "oac-input",
      attr: { placeholder: "Ask anything…", rows: "1" },
    }) as HTMLTextAreaElement;
    const inputActions = inputArea.createEl("div", {
      cls: "oac-input-actions",
    });
    this.abortBtn = inputActions.createEl("button", {
      cls: "oac-abort-btn",
      text: "Stop",
    });
    this.abortBtn.style.display = "none";
    this.sendBtn = inputActions.createEl("button", {
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

    this.sendBtn.addEventListener("click", () => this.handleSend());
    this.abortBtn.addEventListener("click", () => this.session.abort());
    saveBtn.addEventListener("click", () => this.handleSave());
    clearBtn.addEventListener("click", () => this.handleClear());

    // Auto-resize textarea
    this.textarea.addEventListener("input", () => this.resizeTextarea());

    // Pre-fill if provided
    if (this.prefillText) {
      this.textarea.value = this.prefillText;
      this.resizeTextarea();
      this.prefillText = undefined;
    }

    this.textarea.focus();
  }

  async onClose(): Promise<void> {
    this.session.abort();
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

  private async handleSend(): Promise<void> {
    const text = this.textarea.value.trim();
    if (!text || this.isStreaming) return;

    this.textarea.value = "";
    this.resizeTextarea();

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

      await this.session.send(text, systemPrompt, (chunk) => {
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
    if (this.session.messages.length === 0) {
      new Notice("Nothing to save yet.");
      return;
    }
    const transcript = this.session.serialize();
    const folder = this.plugin.settings.saveFolder;

    let title: string;
    try {
      title = await this.session.generateTitle();
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

  private handleClear(): void {
    this.session.clear();
    this.messageList.empty();
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
