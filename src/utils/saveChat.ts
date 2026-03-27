import type { App } from "obsidian";
import type { ChatMessage } from "@/hooks/useStreamChat";

const CHAT_FOLDER = "Chats";

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function buildReadableBody(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      if (m.role === "system") return `*${m.content}*`;
      if (m.role === "user") return `> **User**: ${m.content}`;
      return `**Assistant**: ${m.content}`;
    })
    .join("\n\n---\n\n");
}

export async function saveChat(
  app: App,
  messages: ChatMessage[],
  model: string,
  title: string
): Promise<void> {
  const frontmatter = [
    "---",
    `type: obsidian-chat`,
    `title: "${title.replace(/"/g, '\\"')}"`,
    `model: ${model}`,
    `created: ${new Date().toISOString()}`,
    `cssclasses:`,
    `  - obsidian-chat-note`,
    "---",
  ].join("\n");

  const readableBody = buildReadableBody(messages);
  const dataBlock = [
    "```obsidian-chat-data",
    JSON.stringify(messages),
    "```",
  ].join("\n");

  const content = `${frontmatter}\n\n# ${title}\n\n${readableBody}\n\n${dataBlock}\n`;

  // Ensure folder exists
  if (!app.vault.getAbstractFileByPath(CHAT_FOLDER)) {
    await app.vault.createFolder(CHAT_FOLDER);
  }

  const filename = sanitizeFilename(title);
  let path = `${CHAT_FOLDER}/${filename}.md`;

  // Handle collision
  if (app.vault.getAbstractFileByPath(path)) {
    const timestamp = Date.now();
    path = `${CHAT_FOLDER}/${filename}-${timestamp}.md`;
  }

  await app.vault.create(path, content);
}
