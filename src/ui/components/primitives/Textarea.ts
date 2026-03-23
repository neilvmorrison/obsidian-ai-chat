export interface TextareaConfig {
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

/**
 * Appends a single `<textarea>` to `container`.
 * CSS class: `.oac-textarea`.
 */
export function textarea(container: HTMLElement, config: TextareaConfig): void {
  const el = document.createElement('textarea');
  el.className = 'oac-textarea';
  el.value = config.value ?? '';
  if (config.placeholder !== undefined) el.placeholder = config.placeholder;
  el.addEventListener('input', () => config.onChange(el.value));
  container.appendChild(el);
}
