import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import type { ProviderSettings } from '../types/settings';

/**
 * Constructs an AI SDK LanguageModel from provider settings.
 * - openai-compat: uses @ai-sdk/openai; baseUrl is treated as the API origin
 *   and `/v1` is appended so Ollama, LM Studio, OpenAI, and OpenRouter all work.
 * - anthropic: uses @ai-sdk/anthropic.
 * - gemini: uses @ai-sdk/google.
 */
export function buildModel(provider: ProviderSettings): LanguageModel {
  switch (provider.type) {
    case 'openai-compat': {
      const isNativeOpenAI = provider.baseUrl.includes('api.openai.com');
      return createOpenAI({
        baseURL: provider.baseUrl,
        apiKey: provider.apiKey,
        compatibility: isNativeOpenAI ? 'strict' : 'compatible',
      })(provider.model) as LanguageModel;
    }

    case 'anthropic':
      return createAnthropic({
        baseURL: provider.baseUrl,
        apiKey: provider.apiKey,
      })(provider.model) as LanguageModel;

    case 'gemini':
      return createGoogleGenerativeAI({
        baseURL: provider.baseUrl,
        apiKey: provider.apiKey,
      })(provider.model) as LanguageModel;

    default: {
      const exhaustive: never = provider.type;
      throw new Error(`Unsupported provider type: ${exhaustive}`);
    }
  }
}
