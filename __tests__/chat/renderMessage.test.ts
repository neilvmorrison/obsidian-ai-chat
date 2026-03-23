// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderMessage } from '../../src/chat/renderMessage';

const mockRender = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('obsidian', () => ({
  MarkdownRenderer: { render: mockRender },
}));

/** Synchronous scheduler — runs the callback immediately, no rAF deferral. */
const syncScheduler = (cb: () => void) => { cb(); };

const mockApp = {} as never;
const mockComponent = {} as never;
const sourcePath = 'notes/test.md';

describe('renderMessage', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    mockRender.mockClear();
  });

  describe('update()', () => {
    it('sets pre textContent to the given text', () => {
      const handle = renderMessage(
        { container, app: mockApp, component: mockComponent, sourcePath },
        syncScheduler,
      );

      handle.update('hello world');

      const pre = container.querySelector('pre');
      expect(pre?.textContent).toBe('hello world');
    });

    it('replaces text on each subsequent call', () => {
      const handle = renderMessage(
        { container, app: mockApp, component: mockComponent, sourcePath },
        syncScheduler,
      );

      handle.update('first');
      handle.update('first second');

      const pre = container.querySelector('pre');
      expect(pre?.textContent).toBe('first second');
    });
  });

  describe('finalize()', () => {
    it('calls MarkdownRenderer.render with the correct arguments', async () => {
      const handle = renderMessage(
        { container, app: mockApp, component: mockComponent, sourcePath },
        syncScheduler,
      );

      await handle.finalize('# Heading');

      expect(mockRender).toHaveBeenCalledWith(
        mockApp,
        '# Heading',
        expect.any(HTMLElement),
        sourcePath,
        mockComponent,
      );
    });

    it('resolves after MarkdownRenderer.render completes', async () => {
      const handle = renderMessage(
        { container, app: mockApp, component: mockComponent, sourcePath },
        syncScheduler,
      );

      await expect(handle.finalize('some text')).resolves.toBeUndefined();
    });

    it('removes the pre element before rendering markdown', async () => {
      const handle = renderMessage(
        { container, app: mockApp, component: mockComponent, sourcePath },
        syncScheduler,
      );

      await handle.finalize('done');

      expect(container.querySelector('pre')).toBeNull();
    });

    it('passes an element with the markdown-rendered class to MarkdownRenderer', async () => {
      const handle = renderMessage(
        { container, app: mockApp, component: mockComponent, sourcePath },
        syncScheduler,
      );

      await handle.finalize('text');

      const el: HTMLElement = mockRender.mock.calls[0][2];
      expect(el.classList.contains('markdown-rendered')).toBe(true);
    });
  });
});
