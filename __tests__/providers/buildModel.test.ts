import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProviderSettings } from '../../src/types/settings';

const mockOllamaModel = { id: 'ollama-model' };
const mockOpenAIModel = { id: 'openai-model' };
const mockAnthropicModel = { id: 'anthropic-model' };
const mockGeminiModel = { id: 'gemini-model' };

const mockOllamaFactory = vi.fn().mockReturnValue(mockOllamaModel);
const mockOpenAIFactory = vi.fn().mockReturnValue(mockOpenAIModel);
const mockAnthropicFactory = vi.fn().mockReturnValue(mockAnthropicModel);
const mockGeminiFactory = vi.fn().mockReturnValue(mockGeminiModel);

vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn(() => mockOllamaFactory),
}));
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => mockOpenAIFactory),
}));
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => mockAnthropicFactory),
}));
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => mockGeminiFactory),
}));

import { createOllama } from 'ollama-ai-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { buildModel } from '../../src/providers/buildModel';

const base: Omit<ProviderSettings, 'type' | 'baseUrl'> = {
  id: 'test',
  name: 'Test',
  apiKey: 'sk-test',
  model: 'test-model',
  enabled: true,
};

describe('buildModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOllamaFactory.mockReturnValue(mockOllamaModel);
    mockOpenAIFactory.mockReturnValue(mockOpenAIModel);
    mockAnthropicFactory.mockReturnValue(mockAnthropicModel);
    mockGeminiFactory.mockReturnValue(mockGeminiModel);
    (createOllama as ReturnType<typeof vi.fn>).mockReturnValue(mockOllamaFactory);
    (createOpenAI as ReturnType<typeof vi.fn>).mockReturnValue(mockOpenAIFactory);
    (createAnthropic as ReturnType<typeof vi.fn>).mockReturnValue(mockAnthropicFactory);
    (createGoogleGenerativeAI as ReturnType<typeof vi.fn>).mockReturnValue(mockGeminiFactory);
  });

  describe('ollama', () => {
    it('creates an Ollama provider with the native API baseUrl', () => {
      const provider: ProviderSettings = { ...base, type: 'ollama', baseUrl: 'http://localhost:11434/api' };
      buildModel(provider);
      expect(createOllama).toHaveBeenCalledWith({ baseURL: 'http://localhost:11434/api' });
    });

    it('calls the provider factory with the model id', () => {
      const provider: ProviderSettings = { ...base, type: 'ollama', baseUrl: 'http://localhost:11434/api' };
      const result = buildModel(provider);
      expect(mockOllamaFactory).toHaveBeenCalledWith('test-model');
      expect(result).toBe(mockOllamaModel);
    });
  });

  describe('openai-compat', () => {
    it('uses compatible mode for localhost providers', () => {
      const provider: ProviderSettings = { ...base, type: 'openai-compat', baseUrl: 'http://localhost:1234/v1' };
      buildModel(provider);
      expect(createOpenAI).toHaveBeenCalledWith({
        baseURL: 'http://localhost:1234/v1',
        apiKey: 'sk-test',
        compatibility: 'compatible',
      });
    });

    it('uses strict mode for native OpenAI', () => {
      const provider: ProviderSettings = { ...base, type: 'openai-compat', baseUrl: 'https://api.openai.com/v1' };
      buildModel(provider);
      expect(createOpenAI).toHaveBeenCalledWith({
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        compatibility: 'strict',
      });
    });

    it('uses compatible mode for OpenRouter', () => {
      const provider: ProviderSettings = { ...base, type: 'openai-compat', baseUrl: 'https://openrouter.ai/api/v1' };
      buildModel(provider);
      expect(createOpenAI).toHaveBeenCalledWith({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: 'sk-test',
        compatibility: 'compatible',
      });
    });

    it('calls the provider factory with the model id', () => {
      const provider: ProviderSettings = { ...base, type: 'openai-compat', baseUrl: 'https://openrouter.ai/api/v1' };
      const result = buildModel(provider);
      expect(mockOpenAIFactory).toHaveBeenCalledWith('test-model');
      expect(result).toBe(mockOpenAIModel);
    });
  });

  describe('anthropic', () => {
    it('creates an Anthropic provider with baseUrl and apiKey', () => {
      const provider: ProviderSettings = { ...base, type: 'anthropic', baseUrl: 'https://api.anthropic.com' };
      buildModel(provider);
      expect(createAnthropic).toHaveBeenCalledWith({
        baseURL: 'https://api.anthropic.com',
        apiKey: 'sk-test',
      });
    });

    it('calls the provider factory with the model id', () => {
      const provider: ProviderSettings = { ...base, type: 'anthropic', baseUrl: 'https://api.anthropic.com' };
      const result = buildModel(provider);
      expect(mockAnthropicFactory).toHaveBeenCalledWith('test-model');
      expect(result).toBe(mockAnthropicModel);
    });
  });

  describe('gemini', () => {
    it('creates a Google Generative AI provider with baseUrl and apiKey', () => {
      const provider: ProviderSettings = { ...base, type: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com' };
      buildModel(provider);
      expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
        baseURL: 'https://generativelanguage.googleapis.com',
        apiKey: 'sk-test',
      });
    });

    it('calls the provider factory with the model id', () => {
      const provider: ProviderSettings = { ...base, type: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com' };
      const result = buildModel(provider);
      expect(mockGeminiFactory).toHaveBeenCalledWith('test-model');
      expect(result).toBe(mockGeminiModel);
    });
  });
});
