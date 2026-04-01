import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile,
} from "obsidian";
import type {
  InlineCommandId,
  IPendingCommand,
} from "@/editor/inlinePromptExtension";
import type ReactPlugin from "@/main";

interface IInlineCommand {
  id: InlineCommandId;
  label: string;
  description: string;
}

const COMMANDS: IInlineCommand[] = [
  {
    id: "generate",
    label: "/generate",
    description: " Generate text inline at cursor",
  },
  {
    id: "chat",
    label: "/chat",
    description: " Open a new chat thread with note context",
  },
];

export class InlineCommandSuggest extends EditorSuggest<IInlineCommand> {
  private storedEditor: Editor | null = null;
  private storedStart: EditorPosition | null = null;
  private storedEnd: EditorPosition | null = null;

  constructor(
    app: App,
    private pendingRef: { current: IPendingCommand | null },
    private plugin: ReactPlugin,
  ) {
    super(app);
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    _file: TFile,
  ): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line);
    const sub = line.substring(0, cursor.ch);
    const match = sub.match(/\/(\w*)$/);
    if (!match) return null;

    const query = match[1].toLowerCase();
    const hasMatch = COMMANDS.some((c) => c.id.startsWith(query));
    if (!hasMatch) return null;

    return {
      start: { line: cursor.line, ch: cursor.ch - match[0].length },
      end: cursor,
      query: match[1],
    };
  }

  getSuggestions(context: EditorSuggestContext): IInlineCommand[] {
    this.storedEditor = context.editor;
    this.storedStart = context.start;
    this.storedEnd = context.end;
    const q = context.query.toLowerCase();
    return COMMANDS.filter((c) => c.id.startsWith(q));
  }

  renderSuggestion(item: IInlineCommand, el: HTMLElement): void {
    const wrapper = el.createDiv({ cls: "oac-inline-suggestion" });
    wrapper.createSpan({
      text: item.label,
      cls: "oac-inline-suggestion__label",
    });
    wrapper.createSpan({
      text: item.description,
      cls: "oac-inline-suggestion__desc",
    });
  }

  selectSuggestion(
    item: IInlineCommand,
    _evt: MouseEvent | KeyboardEvent,
  ): void {
    const editor = this.storedEditor;
    const start = this.storedStart;
    const end = this.storedEnd;
    if (!editor || !start || !end) return;

    editor.replaceRange("", start, end);

    if (item.id === "chat") {
      const noteContent = editor.getValue();
      const cursor = editor.getCursor();
      const lines = noteContent.split("\n");
      let cursorOffset = cursor.ch;
      for (let i = 0; i < cursor.line; i++) {
        cursorOffset += lines[i].length + 1;
      }
      const file = this.plugin.app.workspace.getActiveFile();
      this.plugin.openChatWithNoteContext(
        noteContent,
        cursorOffset,
        file?.basename ?? "",
        file?.path ?? "",
      );
      return;
    }

    this.pendingRef.current = { commandId: item.id, promptStartPos: start };
  }
}
