// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { input } from '../../../../src/ui/components/primitives/Input';

describe('input', () => {
  it('appends one input element to the container', () => {
    const container = document.createElement('div');

    input(container, { onChange: vi.fn() });

    expect(container.children).toHaveLength(1);
    expect(container.children[0].tagName).toBe('INPUT');
  });

  it('applies oac-input class to the element', () => {
    const container = document.createElement('div');

    input(container, { onChange: vi.fn() });

    expect(container.children[0].classList.contains('oac-input')).toBe(true);
  });

  it('sets initial value from config', () => {
    const container = document.createElement('div');

    input(container, { value: 'hello', onChange: vi.fn() });

    expect((container.children[0] as HTMLInputElement).value).toBe('hello');
  });

  it('defaults value to empty string when not provided', () => {
    const container = document.createElement('div');

    input(container, { onChange: vi.fn() });

    expect((container.children[0] as HTMLInputElement).value).toBe('');
  });

  it('sets placeholder from config', () => {
    const container = document.createElement('div');

    input(container, { placeholder: 'Type here…', onChange: vi.fn() });

    expect((container.children[0] as HTMLInputElement).placeholder).toBe('Type here…');
  });

  it('calls onChange with the current value when input event fires', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();

    input(container, { onChange });
    const el = container.children[0] as HTMLInputElement;
    el.value = 'new value';
    el.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith('new value');
  });

  it('does not call onChange before any input event', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();

    input(container, { onChange });

    expect(onChange).not.toHaveBeenCalled();
  });
});
