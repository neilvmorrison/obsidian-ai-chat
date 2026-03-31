import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  Modal,
  TFile,
} from "obsidian";
import { generateText } from "ai";
import { ollama, DEFAULT_MODEL } from "@/lib/ollama";
import type ReactPlugin from "@/main";

type InlineCommandId = "generate" | "ask";

interface IInlineCommand {
  id: InlineCommandId;
  label: string;
  description: string;
}

const COMMANDS: IInlineCommand[] = [
  { id: "generate", label: "/generate", description: "Generate text inline at cursor" },
  { id: "ask", label: "/ask", description: "Open chat with your prompt pre-filled" },
];

export class InlineCommandSuggest extends EditorSuggest<IInlineCommand> {
  private storedEditor: Editor | null = null;
  private storedStart: EditorPosition | null = null;
  private storedEnd: EditorPosition | null = null;

  constructor(app: App, private plugin: ReactPlugin) {
    super(app);
  }

  onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile): EditorSuggestTriggerInfo | null {
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
    wrapper.createSpan({ text: item.label, cls: "oac-inline-suggestion__label" });
    wrapper.createSpan({ text: item.description, cls: "oac-inline-suggestion__desc" });
  }

  selectSuggestion(item: IInlineCommand, _evt: MouseEvent | KeyboardEvent): void {
    const editor = this.storedEditor;
    const start = this.storedStart;
    const end = this.storedEnd;
    if (!editor || !start || !end) return;

    editor.replaceRange("", start, end);
    const cursorPos = editor.getCursor();
    new InlinePromptModal(this.app, item.id, editor, cursorPos, this.plugin).open();
  }
}

class InlinePromptModal extends Modal {
  private input!: HTMLInputElement;

  constructor(
    app: App,
    private commandId: InlineCommandId,
    private editor: Editor,
    private cursorPos: EditorPosition,
    private plugin: ReactPlugin,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("oac-prompt-modal");

    const label = this.commandId === "generate" ? "Generate" : "Ask";
    contentEl.createEl("h4", { text: `${label}: Enter your prompt` });

    this.input = contentEl.createEl("input", {
      type: "text",
      placeholder: "Enter your prompt",
      cls: "oac-prompt-modal__input",
    });
    this.input.focus();

    this.input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.submit();
      }
    });
  }

  private async submit(): Promise<void> {
    const prompt = this.input.value.trim();
    if (!prompt) return;
    this.close();

    if (this.commandId === "generate") {
      await this.runGenerate(prompt);
    } else {
      await this.runAsk(prompt);
    }
  }

  private async runGenerate(prompt: string): Promise<void> {
    try {
      const result = await generateText({
        model: ollama(DEFAULT_MODEL),
        prompt,
      });
      this.editor.replaceRange(result.text, this.cursorPos);
    } catch {
      // Silently fail if Ollama is unreachable
    }
  }

  private async runAsk(prompt: string): Promise<void> {
    const leaf = await this.plugin.activateView();
    if (!leaf) return;
    await leaf.setViewState({
      type: leaf.view.getViewType(),
      active: true,
      state: { initialInput: prompt },
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
