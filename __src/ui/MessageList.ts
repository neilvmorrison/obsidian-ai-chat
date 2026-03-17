import { setIcon } from 'obsidian';

export interface MessageListHandle {
  el: HTMLElement;
  listEl: HTMLElement;
  scrollToBottom(): void;
  smartScroll(): void;
  showScrollBtn(): void;
  hideScrollBtn(): void;
  isNearBottom(): boolean;
  setEmpty(empty: boolean): void;
}

export interface MessageListProps {
  withScrollBtn?: boolean;
  emptyText?: string;
}

const NEAR_BOTTOM_THRESHOLD = 80;

export function createMessageList(
  parent: HTMLElement,
  props?: MessageListProps,
): MessageListHandle {
  const el = parent.createEl('div', { cls: 'oac-message-list-container' });

  let listEl: HTMLElement;
  let emptyStateEl: HTMLElement | null = null;
  if (props?.emptyText) {
    listEl = el.createEl('div', { cls: 'oac-message-list' });
    emptyStateEl = listEl.createEl('div', {
      cls: 'oac-empty-state',
      text: props.emptyText,
    });
  } else {
    listEl = el;
  }

  let scrollBtn: HTMLButtonElement | null = null;
  if (props?.withScrollBtn) {
    scrollBtn = el.createEl('button', { cls: 'oac-scroll-btn' }) as HTMLButtonElement;
    setIcon(scrollBtn, 'arrow-down');
    scrollBtn.setAttribute('aria-label', 'Scroll to bottom');
    scrollBtn.addClass('oac-hidden');
    scrollBtn.addEventListener('click', () => {
      scrollToBottom();
      hideScrollBtn();
    });
  }

  listEl.addEventListener('scroll', () => {
    if (isNearBottom()) hideScrollBtn();
  });

  function scrollToBottom(): void {
    listEl.scrollTop = listEl.scrollHeight;
  }

  function isNearBottom(): boolean {
    return listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < NEAR_BOTTOM_THRESHOLD;
  }

  function showScrollBtn(): void {
    scrollBtn?.removeClass('oac-hidden');
  }

  function hideScrollBtn(): void {
    scrollBtn?.addClass('oac-hidden');
  }

  function smartScroll(): void {
    if (isNearBottom()) {
      scrollToBottom();
    } else {
      showScrollBtn();
    }
  }

  function setEmpty(empty: boolean): void {
    if (!emptyStateEl) return;
    if (empty) {
      emptyStateEl.removeClass('oac-hidden');
    } else {
      emptyStateEl.addClass('oac-hidden');
    }
  }

  return { el, listEl, scrollToBottom, smartScroll, showScrollBtn, hideScrollBtn, isNearBottom, setEmpty };
}
