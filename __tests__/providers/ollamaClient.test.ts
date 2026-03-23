import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchOllamaModels } from '../../src/providers/ollamaClient';

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }));
}

describe('fetchOllamaModels', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('calls GET /api/tags on the given base URL', async () => {
    mockFetch(200, { models: [] });
    await fetchOllamaModels('http://localhost:11434');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('http://localhost:11434/api/tags');
  });

  it('returns model names from the response', async () => {
    mockFetch(200, {
      models: [
        { name: 'llama3.2:latest' },
        { name: 'mistral:7b' },
      ],
    });
    const result = await fetchOllamaModels('http://localhost:11434');
    expect(result).toEqual(['llama3.2:latest', 'mistral:7b']);
  });

  it('returns an empty array when models list is empty', async () => {
    mockFetch(200, { models: [] });
    const result = await fetchOllamaModels('http://localhost:11434');
    expect(result).toEqual([]);
  });

  it('throws when the response is not ok', async () => {
    mockFetch(500, {});
    await expect(fetchOllamaModels('http://localhost:11434')).rejects.toThrow('Ollama responded with 500');
  });

  it('uses the provided base URL', async () => {
    mockFetch(200, { models: [{ name: 'phi3' }] });
    await fetchOllamaModels('http://192.168.1.5:11434');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('http://192.168.1.5:11434/api/tags');
  });
});
