import { Notice } from 'obsidian';
import { createOllama } from 'ollama-ai-provider';
import { generateText } from 'ai';
import type OllamaChatPlugin from '../main';

const CALLOUT_PREFIX = '> [!summary]';

function buildCallout(summary: string): string {
  const lines = summary
    .trim()
    .split('\n')
    .map(line => `> ${line}`);
  return [CALLOUT_PREFIX + ' Summary', ...lines].join('\n');
}

function replaceOrPrependCallout(content: string, callout: string): string {
  if (content.startsWith('> [!summary]')) {
    // Replace the existing callout block (all consecutive `> ` lines at the top)
    const lines = content.split('\n');
    let end = 0;
    while (end < lines.length && lines[end].startsWith('> ')) {
      end++;
    }
    // Skip the blank line after the callout if present
    const rest = lines.slice(end).join('\n').trimStart();
    return callout + (rest ? '\n\n' + rest : '');
  }
  return callout + (content ? '\n\n' + content : '');
}

export async function summarizeNote(plugin: OllamaChatPlugin): Promise<void> {
  const file = plugin.app.workspace.getActiveFile();
  if (!file) {
    new Notice('No active note to summarize.');
    return;
  }

  const notice = new Notice('Summarizing…', 0);

  try {
    const content = await plugin.app.vault.read(file);

    const ollama = createOllama({ baseURL: plugin.settings.baseURL });

    const { text } = await generateText({
      model: ollama(plugin.settings.model),
      system:
        'You are a summarization assistant. Write a concise summary of the note. For short notes use 1-2 sentences; for longer notes use no more than one paragraph. Reply with only the summary text, no preamble or metadata.',
      messages: [{ role: 'user', content }],
    });

    const callout = buildCallout(text);
    const newContent = replaceOrPrependCallout(content, callout);

    await plugin.app.vault.modify(file, newContent);
    notice.hide();
    new Notice('Summary added.');
  } catch (err) {
    notice.hide();
    const msg = err instanceof Error ? err.message : String(err);
    new Notice(`Summary failed: ${msg}`);
  }
}
