import type { App } from 'obsidian';
import type { Chat } from '../types/Chat';

const UNSAFE_CHARS = /[/\\:*?"<>|#^[\]]/g;

function sanitizeFilename(title: string): string {
  return title.replace(UNSAFE_CHARS, ' ').replace(/\s{2,}/g, ' ').trim() || 'Untitled Chat';
}

/** Generates and manages read-only markdown snapshots in the vault. */
export class SnapshotGenerator {
  constructor(
    private readonly app: App,
    private readonly snapshotFolder: string,
  ) {}

  /** Writes (or overwrites) a markdown snapshot for the given chat. */
  async generateSnapshot(chat: Chat): Promise<void> {
    const adapter = this.app.vault.adapter;
    if (!await adapter.exists(this.snapshotFolder)) {
      await adapter.mkdir(this.snapshotFolder);
    }

    const path = `${this.snapshotFolder}/${sanitizeFilename(chat.title)}.md`;

    const frontmatter = [
      '---',
      `chat-id: ${chat.id}`,
      `created: ${chat.created}`,
      `modified: ${chat.modified}`,
      `message-count: ${chat.messages.length}`,
      'read-only: true',
      '---',
    ].join('\n');

    const body = chat.messages
      .map(m => {
        const speaker = m.role === 'user' ? '> **You**' : '**Assistant**';
        return `${speaker}\n\n${m.content}`;
      })
      .join('\n\n---\n\n');

    await adapter.write(path, `${frontmatter}\n\n${body}\n`);
  }

  /** Removes the snapshot file for the given chat, if it exists. */
  async deleteSnapshot(chat: Chat): Promise<void> {
    const path = `${this.snapshotFolder}/${sanitizeFilename(chat.title)}.md`;
    const adapter = this.app.vault.adapter;
    if (await adapter.exists(path)) {
      await adapter.remove(path);
    }
  }
}
