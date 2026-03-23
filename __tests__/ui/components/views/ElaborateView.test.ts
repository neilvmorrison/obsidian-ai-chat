// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 'ai' before any module that imports it.
vi.mock('ai', () => ({ streamText: vi.fn() }));

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
  }));
  return { ChatSession };
});

import { WorkspaceLeaf } from 'obsidian';
import { ElaborateView, ELABORATE_VIEW_TYPE } from '../../../../src/ui/components/views/ElaborateView';
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

function makeView(): ElaborateView {
  return new ElaborateView(new WorkspaceLeaf(), {
    settings: mockSettings,
    buildModel: mockBuildModel,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ElaborateView', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── Static metadata ──────────────────────────────────────────────────────
  it('getViewType() returns ELABORATE_VIEW_TYPE', () => {
    expect(makeView().getViewType()).toBe(ELABORATE_VIEW_TYPE);
  });

  it('getDisplayText() returns "Elaborate"', () => {
    expect(makeView().getDisplayText()).toBe('Elaborate');
  });

  it('getIcon() returns "sparkles"', () => {
    expect(makeView().getIcon()).toBe('sparkles');
  });

  // ── onOpen() ─────────────────────────────────────────────────────────────
  describe('onOpen()', () => {
    it('adds oac-elaborate-view class to contentEl', async () => {
      const view = makeView();
      await view.onOpen();
      expect(view.contentEl.classList.contains('oac-elaborate-view')).toBe(true);
    });

    it('renders .oac-message-list', async () => {
      const view = makeView();
      await view.onOpen();
      expect(view.contentEl.querySelector('.oac-message-list')).not.toBeNull();
    });

    it('renders a stop button inside the input area', async () => {
      const view = makeView();
      await view.onOpen();
      expect(view.contentEl.querySelector('button[aria-label="Stop streaming"]')).not.toBeNull();
    });

    it('renders .oac-input-area', async () => {
      const view = makeView();
      await view.onOpen();
      expect(view.contentEl.querySelector('.oac-input-area')).not.toBeNull();
    });

    it('does not render a model select', async () => {
      const view = makeView();
      await view.onOpen();
      expect(view.contentEl.querySelector('.oac-model-select')).toBeNull();
    });
  });

  // ── applyOptions() before open ───────────────────────────────────────────
  describe('applyOptions() — before onOpen()', () => {
    it('buffers the options; prefillText appears in textarea after onOpen()', async () => {
      const view = makeView();
      view.applyOptions({ prefillText: 'elaborate this', systemContext: '', autoSend: false });
      await view.onOpen();
      const ta = view.contentEl.querySelector('textarea') as HTMLTextAreaElement;
      expect(ta.value).toBe('elaborate this');
    });

    it('does not call session.send() when autoSend is false', async () => {
      const view = makeView();
      view.applyOptions({ prefillText: 'text', systemContext: '', autoSend: false });
      await view.onOpen();
      const instance = vi.mocked(ChatSession).mock.results[0].value;
      expect(instance.send).not.toHaveBeenCalled();
    });

    it('calls session.send() with prefillText when autoSend is true', async () => {
      const view = makeView();
      view.applyOptions({ prefillText: 'auto text', systemContext: '', autoSend: true });
      await view.onOpen();
      const instance = vi.mocked(ChatSession).mock.results[0].value;
      expect(instance.send).toHaveBeenCalledWith('auto text');
    });

    it('merges systemContext into the ChatSession system prompt', async () => {
      const view = makeView();
      view.applyOptions({ prefillText: '', systemContext: 'extra context', autoSend: false });
      await view.onOpen();
      expect(ChatSession).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            systemPromptPrefix: 'You are helpful.\n\nextra context',
          }),
        }),
      );
    });

    it('uses original settings when systemContext is empty', async () => {
      const view = makeView();
      view.applyOptions({ prefillText: '', systemContext: '', autoSend: false });
      await view.onOpen();
      expect(ChatSession).toHaveBeenCalledWith(
        expect.objectContaining({ settings: mockSettings }),
      );
    });
  });

  // ── applyOptions() after open ────────────────────────────────────────────
  describe('applyOptions() — after onOpen()', () => {
    it('triggers a re-render', async () => {
      const view = makeView();
      await view.onOpen();
      view.applyOptions({ prefillText: 're-render text', systemContext: '', autoSend: false });
      await Promise.resolve(); // flush the void onOpen() microtask
      const ta = view.contentEl.querySelector('textarea') as HTMLTextAreaElement;
      expect(ta.value).toBe('re-render text');
    });

    it('aborts the old session before creating a new one', async () => {
      const view = makeView();
      await view.onOpen();
      const firstInstance = vi.mocked(ChatSession).mock.results[0].value;
      view.applyOptions({ prefillText: 'new text', systemContext: '', autoSend: false });
      await Promise.resolve();
      expect(firstInstance.abort).toHaveBeenCalled();
    });

    it('re-renders with exactly one .oac-message-list', async () => {
      const view = makeView();
      await view.onOpen();
      view.applyOptions({ prefillText: '', systemContext: '', autoSend: false });
      await Promise.resolve();
      expect(view.contentEl.querySelectorAll('.oac-message-list')).toHaveLength(1);
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

    it('marks the view as closed so subsequent applyOptions() buffers again', async () => {
      const view = makeView();
      await view.onOpen();
      await view.onClose();
      // After close, applyOptions should not trigger onOpen() — just buffer
      vi.clearAllMocks();
      view.applyOptions({ prefillText: 'after close', systemContext: '', autoSend: false });
      expect(ChatSession).not.toHaveBeenCalled();
    });
  });
});
