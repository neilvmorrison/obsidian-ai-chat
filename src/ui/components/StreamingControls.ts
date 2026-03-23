import type { ReadonlySignal } from '../signals';
import type { StreamingState } from '../../chat/ChatSession';

export interface StreamingControlsConfig {
  /** Reactive streaming state from the active ChatSession. */
  streamingState: ReadonlySignal<StreamingState>;
  /** Called when the user clicks the stop button. */
  onAbort: () => void;
}

/**
 * Renders a stop button inside `.oac-streaming-controls`.
 * The button is visible only while `streamingState` is `'streaming'`.
 */
export function streamingControls(container: HTMLElement, config: StreamingControlsConfig): void {
  const root = document.createElement('div');
  root.className = 'oac-streaming-controls';

  const btn = document.createElement('button');
  btn.className = 'oac-icon-button';
  btn.setAttribute('aria-label', 'Stop streaming');
  btn.textContent = '■';
  btn.addEventListener('click', config.onAbort);
  root.appendChild(btn);

  config.streamingState.subscribe(state => {
    btn.hidden = state !== 'streaming';
  });

  container.appendChild(root);
}
