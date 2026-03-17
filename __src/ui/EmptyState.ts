import { setIcon } from 'obsidian';

export interface EmptyStateHandle {
  el: HTMLElement;
  show(): void;
  hide(): void;
}

export interface EmptyStateProps {
  text: string;
  cls?: string | string[];
}

export function createEmptyState(
  parent: HTMLElement,
  props: EmptyStateProps,
): EmptyStateHandle {
  const baseCls = 'oac-empty-state';
  const extra = props.cls
    ? Array.isArray(props.cls) ? props.cls : [props.cls]
    : [];
  const el = parent.createEl('div', { cls: [baseCls, ...extra] });

  const logo = el.createEl('div', { cls: 'oac-empty-logo' });
  const iconWrap = logo.createEl('div', { cls: 'oac-empty-logo-icon' });
  setIcon(iconWrap, 'bot-message-square');

  el.createEl('span', { text: props.text, cls: 'oac-empty-label' });

  return {
    el,
    show() { el.removeClass('oac-hidden'); },
    hide() { el.addClass('oac-hidden'); },
  };
}
