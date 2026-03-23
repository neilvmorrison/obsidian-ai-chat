export interface IconButtonConfig {
  /** Icon character or short text displayed inside the button. */
  icon: string;
  /** Accessible label applied as `aria-label`. */
  label: string;
  onClick: () => void;
}

/**
 * Appends a single `<button>` to `container`.
 * CSS class: `.oac-icon-button`.
 */
export function iconButton(container: HTMLElement, config: IconButtonConfig): void {
  const btn = document.createElement('button');
  btn.className = 'oac-icon-button';
  btn.setAttribute('aria-label', config.label);
  btn.textContent = config.icon;
  btn.addEventListener('click', config.onClick);
  container.appendChild(btn);
}
