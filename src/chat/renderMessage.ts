import type { App, Component } from 'obsidian';
import { MarkdownRenderer } from 'obsidian';

export interface RenderMessageOptions {
  /** The parent element to append the message node into. */
  container: HTMLElement;
  /** Obsidian App instance — required by MarkdownRenderer. */
  app: App;
  /** Owning Component — required by MarkdownRenderer post-processors. */
  component: Component;
  /** Source path of the note — used by MarkdownRenderer for link resolution. */
  sourcePath: string;
}

export interface RenderMessageHandle {
  /** Replace the streaming preview text with the latest chunk. */
  update(text: string): void;
  /**
   * Replace the `<pre>` with a fully rendered Markdown element.
   * Resolves once `MarkdownRenderer.render()` completes.
   */
  finalize(text: string): Promise<void>;
}

/**
 * Creates a `<pre>` element inside `container` for streaming preview and
 * returns a handle to update it or swap it for a rendered Markdown block.
 *
 * @param opts      - Container, Obsidian App, Component, and source path.
 * @param scheduler - Frame scheduler; defaults to `requestAnimationFrame`.
 *                    Override in tests with a synchronous shim.
 */
export function renderMessage(
  opts: RenderMessageOptions,
  scheduler: (cb: () => void) => void = requestAnimationFrame,
): RenderMessageHandle {
  const pre = document.createElement('pre');
  opts.container.appendChild(pre);

  return {
    update(text: string): void {
      pre.textContent = text;
    },

    finalize(text: string): Promise<void> {
      pre.remove();

      const el = document.createElement('div');
      el.classList.add('markdown-rendered');
      opts.container.appendChild(el);

      return new Promise<void>(resolve => {
        scheduler(() => {
          MarkdownRenderer.render(opts.app, text, el, opts.sourcePath, opts.component).then(resolve);
        });
      });
    },
  };
}
