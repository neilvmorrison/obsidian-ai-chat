import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ai', () => ({ generateText: vi.fn(), streamText: vi.fn() }));
vi.mock('@ai-sdk/openai', () => ({ createOpenAI: vi.fn() }));
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: vi.fn() }));
vi.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: vi.fn() }));

vi.mock('../../src/storage/ChatStorageAdapter', () => ({
  ChatStorageAdapter: vi.fn().mockImplementation(() => ({
    ensureStorageDirectory: vi.fn().mockResolvedValue(undefined),
    saveChat: vi.fn().mockResolvedValue(undefined),
    loadChat: vi.fn(),
    listChats: vi.fn().mockResolvedValue([]),
    deleteChat: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../src/storage/SnapshotGenerator', () => ({
  SnapshotGenerator: vi.fn().mockImplementation(() => ({
    generateSnapshot: vi.fn().mockResolvedValue(undefined),
    deleteSnapshot: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../src/storage/TitleGenerator', () => ({
  TitleGenerator: vi.fn().mockImplementation(() => ({
    generateTitle: vi.fn().mockResolvedValue('Generated Title'),
  })),
}));

import { ChatManager } from '../../src/storage/ChatManager';
import { ChatStorageAdapter } from '../../src/storage/ChatStorageAdapter';
import { SnapshotGenerator } from '../../src/storage/SnapshotGenerator';
import { TitleGenerator } from '../../src/storage/TitleGenerator';
import type { Chat } from '../../src/types/Chat';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeManager() {
  return new ChatManager({} as any, '.obsidian/plugins/ai-chat', 'Chats', {} as any);
}

function getStorage(mgr: ChatManager) {
  return vi.mocked(ChatStorageAdapter).mock.results[vi.mocked(ChatStorageAdapter).mock.results.length - 1].value;
}

function getSnapshots(mgr: ChatManager) {
  return vi.mocked(SnapshotGenerator).mock.results[vi.mocked(SnapshotGenerator).mock.results.length - 1].value;
}

function getTitler(mgr: ChatManager) {
  return vi.mocked(TitleGenerator).mock.results[vi.mocked(TitleGenerator).mock.results.length - 1].value;
}

const baseChat: Chat = {
  id: 'chat-id-1',
  title: 'Untitled Chat',
  created: '2024-01-01T00:00:00.000Z',
  modified: '2024-01-01T00:00:00.000Z',
  messages: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatManager', () => {
  let manager: ChatManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = makeManager();
  });

  // ── initializeStorage() ───────────────────────────────────────────────────
  describe('initializeStorage()', () => {
    it('calls ensureStorageDirectory on the adapter', async () => {
      await manager.initializeStorage();
      expect(getStorage(manager).ensureStorageDirectory).toHaveBeenCalled();
    });
  });

  // ── createNewChat() ───────────────────────────────────────────────────────
  describe('createNewChat()', () => {
    it('returns a chat with title "Untitled Chat"', async () => {
      const chat = await manager.createNewChat();
      expect(chat.title).toBe('Untitled Chat');
    });

    it('saves the new chat to storage', async () => {
      await manager.createNewChat();
      expect(getStorage(manager).saveChat).toHaveBeenCalledOnce();
    });

    it('generates a unique id', async () => {
      const a = await manager.createNewChat();
      const b = await manager.createNewChat();
      expect(a.id).not.toBe(b.id);
    });
  });

  // ── openChat() ────────────────────────────────────────────────────────────
  describe('openChat()', () => {
    it('delegates to storage.loadChat', async () => {
      getStorage(manager).loadChat.mockResolvedValue(baseChat);
      const chat = await manager.openChat('chat-id-1');
      expect(getStorage(manager).loadChat).toHaveBeenCalledWith('chat-id-1');
      expect(chat).toEqual(baseChat);
    });
  });

  // ── listAvailableChats() ──────────────────────────────────────────────────
  describe('listAvailableChats()', () => {
    it('delegates to storage.listChats', async () => {
      const meta = [{ id: '1', title: 'A', created: '', modified: '', messageCount: 0 }];
      getStorage(manager).listChats.mockResolvedValue(meta);
      const result = await manager.listAvailableChats();
      expect(result).toEqual(meta);
    });
  });

  // ── continueChat() ────────────────────────────────────────────────────────
  describe('continueChat()', () => {
    beforeEach(() => {
      getStorage(manager).loadChat.mockResolvedValue({ ...baseChat });
    });

    it('appends new messages to the chat', async () => {
      const updated = await manager.continueChat('chat-id-1', [
        { role: 'user', content: 'Hello' },
      ]);
      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0]).toMatchObject({ role: 'user', content: 'Hello' });
    });

    it('stamps each appended message with a timestamp', async () => {
      const updated = await manager.continueChat('chat-id-1', [
        { role: 'user', content: 'Hi' },
      ]);
      expect(typeof updated.messages[0].timestamp).toBe('string');
    });

    it('auto-generates a title when still "Untitled Chat"', async () => {
      const updated = await manager.continueChat('chat-id-1', [
        { role: 'user', content: 'Message' },
      ]);
      expect(updated.title).toBe('Generated Title');
      expect(getTitler(manager).generateTitle).toHaveBeenCalled();
    });

    it('does not call TitleGenerator when chat already has a custom title', async () => {
      getStorage(manager).loadChat.mockResolvedValue({ ...baseChat, title: 'Existing Title' });
      await manager.continueChat('chat-id-1', [{ role: 'user', content: 'Hi' }]);
      expect(getTitler(manager).generateTitle).not.toHaveBeenCalled();
    });

    it('does not call TitleGenerator when there are no messages', async () => {
      await manager.continueChat('chat-id-1', []);
      expect(getTitler(manager).generateTitle).not.toHaveBeenCalled();
    });

    it('saves the updated chat to storage', async () => {
      await manager.continueChat('chat-id-1', [{ role: 'user', content: 'Hi' }]);
      expect(getStorage(manager).saveChat).toHaveBeenCalled();
    });

    it('regenerates the snapshot after saving', async () => {
      await manager.continueChat('chat-id-1', [{ role: 'user', content: 'Hi' }]);
      expect(getSnapshots(manager).generateSnapshot).toHaveBeenCalled();
    });

    it('returns the updated chat', async () => {
      const updated = await manager.continueChat('chat-id-1', [
        { role: 'assistant', content: 'Reply' },
      ]);
      expect(updated.messages[0].content).toBe('Reply');
    });
  });

  // ── saveChat() ────────────────────────────────────────────────────────────
  describe('saveChat()', () => {
    it('persists the chat and regenerates snapshot', async () => {
      await manager.saveChat(baseChat);
      expect(getStorage(manager).saveChat).toHaveBeenCalledWith(baseChat);
      expect(getSnapshots(manager).generateSnapshot).toHaveBeenCalledWith(baseChat);
    });
  });

  // ── deleteChat() ──────────────────────────────────────────────────────────
  describe('deleteChat()', () => {
    it('loads, deletes JSON, and removes snapshot', async () => {
      getStorage(manager).loadChat.mockResolvedValue(baseChat);
      await manager.deleteChat('chat-id-1');
      expect(getStorage(manager).deleteChat).toHaveBeenCalledWith('chat-id-1');
      expect(getSnapshots(manager).deleteSnapshot).toHaveBeenCalledWith(baseChat);
    });
  });
});
