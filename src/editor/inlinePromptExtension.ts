import type { EditorPosition } from "obsidian";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  keymap,
} from "@codemirror/view";
import { Prec, type Extension } from "@codemirror/state";
import { generateText } from "ai";
import { ollama, DEFAULT_MODEL } from "@/lib/ollama";
import type ReactPlugin from "@/main";

export type InlineCommandId = "generate" | "ask";

export interface IPendingCommand {
  commandId: InlineCommandId;
  promptStartPos: EditorPosition;
}

const LOADING_TEXT = "Generating…";

class EnterHintWidget extends WidgetType {
  toDOM(): HTMLElement {
    const el = document.createElement("kbd");
    el.className = "oac-inline-enter-hint";
    el.textContent = "↵ Enter";
    return el;
  }

  eq(): boolean {
    return true;
  }
}

function buildHintDecorations(
  view: EditorView,
  pendingRef: { current: IPendingCommand | null }
): DecorationSet {
  if (!pendingRef.current) return Decoration.none;
  const cursor = view.state.selection.main.head;
  return Decoration.set([
    Decoration.widget({ widget: new EnterHintWidget(), side: 1 }).range(cursor),
  ]);
}

function createEnterHintPlugin(pendingRef: { current: IPendingCommand | null }) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildHintDecorations(view, pendingRef);
      }

      update(update: ViewUpdate): void {
        if (pendingRef.current) {
          const cursor = update.view.state.selection.main.head;
          const cursorLine = update.view.state.doc.lineAt(cursor).number - 1;
          if (cursorLine !== pendingRef.current.promptStartPos.line) {
            pendingRef.current = null;
          }
        }
        this.decorations = buildHintDecorations(update.view, pendingRef);
      }
    },
    { decorations: (v) => v.decorations }
  );
}

export function createInlinePromptExtension(
  pendingRef: { current: IPendingCommand | null },
  plugin: ReactPlugin
): Extension {
  const inlineKeymap = keymap.of([
    {
      key: "Escape",
      run(view: EditorView): boolean {
        if (!pendingRef.current) return false;
        pendingRef.current = null;
        view.dispatch({});
        return true;
      },
    },
    {
      key: "Enter",
      run(view: EditorView): boolean {
        const pending = pendingRef.current;
        if (!pending) return false;

        const { promptStartPos, commandId } = pending;
        const cursor = view.state.selection.main.head;
        const cursorLine = view.state.doc.lineAt(cursor).number - 1;

        if (cursorLine !== promptStartPos.line) return false;

        const fromOffset =
          view.state.doc.line(promptStartPos.line + 1).from + promptStartPos.ch;
        const toOffset = cursor;

        if (fromOffset > toOffset) return false;

        const prompt = view.state.doc.sliceString(fromOffset, toOffset).trim();
        if (!prompt) return false;

        pendingRef.current = null;

        if (commandId === "generate") {
          view.dispatch({
            changes: { from: fromOffset, to: toOffset, insert: LOADING_TEXT },
          });

          const genFrom = fromOffset;
          const genTo = fromOffset + LOADING_TEXT.length;

          (async () => {
            try {
              const result = await generateText({
                model: ollama(DEFAULT_MODEL),
                prompt,
              });
              view.dispatch({
                changes: { from: genFrom, to: genTo, insert: result.text },
              });
            } catch {
              view.dispatch({
                changes: { from: genFrom, to: genTo, insert: "" },
              });
            }
          })();
        } else {
          view.dispatch({
            changes: { from: fromOffset, to: toOffset, insert: "" },
          });

          (async () => {
            const leaf = await plugin.activateView();
            if (!leaf) return;
            await leaf.setViewState({
              type: leaf.view.getViewType(),
              active: true,
              state: { initialInput: prompt },
            });
          })();
        }

        return true;
      },
    },
  ]);

  return [Prec.high(inlineKeymap), createEnterHintPlugin(pendingRef)];
}
