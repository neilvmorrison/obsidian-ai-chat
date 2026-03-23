import { describe, it, expect, vi, beforeEach } from 'vitest';
import { summarizeNote } from '../../src/commands/summarizeNote';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

import { generateText } from 'ai';
const mockGenerateText = vi.mocked(generateText);

const SETTINGS = {
  version: 1,
  defaultProviderId: 'ollama',
  providers: {},
  contextWindowLines: 40,
  systemPromptPrefix: 'You are helpful.',
  saveFolder: 'AI Chats',
  promptSaveOnClose: true,
  hotkey: 'Mod+Shift+A',
  agentProviderId: 'ollama',
  agentModel: '',
  agentSystemPrompt: '',
} as any;

const mockModel = {} as any;
const mockFile = { path: 'note.md', name: 'note.md' } as any;

function makeApp(content: string) {
  return {
    vault: {
      read: vi.fn().mockResolvedValue(content),
      modify: vi.fn().mockResolvedValue(undefined),
    },
  };
}

beforeEach(() => {
  mockGenerateText.mockResolvedValue({ text: 'A concise summary.' } as any);
});

describe('summarizeNote', () => {
  it('reads the file before generating', async () => {
    const app = makeApp('note content');

    await summarizeNote(mockFile, app as any, mockModel, SETTINGS);

    expect(app.vault.read).toHaveBeenCalledWith(mockFile);
  });

  it('calls generateText with the system prompt and file content', async () => {
    const app = makeApp('Note content here.');

    await summarizeNote(mockFile, app as any, mockModel, SETTINGS);

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: mockModel,
        system: 'You are helpful.',
        prompt: expect.stringContaining('Note content here.'),
      }),
    );
  });

  it('writes modified content back to the file', async () => {
    const app = makeApp('content');

    await summarizeNote(mockFile, app as any, mockModel, SETTINGS);

    expect(app.vault.modify).toHaveBeenCalledWith(mockFile, expect.any(String));
  });

  it('prepends summary callout when no existing callout is present', async () => {
    const app = makeApp('# My Note\n\nContent here.');

    await summarizeNote(mockFile, app as any, mockModel, SETTINGS);

    const written = (app.vault.modify as any).mock.calls[0][1] as string;
    expect(written).toMatch(/^> \[!summary\]/);
    expect(written).toContain('A concise summary.');
    expect(written).toContain('# My Note');
  });

  it('replaces an existing leading callout block', async () => {
    const app = makeApp('> [!summary]\n> Old summary.\n\n# My Note\n\nContent.');

    await summarizeNote(mockFile, app as any, mockModel, SETTINGS);

    const written = (app.vault.modify as any).mock.calls[0][1] as string;
    expect(written).not.toContain('Old summary.');
    expect(written).toContain('A concise summary.');
    expect(written).toContain('# My Note');
  });

  it('strips all consecutive leading > lines before generating', async () => {
    const app = makeApp('> Line 1\n> Line 2\n> Line 3\n\nReal content.');

    await summarizeNote(mockFile, app as any, mockModel, SETTINGS);

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Real content.'),
      }),
    );
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.not.stringContaining('> Line 1'),
      }),
    );
  });

  it('formats the summary as a callout block', async () => {
    const app = makeApp('content');

    await summarizeNote(mockFile, app as any, mockModel, SETTINGS);

    const written = (app.vault.modify as any).mock.calls[0][1] as string;
    expect(written).toMatch(/^> \[!summary\]\n> A concise summary\./);
  });
});
