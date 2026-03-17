import type { App, Editor, TFile } from 'obsidian';

/** The extracted context passed to the chat session. */
export interface ContextResult {
  /** Lines of text extracted around the cursor, or a file preview. */
  text: string;
  /** Frontmatter tags from the active note, or an empty array. */
  tags: string[];
  /** Vault-relative path of the active file, or null when no file is open. */
  filePath: string | null;
}

/**
 * Extracts up to `lines` lines of content centred on the editor cursor.
 * Split: 75 % of lines allocated before-and-including the cursor line,
 * 25 % after. Both ends are clamped to the file boundary.
 */
export function extractEditorContext(editor: Editor, lines: number): string {
  const beforeLines = Math.floor(lines * 0.75); // includes cursor line
  const afterLines = lines - beforeLines;

  const cursor = editor.getCursor();
  const allLines = editor.getValue().split('\n');

  const start = Math.max(0, cursor.line - beforeLines + 1);
  const end = Math.min(allLines.length, cursor.line + afterLines + 1);

  return allLines.slice(start, end).join('\n');
}

/**
 * Reads frontmatter tags from Obsidian's metadata cache for `file`.
 * Normalises both array-form (`tags: [a, b]`) and scalar-form (`tags: solo`).
 * Returns an empty array when no tags are present or the cache has no entry.
 */
export function extractTags(app: App, file: TFile): string[] {
  const cache = app.metadataCache.getFileCache(file);
  const raw = cache?.frontmatter?.tags;

  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  return [String(raw)];
}

/**
 * Builds the context block sent alongside each chat message.
 *
 * - When an editor is open, extracts `lines` lines split 75 % before /
 *   25 % after the cursor.
 * - When no editor is open, falls back to the first `lines` lines of the
 *   file via `vault.read()`.
 * - Returns an empty result when no file is active.
 *
 * All nullable Obsidian API calls are guarded.
 */
export async function buildContext(app: App, lines: number): Promise<ContextResult> {
  const file = app.workspace.getActiveFile();

  if (!file) {
    return { text: '', tags: [], filePath: null };
  }

  const tags = extractTags(app, file);

  // `activeEditor` is typed narrowly here to avoid importing MarkdownEditor.
  const activeEd = app.workspace.activeEditor as { editor?: Editor } | null;
  const editor = activeEd?.editor;

  if (editor) {
    return { text: extractEditorContext(editor, lines), tags, filePath: file.path };
  }

  // Fallback: read the raw file and return the first `lines` lines.
  const content = await app.vault.read(file);
  const text = content.split('\n').slice(0, lines).join('\n');
  return { text, tags, filePath: file.path };
}
