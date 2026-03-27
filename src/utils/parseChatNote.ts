import type { ChatMessage } from "@/hooks/useStreamChat";

interface ParsedChat {
  messages: ChatMessage[];
  model: string;
}

export function parseChatNote(content: string): ParsedChat | null {
  // Extract model from frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = frontmatterMatch?.[1] ?? "";
  const modelMatch = frontmatter.match(/^model:\s*(.+)$/m);
  const model = modelMatch?.[1]?.trim() ?? "";

  // Extract messages from the data block
  const dataMatch = content.match(/```obsidian-chat-data\n([\s\S]*?)\n```/);
  if (!dataMatch?.[1]) return null;

  try {
    const messages: ChatMessage[] = JSON.parse(dataMatch[1]);
    return { messages, model };
  } catch {
    return null;
  }
}
