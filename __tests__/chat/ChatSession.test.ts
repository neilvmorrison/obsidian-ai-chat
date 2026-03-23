import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatSession } from '../../src/chat/ChatSession';
import type { AIChatSettings, ProviderSettings } from '../../src/types/settings';

vi.mock('ai', () => ({
  streamText: vi.fn(),
}));

import { streamText } from 'ai';

const mockStreamText = vi.mocked(streamText);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Drain the microtask queue completely before continuing. */
const flushPromises = () => new Promise<void>(resolve => setTimeout(resolve, 0));

function makeStream(...chunks: string[]) {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })(),
  };
}

/**
 * Controlled stream: yields `firstChunk` immediately, then blocks until
 * `unblock()` is called, then yields `sentinel` (so the abort check fires on
 * the next loop iteration).
 */
function makeBlockedStream(firstChunk: string) {
  let unblock!: () => void;
  const blocker = new Promise<void>(r => (unblock = r));

  const textStream = (async function* () {
    yield firstChunk;
    await blocker;
    yield '__sentinel__'; // triggers the abort-check at top of loop
  })();

  return { textStream, unblock };
}

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

// LanguageModel is fully mocked via streamText — the object itself is unused.
const mockModel = {} as ReturnType<typeof vi.fn>;

function makeSession() {
  return new ChatSession({ model: mockModel, provider: mockProvider, settings: mockSettings });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatSession', () => {
  let session: ChatSession;

  beforeEach(() => {
    vi.clearAllMocks();
    session = makeSession();
  });

  // -------------------------------------------------------------------------
  describe('constructor', () => {
    it('initializes messages signal with empty array', () => {
      expect(session.messages.get()).toEqual([]);
    });

    it('initializes streamingState signal as idle', () => {
      expect(session.streamingState.get()).toBe('idle');
    });

    it('initializes error signal as null', () => {
      expect(session.error.get()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('send()', () => {
    it('adds user message to messages signal', async () => {
      mockStreamText.mockReturnValue(makeStream());

      await session.send('hello');

      expect(session.messages.get()[0]).toMatchObject({ role: 'user', content: 'hello' });
    });

    it('updates assistant message signal once per chunk', async () => {
      const updates: string[] = [];
      mockStreamText.mockReturnValue(makeStream('Hello', ', ', 'world!'));

      session.messages.subscribe(msgs => {
        const assistant = msgs.find(m => m.role === 'assistant');
        if (assistant) updates.push(assistant.content);
      });

      await session.send('hi');

      // subscribe fires immediately with '' placeholder, then once per chunk,
      // then once more when the streaming flag is cleared on finalization
      expect(updates).toEqual(['', 'Hello', 'Hello, ', 'Hello, world!', 'Hello, world!']);
    });

    it('sets streamingState to streaming during send', async () => {
      const states: string[] = [];
      mockStreamText.mockReturnValue(makeStream('Hi'));

      session.streamingState.subscribe(s => states.push(s));
      await session.send('hello');

      expect(states).toContain('streaming');
    });

    it('sets streamingState back to idle after send completes', async () => {
      mockStreamText.mockReturnValue(makeStream('Hi'));

      await session.send('hello');

      expect(session.streamingState.get()).toBe('idle');
    });

    it('calls onComplete with full text after stream finishes', async () => {
      const onComplete = vi.fn();
      mockStreamText.mockReturnValue(makeStream('Hello', ' world'));

      await session.send('hi', onComplete);

      expect(onComplete).toHaveBeenCalledWith('Hello world');
    });

    it('leaves error signal null on successful stream', async () => {
      mockStreamText.mockReturnValue(makeStream('ok'));

      await session.send('hi');

      expect(session.error.get()).toBeNull();
    });

    it('sets error signal when stream throws a non-abort error', async () => {
      mockStreamText.mockReturnValue({
        textStream: (async function* () {
          throw new Error('network failure');
        })(),
      });

      await session.send('hi');

      expect(session.error.get()).toBe('network failure');
      expect(session.streamingState.get()).toBe('error');
    });

    it('removes assistant placeholder message on error', async () => {
      mockStreamText.mockReturnValue({
        textStream: (async function* () {
          throw new Error('boom');
        })(),
      });

      await session.send('hello');

      const msgs = session.messages.get();
      expect(msgs).toHaveLength(1);
      expect(msgs[0].role).toBe('user');
    });

    it('preserves all messages across multiple sends', async () => {
      mockStreamText.mockReturnValueOnce(makeStream('First response'));
      await session.send('first');

      mockStreamText.mockReturnValueOnce(makeStream('Second response'));
      await session.send('second');

      const msgs = session.messages.get();
      expect(msgs).toHaveLength(4);
      expect(msgs[0]).toMatchObject({ role: 'user',      content: 'first'           });
      expect(msgs[1]).toMatchObject({ role: 'assistant', content: 'First response'  });
      expect(msgs[2]).toMatchObject({ role: 'user',      content: 'second'          });
      expect(msgs[3]).toMatchObject({ role: 'assistant', content: 'Second response' });
    });

    it('passes system prompt and message history to streamText', async () => {
      mockStreamText.mockReturnValue(makeStream('response'));

      await session.send('hello');

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are helpful.',
          messages: [expect.objectContaining({ role: 'user', content: 'hello' })],
        }),
      );
    });

    it('excludes in-progress assistant placeholder from streamText messages', async () => {
      mockStreamText.mockReturnValueOnce(makeStream('first'));
      await session.send('first msg');

      mockStreamText.mockReturnValueOnce(makeStream('second'));
      await session.send('second msg');

      const lastCall = mockStreamText.mock.calls[1][0] as { messages: unknown[] };
      expect(lastCall.messages).toHaveLength(3); // user, assistant, user — no placeholder
    });
  });

  // -------------------------------------------------------------------------
  describe('abort()', () => {
    it('does nothing when not currently streaming', () => {
      expect(() => session.abort()).not.toThrow();
    });

    it('stops further signal updates and appends _(aborted)_ to partial message', async () => {
      const { textStream, unblock } = makeBlockedStream('partial');
      mockStreamText.mockReturnValue({ textStream });

      const sendPromise = session.send('hi');

      // Drain all microtasks so the first chunk is processed before aborting.
      await flushPromises();

      session.abort();
      unblock(); // let the generator proceed so the abort-check fires

      await sendPromise;

      expect(session.messages.get()[1].content).toBe('partial\n\n_(aborted)_');
    });

    it('calls onComplete with aborted text when some chunks were received', async () => {
      const onComplete = vi.fn();
      const { textStream, unblock } = makeBlockedStream('hello');
      mockStreamText.mockReturnValue({ textStream });

      const sendPromise = session.send('hi', onComplete);

      await flushPromises();

      session.abort();
      unblock();

      await sendPromise;

      expect(onComplete).toHaveBeenCalledWith('hello\n\n_(aborted)_');
    });

    it('does not call onComplete when aborted before any chunks are processed', async () => {
      const onComplete = vi.fn();
      mockStreamText.mockReturnValue({
        textStream: (async function* () {
          yield 'first chunk'; // will be skipped — abort fires before processing
        })(),
      });

      const sendPromise = session.send('hi', onComplete);
      session.abort(); // synchronous — fires before the for-await loop body runs

      await sendPromise;

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('removes placeholder when aborted before any chunks are processed', async () => {
      mockStreamText.mockReturnValue({
        textStream: (async function* () {
          yield 'first chunk';
        })(),
      });

      const sendPromise = session.send('hi');
      session.abort();

      await sendPromise;

      // Only the user message remains
      expect(session.messages.get()).toHaveLength(1);
      expect(session.messages.get()[0].role).toBe('user');
    });

    it('sets streamingState to idle after abort', async () => {
      const { textStream, unblock } = makeBlockedStream('text');
      mockStreamText.mockReturnValue({ textStream });

      const sendPromise = session.send('hi');

      await Promise.resolve();

      session.abort();
      unblock();

      await sendPromise;

      expect(session.streamingState.get()).toBe('idle');
    });
  });

  // -------------------------------------------------------------------------
  describe('generateTitle()', () => {
    it('returns first user message content as title', async () => {
      mockStreamText.mockReturnValue(makeStream('response'));
      await session.send('My question');

      expect(session.generateTitle()).toBe('My question');
    });

    it('strips filesystem-unsafe characters', async () => {
      mockStreamText.mockReturnValue(makeStream('ok'));
      await session.send('file/name:with*bad?chars');

      expect(session.generateTitle()).toBe('filenamewithbadchars');
    });

    it('returns Chat when result is empty after stripping', async () => {
      mockStreamText.mockReturnValue(makeStream('ok'));
      await session.send('///:*?"<>|#^[]');

      expect(session.generateTitle()).toBe('Chat');
    });

    it('returns Chat when there are no user messages', () => {
      expect(session.generateTitle()).toBe('Chat');
    });
  });

  // -------------------------------------------------------------------------
  describe('serialize()', () => {
    it('includes YAML frontmatter with all required fields', async () => {
      mockStreamText.mockReturnValue(makeStream('response'));
      await session.send('hello');

      const output = session.serialize('Test Title');

      expect(output).toContain('---');
      expect(output).toContain('title: "Test Title"');
      expect(output).toContain('model: llama3');
      expect(output).toContain('turns: 1');
      expect(output).toContain('message_count: 2');
      expect(output).toContain('tags: [ai-chat]');
    });

    it('uses generateTitle when no title argument is provided', async () => {
      mockStreamText.mockReturnValue(makeStream('ok'));
      await session.send('My question');

      const output = session.serialize();

      expect(output).toContain('title: "My question"');
    });

    it('counts only user messages in turns', async () => {
      mockStreamText.mockReturnValueOnce(makeStream('resp 1'));
      await session.send('first');
      mockStreamText.mockReturnValueOnce(makeStream('resp 2'));
      await session.send('second');

      const output = session.serialize('title');

      expect(output).toContain('turns: 2');
      expect(output).toContain('message_count: 4');
    });

    it('includes date as ISO string', async () => {
      mockStreamText.mockReturnValue(makeStream('ok'));
      await session.send('hello');

      const output = session.serialize();

      expect(output).toMatch(/date: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
