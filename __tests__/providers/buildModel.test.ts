import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProviderSettings } from '../../src/types/settings';

const mockOpenAIModel = { id: 'openai-model' };
const mockAnthropicModel = { id: 'anthropic-model' };
const mockGeminiModel = { id: 'gemini-model' };

const mockOpenAIFactory = vi.fn().mockReturnValue(mockOpenAIModel);
const mockAnthropicFactory = vi.fn().mockReturnValue(mockAnthropicModel);
const mockGeminiFactory = vi.fn().mockReturnValue(mockGeminiModel);

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => mockOpenAIFactory),
}));
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => mockAnthropicFactory),
}));
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => mockGeminiFactory),
}));

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
    mockOpenAIFactory.mockReturnValue(mockOpenAIModel);
    mockAnthropicFactory.mockReturnValue(mockAnthropicModel);
    mockGeminiFactory.mockReturnValue(mockGeminiModel);
    (createOpenAI as ReturnType<typeof vi.fn>).mockReturnValue(mockOpenAIFactory);
    (createAnthropic as ReturnType<typeof vi.fn>).mockReturnValue(mockAnthropicFactory);
    (createGoogleGenerativeAI as ReturnType<typeof vi.fn>).mockReturnValue(mockGeminiFactory);
  });

  describe('openai-compat', () => {
    it('uses compatible mode for Ollama (localhost)', () => {
      const provider: ProviderSettings = { ...base, type: 'openai-compat', baseUrl: 'http://localhost:11434/v1' };
      buildModel(provider);
      expect(createOpenAI).toHaveBeenCalledWith({
        baseURL: 'http://localhost:11434/v1',
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
      const provider: ProviderSettings = { ...base, type: 'openai-compat', baseUrl: 'http://localhost:11434/v1' };
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
