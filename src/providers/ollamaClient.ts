interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

/**
 * Fetches the list of locally downloaded models from the Ollama API.
 * Calls GET /api/tags on the given base URL.
 */
export async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  const origin = new URL(baseUrl).origin;
  const res = await fetch(`${origin}/api/tags`);
  if (!res.ok) throw new Error(`Ollama responded with ${res.status}`);
  const data = await res.json() as OllamaTagsResponse;
  return data.models.map(m => m.name);
}
