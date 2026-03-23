// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { signal } from '../../../src/ui/signals';
import { modelSelect } from '../../../src/ui/components/ModelSelect';

const OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'claude-3', label: 'Claude 3' },
  { value: 'llama3', label: 'Llama 3' },
];

describe('modelSelect', () => {
  it('appends one root element to the container', () => {
    const container = document.createElement('div');
    const value = signal('gpt-4o');

    modelSelect(container, { options: OPTIONS, value, onChange: vi.fn() });

    expect(container.children).toHaveLength(1);
  });

  it('applies oac-model-select class to the root element', () => {
    const container = document.createElement('div');
    const value = signal('gpt-4o');

    modelSelect(container, { options: OPTIONS, value, onChange: vi.fn() });

    expect(container.children[0].classList.contains('oac-model-select')).toBe(true);
  });

  it('renders a select element inside the root', () => {
    const container = document.createElement('div');
    const value = signal('gpt-4o');

    modelSelect(container, { options: OPTIONS, value, onChange: vi.fn() });

    expect(container.querySelector('select')).not.toBeNull();
  });

  it('renders one option per entry in options config', () => {
    const container = document.createElement('div');
    const value = signal('gpt-4o');

    modelSelect(container, { options: OPTIONS, value, onChange: vi.fn() });

    const el = container.querySelector('select') as HTMLSelectElement;
    expect(el.options).toHaveLength(3);
  });

  it('sets each option value and label from config', () => {
    const container = document.createElement('div');
    const value = signal('gpt-4o');

    modelSelect(container, { options: OPTIONS, value, onChange: vi.fn() });

    const el = container.querySelector('select') as HTMLSelectElement;
    expect(el.options[0].value).toBe('gpt-4o');
    expect(el.options[0].textContent).toBe('GPT-4o');
    expect(el.options[1].value).toBe('claude-3');
  });

  it('sets the initial selected value from the signal', () => {
    const container = document.createElement('div');
    const value = signal('claude-3');

    modelSelect(container, { options: OPTIONS, value, onChange: vi.fn() });

    const el = container.querySelector('select') as HTMLSelectElement;
    expect(el.value).toBe('claude-3');
  });

  it('calls onChange with the new value when user changes selection', () => {
    const container = document.createElement('div');
    const value = signal('gpt-4o');
    const onChange = vi.fn();

    modelSelect(container, { options: OPTIONS, value, onChange });
    const el = container.querySelector('select') as HTMLSelectElement;
    el.value = 'llama3';
    el.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith('llama3');
  });

  it('does not call onChange before any change event', () => {
    const container = document.createElement('div');
    const value = signal('gpt-4o');
    const onChange = vi.fn();

    modelSelect(container, { options: OPTIONS, value, onChange });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('updates the selected value when the signal changes', () => {
    const container = document.createElement('div');
    const value = signal('gpt-4o');

    modelSelect(container, { options: OPTIONS, value, onChange: vi.fn() });
    const el = container.querySelector('select') as HTMLSelectElement;

    value.set('llama3');

    expect(el.value).toBe('llama3');
  });
});
