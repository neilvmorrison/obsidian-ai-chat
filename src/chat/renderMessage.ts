import { App, MarkdownRenderer, Component } from 'obsidian';

export interface MessageHandle {
  el: HTMLElement;
  appendChunk: (text: string) => void;
  finalise: () => Promise<void>;
}

export type SelectionHandler = (selectedText: string, parentMessage: string) => void;

export function appendMessage(
  container: HTMLElement,
  role: 'user' | 'assistant',
  app: App,
  component: Component,
  sourcePath: string,
  onElaborate?: SelectionHandler,
  onAskAbout?: SelectionHandler
): MessageHandle {
  const el = container.createEl('div', {
    cls: `oac-message oac-message--${role} markdown-rendered`,
  });

  const pre = el.createEl('pre', { cls: 'oac-message-pre' });
  let fullText = '';

  function appendChunk(text: string): void {
    fullText += text;
    pre.textContent = fullText;
  }

  const finalise = (): Promise<void> =>
    new Promise((resolve) => {
      requestAnimationFrame(async () => {
        el.empty();
        await MarkdownRenderer.render(app, fullText, el, sourcePath, component);
        if (role === 'assistant' && (onElaborate || onAskAbout)) {
          attachSelectionPopup(el, el, fullText, onElaborate, onAskAbout);
        }
        resolve();
      });
    });

  return { el, appendChunk, finalise };
}

function attachSelectionPopup(
  messageEl: HTMLElement,
  contentEl: HTMLElement,
  fullText: string,
  onElaborate?: SelectionHandler,
  onAskAbout?: SelectionHandler
): void {
  let popup: HTMLElement | null = null;

  function removePopup(): void {
    popup?.remove();
    popup = null;
  }

  contentEl.addEventListener('mouseup', (e: MouseEvent) => {
    // Small delay to let selection settle
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      if (!selectedText) {
        removePopup();
        return;
      }

      removePopup();

      const range = selection?.getRangeAt(0);
      if (!range) return;

      const rect = range.getBoundingClientRect();
      const containerRect = messageEl.getBoundingClientRect();

      popup = document.createEl('div', { cls: 'oac-selection-popup' });

      if (onElaborate) {
        const elaborateBtn = popup.createEl('button', {
          cls: 'oac-selection-btn',
          text: 'Elaborate',
        });
        elaborateBtn.addEventListener('click', () => {
          removePopup();
          onElaborate(selectedText, fullText);
        });
      }

      if (onAskAbout) {
        const askBtn = popup.createEl('button', {
          cls: 'oac-selection-btn',
          text: 'Ask about this',
        });
        askBtn.addEventListener('click', () => {
          removePopup();
          onAskAbout(selectedText, fullText);
        });
      }

      // Position relative to the message element
      const top = rect.top - containerRect.top - (popup.offsetHeight || 32) - 4;
      const left = rect.left - containerRect.left;

      popup.style.top = `${top}px`;
      popup.style.left = `${left}px`;

      messageEl.style.position = 'relative';
      messageEl.appendChild(popup);

      e.stopPropagation();
    }, 10);
  });

  // Remove popup when clicking outside
  document.addEventListener('mousedown', (e: MouseEvent) => {
    if (popup && !popup.contains(e.target as Node)) {
      removePopup();
    }
  });
}
