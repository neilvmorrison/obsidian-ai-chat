export interface InputConfig {
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

/**
 * Appends a single `<input>` to `container`.
 * CSS class: `.oac-input`.
 */
export function input(container: HTMLElement, config: InputConfig): void {
  const el = document.createElement('input');
  el.className = 'oac-input';
  el.value = config.value ?? '';
  if (config.placeholder !== undefined) el.placeholder = config.placeholder;
  el.addEventListener('input', () => config.onChange(el.value));
  container.appendChild(el);
}
