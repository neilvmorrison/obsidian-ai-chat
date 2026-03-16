import { App } from 'obsidian';

export async function buildContext(app: App, contextWindowLines = 40): Promise<string> {
  const file = app.workspace.getActiveFile();
  if (!file) return '';

  const parts: string[] = [];

  parts.push(`Active file: ${file.path}`);

  const cache = app.metadataCache.getFileCache(file);
  const tags = cache?.frontmatter?.tags;
  if (tags) {
    const tagList = Array.isArray(tags) ? tags.join(', ') : String(tags);
    parts.push(`Tags: ${tagList}`);
  }

  const editor = app.workspace.activeEditor?.editor;
  if (editor) {
    const cursor = editor.getCursor();
    const totalLines = editor.lineCount();
    const linesBefore = Math.floor(contextWindowLines * 0.75); // ~30 of 40
    const linesAfter = contextWindowLines - linesBefore;         // ~10 of 40

    const startLine = Math.max(0, cursor.line - linesBefore);
    const endLine = Math.min(totalLines - 1, cursor.line + linesAfter);

    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(editor.getLine(i));
    }

    parts.push(`\nContext around cursor (lines ${startLine + 1}–${endLine + 1}):\n\`\`\`\n${lines.join('\n')}\n\`\`\``);
  } else {
    // No active editor — read the whole file for context
    try {
      const content = await app.vault.read(file);
      const lines = content.split('\n');
      const preview = lines.slice(0, contextWindowLines).join('\n');
      parts.push(`\nFile preview (first ${contextWindowLines} lines):\n\`\`\`\n${preview}\n\`\`\``);
    } catch {
      // Ignore read errors
    }
  }

  return parts.join('\n');
}
