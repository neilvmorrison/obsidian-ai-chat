import { describe, it, expect, vi } from 'vitest';
import {
  extractEditorContext,
  extractTags,
  buildContext,
} from '../../src/context/buildContext';
import type { App, Editor, TFile } from 'obsidian';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEditor(lines: string[], cursorLine: number): Editor {
  return {
    getCursor: () => ({ line: cursorLine, ch: 0 }),
    getValue: () => lines.join('\n'),
  } as unknown as Editor;
}

function makeApp(opts: {
  file?: TFile | null;
  editor?: Editor | null;
  fileContent?: string;
  tags?: string | string[] | undefined;
}): App {
  const file = opts.file ?? ({ path: 'note.md' } as TFile);
  return {
    workspace: {
      getActiveFile: vi.fn().mockReturnValue(opts.file !== undefined ? opts.file : file),
      activeEditor: opts.editor !== undefined
        ? (opts.editor ? { editor: opts.editor } : null)
        : null,
    },
    vault: {
      read: vi.fn().mockResolvedValue(opts.fileContent ?? ''),
    },
    metadataCache: {
      getFileCache: vi.fn().mockReturnValue(
        opts.tags !== undefined
          ? { frontmatter: { tags: opts.tags } }
          : { frontmatter: {} },
      ),
    },
  } as unknown as App;
}

// ---------------------------------------------------------------------------
// extractEditorContext
// ---------------------------------------------------------------------------

describe('extractEditorContext', () => {
  it('returns 75% lines before cursor and 25% after when unclamped', () => {
    // lines=4: beforeLines=3 (includes cursor), afterLines=1
    const fileLines = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const editor = makeEditor(fileLines, 5);

    const result = extractEditorContext(editor, 4);

    // cursor=5, start=max(0, 5-3+1)=3, end=min(10, 5+1+1)=7 → lines[3..6]='d','e','f','g'
    expect(result).toBe('d\ne\nf\ng');
  });

  it('clamps start when cursor is near the beginning of the file', () => {
    const fileLines = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const editor = makeEditor(fileLines, 1);

    const result = extractEditorContext(editor, 4);

    // cursor=1, start=max(0, 1-3+1)=0, end=min(10, 1+2)=3 → lines[0..2]='a','b','c'
    expect(result).toBe('a\nb\nc');
  });

  it('clamps end when cursor is near the end of the file', () => {
    const fileLines = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const editor = makeEditor(fileLines, 9);

    const result = extractEditorContext(editor, 4);

    // cursor=9, start=max(0,9-3+1)=7, end=min(10,9+2)=10 → lines[7..9]='h','i','j'
    expect(result).toBe('h\ni\nj');
  });

  it('returns single line when file has one line', () => {
    const editor = makeEditor(['only'], 0);

    const result = extractEditorContext(editor, 4);

    expect(result).toBe('only');
  });

  it('returns the full file when line count is less than requested lines', () => {
    const editor = makeEditor(['x', 'y'], 1);

    const result = extractEditorContext(editor, 40);

    expect(result).toBe('x\ny');
  });
});

// ---------------------------------------------------------------------------
// extractTags
// ---------------------------------------------------------------------------

describe('extractTags', () => {
  it('returns an array of tags when frontmatter has an array', () => {
    const app = makeApp({ tags: ['foo', 'bar'] });
    const file = { path: 'note.md' } as TFile;

    const result = extractTags(app, file);

    expect(result).toEqual(['foo', 'bar']);
  });

  it('wraps a single string tag in an array', () => {
    const app = makeApp({ tags: 'solo' });
    const file = { path: 'note.md' } as TFile;

    const result = extractTags(app, file);

    expect(result).toEqual(['solo']);
  });

  it('returns empty array when frontmatter has no tags field', () => {
    const app = makeApp({ tags: undefined });
    const file = { path: 'note.md' } as TFile;

    const result = extractTags(app, file);

    expect(result).toEqual([]);
  });

  it('returns empty array when file has no cache entry', () => {
    const app = {
      metadataCache: {
        getFileCache: vi.fn().mockReturnValue(null),
      },
    } as unknown as App;
    const file = { path: 'note.md' } as TFile;

    const result = extractTags(app, file);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildContext
// ---------------------------------------------------------------------------

describe('buildContext', () => {
  it('returns empty result when no active file', async () => {
    const app = makeApp({ file: null });

    const result = await buildContext(app, 40);

    expect(result).toEqual({ text: '', tags: [], filePath: null });
  });

  it('uses editor context when active editor is present', async () => {
    const fileLines = Array.from({ length: 20 }, (_, i) => `line${i}`);
    const editor = makeEditor(fileLines, 10);
    const file = { path: 'note.md' } as TFile;
    const app = makeApp({ file, editor, fileContent: fileLines.join('\n'), tags: [] });

    const result = await buildContext(app, 4);

    // editor path — vault.read should NOT be called
    expect(app.vault.read).not.toHaveBeenCalled();
    // cursor=10, lines=4: beforeLines=3, afterLines=1
    // start=max(0,10-2)=8, end=min(20,12)=12 → lines 8..11
    expect(result.text).toBe('line8\nline9\nline10\nline11');
    expect(result.filePath).toBe('note.md');
  });

  it('falls back to vault.read() preview when no active editor', async () => {
    const content = Array.from({ length: 100 }, (_, i) => `L${i}`).join('\n');
    const file = { path: 'note.md' } as TFile;
    const app = makeApp({ file, editor: null, fileContent: content, tags: [] });

    const result = await buildContext(app, 5);

    expect(app.vault.read).toHaveBeenCalledWith(file);
    expect(result.text).toBe('L0\nL1\nL2\nL3\nL4');
    expect(result.filePath).toBe('note.md');
  });

  it('includes frontmatter tags in the result', async () => {
    const file = { path: 'tagged.md' } as TFile;
    const app = makeApp({ file, editor: null, fileContent: 'hello', tags: ['ai', 'notes'] });

    const result = await buildContext(app, 10);

    expect(result.tags).toEqual(['ai', 'notes']);
  });

  it('returns empty tags array when note has no frontmatter tags', async () => {
    const file = { path: 'plain.md' } as TFile;
    const app = makeApp({ file, editor: null, fileContent: 'hello', tags: undefined });

    const result = await buildContext(app, 10);

    expect(result.tags).toEqual([]);
  });
});
