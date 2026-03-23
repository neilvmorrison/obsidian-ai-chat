import type { App } from 'obsidian';
import { isValidChat } from '../types/Chat';
import type { Chat } from '../types/Chat';

/** Low-level adapter for reading and writing chat JSON files. */
export class ChatStorageAdapter {
  private readonly chatsDir: string;

  constructor(
    private readonly app: App,
    pluginDir: string,
  ) {
    this.chatsDir = `${pluginDir}/chats`;
  }

  /** Creates the chats directory if it does not already exist. */
  async ensureStorageDirectory(): Promise<void> {
    const adapter = this.app.vault.adapter;
    if (!await adapter.exists(this.chatsDir)) {
      await adapter.mkdir(this.chatsDir);
    }
  }

  /** Atomically writes a chat to disk (write temp → rename). */
  async saveChat(chat: Chat): Promise<void> {
    const path = `${this.chatsDir}/chat-${chat.id}.json`;
    const tmp = `${path}.tmp`;
    await this.app.vault.adapter.write(tmp, JSON.stringify(chat, null, 2));
    await this.app.vault.adapter.rename(tmp, path);
  }

  /** Loads and validates a chat by id. Throws if missing or malformed. */
  async loadChat(chatId: string): Promise<Chat> {
    const path = `${this.chatsDir}/chat-${chatId}.json`;
    const raw = await this.app.vault.adapter.read(path);
    const parsed: unknown = JSON.parse(raw);
    if (!isValidChat(parsed)) throw new Error(`Invalid chat data at: ${path}`);
    return parsed;
  }

  /**
   * Lists all chats as lightweight metadata objects.
   * Full message arrays are not included to keep the listing fast.
   */
  async listChats(): Promise<Array<{
    id: string;
    title: string;
    created: string;
    modified: string;
    messageCount: number;
  }>> {
    const adapter = this.app.vault.adapter;
    if (!await adapter.exists(this.chatsDir)) return [];
    const { files } = await adapter.list(this.chatsDir);
    const results: Array<{ id: string; title: string; created: string; modified: string; messageCount: number }> = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = await adapter.read(file);
        const parsed: unknown = JSON.parse(raw);
        if (isValidChat(parsed)) {
          results.push({
            id: parsed.id,
            title: parsed.title,
            created: parsed.created,
            modified: parsed.modified,
            messageCount: parsed.messages.length,
          });
        }
      } catch {
        // skip malformed or unreadable files
      }
    }
    return results;
  }

  /** Deletes the JSON file for the given chat id. */
  async deleteChat(chatId: string): Promise<void> {
    const path = `${this.chatsDir}/chat-${chatId}.json`;
    await this.app.vault.adapter.remove(path);
  }
}
