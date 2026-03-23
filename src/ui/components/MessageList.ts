import type { App, Component } from 'obsidian';
import { MarkdownRenderer } from 'obsidian';
import { emptyState } from './primitives/EmptyState';
import type { ReadonlySignal } from '../signals';
import type { Message } from '../../chat/ChatSession';

export interface MessageListConfig {
  /** Reactive list of messages to display. */
  messages: ReadonlySignal<Message[]>;
  /** Obsidian App instance — required by MarkdownRenderer. */
  app: App;
  /** Owning Component — required by MarkdownRenderer post-processors. */
  component: Component;
  /** Source path for link resolution; use '' for no-note context. */
  sourcePath?: string;
}

interface MessageNode {
  wrapper: HTMLElement;
  /** The `<pre>` used while the assistant message is streaming. */
  preEl?: HTMLPreElement;
  timestampEl: HTMLElement;
  finalized: boolean;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createNode(msg: Message, config: MessageListConfig): MessageNode {
  const wrapper = document.createElement('div');
  wrapper.className = `oac-message oac-message--${msg.role}`;

  let preEl: HTMLPreElement | undefined;

  if (msg.role === 'user') {
    const content = document.createElement('span');
    content.className = 'oac-message__content';
    content.textContent = msg.content;
    wrapper.appendChild(content);
  } else if (msg.streaming || !msg.content) {
    // Streaming or empty placeholder — render as <pre> for now.
    preEl = document.createElement('pre');
    preEl.textContent = msg.content;
    wrapper.appendChild(preEl);
  } else {
    // Already-finalized assistant message (e.g. loaded history).
    const mdEl = document.createElement('div');
    mdEl.className = 'markdown-rendered';
    wrapper.appendChild(mdEl);
    void MarkdownRenderer.render(
      config.app, msg.content, mdEl, config.sourcePath ?? '', config.component,
    );
  }

  const timestampEl = document.createElement('span');
  timestampEl.className = 'oac-message__timestamp';
  timestampEl.textContent = formatTimestamp(msg.timestamp);
  wrapper.appendChild(timestampEl);

  const finalized = msg.role === 'user' || (!msg.streaming && !!msg.content);
  return { wrapper, preEl, timestampEl, finalized };
}

function finalizeNode(node: MessageNode, msg: Message, config: MessageListConfig): void {
  node.preEl?.remove();
  node.preEl = undefined;
  node.finalized = true;

  const mdEl = document.createElement('div');
  mdEl.className = 'markdown-rendered';
  node.wrapper.insertBefore(mdEl, node.timestampEl);
  void MarkdownRenderer.render(
    config.app, msg.content, mdEl, config.sourcePath ?? '', config.component,
  );
}

/**
 * Subscribes to a messages signal and renders message items inside a
 * `.oac-message-list` root using smart node-tracking to avoid full re-renders.
 * Assistant messages stream as `<pre>` and are finalized via `MarkdownRenderer`
 * once the `streaming` flag is cleared. Each message shows a timestamp.
 */
export function messageList(container: HTMLElement, config: MessageListConfig): void {
  const root = document.createElement('div');
  root.className = 'oac-message-list';

  const nodes: MessageNode[] = [];

  const render = (messages: Message[]): void => {
    if (messages.length === 0) {
      while (root.firstChild) root.removeChild(root.firstChild);
      nodes.length = 0;
      emptyState(root, { message: 'No messages yet' });
      return;
    }

    // Remove empty state if present.
    const emptyEl = root.querySelector('.oac-empty-state');
    if (emptyEl) root.removeChild(emptyEl);

    // Remove excess DOM nodes when messages array shrinks (e.g. placeholder removed on error).
    while (nodes.length > messages.length) {
      nodes.pop()!.wrapper.remove();
    }

    // Append nodes for newly added messages.
    for (let i = nodes.length; i < messages.length; i++) {
      const node = createNode(messages[i], config);
      nodes.push(node);
      root.appendChild(node.wrapper);
    }

    // Update the last node when it belongs to an unfinalized assistant message.
    if (nodes.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const lastNode = nodes[nodes.length - 1];

      if (lastMsg.role === 'assistant' && !lastNode.finalized) {
        if (!lastMsg.streaming && lastMsg.content) {
          finalizeNode(lastNode, lastMsg, config);
        } else {
          lastNode.preEl!.textContent = lastMsg.content;
        }
      }
    }
  };

  config.messages.subscribe(render);
  container.appendChild(root);
}
