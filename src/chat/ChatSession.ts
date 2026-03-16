import { createOllama } from 'ollama-ai-provider';
import { streamText } from 'ai';
import type { OllamaChatSettings } from '../settings';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatSession {
  messages: Message[] = [];
  private abortController: AbortController | null = null;
  private settings: OllamaChatSettings;

  constructor(settings: OllamaChatSettings) {
    this.settings = settings;
  }

  abort(): void {
    this.abortController?.abort();
  }

  async send(
    userContent: string,
    systemPrompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    this.messages.push({ role: 'user', content: userContent });

    this.abortController = new AbortController();

    const ollama = createOllama({ baseURL: this.settings.baseURL });

    let fullText = '';

    try {
      const result = await streamText({
        model: ollama(this.settings.model),
        system: systemPrompt,
        messages: this.messages,
        abortSignal: this.abortController.signal,
      });

      for await (const chunk of result.textStream) {
        fullText += chunk;
        onChunk(chunk);
      }

      this.messages.push({ role: 'assistant', content: fullText });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Aborted by user — still record whatever was streamed
        if (fullText) {
          this.messages.push({ role: 'assistant', content: fullText + '\n\n_(aborted)_' });
        }
      } else {
        throw err;
      }
    } finally {
      this.abortController = null;
    }
  }

  serialize(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const lines: string[] = [`# AI Chat — ${timestamp}`, ''];

    for (const msg of this.messages) {
      const label = msg.role === 'user' ? '**User:**' : '**Assistant:**';
      lines.push(label);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    }

    return lines.join('\n');
  }

  clear(): void {
    this.abortController?.abort();
    this.messages = [];
    this.abortController = null;
  }
}
