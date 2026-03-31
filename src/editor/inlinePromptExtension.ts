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
import { streamText } from "ai";
import { ollama, DEFAULT_MODEL } from "@/lib/ollama";
import type ReactPlugin from "@/main";

export type InlineCommandId = "generate" | "ask";

export interface IPendingCommand {
  commandId: InlineCommandId;
  promptStartPos: EditorPosition;
}

type IGeneratingState = { from: number; to: number } | null;

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

class PlaceholderWidget extends WidgetType {
  toDOM(): HTMLElement {
    const el = document.createElement("span");
    el.className = "oac-inline-placeholder";
    el.textContent = "Type your prompt…";
    return el;
  }

  eq(): boolean {
    return true;
  }
}

class GeneratingWidget extends WidgetType {
  constructor(private hasContent: boolean) {
    super();
  }

  toDOM(): HTMLElement {
    const el = document.createElement("span");
    el.className = "oac-inline-generating";
    if (!this.hasContent) {
      const label = document.createElement("span");
      label.className = "oac-inline-generating__label";
      label.textContent = "Generating…";
      el.appendChild(label);
    }
    const spinner = document.createElement("span");
    spinner.className = "oac-inline-spinner";
    el.appendChild(spinner);
    return el;
  }

  eq(other: GeneratingWidget): boolean {
    return this.hasContent === other.hasContent;
  }
}

function buildHintDecorations(
  view: EditorView,
  pendingRef: { current: IPendingCommand | null }
): DecorationSet {
  if (!pendingRef.current) return Decoration.none;

  const { promptStartPos } = pendingRef.current;
  const cursor = view.state.selection.main.head;
  const lineFrom = view.state.doc.line(promptStartPos.line + 1).from;
  const promptFrom = lineFrom + promptStartPos.ch;

  if (cursor < promptFrom) return Decoration.none;

  const promptText = view.state.doc.sliceString(promptFrom, cursor);
  const hasText = promptText.trim().length > 0;

  if (!hasText) {
    return Decoration.set([
      Decoration.widget({ widget: new PlaceholderWidget(), side: 0 }).range(promptFrom),
    ]);
  }

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

function createGeneratingPlugin(generatingRef: { current: IGeneratingState }) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor() {
        this.decorations = Decoration.none;
      }

      update(update: ViewUpdate): void {
        const state = generatingRef.current;
        if (!state) {
          this.decorations = Decoration.none;
          return;
        }
        const { from, to } = state;
        const docLen = update.view.state.doc.length;
        if (to > docLen) {
          this.decorations = Decoration.none;
          return;
        }
        const hasContent = to > from;
        this.decorations = Decoration.set([
          Decoration.widget({ widget: new GeneratingWidget(hasContent), side: 1 }).range(to),
        ]);
      }
    },
    { decorations: (v) => v.decorations }
  );
}

export function createInlinePromptExtension(
  pendingRef: { current: IPendingCommand | null },
  plugin: ReactPlugin
): Extension {
  const generatingRef: { current: IGeneratingState } = { current: null };

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
          view.dispatch({ changes: { from: fromOffset, to: toOffset, insert: "" } });

          generatingRef.current = { from: fromOffset, to: fromOffset };
          view.dispatch({});

          (async () => {
            try {
              const result = streamText({
                model: ollama(DEFAULT_MODEL),
                prompt,
              });

              for await (const chunk of result.textStream) {
                if (!generatingRef.current) break;
                const pos = generatingRef.current.to;
                view.dispatch({ changes: { from: pos, to: pos, insert: chunk } });
                generatingRef.current = { ...generatingRef.current, to: pos + chunk.length };
              }
            } catch {
              if (generatingRef.current) {
                const { from, to } = generatingRef.current;
                view.dispatch({ changes: { from, to, insert: "" } });
              }
            } finally {
              generatingRef.current = null;
              view.dispatch({});
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

  return [
    Prec.high(inlineKeymap),
    createEnterHintPlugin(pendingRef),
    createGeneratingPlugin(generatingRef),
  ];
}
