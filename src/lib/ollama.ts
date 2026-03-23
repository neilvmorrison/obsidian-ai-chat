import { createOpenAI } from "@ai-sdk/openai";

export const OLLAMA_BASE_URL = "http://localhost:11434";
export const DEFAULT_MODEL = "llama3.2:latest";

export const ollama = createOpenAI({
  baseURL: `${OLLAMA_BASE_URL}/v1`,
  apiKey: "ollama",
});
