import { createStreamingControls, StreamingControlsHandle } from './StreamingControls';

export interface InputAreaHandle {
  el: HTMLElement;
  textarea: HTMLTextAreaElement;
  actionsLeftEl: HTMLElement;
  controls: StreamingControlsHandle;
  resizeTextarea(): void;
}

export interface InputAreaProps {
  placeholder?: string;
  onSend: () => void;
  onAbort: () => void;
}

export function createInputArea(
  parent: HTMLElement,
  props: InputAreaProps,
): InputAreaHandle {
  const el = parent.createEl('div', { cls: 'oac-input-area' });

  const textarea = el.createEl('textarea', {
    cls: 'oac-input',
    attr: { placeholder: props.placeholder ?? 'Ask anything…', rows: '1' },
  }) as HTMLTextAreaElement;

  const inputActions = el.createEl('div', { cls: 'oac-input-actions' });
  const actionsLeftEl = inputActions.createEl('div', { cls: 'oac-input-actions-left' });
  const controls = createStreamingControls(inputActions, { onAbort: props.onAbort });

  function resizeTextarea(): void {
    textarea.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const maxHeight = lineHeight * 6;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
  }

  textarea.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      props.onSend();
    }
  });
  textarea.addEventListener('input', resizeTextarea);
  controls.sendBtn.addEventListener('click', props.onSend);

  return { el, textarea, actionsLeftEl, controls, resizeTextarea };
}
