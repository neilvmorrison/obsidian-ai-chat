import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

import { generateText } from 'ai';
import { TitleGenerator } from '../../src/storage/TitleGenerator';
import type { ChatMessage } from '../../src/types/Chat';

const mockGenerateText = vi.mocked(generateText);

const mockModel = {} as any;

const sampleMessages: ChatMessage[] = [
  { role: 'user', content: 'How do I set up a React project?', timestamp: '2024-01-01T00:00:00Z' },
  { role: 'assistant', content: 'You can use Create React App or Vite.', timestamp: '2024-01-01T00:00:01Z' },
];

describe('TitleGenerator', () => {
  let generator: TitleGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new TitleGenerator(mockModel);
  });

  it('returns the LLM-generated title', async () => {
    mockGenerateText.mockResolvedValue({ text: 'Setting up React project' } as any);
    const title = await generator.generateTitle(sampleMessages);
    expect(title).toBe('Setting up React project');
  });

  it('trims whitespace from the generated title', async () => {
    mockGenerateText.mockResolvedValue({ text: '  Trimmed Title  ' } as any);
    const title = await generator.generateTitle(sampleMessages);
    expect(title).toBe('Trimmed Title');
  });

  it('strips filesystem-unsafe characters', async () => {
    mockGenerateText.mockResolvedValue({ text: 'Chat: "Hello/World"' } as any);
    const title = await generator.generateTitle(sampleMessages);
    expect(title).toBe('Chat Hello World');
  });

  it('falls back to dated title on LLM error', async () => {
    mockGenerateText.mockRejectedValue(new Error('API failure'));
    const title = await generator.generateTitle(sampleMessages);
    expect(title).toMatch(/^Chat \d{4}-\d{2}-\d{2}$/);
  });

  it('falls back to dated title when LLM returns empty string', async () => {
    mockGenerateText.mockResolvedValue({ text: '' } as any);
    const title = await generator.generateTitle(sampleMessages);
    expect(title).toMatch(/^Chat \d{4}-\d{2}-\d{2}$/);
  });

  it('falls back to dated title when LLM returns only unsafe chars', async () => {
    mockGenerateText.mockResolvedValue({ text: '/\\:*?"<>|#^[]' } as any);
    const title = await generator.generateTitle(sampleMessages);
    expect(title).toMatch(/^Chat \d{4}-\d{2}-\d{2}$/);
  });

  it('passes the conversation history to the LLM', async () => {
    mockGenerateText.mockResolvedValue({ text: 'React Setup Guide' } as any);
    await generator.generateTitle(sampleMessages);
    const call = mockGenerateText.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(call.messages[0].content).toContain('How do I set up a React project?');
    expect(call.messages[0].content).toContain('You can use Create React App or Vite.');
  });

  it('includes the title prompt in the message sent to the LLM', async () => {
    mockGenerateText.mockResolvedValue({ text: 'Some Title' } as any);
    await generator.generateTitle(sampleMessages);
    const call = mockGenerateText.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(call.messages[0].content).toContain('3-5 words');
  });
});
