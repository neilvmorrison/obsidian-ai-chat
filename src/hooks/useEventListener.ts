import { useEffect } from "react";

export interface IEventMap {
  click: MouseEvent;
  dblclick: MouseEvent;
  mousedown: MouseEvent;
  mouseup: MouseEvent;
  mousemove: MouseEvent;
  mouseover: MouseEvent;
  mouseout: MouseEvent;
  mouseenter: MouseEvent;
  mouseleave: MouseEvent;
  keydown: KeyboardEvent;
  keyup: KeyboardEvent;
  keypress: KeyboardEvent;
  focus: FocusEvent;
  blur: FocusEvent;
  change: Event;
  input: Event;
  submit: SubmitEvent;
  reset: Event;
  scroll: Event;
  resize: UIEvent;
  load: Event;
  unload: Event;
  beforeunload: BeforeUnloadEvent;
  error: ErrorEvent;
  abort: ProgressEvent;
  progress: ProgressEvent;
  loadstart: ProgressEvent;
  loadend: ProgressEvent;
  touchstart: TouchEvent;
  touchend: TouchEvent;
  touchmove: TouchEvent;
  touchcancel: TouchEvent;
  pointerdown: PointerEvent;
  pointerup: PointerEvent;
  pointermove: PointerEvent;
  pointerenter: PointerEvent;
  pointerleave: PointerEvent;
  wheel: WheelEvent;
  contextmenu: MouseEvent;
  visibilitychange: Event;
  fullscreenchange: Event;
}

export function useEventListener<K extends keyof IEventMap>(
  event: K,
  callback: (event: IEventMap[K]) => void,
): void {
  useEffect(() => {
    window.addEventListener(event, callback as EventListener);
    return () => {
      window.removeEventListener(event, callback as EventListener);
    };
  }, [event, callback]);
}
