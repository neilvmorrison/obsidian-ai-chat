import { useEventListener } from "./useEventListener";

/**
 * Registers a keyboard shortcut with optional modifiers (ctrl, shift, alt, meta).
 *
 * @param options - Configuration object for the keyboard shortcut
 *
 * @example
 * ```typescript
 * useKeyboardShortcut({
 *   key: 's',
 *   modifiers: ['ctrl'],
 *   onPress: () => {
 *     saveDocument();
 *   },
 * });
 * ```
 */

export type KeyModifier = "ctrl" | "shift" | "alt" | "meta";

export interface IUseKeyboardShortcutOptions {
  key: string;
  modifiers?: KeyModifier[];
  onPress: () => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcut(
  options: IUseKeyboardShortcutOptions,
): void {
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key.toLowerCase() !== options.key.toLowerCase()) {
      return;
    }

    if (options.modifiers && options.modifiers.length > 0) {
      const allModifiersPressed = options.modifiers.every((modifier) => {
        switch (modifier) {
          case "ctrl":
            return event.ctrlKey || event.metaKey;
          case "shift":
            return event.shiftKey;
          case "alt":
            return event.altKey;
          case "meta":
            return event.metaKey;
          default:
            return false;
        }
      });

      if (!allModifiersPressed) {
        return;
      }
    }

    if (options.preventDefault !== false) {
      event.preventDefault();
    }

    options.onPress();
  }

  useEventListener("keydown", handleKeyDown);
}
