import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SnapshotGenerator } from '../../src/storage/SnapshotGenerator';
import type { Chat } from '../../src/types/Chat';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeVaultAdapter() {
  const files: Record<string, string> = {};
  return {
    exists: vi.fn((p: string) => Promise.resolve(p in files)),
    mkdir: vi.fn(() => Promise.resolve()),
    write: vi.fn((p: string, data: string) => {
      files[p] = data;
      return Promise.resolve();
    }),
    remove: vi.fn((p: string) => {
      delete files[p];
      return Promise.resolve();
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

const sampleChat: Chat = {
  id: 'test-id',
  title: 'My Test Chat',
  created: '2024-01-01T00:00:00.000Z',
  modified: '2024-01-01T01:00:00.000Z',
  messages: [
    { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:01.000Z' },
    { role: 'assistant', content: 'Hi there!', timestamp: '2024-01-01T00:00:02.000Z' },
  ],
};

const SNAPSHOT_FOLDER = 'Chats';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SnapshotGenerator', () => {
  let vaultAdapter: ReturnType<typeof makeVaultAdapter>;
  let generator: SnapshotGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    vaultAdapter = makeVaultAdapter();
    generator = new SnapshotGenerator(makeApp(vaultAdapter) as any, SNAPSHOT_FOLDER);
  });

  // ── generateSnapshot() ────────────────────────────────────────────────────
  describe('generateSnapshot()', () => {
    it('creates the snapshot folder when it does not exist', async () => {
      await generator.generateSnapshot(sampleChat);
      expect(vaultAdapter.mkdir).toHaveBeenCalledWith(SNAPSHOT_FOLDER);
    });

    it('does not call mkdir when the folder already exists', async () => {
      vaultAdapter._files[SNAPSHOT_FOLDER] = '';
      await generator.generateSnapshot(sampleChat);
      expect(vaultAdapter.mkdir).not.toHaveBeenCalled();
    });

    it('writes the snapshot to <folder>/<title>.md', async () => {
      await generator.generateSnapshot(sampleChat);
      expect(vaultAdapter._files[`${SNAPSHOT_FOLDER}/My Test Chat.md`]).toBeDefined();
    });

    it('includes YAML frontmatter with chat-id', async () => {
      await generator.generateSnapshot(sampleChat);
      const content = vaultAdapter._files[`${SNAPSHOT_FOLDER}/My Test Chat.md`];
      expect(content).toContain('---');
      expect(content).toContain(`chat-id: ${sampleChat.id}`);
    });

    it('includes read-only: true in frontmatter', async () => {
      await generator.generateSnapshot(sampleChat);
      const content = vaultAdapter._files[`${SNAPSHOT_FOLDER}/My Test Chat.md`];
      expect(content).toContain('read-only: true');
    });

    it('includes message-count in frontmatter', async () => {
      await generator.generateSnapshot(sampleChat);
      const content = vaultAdapter._files[`${SNAPSHOT_FOLDER}/My Test Chat.md`];
      expect(content).toContain(`message-count: ${sampleChat.messages.length}`);
    });

    it('renders user messages with blockquote prefix', async () => {
      await generator.generateSnapshot(sampleChat);
      const content = vaultAdapter._files[`${SNAPSHOT_FOLDER}/My Test Chat.md`];
      expect(content).toContain('> **You**');
      expect(content).toContain('Hello');
    });

    it('renders assistant messages with bold prefix', async () => {
      await generator.generateSnapshot(sampleChat);
      const content = vaultAdapter._files[`${SNAPSHOT_FOLDER}/My Test Chat.md`];
      expect(content).toContain('**Assistant**');
      expect(content).toContain('Hi there!');
    });

    it('overwrites an existing snapshot', async () => {
      await generator.generateSnapshot(sampleChat);
      const updated = { ...sampleChat, title: 'My Test Chat', messages: [...sampleChat.messages, { role: 'user' as const, content: 'New message', timestamp: '2024-01-01T02:00:00Z' }] };
      await generator.generateSnapshot(updated);
      const content = vaultAdapter._files[`${SNAPSHOT_FOLDER}/My Test Chat.md`];
      expect(content).toContain('New message');
    });

    it('sanitizes filesystem-unsafe characters in the filename', async () => {
      const unsafeChat = { ...sampleChat, title: 'Chat: "Hello/World"' };
      await generator.generateSnapshot(unsafeChat);
      expect(vaultAdapter._files[`${SNAPSHOT_FOLDER}/Chat Hello World.md`]).toBeDefined();
    });

    it('falls back to Untitled Chat when title sanitizes to empty', async () => {
      const emptyTitleChat = { ...sampleChat, title: '/\\:*?"<>|' };
      await generator.generateSnapshot(emptyTitleChat);
      expect(vaultAdapter._files[`${SNAPSHOT_FOLDER}/Untitled Chat.md`]).toBeDefined();
    });
  });

  // ── deleteSnapshot() ──────────────────────────────────────────────────────
  describe('deleteSnapshot()', () => {
    it('removes the snapshot file if it exists', async () => {
      await generator.generateSnapshot(sampleChat);
      await generator.deleteSnapshot(sampleChat);
      expect(vaultAdapter._files[`${SNAPSHOT_FOLDER}/My Test Chat.md`]).toBeUndefined();
    });

    it('does not throw when snapshot does not exist', async () => {
      await expect(generator.deleteSnapshot(sampleChat)).resolves.not.toThrow();
      expect(vaultAdapter.remove).not.toHaveBeenCalled();
    });
  });
});
