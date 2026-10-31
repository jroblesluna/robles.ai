/**
 * OpenAI models used by the site and the demo APIs, editable from Admin → Settings
 * so a retired model can be replaced without a deploy. The embedding models are not
 * listed on purpose: changing one requires rebuilding the vector indexes.
 */
export const AI_MODELS = [
  { key: 'ai_model_site_chat', fallback: 'gpt-4o-mini', group: 'Site', label: 'Robly and quiz', hint: 'Fast and low cost' },
  { key: 'ai_model_site_content', fallback: 'gpt-4o', group: 'Site', label: 'Blog and El Dominical IA', hint: 'Writing and scoring' },
  { key: 'ai_model_site_image', fallback: 'gpt-image-2.5-flare', group: 'Site', label: 'Generated images', hint: 'Carousels and video backgrounds' },
  { key: 'ai_model_site_tts', fallback: 'gpt-4o-mini-tts', group: 'Site', label: 'Narrated video', hint: 'Text to speech' },
  { key: 'ai_model_demo_text', fallback: 'gpt-4o-mini', group: 'Demos', label: 'Chatbot, RAG, agents, transcription', hint: 'Applied on each API within 5 minutes' },
  { key: 'ai_model_demo_vision', fallback: 'gpt-4o-mini', group: 'Demos', label: 'Document extraction', hint: 'Must support images' },
  { key: 'ai_model_demo_tts', fallback: 'gpt-4o-mini-tts', group: 'Demos', label: 'Text to speech', hint: 'Must support the voices in the demo' },
] as const;

export type AiModelKey = (typeof AI_MODELS)[number]['key'];

export const isAiModelKey = (key: string): key is AiModelKey => AI_MODELS.some(model => model.key === key);

/** Same shape as OpenAI's ids; also rules out anything that is not a model name. */
export const isValidModelId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z0-9][a-z0-9._:-]{1,63}$/i.test(value);
