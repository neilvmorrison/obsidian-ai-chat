import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InlineGenerateSuggest } from '../../src/commands/InlineGenerateSuggest';

vi.mock('obsidian', () => ({
  EditorSuggest: class {
    context: any = null;
    constructor(_app: any) {}
  },
  Notice: vi.fn(),
}));

vi.mock('ai', () => ({
  streamText: vi.fn(),
}));

import { streamText } from 'ai';
const mockStreamText = vi.mocked(streamText);

const SETTINGS = {
  defaultProviderId: 'ollama',
  providers: { ollama: { id: 'ollama', model: 'llama3', enabled: true } },
  systemPromptPrefix: 'You are helpful.',
} as any;

const mockModel = {} as any;
const mockBuildModel = vi.fn().mockReturnValue(mockModel);

function makeDeps() {
  return { settings: SETTINGS, buildModel: mockBuildModel };
}

function makeSuggest() {
  return new InlineGenerateSuggest({} as any, makeDeps());
}

function makeEditor(overrides: Record<string, any> = {}) {
  return {
    getLine: vi.fn().mockReturnValue(''),
    replaceRange: vi.fn(),
    getCursor: vi.fn().mockReturnValue({ line: 0, ch: 0 }),
    getRange: vi.fn().mockReturnValue(''),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockBuildModel.mockReturnValue(mockModel);
});

describe('InlineGenerateSuggest', () => {
  describe('onTrigger', () => {
    it('returns null when /generate is not in the line', () => {
      const suggest = makeSuggest();
      const editor = makeEditor({ getLine: () => 'Hello world' });

      const result = suggest.onTrigger({ line: 0, ch: 11 } as any, editor as any, {} as any);

      expect(result).toBeNull();
    });

    it('returns trigger info when /generate is found', () => {
      const suggest = makeSuggest();
      const editor = makeEditor({ getLine: () => '/generate' });

      const result = suggest.onTrigger({ line: 0, ch: 9 } as any, editor as any, {} as any);

      expect(result).not.toBeNull();
    });

    it('sets start to the position of /generate', () => {
      const suggest = makeSuggest();
      const editor = makeEditor({ getLine: () => '/generate' });

      const result = suggest.onTrigger({ line: 0, ch: 9 } as any, editor as any, {} as any);

      expect(result?.start).toEqual({ line: 0, ch: 0 });
    });

    it('sets end to the cursor position', () => {
      const suggest = makeSuggest();
      const cursor = { line: 0, ch: 9 };
      const editor = makeEditor({ getLine: () => '/generate' });

      const result = suggest.onTrigger(cursor as any, editor as any, {} as any);

      expect(result?.end).toEqual(cursor);
    });

    it('returns null when line has text but cursor is before /generate', () => {
      const suggest = makeSuggest();
      const editor = makeEditor({ getLine: () => '/generate' });

      const result = suggest.onTrigger({ line: 0, ch: 2 } as any, editor as any, {} as any);

      expect(result).toBeNull();
    });
  });

  describe('getSuggestions', () => {
    it('returns a non-empty list', () => {
      const suggest = makeSuggest();

      const items = suggest.getSuggestions({} as any);

      expect(items.length).toBeGreaterThan(0);
    });

    it('returns string items', () => {
      const suggest = makeSuggest();

      const items = suggest.getSuggestions({} as any);

      expect(typeof items[0]).toBe('string');
    });
  });

  describe('renderSuggestion', () => {
    it('sets element text to the item value', () => {
      const suggest = makeSuggest();
      const el = { setText: vi.fn() };

      suggest.renderSuggestion('Generate text here', el as any);

      expect(el.setText).toHaveBeenCalledWith('Generate text here');
    });
  });

  describe('selectSuggestion', () => {
    it('does nothing when context is null', async () => {
      const suggest = makeSuggest();
      (suggest as any).context = null;

      await suggest.selectSuggestion('item', {} as any);

      expect(mockBuildModel).not.toHaveBeenCalled();
    });

    it('removes the trigger text from the editor', async () => {
      mockStreamText.mockReturnValue({ textStream: (async function* () {})() } as any);
      const suggest = makeSuggest();
      const editor = makeEditor();
      (suggest as any).context = {
        editor,
        file: {},
        start: { line: 0, ch: 0 },
        end: { line: 0, ch: 9 },
      };

      await suggest.selectSuggestion('Generate text here', {} as any);

      expect(editor.replaceRange).toHaveBeenCalledWith('', { line: 0, ch: 0 }, { line: 0, ch: 9 });
    });

    it('calls buildModel with the default provider', async () => {
      mockStreamText.mockReturnValue({ textStream: (async function* () {})() } as any);
      const suggest = makeSuggest();
      const editor = makeEditor();
      (suggest as any).context = {
        editor,
        file: {},
        start: { line: 0, ch: 0 },
        end: { line: 0, ch: 9 },
      };

      await suggest.selectSuggestion('item', {} as any);

      expect(mockBuildModel).toHaveBeenCalledWith(SETTINGS.providers.ollama);
    });

    it('inserts streamed chunks into the editor', async () => {
      mockStreamText.mockReturnValue({
        textStream: (async function* () {
          yield 'Hello';
          yield ' world';
        })(),
      } as any);
      const suggest = makeSuggest();
      const editor = makeEditor();
      (suggest as any).context = {
        editor,
        file: {},
        start: { line: 0, ch: 0 },
        end: { line: 0, ch: 9 },
      };

      await suggest.selectSuggestion('item', {} as any);

      // First call removes trigger; subsequent calls insert chunks
      const calls = (editor.replaceRange as any).mock.calls;
      const chunkCalls = calls.filter((c: any[]) => c[0] !== '');
      expect(chunkCalls[0][0]).toBe('Hello');
      expect(chunkCalls[1][0]).toBe(' world');
    });

    it('shows a Notice on error', async () => {
      mockStreamText.mockImplementation(() => { throw new Error('API failure'); });
      const { Notice } = await import('obsidian');
      const suggest = makeSuggest();
      const editor = makeEditor();
      (suggest as any).context = {
        editor,
        file: {},
        start: { line: 0, ch: 0 },
        end: { line: 0, ch: 9 },
      };

      await suggest.selectSuggestion('item', {} as any);

      expect(Notice).toHaveBeenCalledWith(expect.stringContaining('API failure'));
    });
  });
});
