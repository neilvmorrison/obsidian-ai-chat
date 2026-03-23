// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { signal } from '../../../src/ui/signals';
import { messageList } from '../../../src/ui/components/MessageList';
import type { Message } from '../../../src/chat/ChatSession';
import { App, Component } from 'obsidian';

const TS = 1700000000000;

function makeConfig(msgs: Message[] = []) {
  const messages = signal<Message[]>(msgs);
  return {
    messages,
    app: new App(),
    component: new Component(),
    sourcePath: '',
  };
}

const USER_MSG: Message = { role: 'user', content: 'Hello', timestamp: TS };
const ASSISTANT_MSG: Message = { role: 'assistant', content: 'Hi there', timestamp: TS + 1000 };
const STREAMING_MSG: Message = { role: 'assistant', content: 'Typ...', streaming: true, timestamp: TS + 2000 };

describe('messageList', () => {
  it('appends one root element to the container', () => {
    const container = document.createElement('div');
    const config = makeConfig();

    messageList(container, config);

    expect(container.children).toHaveLength(1);
  });

  it('applies oac-message-list class to the root element', () => {
    const container = document.createElement('div');
    const config = makeConfig();

    messageList(container, config);

    expect(container.children[0].classList.contains('oac-message-list')).toBe(true);
  });

  it('renders empty state when messages signal is empty', () => {
    const container = document.createElement('div');
    const config = makeConfig();

    messageList(container, config);

    const root = container.children[0];
    expect(root.querySelector('.oac-empty-state')).not.toBeNull();
  });

  it('renders one message item per message when messages are present', () => {
    const container = document.createElement('div');
    const config = makeConfig([USER_MSG, ASSISTANT_MSG]);

    messageList(container, config);

    const root = container.children[0];
    expect(root.querySelectorAll('.oac-message')).toHaveLength(2);
  });

  it('renders user message content as text', () => {
    const container = document.createElement('div');
    const config = makeConfig([USER_MSG]);

    messageList(container, config);

    const root = container.children[0];
    const content = root.querySelector('.oac-message__content') as HTMLElement;
    expect(content.textContent).toBe('Hello');
  });

  it('renders streaming assistant message as <pre>', () => {
    const container = document.createElement('div');
    const config = makeConfig([STREAMING_MSG]);

    messageList(container, config);

    const root = container.children[0];
    const pre = root.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre!.textContent).toBe('Typ...');
  });

  it('renders finalized assistant message with MarkdownRenderer', () => {
    const container = document.createElement('div');
    const config = makeConfig([ASSISTANT_MSG]);

    messageList(container, config);

    const root = container.children[0];
    expect(root.querySelector('.markdown-rendered')).not.toBeNull();
    expect(root.querySelector('pre')).toBeNull();
  });

  it('applies role modifier class to each message item', () => {
    const container = document.createElement('div');
    const config = makeConfig([USER_MSG, ASSISTANT_MSG]);

    messageList(container, config);

    const root = container.children[0];
    const items = root.querySelectorAll('.oac-message');
    expect(items[0].classList.contains('oac-message--user')).toBe(true);
    expect(items[1].classList.contains('oac-message--assistant')).toBe(true);
  });

  it('renders a timestamp on each message', () => {
    const container = document.createElement('div');
    const config = makeConfig([USER_MSG, ASSISTANT_MSG]);

    messageList(container, config);

    const root = container.children[0];
    const timestamps = root.querySelectorAll('.oac-message__timestamp');
    expect(timestamps).toHaveLength(2);
    timestamps.forEach(ts => expect(ts.textContent).not.toBe(''));
  });

  it('removes empty state and renders messages when signal updates from empty', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([]);
    const config = { messages, app: new App(), component: new Component(), sourcePath: '' };

    messageList(container, config);

    messages.set([USER_MSG]);

    const root = container.children[0];
    expect(root.querySelector('.oac-empty-state')).toBeNull();
    expect(root.querySelectorAll('.oac-message')).toHaveLength(1);
  });

  it('updates streaming <pre> content when signal changes', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([STREAMING_MSG]);
    const config = { messages, app: new App(), component: new Component(), sourcePath: '' };

    messageList(container, config);

    messages.set([{ ...STREAMING_MSG, content: 'Typing...' }]);

    const root = container.children[0];
    expect(root.querySelector('pre')!.textContent).toBe('Typing...');
  });

  it('finalizes streaming message with MarkdownRenderer when streaming flag is cleared', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([STREAMING_MSG]);
    const config = { messages, app: new App(), component: new Component(), sourcePath: '' };

    messageList(container, config);
    expect(container.querySelector('pre')).not.toBeNull();

    messages.set([{ role: 'assistant', content: 'Done!', timestamp: STREAMING_MSG.timestamp }]);

    expect(container.querySelector('.markdown-rendered')).not.toBeNull();
    expect(container.querySelector('pre')).toBeNull();
  });

  it('removes placeholder DOM node when messages array shrinks', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([USER_MSG, STREAMING_MSG]);
    const config = { messages, app: new App(), component: new Component(), sourcePath: '' };

    messageList(container, config);
    expect(container.querySelectorAll('.oac-message')).toHaveLength(2);

    messages.set([USER_MSG]);

    expect(container.querySelectorAll('.oac-message')).toHaveLength(1);
  });

  it('updates rendered messages when signal grows', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([USER_MSG]);
    const config = { messages, app: new App(), component: new Component(), sourcePath: '' };

    messageList(container, config);
    messages.set([USER_MSG, STREAMING_MSG]);

    const root = container.children[0];
    expect(root.querySelectorAll('.oac-message')).toHaveLength(2);
  });

  it('shows empty state again when messages signal returns to empty', () => {
    const container = document.createElement('div');
    const messages = signal<Message[]>([USER_MSG]);
    const config = { messages, app: new App(), component: new Component(), sourcePath: '' };

    messageList(container, config);
    messages.set([]);

    const root = container.children[0];
    expect(root.querySelector('.oac-empty-state')).not.toBeNull();
    expect(root.querySelectorAll('.oac-message')).toHaveLength(0);
  });
});
