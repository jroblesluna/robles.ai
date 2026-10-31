import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const stored = new Map<string, string | null>();
vi.mock('../db.js', () => ({
  default: { prepare: () => ({ get: (key: string) => (stored.has(key) ? { value: stored.get(key) } : undefined) }) },
}));

import publicRouter from '../publicRoutes.js';
import { getAiModel } from '../services/aiModels.js';
import { AI_MODELS, isAiModelKey, isValidModelId } from '../../shared/aiModels.js';

beforeEach(() => stored.clear());
afterEach(() => vi.restoreAllMocks());

describe('AI model settings', () => {
  it('uses the default when unset or invalid and the saved model otherwise', () => {
    expect(getAiModel('ai_model_site_content')).toBe('gpt-4o');
    stored.set('ai_model_site_content', 'not a model; rm -rf');
    expect(getAiModel('ai_model_site_content')).toBe('gpt-4o');
    stored.set('ai_model_site_content', 'gpt-5.1-mini');
    expect(getAiModel('ai_model_site_content')).toBe('gpt-5.1-mini');
  });

  it('accepts OpenAI ids and rejects anything else', () => {
    for (const model of AI_MODELS) expect(isValidModelId(model.fallback)).toBe(true);
    expect(isValidModelId('ft:gpt-4o-mini:org:name:id')).toBe(true);
    for (const bad of ['', ' ', 'a b', '<script>', null, 42]) expect(isValidModelId(bad)).toBe(false);
    expect(isAiModelKey('openai_api_key')).toBe(false);
  });

  it('serves the demo models publicly and nothing else from settings', async () => {
    stored.set('ai_model_demo_text', 'gpt-5.1-mini');
    stored.set('openai_api_key', 'sk-secret');
    const app = express().use('/api/public', publicRouter);
    const res = await request(app).get('/api/public/ai-models');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: 'gpt-5.1-mini', vision: 'gpt-4o-mini', tts: 'gpt-4o-mini-tts', apiKeysRequired: false });
    expect(JSON.stringify(res.body)).not.toContain('sk-secret');
  });
});
