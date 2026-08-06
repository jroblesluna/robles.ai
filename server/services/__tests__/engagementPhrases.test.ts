import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEngagementPhrases } from '../engagementPhrases.js';

const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

const sampleArticles = [
  {
    title: 'El futuro de la IA en Latinoamérica',
    excerpt: 'Un análisis profundo sobre cómo la inteligencia artificial está transformando la región.',
    categories: ['IA', 'Tecnología'],
  },
  {
    title: 'Blockchain y finanzas descentralizadas',
    excerpt: 'Las criptomonedas y DeFi están cambiando el panorama financiero global.',
    categories: ['Blockchain', 'Finanzas'],
  },
];

describe('generateEngagementPhrases', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('returns phrases on successful GPT-4o response', async () => {
    const phrases = [
      '¿Está tu empresa lista para la revolución de IA?',
      '¿El futuro financiero es descentralizado?',
    ];

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(phrases) } }],
    });

    const result = await generateEngagementPhrases(sampleArticles, 'test-api-key');

    expect(result.phrases).toHaveLength(2);
    expect(result.phrases[0]).toBe(phrases[0]);
    expect(result.phrases[1]).toBe(phrases[1]);
  });

  it('returns empty phrases array for empty articles input', async () => {
    const result = await generateEngagementPhrases([], 'test-api-key');
    expect(result.phrases).toEqual([]);
  });

  it('retries exactly once on first GPT-4o failure then succeeds', async () => {
    const phrases = ['¿Preparado para el cambio tecnológico?', '¿Es el blockchain el futuro?'];

    mockCreate
      .mockRejectedValueOnce(new Error('API rate limit exceeded'))
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(phrases) } }],
      });

    const result = await generateEngagementPhrases(sampleArticles, 'test-api-key');

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.phrases).toEqual(phrases);
  });

  it('throws descriptive error on double failure (after exactly one retry)', async () => {
    mockCreate
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockRejectedValueOnce(new Error('Service unavailable'));

    await expect(
      generateEngagementPhrases(sampleArticles, 'test-api-key')
    ).rejects.toThrow('Failed to generate engagement phrases after 2 attempts: Service unavailable');

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('generates phrases in Spanish (system prompt requests Spanish)', async () => {
    const spanishPhrases = [
      '¿Está tu empresa lista para la revolución?',
      '¿Cuál es el verdadero costo de la innovación?',
    ];

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(spanishPhrases) } }],
    });

    await generateEngagementPhrases(sampleArticles, 'test-api-key');

    // Verify the system prompt contains Spanish language instructions
    const callArgs = mockCreate.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const systemMessage = callArgs.messages.find(
      (m: { role: string; content: string }) => m.role === 'system'
    );
    expect(systemMessage?.content).toContain('español');
    expect(systemMessage?.content).toContain('latinoamericana');
  });

  it('throws when GPT-4o returns empty response content', async () => {
    mockCreate
      .mockResolvedValueOnce({ choices: [{ message: { content: null } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: null } }] });

    await expect(
      generateEngagementPhrases(sampleArticles, 'test-api-key')
    ).rejects.toThrow('Failed to generate engagement phrases after 2 attempts');
  });

  it('throws when phrase count does not match article count', async () => {
    // Return only 1 phrase for 2 articles on both attempts
    mockCreate
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(['Solo una frase']) } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(['Solo una frase']) } }],
      });

    await expect(
      generateEngagementPhrases(sampleArticles, 'test-api-key')
    ).rejects.toThrow('Failed to generate engagement phrases after 2 attempts');
  });

  it('truncates phrases longer than 80 characters', async () => {
    const longPhrase = 'A'.repeat(100);
    const normalPhrase = '¿El futuro es ahora?';

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify([longPhrase, normalPhrase]) } }],
    });

    const result = await generateEngagementPhrases(sampleArticles, 'test-api-key');

    expect(result.phrases[0]).toHaveLength(80);
    expect(result.phrases[1]).toBe(normalPhrase);
  });

  it('parses response that wraps JSON in extra text', async () => {
    const phrases = ['¿Listo para el futuro?', '¿Innovación o extinción?'];
    const wrappedContent = `Here are the phrases:\n${JSON.stringify(phrases)}\n`;

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: wrappedContent } }],
    });

    const result = await generateEngagementPhrases(sampleArticles, 'test-api-key');
    expect(result.phrases).toEqual(phrases);
  });

  it('uses gpt-4o model in the API call', async () => {
    const phrases = ['Frase uno', 'Frase dos'];

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(phrases) } }],
    });

    await generateEngagementPhrases(sampleArticles, 'test-api-key');

    const callArgs = mockCreate.mock.calls[0][0] as { model: string };
    expect(callArgs.model).toBe('gpt-4o');
  });
});
