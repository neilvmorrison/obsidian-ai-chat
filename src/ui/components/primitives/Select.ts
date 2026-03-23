export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectConfig {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
}

/**
 * Appends a single `<select>` to `container`.
 * CSS class: `.oac-select`.
 */
export function select(container: HTMLElement, config: SelectConfig): void {
  const el = document.createElement('select');
  el.className = 'oac-select';

  for (const opt of config.options) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    el.appendChild(option);
  }

  if (config.value !== undefined) el.value = config.value;
  el.addEventListener('change', () => config.onChange(el.value));
  container.appendChild(el);
}
