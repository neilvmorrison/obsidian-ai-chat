import { generateText } from "ai";
import { ollama, DEFAULT_MODEL } from "@/lib/ollama";
import type { ChatMessage } from "@/hooks/useStreamChat";

export async function generateTitle(messages: ChatMessage[]): Promise<string> {
  try {
    const conversationMessages = messages.filter((m) => m.role !== "system");
    const condensed = conversationMessages
      .slice(0, 4)
      .map((m) => `${m.role}: ${m.content.slice(0, 300)}`)
      .join("\n");

    const { text } = await generateText({
      model: ollama(DEFAULT_MODEL),
      system:
        "Generate a short title (max 6 words) summarizing this conversation. Reply with ONLY the title, no quotes, no punctuation.",
      prompt: condensed,
    });

    const title = text.trim().replace(/['"]/g, "");
    if (title.length > 0 && title.length < 100) return title;
    return fallbackTitle();
  } catch {
    return fallbackTitle();
  }
}

function fallbackTitle(): string {
  const now = new Date();
  return `Chat ${now.toISOString().slice(0, 16).replace("T", " ")}`;
}
