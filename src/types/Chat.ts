/** A single stored message — no transient streaming state. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/** A persisted chat conversation. */
export interface Chat {
  id: string;
  title: string;
  /** ISO 8601 timestamp */
  created: string;
  /** ISO 8601 timestamp */
  modified: string;
  messages: ChatMessage[];
}

/** Creates a new empty Chat with the given title and a fresh UUID. */
export function createChat(title: string): Chat {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    created: now,
    modified: now,
    messages: [],
  };
}

/** Returns a new Chat with the message appended and `modified` updated. */
export function addMessageToChat(
  chat: Chat,
  message: Omit<ChatMessage, 'timestamp'>,
): Chat {
  return {
    ...chat,
    modified: new Date().toISOString(),
    messages: [
      ...chat.messages,
      { ...message, timestamp: new Date().toISOString() },
    ],
  };
}

/** Runtime type guard for Chat objects loaded from untrusted sources. */
export function isValidChat(obj: unknown): obj is Chat {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.title === 'string' &&
    typeof c.created === 'string' &&
    typeof c.modified === 'string' &&
    Array.isArray(c.messages)
  );
}
