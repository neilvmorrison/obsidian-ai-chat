import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import type { ChatMessage } from '../types/Chat';

const TITLE_PROMPT =
  'Summarize this conversation in 3-5 words for a chat title. Respond with only the title, no punctuation or quotes.';

const UNSAFE_CHARS = /[/\\:*?"<>|#^[\]]/g;

/** Uses an LLM to generate a concise 3-5 word title for a chat conversation. */
export class TitleGenerator {
  constructor(private readonly model: LanguageModel) {}

  async generateTitle(messages: ChatMessage[]): Promise<string> {
    const conversation = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    try {
      const { text } = await generateText({
        model: this.model,
        messages: [
          { role: 'user', content: `${conversation}\n\n${TITLE_PROMPT}` },
        ],
      });
      const sanitized = text.trim().replace(UNSAFE_CHARS, ' ').replace(/\s{2,}/g, ' ').trim();
      return sanitized || this.fallbackTitle();
    } catch {
      return this.fallbackTitle();
    }
  }

  private fallbackTitle(): string {
    return `Chat ${new Date().toISOString().slice(0, 10)}`;
  }
}
