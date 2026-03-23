// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { signal } from '../../../src/ui/signals';
import { messageList } from '../../../src/ui/components/MessageList';
import type { Message } from '../../../src/chat/ChatSession';

const USER_MSG: Message = { role: 'user', content: 'Hello' };
const ASSISTANT_MSG: Message = { role: 'assistant', content: 'Hi there' };

describe('messageList', () => {
  it('appends one root element to the container', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([]);

    messageList(container, { messages });

    expect(container.children).toHaveLength(1);
  });

  it('applies oac-message-list class to the root element', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([]);

    messageList(container, { messages });

    expect(container.children[0].classList.contains('oac-message-list')).toBe(true);
  });

  it('renders empty state when messages signal is empty', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([]);

    messageList(container, { messages });

    const root = container.children[0];
    expect(root.querySelector('.oac-empty-state')).not.toBeNull();
  });

  it('renders one message item per message when messages are present', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([USER_MSG, ASSISTANT_MSG]);

    messageList(container, { messages });

    const root = container.children[0];
    expect(root.querySelectorAll('.oac-message')).toHaveLength(2);
  });

  it('renders message content as text in each item', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([USER_MSG]);

    messageList(container, { messages });

    const root = container.children[0];
    const item = root.querySelector('.oac-message') as HTMLElement;
    expect(item.textContent).toBe('Hello');
  });

  it('applies role modifier class to each message item', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([USER_MSG, ASSISTANT_MSG]);

    messageList(container, { messages });

    const root = container.children[0];
    const items = root.querySelectorAll('.oac-message');
    expect(items[0].classList.contains('oac-message--user')).toBe(true);
    expect(items[1].classList.contains('oac-message--assistant')).toBe(true);
  });

  it('removes empty state and renders messages when signal updates from empty', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([]);

    messageList(container, { messages });

    messages.set([USER_MSG]);

    const root = container.children[0];
    expect(root.querySelector('.oac-empty-state')).toBeNull();
    expect(root.querySelectorAll('.oac-message')).toHaveLength(1);
  });

  it('updates rendered messages when signal changes', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([USER_MSG]);

    messageList(container, { messages });

    messages.set([USER_MSG, ASSISTANT_MSG]);

    const root = container.children[0];
    expect(root.querySelectorAll('.oac-message')).toHaveLength(2);
  });

  it('shows empty state again when messages signal returns to empty', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([USER_MSG]);

    messageList(container, { messages });

    messages.set([]);

    const root = container.children[0];
    expect(root.querySelector('.oac-empty-state')).not.toBeNull();
    expect(root.querySelectorAll('.oac-message')).toHaveLength(0);
  });
});
