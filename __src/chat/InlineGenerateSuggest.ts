import {
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile,
} from "obsidian";
import { createOllama } from "ollama-ai-provider";
import { streamText } from "ai";
import type OllamaChatPlugin from "../main";

const TRIGGER = "/generate";

interface GenerateSuggestion {
  label: string;
}

export class InlineGenerateSuggest extends EditorSuggest<GenerateSuggestion> {
  private plugin: OllamaChatPlugin;

  constructor(plugin: OllamaChatPlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    _file: TFile | null,
  ): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line);
    const before = line.slice(0, cursor.ch);

    if (!before.endsWith(TRIGGER)) return null;

    return {
      start: { line: cursor.line, ch: cursor.ch - TRIGGER.length },
      end: cursor,
      query: "",
    };
  }

  getSuggestions(_ctx: EditorSuggestContext): GenerateSuggestion[] {
    return [{ label: "Generate text about…" }];
  }

  renderSuggestion(suggestion: GenerateSuggestion, el: HTMLElement): void {
    el.setText(suggestion.label);
  }

  selectSuggestion(
    _suggestion: GenerateSuggestion,
    _evt: MouseEvent | KeyboardEvent,
  ): void {
    const ctx = this.context;
    if (!ctx) return;

    const { editor, start, end } = ctx;

    // Remove /generate from the document
    editor.replaceRange("", start, end);

    // Show inline prompt input at the cursor position
    this.showInlineInput(editor, start);
  }

  private showInlineInput(editor: Editor, pos: EditorPosition): void {
    // Resolve screen coordinates via the underlying CodeMirror 6 view
    const cm = (editor as any).cm as any;
    if (!cm) return;

    // CM6 lines are 1-indexed; Obsidian EditorPosition.line is 0-indexed
    const docOffset = cm.state.doc.line(pos.line + 1).from + pos.ch;
    const coords: { left: number; top: number; bottom: number } | null =
      cm.coordsAtPos(docOffset);
    if (!coords) return;

    const wrapper = document.createElement("div");
    wrapper.className = "oac-inline-generate-wrapper";
    wrapper.style.left = `${coords.left}px`;
    wrapper.style.top = `${coords.top}px`;

    const chevron = document.createElement("span");
    chevron.className = "oac-inline-generate-chevron";
    chevron.textContent = "❯";

    const textarea = document.createElement("textarea");
    textarea.rows = 1;
    textarea.placeholder = "Describe what to write here…";
    textarea.className = "oac-inline-generate-input";
    textarea.style.outline = "none";
    textarea.style.border = "none";

    wrapper.appendChild(chevron);
    wrapper.appendChild(textarea);
    document.body.appendChild(wrapper);
    textarea.focus();

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      wrapper.remove();
    };

    textarea.addEventListener("keydown", async (e) => {
      if (e.key === "Escape") {
        dismiss();
        editor.focus();
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const prompt = textarea.value.trim();
        dismiss();
        editor.focus();
        if (prompt) {
          await this.streamAtPos(editor, pos, prompt);
        }
      }
    });

    // Auto-grow height as user types
    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    });

    textarea.addEventListener("blur", () => {
      // Slight delay so keydown → Enter has time to fire first
      setTimeout(dismiss, 150);
    });
  }

  private async streamAtPos(
    editor: Editor,
    pos: EditorPosition,
    prompt: string,
  ): Promise<void> {
    const ollama = createOllama({ baseURL: this.plugin.settings.baseURL });

    let cursor = { ...pos };

    try {
      const result = await streamText({
        model: ollama(this.plugin.settings.model),
        messages: [{ role: "user", content: prompt }],
      });

      for await (const chunk of result.textStream) {
        editor.replaceRange(chunk, cursor);

        const lines = chunk.split("\n");
        if (lines.length > 1) {
          cursor = {
            line: cursor.line + lines.length - 1,
            ch: lines[lines.length - 1].length,
          };
        } else {
          cursor = { line: cursor.line, ch: cursor.ch + chunk.length };
        }
      }
    } catch (err) {
      console.error("[InlineGenerate] streamText error:", err);
    }
  }
}
