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
