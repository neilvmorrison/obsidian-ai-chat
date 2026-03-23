// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { select } from '../../../../src/ui/components/primitives/Select';

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

describe('select', () => {
  it('appends one select element to the container', () => {
    const container = document.createElement('div');

    select(container, { options: OPTIONS, onChange: vi.fn() });

    expect(container.children).toHaveLength(1);
    expect(container.children[0].tagName).toBe('SELECT');
  });

  it('applies oac-select class to the element', () => {
    const container = document.createElement('div');

    select(container, { options: OPTIONS, onChange: vi.fn() });

    expect(container.children[0].classList.contains('oac-select')).toBe(true);
  });

  it('renders one option element per entry in options config', () => {
    const container = document.createElement('div');

    select(container, { options: OPTIONS, onChange: vi.fn() });

    const el = container.children[0] as HTMLSelectElement;
    expect(el.options).toHaveLength(3);
  });

  it('sets each option value and label from config', () => {
    const container = document.createElement('div');

    select(container, { options: OPTIONS, onChange: vi.fn() });

    const el = container.children[0] as HTMLSelectElement;
    expect(el.options[0].value).toBe('a');
    expect(el.options[0].textContent).toBe('Option A');
    expect(el.options[1].value).toBe('b');
    expect(el.options[1].textContent).toBe('Option B');
  });

  it('sets the initial selected value from config', () => {
    const container = document.createElement('div');

    select(container, { options: OPTIONS, value: 'b', onChange: vi.fn() });

    expect((container.children[0] as HTMLSelectElement).value).toBe('b');
  });

  it('calls onChange with the selected value when change event fires', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();

    select(container, { options: OPTIONS, onChange });
    const el = container.children[0] as HTMLSelectElement;
    el.value = 'c';
    el.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('does not call onChange before any change event', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();

    select(container, { options: OPTIONS, onChange });

    expect(onChange).not.toHaveBeenCalled();
  });
});
