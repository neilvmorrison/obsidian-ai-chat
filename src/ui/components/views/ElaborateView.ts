import { ItemView, WorkspaceLeaf } from 'obsidian';
import { computed } from '../../signals';
import { ChatSession } from '../../../chat/ChatSession';
import type { LanguageModel } from 'ai';
import type { AIChatSettings, ProviderSettings } from '../../../types/settings';
import { inputArea } from '../InputArea';
import { messageList } from '../MessageList';

export const ELABORATE_VIEW_TYPE = 'oac-elaborate-view';

export interface ElaborateOptions {
  /** Text to pre-populate (and auto-send) in the input area. */
  prefillText: string;
  /** Additional context appended to the system prompt. */
  systemContext: string;
  /** When true, prefillText is sent automatically on open. */
  autoSend: boolean;
}

/** Minimal plugin interface required by ElaborateView. */
export interface ElaborateViewDeps {
  settings: AIChatSettings;
  buildModel(provider: ProviderSettings): LanguageModel;
}

/**
 * Single-shot elaboration view. Accepts options before or after `onOpen()`.
 * If `applyOptions()` is called before the view is open, options are buffered
 * in `pendingOptions` and applied when `onOpen()` runs. If called after open,
 * the view re-renders with the new options.
 */
export class ElaborateView extends ItemView {
  static readonly VIEW_TYPE = ELABORATE_VIEW_TYPE;

  private readonly deps: ElaborateViewDeps;
  private session!: ChatSession;
  private pendingOptions: ElaborateOptions | null = null;
  private isOpen = false;

  constructor(leaf: WorkspaceLeaf, deps: ElaborateViewDeps) {
    super(leaf);
    this.deps = deps;
  }

  getViewType(): string {
    return ELABORATE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Elaborate';
  }

  getIcon(): string {
    return 'sparkles';
  }

  /**
   * Supplies options to the view. Safe to call before `onOpen()` — options
   * are buffered and applied when the view opens. If called after open,
   * triggers a fresh render with the new options.
   */
  applyOptions(opts: ElaborateOptions): void {
    this.pendingOptions = opts;
    if (this.isOpen) void this.onOpen();
  }

  async onOpen(): Promise<void> {
    this.isOpen = true;
    this.session?.abort();

    const { settings } = this.deps;
    const provider = settings.providers[settings.defaultProviderId];

    // Merge systemContext into the system prompt for this session.
    const sessionSettings = this.pendingOptions?.systemContext
      ? {
          ...settings,
          systemPromptPrefix: [settings.systemPromptPrefix, this.pendingOptions.systemContext]
            .filter(Boolean)
            .join('\n\n'),
        }
      : settings;

    this.session = new ChatSession({
      model: this.deps.buildModel(provider),
      provider,
      settings: sessionSettings,
    });

    const isStreaming = computed(
      () => this.session.streamingState.get() === 'streaming',
      [this.session.streamingState],
    );

    const content = this.contentEl;
    (content as any).empty();
    content.classList.add('oac-elaborate-view');

    messageList(content, {
      messages: this.session.messages,
      app: this.app,
      component: this,
      sourcePath: '',
    });

    const opts = this.pendingOptions;
    this.pendingOptions = null;

    inputArea(content, {
      placeholder: 'Add instructions…',
      onSend: text => { void this.session.send(text); },
      isStreaming,
      onAbort: () => this.session.abort(),
      initialValue: opts?.prefillText,
    });

    if (opts?.autoSend && opts.prefillText) {
      void this.session.send(opts.prefillText);
    }
  }

  async onClose(): Promise<void> {
    this.isOpen = false;
    this.session?.abort();
  }
}
