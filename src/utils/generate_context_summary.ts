import { generateText } from "ai";
import { ollama, DEFAULT_MODEL } from "@/lib/ollama";
import type { ChatMessage } from "@/hooks/useStreamChat";

const MAX_MESSAGES = 8;
const MAX_CONTENT_LENGTH = 400;

export async function generate_context_summary(
  messages: ChatMessage[],
  model: string,
  highlightedText: string
): Promise<string> {
  try {
    const conversationMessages = messages.filter((m) => m.role !== "system");
    const condensed = conversationMessages
      .slice(-MAX_MESSAGES)
      .map((m) => `${m.role}: ${m.content.slice(0, MAX_CONTENT_LENGTH)}`)
      .join("\n");

    const { text } = await generateText({
      model: ollama(model || DEFAULT_MODEL),
      system:
        "Summarize the following conversation in exactly 3 sentences. Focus on the main topics and conclusions. Reply with only the 3 sentences, no preamble.",
      prompt: condensed,
    });

    const summary = text.trim();
    if (summary.length > 0) {
      return `${summary} The user wants to explore the following excerpt from the previous conversation in more detail: "${highlightedText.slice(0, 200)}"`;
    }
    return fallbackSummary(highlightedText);
  } catch {
    return fallbackSummary(highlightedText);
  }
}

function fallbackSummary(highlightedText: string): string {
  return `This is a continuation of a previous conversation. The user wants to explore the following excerpt in more detail: "${highlightedText.slice(0, 200)}"`;
}
