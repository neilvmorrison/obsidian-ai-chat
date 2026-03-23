import { emptyState } from './primitives/EmptyState';
import type { ReadonlySignal } from '../signals';
import type { Message } from '../../chat/ChatSession';

export interface MessageListConfig {
  /** Reactive list of messages to display. */
  messages: ReadonlySignal<Message[]>;
}

/**
 * Subscribes to a messages signal and re-renders message items inside a
 * `.oac-message-list` root. Shows an empty state when the list is empty.
 * Each message renders as `.oac-message.oac-message--{role}`.
 */
export function messageList(container: HTMLElement, config: MessageListConfig): void {
  const root = document.createElement('div');
  root.className = 'oac-message-list';

  const render = (messages: Message[]): void => {
    while (root.firstChild) root.removeChild(root.firstChild);

    if (messages.length === 0) {
      emptyState(root, { message: 'No messages yet' });
      return;
    }

    for (const msg of messages) {
      const item = document.createElement('div');
      item.className = `oac-message oac-message--${msg.role}`;
      item.textContent = msg.content;
      root.appendChild(item);
    }
  };

  config.messages.subscribe(render);
  container.appendChild(root);
}
