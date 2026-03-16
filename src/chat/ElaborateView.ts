import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import type OllamaChatPlugin from '../main';
import { ChatSession } from './ChatSession';
import { appendMessage } from './renderMessage';

export const ELABORATE_VIEW_TYPE = 'ollama-elaborate-view';

export interface ElaborateOptions {
  prefillText: string;
  systemContext: string;
  autoSend: boolean;
}

export class ElaborateView extends ItemView {
  plugin: OllamaChatPlugin;
  session: ChatSession;
  private messageList!: HTMLElement;
  private textarea!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private abortBtn!: HTMLButtonElement;
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
    this.messageList = root.createEl('div', { cls: 'oac-message-list' });

    // Input area
    const inputArea = root.createEl('div', { cls: 'oac-input-area' });
    this.textarea = inputArea.createEl('textarea', {
      cls: 'oac-input',
      attr: { placeholder: 'Ask anything…', rows: '1' },
    }) as HTMLTextAreaElement;
    const inputActions = inputArea.createEl('div', { cls: 'oac-input-actions' });
    this.abortBtn = inputActions.createEl('button', { cls: 'oac-abort-btn', text: 'Stop' });
    this.abortBtn.style.display = 'none';
    this.sendBtn = inputActions.createEl('button', { cls: 'oac-send-btn', text: 'Send' });

    this.textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    this.sendBtn.addEventListener('click', () => this.handleSend());
    this.abortBtn.addEventListener('click', () => this.session.abort());
    clearBtn.addEventListener('click', () => this.handleClear());
    this.textarea.addEventListener('input', () => this.resizeTextarea());

    // Apply pending options if set before onOpen was called
    if (this.pendingOptions) {
      await this.applyOptions(this.pendingOptions);
      this.pendingOptions = undefined;
    } else {
      this.textarea.focus();
    }
  }

  async onClose(): Promise<void> {
    this.session.abort();
  }

  async applyOptions(opts: ElaborateOptions): Promise<void> {
    // If the view isn't fully built yet, queue the options
    if (!this.textarea) {
      this.pendingOptions = opts;
      return;
    }

    this.session.clear();
    this.messageList.empty();

    this.textarea.value = opts.prefillText;
    this.resizeTextarea();

    if (opts.autoSend) {
      await this.handleSendWithContext(opts.prefillText, opts.systemContext);
      this.textarea.value = '';
      this.resizeTextarea();
    } else {
      this.textarea.focus();
      // Position cursor at end
      this.textarea.selectionStart = this.textarea.value.length;
      this.textarea.selectionEnd = this.textarea.value.length;
    }
  }

  private resizeTextarea(): void {
    this.textarea.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(this.textarea).lineHeight) || 20;
    const maxHeight = lineHeight * 6;
    this.textarea.style.height = Math.min(this.textarea.scrollHeight, maxHeight) + 'px';
  }

  private setStreaming(streaming: boolean): void {
    this.isStreaming = streaming;
    this.sendBtn.disabled = streaming;
    this.abortBtn.style.display = streaming ? 'inline-flex' : 'none';
  }

  private async handleSend(): Promise<void> {
    const text = this.textarea.value.trim();
    if (!text || this.isStreaming) return;

    this.textarea.value = '';
    this.resizeTextarea();

    await this.handleSendWithContext(text, '');
  }

  private async handleSendWithContext(text: string, systemContext: string): Promise<void> {
    const userHandle = appendMessage(this.messageList, 'user', this.app);
    userHandle.appendChunk(text);
    await userHandle.finalise();
    this.scrollToBottom();

    const assistantHandle = appendMessage(this.messageList, 'assistant', this.app);
    this.scrollToBottom();

    this.setStreaming(true);

    try {
      const systemParts = [this.plugin.settings.systemPromptPrefix];
      if (systemContext) {
        systemParts.push(`\nContext from parent message:\n\n${systemContext}`);
      }
      const systemPrompt = systemParts.filter(Boolean).join('\n');

      await this.session.send(text, systemPrompt, chunk => {
        assistantHandle.appendChunk(chunk);
        this.scrollToBottom();
      });

      await assistantHandle.finalise();
    } catch (err) {
      new Notice(`Elaborate error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.setStreaming(false);
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    this.messageList.scrollTop = this.messageList.scrollHeight;
  }

  private handleClear(): void {
    this.session.clear();
    this.messageList.empty();
  }
}
