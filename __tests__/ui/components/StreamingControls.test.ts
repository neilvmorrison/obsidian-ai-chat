// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { signal } from '../../../src/ui/signals';
import { streamingControls } from '../../../src/ui/components/StreamingControls';
import type { StreamingState } from '../../../src/chat/ChatSession';

describe('streamingControls', () => {
  it('appends one root element to the container', () => {
    const container = document.createElement('div');
    const streamingState = signal<StreamingState>('idle');

    streamingControls(container, { streamingState, onAbort: vi.fn() });

    expect(container.children).toHaveLength(1);
  });

  it('applies oac-streaming-controls class to the root element', () => {
    const container = document.createElement('div');
    const streamingState = signal<StreamingState>('idle');

    streamingControls(container, { streamingState, onAbort: vi.fn() });

    expect(container.children[0].classList.contains('oac-streaming-controls')).toBe(true);
  });

  it('hides the stop button when state is idle', () => {
    const container = document.createElement('div');
    const streamingState = signal<StreamingState>('idle');

    streamingControls(container, { streamingState, onAbort: vi.fn() });

    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.hidden).toBe(true);
  });

  it('shows the stop button when state is streaming', () => {
    const container = document.createElement('div');
    const streamingState = signal<StreamingState>('streaming');

    streamingControls(container, { streamingState, onAbort: vi.fn() });

    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.hidden).toBe(false);
  });

  it('hides the stop button when state is error', () => {
    const container = document.createElement('div');
    const streamingState = signal<StreamingState>('error');

    streamingControls(container, { streamingState, onAbort: vi.fn() });

    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.hidden).toBe(true);
  });

  it('calls onAbort when the stop button is clicked', () => {
    const container = document.createElement('div');
    const streamingState = signal<StreamingState>('streaming');
    const onAbort = vi.fn();

    streamingControls(container, { streamingState, onAbort });
    (container.querySelector('button') as HTMLButtonElement).click();

    expect(onAbort).toHaveBeenCalledOnce();
  });

  it('shows the stop button when state changes from idle to streaming', () => {
    const container = document.createElement('div');
    const streamingState = signal<StreamingState>('idle');

    streamingControls(container, { streamingState, onAbort: vi.fn() });
    const btn = container.querySelector('button') as HTMLButtonElement;

    streamingState.set('streaming');

    expect(btn.hidden).toBe(false);
  });

  it('hides the stop button when state changes from streaming to idle', () => {
    const container = document.createElement('div');
    const streamingState = signal<StreamingState>('streaming');

    streamingControls(container, { streamingState, onAbort: vi.fn() });
    const btn = container.querySelector('button') as HTMLButtonElement;

    streamingState.set('idle');

    expect(btn.hidden).toBe(true);
  });
});
