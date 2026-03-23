import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createChat, addMessageToChat, isValidChat } from '../../src/types/Chat';
import type { Chat } from '../../src/types/Chat';

// Freeze time for deterministic timestamps
const FIXED_NOW = '2024-01-15T10:00:00.000Z';

describe('Chat types', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── createChat() ──────────────────────────────────────────────────────────
  describe('createChat()', () => {
    it('sets the given title', () => {
      const chat = createChat('My Chat');
      expect(chat.title).toBe('My Chat');
    });

    it('generates a non-empty id', () => {
      const chat = createChat('Test');
      expect(typeof chat.id).toBe('string');
      expect(chat.id.length).toBeGreaterThan(0);
    });

    it('generates unique ids', () => {
      const a = createChat('A');
      const b = createChat('B');
      expect(a.id).not.toBe(b.id);
    });

    it('sets created and modified to current ISO timestamp', () => {
      const chat = createChat('Test');
      expect(chat.created).toBe(FIXED_NOW);
      expect(chat.modified).toBe(FIXED_NOW);
    });

    it('initializes messages as empty array', () => {
      const chat = createChat('Test');
      expect(chat.messages).toEqual([]);
    });
  });

  // ── addMessageToChat() ────────────────────────────────────────────────────
  describe('addMessageToChat()', () => {
    let base: Chat;

    beforeEach(() => {
      base = createChat('Base');
    });

    it('appends the message to the messages array', () => {
      const updated = addMessageToChat(base, { role: 'user', content: 'Hello' });
      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0]).toMatchObject({ role: 'user', content: 'Hello' });
    });

    it('stamps the message with the current ISO timestamp', () => {
      const updated = addMessageToChat(base, { role: 'user', content: 'Hi' });
      expect(updated.messages[0].timestamp).toBe(FIXED_NOW);
    });

    it('updates the modified timestamp', () => {
      const laterTime = '2024-01-15T11:00:00.000Z';
      vi.setSystemTime(new Date(laterTime));
      const updated = addMessageToChat(base, { role: 'assistant', content: 'Reply' });
      expect(updated.modified).toBe(laterTime);
    });

    it('does not mutate the original chat', () => {
      addMessageToChat(base, { role: 'user', content: 'Hi' });
      expect(base.messages).toHaveLength(0);
    });

    it('preserves existing messages', () => {
      const withFirst = addMessageToChat(base, { role: 'user', content: 'First' });
      const withSecond = addMessageToChat(withFirst, { role: 'assistant', content: 'Second' });
      expect(withSecond.messages).toHaveLength(2);
      expect(withSecond.messages[0].content).toBe('First');
      expect(withSecond.messages[1].content).toBe('Second');
    });

    it('preserves id, title, and created fields', () => {
      const updated = addMessageToChat(base, { role: 'user', content: 'Hi' });
      expect(updated.id).toBe(base.id);
      expect(updated.title).toBe(base.title);
      expect(updated.created).toBe(base.created);
    });
  });

  // ── isValidChat() ─────────────────────────────────────────────────────────
  describe('isValidChat()', () => {
    it('returns true for a valid Chat object', () => {
      const chat = createChat('Valid');
      expect(isValidChat(chat)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidChat(null)).toBe(false);
    });

    it('returns false for a string', () => {
      expect(isValidChat('not a chat')).toBe(false);
    });

    it('returns false when id is missing', () => {
      const { id: _id, ...chat } = createChat('Test');
      expect(isValidChat(chat)).toBe(false);
    });

    it('returns false when messages is not an array', () => {
      const chat = { ...createChat('Test'), messages: 'bad' };
      expect(isValidChat(chat)).toBe(false);
    });

    it('returns false when title is not a string', () => {
      const chat = { ...createChat('Test'), title: 42 };
      expect(isValidChat(chat)).toBe(false);
    });
  });
});
