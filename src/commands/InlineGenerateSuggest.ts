import { EditorSuggest, Notice } from 'obsidian';
import type {
  App,
  Editor,
  EditorPosition,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile,
} from 'obsidian';
import { streamText } from 'ai';
import type { LanguageModel } from 'ai';
import type { AIChatSettings, ProviderSettings } from '../types/settings';

const TRIGGER = '/generate';

export interface InlineGenerateDeps {
  settings: AIChatSettings;
  buildModel(provider: ProviderSettings): LanguageModel;
}

/**
 * EditorSuggest that fires when the user types `/generate`.
 * On selection, the trigger text is removed and AI-generated text is streamed
 * in at the cursor position.
 *
 * NOTE: `(editor as any).cm` is the CodeMirror 6 view — any access to it must
 * be isolated to `cmCoordsAt()` so it can be found and swapped if the
 * internal API changes.
 */
export class InlineGenerateSuggest extends EditorSuggest<string> {
  private readonly deps: InlineGenerateDeps;

  constructor(app: App, deps: InlineGenerateDeps) {
    super(app);
    this.deps = deps;
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    _file: TFile,
  ): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line);
    const start = line.lastIndexOf(TRIGGER, cursor.ch);
    if (start === -1) return null;
    // Only trigger if the cursor is at or after the full trigger string.
    if (start + TRIGGER.length > cursor.ch) return null;

    return {
      start: { line: cursor.line, ch: start },
      end: cursor,
      query: TRIGGER,
    };
  }

  getSuggestions(_ctx: EditorSuggestContext): string[] {
    return ['Generate text here'];
  }

  renderSuggestion(item: string, el: HTMLElement): void {
    (el as any).setText(item);
  }

  /**
   * Removes the `/generate` trigger, then streams generated text at the cursor.
   * Guards against `context` being null (can happen if suggest is dismissed
   * before selection fires).
   */
  async selectSuggestion(_item: string, _evt: MouseEvent | KeyboardEvent): Promise<void> {
    const ctx = this.context;
    if (!ctx) return;

    const { editor } = ctx;

    // Remove the trigger text before inserting generated content.
    editor.replaceRange('', ctx.start, ctx.end);

    const { settings, buildModel } = this.deps;
    const provider = settings.providers[settings.defaultProviderId];
    const model = buildModel(provider);

    const cursor = editor.getCursor();
    const beforeCursor = editor.getRange({ line: 0, ch: 0 }, cursor);

    try {
      const result = streamText({
        model,
        system: settings.systemPromptPrefix,
        prompt: `Continue writing from:\n\n${beforeCursor}`,
      });

      let pos = { ...cursor };
      for await (const chunk of result.textStream) {
        editor.replaceRange(chunk, pos);
        pos = { line: pos.line, ch: pos.ch + chunk.length };
      }
    } catch (err) {
      new Notice(
        `Generate failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
