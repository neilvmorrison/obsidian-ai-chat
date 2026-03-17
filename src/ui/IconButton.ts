import { setIcon } from 'obsidian';

export interface IconButtonHandle {
  el: HTMLButtonElement;
}

export interface IconButtonProps {
  icon: string;
  label: string;
  cls: string | string[];
  onClick: () => void;
}

export function createIconButton(
  parent: HTMLElement,
  props: IconButtonProps,
): IconButtonHandle {
  const classes = Array.isArray(props.cls) ? props.cls : [props.cls];
  const el = parent.createEl('button', { cls: classes }) as HTMLButtonElement;
  setIcon(el, props.icon);
  el.setAttribute('aria-label', props.label);
  el.addEventListener('click', props.onClick);
  return { el };
}
