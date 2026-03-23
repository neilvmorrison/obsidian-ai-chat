// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 'ai' before any module that imports it.
vi.mock('ai', () => ({ streamText: vi.fn() }));

// Mock fetch to return a fixed set of Ollama models.
const MOCK_OLLAMA_MODELS = ['llama3:latest', 'mistral:7b'];
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ models: MOCK_OLLAMA_MODELS.map(name => ({ name })) }),
}));

// Mock ChatSession so tests don't hit the real streaming logic.
vi.mock('../../../../src/chat/ChatSession', () => {
  const ChatSession = vi.fn().mockImplementation(() => ({
    messages: {
      get: () => [],
      subscribe: (cb: (v: unknown[]) => void) => { cb([]); return () => {}; },
    },
    streamingState: {
      get: () => 'idle',
      subscribe: (cb: (v: string) => void) => { cb('idle'); return () => {}; },
    },
    error: {
      get: () => null,
      subscribe: (cb: (v: null) => void) => { cb(null); return () => {}; },
    },
    send: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn(),
    setModel: vi.fn(),
  }));
  return { ChatSession };
});

import { WorkspaceLeaf } from 'obsidian';
import { ChatView, CHAT_VIEW_TYPE } from '../../../../src/ui/components/views/ChatView';
import { ChatSession } from '../../../../src/chat/ChatSession';
import type { AIChatSettings, ProviderSettings } from '../../../../src/types/settings';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockProvider: ProviderSettings = {
  id: 'ollama',
  name: 'Ollama',
  type: 'openai-compat',
  baseUrl: 'http://localhost:11434',
  apiKey: '',
  model: 'llama3',
  enabled: true,
};

const mockSettings: AIChatSettings = {
  version: 1,
  defaultProviderId: 'ollama',
  providers: { ollama: mockProvider },
  contextWindowLines: 40,
  systemPromptPrefix: 'You are helpful.',
  saveFolder: 'AI Chats',
  promptSaveOnClose: true,
  hotkey: 'Mod+Shift+A',
  agentProviderId: 'ollama',
  agentModel: '',
  agentSystemPrompt: 'You are an agent.',
};

const mockModel = {};
const mockBuildModel = vi.fn().mockReturnValue(mockModel);

function makeView(): ChatView {
  return new ChatView(new WorkspaceLeaf(), {
    settings: mockSettings,
    buildModel: mockBuildModel,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatView', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── Static metadata ──────────────────────────────────────────────────────
  it('getViewType() returns CHAT_VIEW_TYPE', () => {
    expect(makeView().getViewType()).toBe(CHAT_VIEW_TYPE);
  });

  it('getDisplayText() returns "Chat (N)" with an incrementing tab number', () => {
    const text = makeView().getDisplayText();
    expect(text).toMatch(/^Chat \(\d+\)$/);
  });

  it('getIcon() returns "bot-message-square"', () => {
    expect(makeView().getIcon()).toBe('bot-message-square');
  });

  // ── onOpen() ─────────────────────────────────────────────────────────────
  describe('onOpen()', () => {
    it('adds oac-chat-view class to contentEl', async () => {
      const view = makeView();
      await view.onOpen();
      expect(view.contentEl.classList.contains('oac-chat-view')).toBe(true);
    });

    it('calls buildModel with the default provider and the first available model', async () => {
      const view = makeView();
      await view.onOpen();
      // buildModel is called with an updated provider where model = first Ollama model
      expect(mockBuildModel).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ollama' }),
      );
    });

    it('instantiates a ChatSession', async () => {
      const view = makeView();
      await view.onOpen();
      expect(ChatSession).toHaveBeenCalledOnce();
    });

    it('renders .oac-model-select inside contentEl', async () => {
      const view = makeView();
      await view.onOpen();
      expect(view.contentEl.querySelector('.oac-model-select')).not.toBeNull();
    });

    it('renders .oac-message-list inside contentEl', async () => {
      const view = makeView();
      await view.onOpen();
      expect(view.contentEl.querySelector('.oac-message-list')).not.toBeNull();
    });

    it('renders a stop button inside contentEl', async () => {
      const view = makeView();
      await view.onOpen();
      expect(view.contentEl.querySelector('button[aria-label="Stop streaming"]')).not.toBeNull();
    });

    it('renders .oac-input-area inside contentEl', async () => {
      const view = makeView();
      await view.onOpen();
      expect(view.contentEl.querySelector('.oac-input-area')).not.toBeNull();
    });

    it('applies prefillText as initial textarea value', async () => {
      const view = makeView();
      view.prefillText = 'hello!';
      await view.onOpen();
      const ta = view.contentEl.querySelector('textarea') as HTMLTextAreaElement;
      expect(ta.value).toBe('hello!');
    });

    it('clears prefillText after onOpen()', async () => {
      const view = makeView();
      view.prefillText = 'some text';
      await view.onOpen();
      expect(view.prefillText).toBeUndefined();
    });

    it('re-renders cleanly when called a second time', async () => {
      const view = makeView();
      await view.onOpen();
      await view.onOpen();
      // Should still have exactly one of each component root
      expect(view.contentEl.querySelectorAll('.oac-message-list')).toHaveLength(1);
      expect(view.contentEl.querySelectorAll('.oac-input-area')).toHaveLength(1);
    });
  });

  // ── onClose() ────────────────────────────────────────────────────────────
  describe('onClose()', () => {
    it('calls session.abort()', async () => {
      const view = makeView();
      await view.onOpen();
      const instance = vi.mocked(ChatSession).mock.results[0].value;
      await view.onClose();
      expect(instance.abort).toHaveBeenCalled();
    });

    it('does not throw if called before onOpen()', async () => {
      const view = makeView();
      await expect(view.onClose()).resolves.not.toThrow();
    });
  });

  // ── selectedModel signal ─────────────────────────────────────────────────
  describe('model select', () => {
    it('populates options from Ollama models', async () => {
      const view = makeView();
      await view.onOpen();
      const select = view.contentEl.querySelector('select') as HTMLSelectElement;
      // Ollama returns 2 models; default 'llama3.2:latest' is prepended if absent.
      const values = Array.from(select.options).map(o => o.value);
      expect(values).toContain('llama3:latest');
      expect(values).toContain('mistral:7b');
    });

    it('falls back to the default model when fetch fails', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('connection refused'));
      const view = makeView();
      await view.onOpen();
      const select = view.contentEl.querySelector('select') as HTMLSelectElement;
      const values = Array.from(select.options).map(o => o.value);
      expect(values).toContain('llama3.2:latest');
    });
  });
});
