import { App, MarkdownRenderer, Component, Menu } from 'obsidian';

export interface MessageHandle {
  el: HTMLElement;
  appendChunk: (text: string) => void;
  finalise: () => Promise<void>;
  destroy: () => void;
}

export type OpenInNewChatHandler = (selectedText: string) => void;
export type LookupHandler = (selectedText: string, fullText: string) => void;

export function appendMessage(
  container: HTMLElement,
  role: 'user' | 'assistant',
  app: App,
  component: Component,
  sourcePath: string,
  onOpenNewChat?: OpenInNewChatHandler,
  onLookup?: LookupHandler
): MessageHandle {
  const el = container.createEl('div', {
    cls: `oac-message oac-message--${role} oac-message-rendered markdown-rendered`,
  });

  const pre = el.createEl('pre', { cls: 'oac-message-pre' });
  let fullText = '';

  function appendChunk(text: string): void {
    fullText += text;
    pre.textContent = fullText;
  }

  let cleanupMenu: (() => void) | null = null;

  const finalise = (): Promise<void> =>
    new Promise((resolve) => {
      requestAnimationFrame(async () => {
        el.empty();
        await MarkdownRenderer.render(app, fullText, el, sourcePath, component);
        if (role === 'assistant' && (onOpenNewChat || onLookup)) {
          cleanupMenu = attachContextMenu(el, fullText, onOpenNewChat, onLookup);
        }
        resolve();
      });
    });

  return {
    el,
    appendChunk,
    finalise,
    destroy: () => { cleanupMenu?.(); cleanupMenu = null; },
  };
}

function attachContextMenu(
  contentEl: HTMLElement,
  fullText: string,
  onOpenNewChat?: OpenInNewChatHandler,
  onLookup?: LookupHandler
): () => void {
  function onContextMenu(e: MouseEvent): void {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (!selectedText) return;

    const range = selection?.getRangeAt(0);
    if (!range || !contentEl.contains(range.commonAncestorContainer)) return;

    e.preventDefault();

    const menu = new Menu();

    if (onOpenNewChat) {
      menu.addItem((item) =>
        item
          .setTitle('Open in new chat')
          .setIcon('message-square')
          .onClick(() => onOpenNewChat(selectedText))
      );
    }

    if (onLookup) {
      menu.addItem((item) =>
        item
          .setTitle('Look up')
          .setIcon('search')
          .onClick(() => onLookup(selectedText, fullText))
      );
    }

    menu.showAtMouseEvent(e);
  }

  contentEl.addEventListener('contextmenu', onContextMenu);

  return () => {
    contentEl.removeEventListener('contextmenu', onContextMenu);
  };
}
