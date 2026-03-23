import type { SelectOption } from './primitives/Select';
import type { ReadonlySignal } from '../signals';

export type { SelectOption };

export interface ModelSelectConfig {
  /** Available model options. */
  options: SelectOption[];
  /** Reactive signal holding the currently selected model value. */
  value: ReadonlySignal<string>;
  /** Called with the newly selected value when the user changes the selection. */
  onChange: (value: string) => void;
}

/**
 * Renders a `<select>` for choosing a model inside `.oac-model-select`.
 * Subscribes to the `value` signal to keep the DOM in sync with external changes.
 */
export function modelSelect(container: HTMLElement, config: ModelSelectConfig): void {
  const root = document.createElement('div');
  root.className = 'oac-model-select';

  const el = document.createElement('select');
  el.className = 'oac-select';

  for (const opt of config.options) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    el.appendChild(option);
  }

  el.addEventListener('change', () => config.onChange(el.value));

  config.value.subscribe(val => {
    el.value = val;
  });

  root.appendChild(el);
  container.appendChild(root);
}
