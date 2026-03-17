import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import type OllamaChatPlugin from '../main';
import { ChatSession } from './ChatSession';
import { appendMessage } from './renderMessage';
import { createInputArea, createMessageList } from '../ui';
import type { InputAreaHandle, MessageListHandle } from '../ui';

export const ELABORATE_VIEW_TYPE = 'ollama-elaborate-view';

export interface ElaborateOptions {
  prefillText: string;
  systemContext: string;
  autoSend: boolean;
}

export class ElaborateView extends ItemView {
  plugin: OllamaChatPlugin;
  session: ChatSession;
  private inputArea!: InputAreaHandle;
  private msgList!: MessageListHandle;
  private isStreaming = false;
  private pendingOptions?: ElaborateOptions;

  constructor(leaf: WorkspaceLeaf, plugin: OllamaChatPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.session = new ChatSession(plugin.settings);
  }

  getViewType(): string {
    return ELABORATE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Elaborate';
  }

  getIcon(): string {
    return 'zoom-in';
  }

  async onOpen(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    root.addClass('oac-chat-root');

    // Toolbar
    const toolbar = root.createEl('div', { cls: 'oac-toolbar' });
    toolbar.createEl('span', { cls: 'oac-title', text: 'Elaborate' });
    const clearBtn = toolbar.createEl('button', { cls: 'oac-clear-btn', text: 'Clear' });

    // Message list
    this.msgList = createMessageList(root, { emptyText: "Let's Chat!" });

    // Input area
    this.inputArea = createInputArea(root, {
      onSend: () => this.handleSend(),
      onAbort: () => this.session.abort(),
    });

    clearBtn.addEventListener('click', () => this.handleClear());

    // Apply pending options if set before onOpen was called
    if (this.pendingOptions) {
      await this.applyOptions(this.pendingOptions);
      this.pendingOptions = undefined;
    } else {
      this.inputArea.textarea.focus();
    }
  }

  async onClose(): Promise<void> {
    this.session.abort();
  }

  async applyOptions(opts: ElaborateOptions): Promise<void> {
    if (!this.inputArea) {
      this.pendingOptions = opts;
      return;
    }

    this.session.clear();
    this.msgList.listEl.empty();
    this.msgList.setEmpty(true);

    this.inputArea.textarea.value = opts.prefillText;
    this.inputArea.resizeTextarea();

    if (opts.autoSend) {
      await this.handleSendWithContext(opts.prefillText, opts.systemContext);
      this.inputArea.textarea.value = '';
      this.inputArea.resizeTextarea();
    } else {
      this.inputArea.textarea.focus();
      this.inputArea.textarea.selectionStart = this.inputArea.textarea.value.length;
      this.inputArea.textarea.selectionEnd = this.inputArea.textarea.value.length;
    }
  }

  private async handleSend(): Promise<void> {
    const text = this.inputArea.textarea.value.trim();
    if (!text || this.isStreaming) return;

    this.inputArea.textarea.value = '';
    this.inputArea.resizeTextarea();

    await this.handleSendWithContext(text, '');
  }

  private async handleSendWithContext(text: string, systemContext: string): Promise<void> {
    const sourcePath = this.app.workspace.getActiveFile()?.path ?? '';

    this.msgList.setEmpty(false);

    const userHandle = appendMessage(this.msgList.listEl, 'user', this.app, this, sourcePath);
    userHandle.appendChunk(text);
    await userHandle.finalise();
    this.msgList.scrollToBottom();

    const assistantHandle = appendMessage(this.msgList.listEl, 'assistant', this.app, this, sourcePath);
    this.msgList.scrollToBottom();

    this.isStreaming = true;
    this.inputArea.controls.setStreaming(true);

    try {
      const systemParts = [this.plugin.settings.systemPromptPrefix];
      if (systemContext) {
        systemParts.push(`\nContext from parent message:\n\n${systemContext}`);
      }
      const systemPrompt = systemParts.filter(Boolean).join('\n');

      await this.session.send(text, systemPrompt, chunk => {
        assistantHandle.appendChunk(chunk);
        this.msgList.scrollToBottom();
      }, () => assistantHandle.finalise());
    } catch (err) {
      new Notice(`Elaborate error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.isStreaming = false;
      this.inputArea.controls.setStreaming(false);
      this.msgList.scrollToBottom();
    }
  }

  private handleClear(): void {
    this.session.clear();
    this.msgList.listEl.empty();
    this.msgList.setEmpty(true);
  }
}
