// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { textarea } from '../../../../src/ui/components/primitives/Textarea';

describe('textarea', () => {
  it('appends one textarea element to the container', () => {
    const container = document.createElement('div');

    textarea(container, { onChange: vi.fn() });

    expect(container.children).toHaveLength(1);
    expect(container.children[0].tagName).toBe('TEXTAREA');
  });

  it('applies oac-textarea class to the element', () => {
    const container = document.createElement('div');

    textarea(container, { onChange: vi.fn() });

    expect(container.children[0].classList.contains('oac-textarea')).toBe(true);
  });

  it('sets initial value from config', () => {
    const container = document.createElement('div');

    textarea(container, { value: 'initial text', onChange: vi.fn() });

    expect((container.children[0] as HTMLTextAreaElement).value).toBe('initial text');
  });

  it('defaults value to empty string when not provided', () => {
    const container = document.createElement('div');

    textarea(container, { onChange: vi.fn() });

    expect((container.children[0] as HTMLTextAreaElement).value).toBe('');
  });

  it('sets placeholder from config', () => {
    const container = document.createElement('div');

    textarea(container, { placeholder: 'Write something…', onChange: vi.fn() });

    expect((container.children[0] as HTMLTextAreaElement).placeholder).toBe('Write something…');
  });

  it('calls onChange with the current value when input event fires', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();

    textarea(container, { onChange });
    const el = container.children[0] as HTMLTextAreaElement;
    el.value = 'typed text';
    el.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith('typed text');
  });

  it('does not call onChange before any input event', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();

    textarea(container, { onChange });

    expect(onChange).not.toHaveBeenCalled();
  });
});
