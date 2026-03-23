import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import type { App, TFile } from 'obsidian';
import type { AIChatSettings } from '../types/settings';

/**
 * Strips consecutive `> ` lines from the top of the content,
 * including the blank line that typically follows a callout block.
 */
function stripLeadingCallout(content: string): string {
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].startsWith('> ')) i++;
  if (i < lines.length && lines[i] === '') i++;
  return lines.slice(i).join('\n');
}

/** Wraps summary text in an Obsidian `[!summary]` callout block. */
function formatSummaryCallout(summary: string): string {
  const body = summary
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');
  return `> [!summary]\n${body}`;
}

/**
 * Generates a 2–3 sentence summary of `file` using `generateText` (non-streaming)
 * and prepends it as a `> [!summary]` callout.
 *
 * Any existing leading callout block (consecutive `> ` lines) is stripped
 * before the new callout is written, so re-running replaces rather than appends.
 */
export async function summarizeNote(
  file: TFile,
  app: App,
  model: LanguageModel,
  settings: AIChatSettings,
): Promise<void> {
  const raw = await app.vault.read(file);
  const content = stripLeadingCallout(raw);

  const { text } = await generateText({
    model,
    system: settings.systemPromptPrefix,
    prompt: `Summarize the following note in 2-3 sentences:\n\n${content}`,
  });

  const callout = formatSummaryCallout(text.trim());
  await app.vault.modify(file, `${callout}\n\n${content}`);
}
