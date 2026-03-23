// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { signal } from '../../../src/ui/signals';
import { inputArea } from '../../../src/ui/components/InputArea';
import type { ReadonlySignal } from '../../../src/ui/signals';

function makeNotStreaming(): ReadonlySignal<boolean> {
  return signal(false);
}

describe('inputArea', () => {
  it('appends one root element to the container', () => {
    const container = document.createElement('div');

    inputArea(container, { onSend: vi.fn(), isStreaming: makeNotStreaming(), onAbort: vi.fn() });

    expect(container.children).toHaveLength(1);
  });

  it('applies oac-input-area class to the root element', () => {
    const container = document.createElement('div');

    inputArea(container, { onSend: vi.fn(), isStreaming: makeNotStreaming(), onAbort: vi.fn() });

    expect(container.children[0].classList.contains('oac-input-area')).toBe(true);
  });

  it('renders a textarea inside the root element', () => {
    const container = document.createElement('div');

    inputArea(container, { onSend: vi.fn(), isStreaming: makeNotStreaming(), onAbort: vi.fn() });

    const ta = container.querySelector('textarea');
    expect(ta).not.toBeNull();
  });

  it('renders a send button inside the root element', () => {
    const container = document.createElement('div');

    inputArea(container, { onSend: vi.fn(), isStreaming: makeNotStreaming(), onAbort: vi.fn() });

    const btn = container.querySelector('button[aria-label="Send message"]');
    expect(btn).not.toBeNull();
  });

  it('renders a stop button inside the root element', () => {
    const container = document.createElement('div');

    inputArea(container, { onSend: vi.fn(), isStreaming: makeNotStreaming(), onAbort: vi.fn() });

    const btn = container.querySelector('button[aria-label="Stop streaming"]');
    expect(btn).not.toBeNull();
  });

  it('sets placeholder on the textarea when provided', () => {
    const container = document.createElement('div');

    inputArea(container, { placeholder: 'Ask something…', onSend: vi.fn(), isStreaming: makeNotStreaming(), onAbort: vi.fn() });

    const ta = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(ta.placeholder).toBe('Ask something…');
  });

  it('calls onSend with the current textarea value when send button is clicked', () => {
    const container = document.createElement('div');
    const onSend = vi.fn();

    inputArea(container, { onSend, isStreaming: makeNotStreaming(), onAbort: vi.fn() });
    const ta = container.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'hello world';
    ta.dispatchEvent(new Event('input'));
    (container.querySelector('button[aria-label="Send message"]') as HTMLButtonElement).click();

    expect(onSend).toHaveBeenCalledWith('hello world');
  });

  it('clears the textarea after calling onSend', () => {
    const container = document.createElement('div');

    inputArea(container, { onSend: vi.fn(), isStreaming: makeNotStreaming(), onAbort: vi.fn() });
    const ta = container.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'hello';
    ta.dispatchEvent(new Event('input'));
    (container.querySelector('button[aria-label="Send message"]') as HTMLButtonElement).click();

    expect(ta.value).toBe('');
  });

  it('does not call onSend when textarea is empty', () => {
    const container = document.createElement('div');
    const onSend = vi.fn();

    inputArea(container, { onSend, isStreaming: makeNotStreaming(), onAbort: vi.fn() });
    (container.querySelector('button[aria-label="Send message"]') as HTMLButtonElement).click();

    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend when textarea contains only whitespace', () => {
    const container = document.createElement('div');
    const onSend = vi.fn();

    inputArea(container, { onSend, isStreaming: makeNotStreaming(), onAbort: vi.fn() });
    const ta = container.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = '   ';
    ta.dispatchEvent(new Event('input'));
    (container.querySelector('button[aria-label="Send message"]') as HTMLButtonElement).click();

    expect(onSend).not.toHaveBeenCalled();
  });

  it('hides the send button and shows the stop button when isStreaming is true', () => {
    const container = document.createElement('div');
    const isStreaming = signal(true);

    inputArea(container, { onSend: vi.fn(), isStreaming, onAbort: vi.fn() });

    const sendBtn = container.querySelector('button[aria-label="Send message"]') as HTMLButtonElement;
    const stopBtn = container.querySelector('button[aria-label="Stop streaming"]') as HTMLButtonElement;
    expect(sendBtn.hidden).toBe(true);
    expect(stopBtn.hidden).toBe(false);
  });

  it('shows the send button and hides the stop button when isStreaming is false', () => {
    const container = document.createElement('div');
    const isStreaming = signal(false);

    inputArea(container, { onSend: vi.fn(), isStreaming, onAbort: vi.fn() });

    const sendBtn = container.querySelector('button[aria-label="Send message"]') as HTMLButtonElement;
    const stopBtn = container.querySelector('button[aria-label="Stop streaming"]') as HTMLButtonElement;
    expect(sendBtn.hidden).toBe(false);
    expect(stopBtn.hidden).toBe(true);
  });

  it('toggles send/stop visibility when isStreaming signal changes', () => {
    const container = document.createElement('div');
    const isStreaming = signal(false);

    inputArea(container, { onSend: vi.fn(), isStreaming, onAbort: vi.fn() });
    const sendBtn = container.querySelector('button[aria-label="Send message"]') as HTMLButtonElement;
    const stopBtn = container.querySelector('button[aria-label="Stop streaming"]') as HTMLButtonElement;

    isStreaming.set(true);

    expect(sendBtn.hidden).toBe(true);
    expect(stopBtn.hidden).toBe(false);
  });

  it('calls onAbort when the stop button is clicked', () => {
    const container = document.createElement('div');
    const onAbort = vi.fn();
    const isStreaming = signal(true);

    inputArea(container, { onSend: vi.fn(), isStreaming, onAbort });
    (container.querySelector('button[aria-label="Stop streaming"]') as HTMLButtonElement).click();

    expect(onAbort).toHaveBeenCalled();
  });

  it('pre-populates the textarea when initialValue is provided', () => {
    const container = document.createElement('div');

    inputArea(container, { onSend: vi.fn(), isStreaming: makeNotStreaming(), onAbort: vi.fn(), initialValue: 'pre-filled text' });

    const ta = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(ta.value).toBe('pre-filled text');
  });

  it('sends the initialValue when the send button is clicked without typing', () => {
    const container = document.createElement('div');
    const onSend = vi.fn();

    inputArea(container, { onSend, isStreaming: makeNotStreaming(), onAbort: vi.fn(), initialValue: 'pre-filled' });
    (container.querySelector('button[aria-label="Send message"]') as HTMLButtonElement).click();

    expect(onSend).toHaveBeenCalledWith('pre-filled');
  });

  describe('model select footer', () => {
    it('does not render a select when modelOptions is omitted', () => {
      const container = document.createElement('div');

      inputArea(container, { onSend: vi.fn(), isStreaming: makeNotStreaming(), onAbort: vi.fn() });

      expect(container.querySelector('select')).toBeNull();
    });

    it('renders a select when modelOptions are provided', () => {
      const container = document.createElement('div');
      const selectedModel = signal('a');

      inputArea(container, {
        onSend: vi.fn(),
        isStreaming: makeNotStreaming(),
        onAbort: vi.fn(),
        modelOptions: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
        selectedModel,
        onModelChange: vi.fn(),
      });

      expect(container.querySelector('select')).not.toBeNull();
    });

    it('populates select options', () => {
      const container = document.createElement('div');
      const selectedModel = signal('a');

      inputArea(container, {
        onSend: vi.fn(),
        isStreaming: makeNotStreaming(),
        onAbort: vi.fn(),
        modelOptions: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
        selectedModel,
        onModelChange: vi.fn(),
      });

      const sel = container.querySelector('select') as HTMLSelectElement;
      expect(sel.options).toHaveLength(2);
      expect(sel.options[0].value).toBe('a');
      expect(sel.options[1].value).toBe('b');
    });

    it('calls onModelChange when selection changes', () => {
      const container = document.createElement('div');
      const onModelChange = vi.fn();
      const selectedModel = signal('a');

      inputArea(container, {
        onSend: vi.fn(),
        isStreaming: makeNotStreaming(),
        onAbort: vi.fn(),
        modelOptions: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
        selectedModel,
        onModelChange,
      });

      const sel = container.querySelector('select') as HTMLSelectElement;
      sel.value = 'b';
      sel.dispatchEvent(new Event('change'));

      expect(onModelChange).toHaveBeenCalledWith('b');
    });
  });
});
