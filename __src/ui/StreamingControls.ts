export interface StreamingControlsHandle {
  el: HTMLElement;
  sendBtn: HTMLButtonElement;
  abortBtn: HTMLButtonElement;
  setStreaming(streaming: boolean): void;
}

export interface StreamingControlsProps {
  onAbort: () => void;
}

export function createStreamingControls(
  parent: HTMLElement,
  props: StreamingControlsProps,
): StreamingControlsHandle {
  const el = parent.createEl('div', { cls: 'oac-input-actions-right' });

  const abortBtn = el.createEl('button', {
    cls: 'oac-abort-btn',
    text: 'Stop',
  }) as HTMLButtonElement;
  abortBtn.addClass('oac-hidden');
  abortBtn.addEventListener('click', props.onAbort);

  const sendBtn = el.createEl('button', {
    cls: 'oac-send-btn',
    text: 'Send',
  }) as HTMLButtonElement;

  return {
    el,
    sendBtn,
    abortBtn,
    setStreaming(streaming: boolean) {
      sendBtn.disabled = streaming;
      if (streaming) {
        abortBtn.removeClass('oac-hidden');
      } else {
        abortBtn.addClass('oac-hidden');
      }
    },
  };
}
