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
  const el = parent.createEl('div', { cls: [baseCls, ...extra], text: props.text });

  return {
    el,
    show() { el.removeClass('oac-hidden'); },
    hide() { el.addClass('oac-hidden'); },
  };
}
