import db from '../db.js';
import { AI_MODELS, isValidModelId, type AiModelKey } from '../../shared/aiModels.js';

/** The model configured in Admin → Settings, or the default when unset or invalid. */
export function getAiModel(key: AiModelKey): string {
  const fallback = AI_MODELS.find(model => model.key === key)!.fallback;
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string | null } | undefined;
    return isValidModelId(row?.value) ? row.value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Sampling and token options for a chat completion. GPT-5 and later models and the
 * o-series reject `temperature`, `top_p` and `max_tokens`, so those are only sent to
 * older models and the token limit moves to `max_completion_tokens`.
 */
export function chatOptions(model: string, options: { temperature?: number; top_p?: number; maxTokens?: number }) {
  const { temperature, top_p, maxTokens } = options;
  if (/^(gpt-([5-9]|\d{2,})|o\d)/.test(model)) {
    return { model, ...(maxTokens === undefined ? {} : { max_completion_tokens: maxTokens }) };
  }
  return {
    model,
    ...(temperature === undefined ? {} : { temperature }),
    ...(top_p === undefined ? {} : { top_p }),
    ...(maxTokens === undefined ? {} : { max_tokens: maxTokens }),
  };
}

/** `chatOptions` for the model configured for an admin setting. */
export const chatOptionsFor = (key: AiModelKey, options: Parameters<typeof chatOptions>[1] = {}) =>
  chatOptions(getAiModel(key), options);
