import OpenAI from 'openai';
import type { ArticleInput } from './carouselTypes.js';

/** Result of generating engagement phrases for a set of articles */
export interface EngagementPhraseResult {
  phrases: string[]; // One per article, max 80 chars each
}

const MAX_PHRASE_LENGTH = 80;

/**
 * Builds the system prompt for GPT-4o engagement phrase generation.
 */
function buildSystemPrompt(): string {
  return `Eres un experto en copywriting para LinkedIn en español dirigido a una audiencia profesional latinoamericana.

Tu tarea: generar UNA frase de engagement por cada artículo proporcionado.

Reglas estrictas:
- Cada frase debe tener máximo 80 caracteres (incluyendo espacios y signos de puntuación)
- Las frases deben ser provocativas, generando curiosidad o debate
- Pueden ser preguntas retóricas o afirmaciones de impacto
- Escritas en español neutro latinoamericano profesional
- NO usar hashtags ni emojis
- Responde ÚNICAMENTE con un JSON array de strings, sin explicación adicional

Ejemplo de respuesta válida:
["¿Está tu empresa lista para la revolución cuántica?", "El futuro del trabajo ya no es remoto, es autónomo"]`;
}

/**
 * Builds the user prompt with article details.
 */
function buildUserPrompt(articles: ArticleInput[]): string {
  const articleDescriptions = articles.map((article, i) => {
    const categories = article.categories.length > 0
      ? article.categories.join(', ')
      : 'General';
    return `Artículo ${i + 1}:\n- Título: ${article.title}\n- Extracto: ${article.excerpt}\n- Categorías: ${categories}`;
  });

  return `Genera una frase de engagement para cada uno de los siguientes ${articles.length} artículos:\n\n${articleDescriptions.join('\n\n')}`;
}

/**
 * Parses and validates the GPT-4o response into an array of phrases.
 * Throws if parsing fails or validation doesn't pass.
 */
function parseAndValidatePhrases(content: string, expectedCount: number): string[] {
  // Try to extract JSON array from the response
  const trimmed = content.trim();

  let phrases: unknown;
  try {
    phrases = JSON.parse(trimmed);
  } catch {
    // Try to find a JSON array within the response text
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) {
      throw new Error('GPT-4o response does not contain a valid JSON array');
    }
    phrases = JSON.parse(match[0]);
  }

  if (!Array.isArray(phrases)) {
    throw new Error('GPT-4o response is not a JSON array');
  }

  if (phrases.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} phrases but received ${phrases.length}`
    );
  }

  // Validate each phrase
  const validated: string[] = [];
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    if (typeof phrase !== 'string' || phrase.trim().length === 0) {
      throw new Error(`Phrase at index ${i} is empty or not a string`);
    }

    const trimmedPhrase = phrase.trim();
    // Truncate to max length if slightly over (graceful handling)
    const finalPhrase = trimmedPhrase.length > MAX_PHRASE_LENGTH
      ? trimmedPhrase.slice(0, MAX_PHRASE_LENGTH)
      : trimmedPhrase;

    validated.push(finalPhrase);
  }

  return validated;
}

/**
 * Generates engagement phrases for a list of articles using GPT-4o.
 * Makes a single API call for all articles. Retries once on failure.
 * On second failure, throws a descriptive error.
 */
export async function generateEngagementPhrases(
  articles: ArticleInput[],
  apiKey: string
): Promise<EngagementPhraseResult> {
  if (articles.length === 0) {
    return { phrases: [] };
  }

  const openai = new OpenAI({ apiKey });

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(articles);

  let lastError: Error | null = null;

  // Attempt up to 2 times (initial + 1 retry)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('GPT-4o returned an empty response');
      }

      const phrases = parseAndValidatePhrases(content, articles.length);
      return { phrases };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // If this was the first attempt, retry
      if (attempt === 0) {
        continue;
      }
    }
  }

  throw new Error(
    `Failed to generate engagement phrases after 2 attempts: ${lastError?.message || 'Unknown error'}`
  );
}
