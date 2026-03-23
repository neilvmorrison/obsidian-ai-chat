import type { App } from 'obsidian';
import type { LanguageModel } from 'ai';
import { createChat } from '../types/Chat';
import type { Chat, ChatMessage } from '../types/Chat';
import { ChatStorageAdapter } from './ChatStorageAdapter';
import { SnapshotGenerator } from './SnapshotGenerator';
import { TitleGenerator } from './TitleGenerator';

const UNTITLED = 'Untitled Chat';

/** High-level orchestrator for all chat persistence operations. */
export class ChatManager {
  private readonly storage: ChatStorageAdapter;
  private readonly snapshots: SnapshotGenerator;
  private readonly titler: TitleGenerator;

  constructor(
    app: App,
    pluginDir: string,
    snapshotFolder: string,
    model: LanguageModel,
  ) {
    this.storage = new ChatStorageAdapter(app, pluginDir);
    this.snapshots = new SnapshotGenerator(app, snapshotFolder);
    this.titler = new TitleGenerator(model);
  }

  /** Ensures the plugin chats directory exists. Call on plugin load. */
  async initializeStorage(): Promise<void> {
    await this.storage.ensureStorageDirectory();
  }

  /** Creates and persists a new empty chat with the placeholder title. */
  async createNewChat(): Promise<Chat> {
    const chat = createChat(UNTITLED);
    await this.storage.saveChat(chat);
    return chat;
  }

  /** Loads the full chat (including message history) by id. */
  async openChat(chatId: string): Promise<Chat> {
    return this.storage.loadChat(chatId);
  }

  /** Returns lightweight metadata for all persisted chats. */
  async listAvailableChats(): Promise<Array<{
    id: string;
    title: string;
    created: string;
    modified: string;
    messageCount: number;
  }>> {
    return this.storage.listChats();
  }

  /**
   * Appends new messages to an existing chat, auto-generates a title via LLM
   * if the chat is still "Untitled Chat", then persists the JSON and regenerates
   * the markdown snapshot.
   */
  async continueChat(
    chatId: string,
    newMessages: Array<Omit<ChatMessage, 'timestamp'>>,
  ): Promise<Chat> {
    let chat = await this.storage.loadChat(chatId);
    const now = new Date().toISOString();

    for (const msg of newMessages) {
      chat = {
        ...chat,
        modified: now,
        messages: [...chat.messages, { ...msg, timestamp: now }],
      };
    }

    if (chat.title === UNTITLED && chat.messages.length > 0) {
      chat = { ...chat, title: await this.titler.generateTitle(chat.messages) };
    }

    await this.storage.saveChat(chat);
    await this.snapshots.generateSnapshot(chat);
    return chat;
  }

  /** Saves an existing Chat object and regenerates its snapshot. */
  async saveChat(chat: Chat): Promise<void> {
    await this.storage.saveChat(chat);
    await this.snapshots.generateSnapshot(chat);
  }

  /** Deletes the JSON source and its markdown snapshot. */
  async deleteChat(chatId: string): Promise<void> {
    const chat = await this.storage.loadChat(chatId);
    await this.storage.deleteChat(chatId);
    await this.snapshots.deleteSnapshot(chat);
  }
}
