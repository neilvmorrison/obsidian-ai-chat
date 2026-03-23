import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatStorageAdapter } from '../../src/storage/ChatStorageAdapter';
import type { Chat } from '../../src/types/Chat';

// ---------------------------------------------------------------------------
// In-memory vault adapter factory
// ---------------------------------------------------------------------------

function makeVaultAdapter() {
  const files: Record<string, string> = {};

  return {
    exists: vi.fn((p: string) => Promise.resolve(p in files)),
    mkdir: vi.fn(() => Promise.resolve()),
    read: vi.fn((p: string) => {
      if (p in files) return Promise.resolve(files[p]);
      return Promise.reject(new Error(`File not found: ${p}`));
    }),
    write: vi.fn((p: string, data: string) => {
      files[p] = data;
      return Promise.resolve();
    }),
    rename: vi.fn((from: string, to: string) => {
      files[to] = files[from];
      delete files[from];
      return Promise.resolve();
    }),
    remove: vi.fn((p: string) => {
      delete files[p];
      return Promise.resolve();
    }),
    list: vi.fn((p: string) => {
      const fileList = Object.keys(files).filter(f => f.startsWith(p + '/') && !f.slice(p.length + 1).includes('/'));
      return Promise.resolve({ files: fileList, folders: [] });
    }),
    _files: files,
  };
}

function makeApp(adapter = makeVaultAdapter()) {
  return { vault: { adapter } };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PLUGIN_DIR = '.obsidian/plugins/ai-chat-plugin';

const sampleChat: Chat = {
  id: 'abc-123',
  title: 'Test Chat',
  created: '2024-01-01T00:00:00.000Z',
  modified: '2024-01-01T01:00:00.000Z',
  messages: [
    { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:01.000Z' },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatStorageAdapter', () => {
  let adapter: ReturnType<typeof makeVaultAdapter>;
  let storage: ChatStorageAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = makeVaultAdapter();
    storage = new ChatStorageAdapter(makeApp(adapter) as any, PLUGIN_DIR);
  });

  // ── ensureStorageDirectory() ──────────────────────────────────────────────
  describe('ensureStorageDirectory()', () => {
    it('creates the chats directory when it does not exist', async () => {
      await storage.ensureStorageDirectory();
      expect(adapter.mkdir).toHaveBeenCalledWith(`${PLUGIN_DIR}/chats`);
    });

    it('does not call mkdir when directory already exists', async () => {
      adapter._files[`${PLUGIN_DIR}/chats`] = '';
      await storage.ensureStorageDirectory();
      expect(adapter.mkdir).not.toHaveBeenCalled();
    });
  });

  // ── saveChat() ────────────────────────────────────────────────────────────
  describe('saveChat()', () => {
    it('writes the chat JSON to the correct path after rename', async () => {
      await storage.saveChat(sampleChat);
      const expectedPath = `${PLUGIN_DIR}/chats/chat-${sampleChat.id}.json`;
      expect(adapter._files[expectedPath]).toBeDefined();
      expect(JSON.parse(adapter._files[expectedPath])).toMatchObject({ id: sampleChat.id });
    });

    it('writes to a temp file first then renames atomically', async () => {
      const calls: string[] = [];
      adapter.write.mockImplementation((p: string, _d: string) => {
        calls.push(`write:${p}`);
        adapter._files[p] = _d;
        return Promise.resolve();
      });
      adapter.rename.mockImplementation((from: string, to: string) => {
        calls.push(`rename:${from}->${to}`);
        adapter._files[to] = adapter._files[from];
        delete adapter._files[from];
        return Promise.resolve();
      });

      await storage.saveChat(sampleChat);

      const tmpPath = `${PLUGIN_DIR}/chats/chat-${sampleChat.id}.json.tmp`;
      const finalPath = `${PLUGIN_DIR}/chats/chat-${sampleChat.id}.json`;
      expect(calls[0]).toBe(`write:${tmpPath}`);
      expect(calls[1]).toBe(`rename:${tmpPath}->${finalPath}`);
    });
  });

  // ── loadChat() ────────────────────────────────────────────────────────────
  describe('loadChat()', () => {
    it('loads and returns the chat by id', async () => {
      await storage.saveChat(sampleChat);
      const loaded = await storage.loadChat(sampleChat.id);
      expect(loaded).toMatchObject({ id: sampleChat.id, title: sampleChat.title });
    });

    it('throws when the file does not exist', async () => {
      await expect(storage.loadChat('nonexistent')).rejects.toThrow();
    });

    it('throws when the file contains invalid JSON', async () => {
      adapter._files[`${PLUGIN_DIR}/chats/chat-bad.json`] = 'not json';
      await expect(storage.loadChat('bad')).rejects.toThrow();
    });

    it('throws when the file contains valid JSON but invalid Chat shape', async () => {
      adapter._files[`${PLUGIN_DIR}/chats/chat-bad.json`] = JSON.stringify({ foo: 'bar' });
      await expect(storage.loadChat('bad')).rejects.toThrow('Invalid chat data');
    });
  });

  // ── listChats() ───────────────────────────────────────────────────────────
  describe('listChats()', () => {
    it('returns empty array when directory does not exist', async () => {
      const result = await storage.listChats();
      expect(result).toEqual([]);
    });

    it('returns metadata for all valid chats', async () => {
      adapter._files[`${PLUGIN_DIR}/chats`] = '';
      await storage.saveChat(sampleChat);

      const result = await storage.listChats();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: sampleChat.id,
        title: sampleChat.title,
        messageCount: sampleChat.messages.length,
      });
    });

    it('skips malformed JSON files without throwing', async () => {
      adapter._files[`${PLUGIN_DIR}/chats`] = '';
      adapter._files[`${PLUGIN_DIR}/chats/chat-bad.json`] = 'invalid json {';
      await storage.saveChat(sampleChat);

      const result = await storage.listChats();
      expect(result).toHaveLength(1);
    });

    it('does not include temporary .tmp files', async () => {
      adapter._files[`${PLUGIN_DIR}/chats`] = '';
      adapter._files[`${PLUGIN_DIR}/chats/chat-abc.json.tmp`] = JSON.stringify(sampleChat);
      const result = await storage.listChats();
      expect(result).toHaveLength(0);
    });
  });

  // ── deleteChat() ──────────────────────────────────────────────────────────
  describe('deleteChat()', () => {
    it('removes the chat JSON file', async () => {
      await storage.saveChat(sampleChat);
      await storage.deleteChat(sampleChat.id);
      expect(adapter._files[`${PLUGIN_DIR}/chats/chat-${sampleChat.id}.json`]).toBeUndefined();
    });
  });
});
