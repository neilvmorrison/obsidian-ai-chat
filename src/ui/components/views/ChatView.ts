import { ItemView, WorkspaceLeaf } from 'obsidian';
import { computed, signal } from '../../signals';
import type { Signal } from '../../signals';
import { ChatSession } from '../../../chat/ChatSession';
import type { LanguageModel } from 'ai';
import type { AIChatSettings, ProviderSettings } from '../../../types/settings';
import { inputArea } from '../InputArea';
import { messageList } from '../MessageList';
import { fetchOllamaModels } from '../../../providers/ollamaClient';

export const CHAT_VIEW_TYPE = 'oac-chat-view';

const DEFAULT_MODEL = 'llama3.2:latest';

/** Minimal plugin interface required by ChatView. */
export interface ChatViewDeps {
  settings: AIChatSettings;
  /** Factory that builds an AI SDK LanguageModel from provider settings. */
  buildModel(provider: ProviderSettings): LanguageModel;
}

/**
 * Full-pane chat view. Owns one ChatSession per open lifecycle.
 * Always uses the Ollama provider. The model select in the inputArea footer
 * drives the active model — changing it immediately updates the ChatSession.
 */
export class ChatView extends ItemView {
  static readonly VIEW_TYPE = CHAT_VIEW_TYPE;
  private static tabCounter = 0;

  private readonly deps: ChatViewDeps;
  private readonly tabNumber: number;
  private session!: ChatSession;
  private selectedModel!: Signal<string>;

  /** Optional text pre-populated in the input area on next open. */
  prefillText?: string;

  constructor(leaf: WorkspaceLeaf, deps: ChatViewDeps) {
    super(leaf);
    this.deps = deps;
    ChatView.tabCounter += 1;
    this.tabNumber = ChatView.tabCounter;
  }

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return `Chat (${this.tabNumber})`;
  }

  getIcon(): string {
    return 'bot-message-square';
  }

  async onOpen(): Promise<void> {
    const { settings } = this.deps;
    const provider = settings.providers[settings.defaultProviderId];

    // ── Fetch available Ollama models ─────────────────────────────────────
    let modelNames: string[];
    try {
      modelNames = await fetchOllamaModels(provider.baseUrl);
    } catch {
      modelNames = [];
    }
    if (!modelNames.includes(DEFAULT_MODEL)) modelNames.unshift(DEFAULT_MODEL);
    const modelOptions = modelNames.map(name => ({ value: name, label: name }));

    // ── Initialise with the first available model ─────────────────────────
    const initialModel = modelNames[0];
    this.selectedModel = signal(initialModel);

    const buildForModel = (name: string) =>
      this.deps.buildModel({ ...provider, model: name });

    this.session = new ChatSession({
      model: buildForModel(initialModel),
      provider: { ...provider, model: initialModel },
      settings,
    });

    // Keep the session model in sync whenever the user picks a different one.
    this.selectedModel.subscribe(name => {
      this.session.setModel(buildForModel(name));
    });

    const isStreaming = computed(
      () => this.session.streamingState.get() === 'streaming',
      [this.session.streamingState],
    );

    const content = this.contentEl;
    (content as any).empty();
    content.classList.add('oac-chat-view');

    messageList(content, {
      messages: this.session.messages,
      app: this.app,
      component: this,
      sourcePath: '',
    });

    const prefill = this.prefillText;
    this.prefillText = undefined;

    inputArea(content, {
      placeholder: 'Message…',
      onSend: text => { void this.session.send(text); },
      isStreaming,
      onAbort: () => this.session.abort(),
      initialValue: prefill,
      modelOptions,
      selectedModel: this.selectedModel,
      onModelChange: v => this.selectedModel.set(v),
    });
  }

  async onClose(): Promise<void> {
    this.session?.abort();
  }
}
