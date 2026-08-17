import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import db from '../db.js';
import { getPageContext } from './chatContext.js';
import type { ContactData } from '../../shared/chatTypes.js';

// ============================================================
// AI Engine — Generates streaming chatbot responses using
// GPT-4o-mini with page context, contact extraction, and
// conversation closure detection.
// ============================================================

/** Event types emitted by the AI Engine stream */
export type ChatStreamEvent =
  | { type: 'token'; content: string }
  | { type: 'done'; fullContent: string }
  | { type: 'tool_call'; name: 'close_conversation' }
  | { type: 'tool_call'; name: 'update_contact'; data: Partial<ContactData> }
  | { type: 'error'; message: string };

/** Message format accepted by the engine */
export interface EngineMessage {
  role: 'visitor' | 'assistant';
  content: string;
}

// ----------------------------------------------------------
// OpenAI Client Setup
// ----------------------------------------------------------

/**
 * Retrieves the OpenAI API key from settings table or environment variable.
 * Throws if no key is configured.
 */
function getApiKey(): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('openai_api_key') as
    | { value: string | null }
    | undefined;
  const apiKey = row?.value || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  return apiKey;
}

// ----------------------------------------------------------
// System Prompt Layers
// ----------------------------------------------------------

const BASE_IDENTITY = `You are the Robles.AI assistant on robles.ai. You help visitors understand Robles.AI's services in AI/ML, computer vision, data science, and related fields. Keep responses concise (2-4 sentences). Be warm, professional, and knowledgeable.`;

const TOPIC_GUARD = `If a visitor asks about topics unrelated to AI, ML, data science, Robles.AI services, or the current page content, politely redirect them. Example: "That's an interesting topic! I specialize in AI and ML though — is there something about Robles.AI's services I can help with?"`;

const CONTACT_COLLECTION = `Naturally work toward learning the visitor's name, and either their email or phone number. Do NOT ask for all fields at once. Weave requests into the conversation flow. Once you have their name and at least one contact method, stop requesting information. Never be pushy if they decline.`;

/**
 * Builds the full system prompt with all three layers plus dynamic page context.
 */
async function buildSystemPrompt(pagePath: string): Promise<string> {
  const pageContext = await getPageContext(pagePath);

  return `${BASE_IDENTITY}

${TOPIC_GUARD}

${CONTACT_COLLECTION}

---
The visitor is currently viewing: ${pagePath}
Relevant page content:
${pageContext}`;
}

// ----------------------------------------------------------
// Tool Definitions
// ----------------------------------------------------------

const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'close_conversation',
      description: 'Call this when the visitor says goodbye, indicates they want to end the conversation, or thanks you and is done.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_contact',
      description: 'Extract and update contact information mentioned by the visitor during the conversation.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Visitor first name' },
          lastName: { type: 'string', description: 'Visitor last name' },
          email: { type: 'string', description: 'Visitor email address' },
          phone: { type: 'string', description: 'Visitor phone number' },
          company: { type: 'string', description: 'Visitor company or organization' },
        },
      },
    },
  },
];

// ----------------------------------------------------------
// Main API: generateResponse
// ----------------------------------------------------------

/**
 * Generates an AI response as an async iterable of ChatStreamEvents.
 * Streams tokens as they arrive and emits tool call events at the end.
 *
 * @param messages - The conversation history (visitor + assistant messages)
 * @param pagePath - The visitor's current page path for context assembly
 * @param _sessionId - The session ID (reserved for future rate-limiting integration)
 */
export async function* generateResponse(
  messages: EngineMessage[],
  pagePath: string,
  _sessionId: string
): AsyncGenerator<ChatStreamEvent> {
  // Validate API key availability
  let apiKey: string;
  try {
    apiKey = getApiKey();
  } catch {
    yield { type: 'error', message: 'Service unavailable. Please try again later.' };
    return;
  }

  const openai = new OpenAI({ apiKey });

  // Build system prompt with page context
  const systemPrompt = await buildSystemPrompt(pagePath);

  // Convert engine messages to OpenAI format
  const openaiMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'visitor' ? 'user' as const : 'assistant' as const,
      content: m.content,
    })),
  ];

  try {
    // Create streaming completion with tool support
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      tools: TOOLS,
      tool_choice: 'auto',
      stream: true,
      max_tokens: 500,
    });

    let fullContent = '';
    // Accumulate tool call data from stream deltas (array indexed by tool call index)
    const toolCalls: Array<{ name: string; arguments: string }> = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      // Stream text content tokens
      if (delta.content) {
        fullContent += delta.content;
        yield { type: 'token', content: delta.content };
      }

      // Accumulate tool call deltas
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCalls[tc.index]) {
            toolCalls[tc.index] = {
              name: tc.function?.name || '',
              arguments: tc.function?.arguments || '',
            };
          } else {
            if (tc.function?.name) toolCalls[tc.index].name = tc.function.name;
            if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments;
          }
        }
      }
    }

    // Emit done event with the full assembled content
    yield { type: 'done', fullContent };

    // Process tool calls after streaming completes
    for (const toolCall of toolCalls) {
      if (!toolCall) continue;
      if (toolCall.name === 'close_conversation') {
        yield { type: 'tool_call', name: 'close_conversation' };
      } else if (toolCall.name === 'update_contact') {
        try {
          const data = JSON.parse(toolCall.arguments || '{}') as Partial<ContactData>;
          // Only emit if at least one field is present
          const hasData = data.name || data.lastName || data.email || data.phone || data.company;
          if (hasData) {
            yield { type: 'tool_call', name: 'update_contact', data };
          }
        } catch {
          // Malformed tool call arguments — skip silently
          console.warn('[ChatEngine] Failed to parse update_contact arguments:', toolCall.arguments);
        }
      }
    }
  } catch (error: any) {
    // Handle specific OpenAI error scenarios
    if (error?.status === 429) {
      yield { type: 'error', message: 'Too many requests. Please wait a moment and try again.' };
    } else if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      yield { type: 'error', message: 'Response timed out. Please try again.' };
    } else {
      console.error('[ChatEngine] OpenAI API error:', error?.message || error);
      yield { type: 'error', message: 'Something went wrong. Please try again.' };
    }
  }
}

// ----------------------------------------------------------
// Contact Extraction (standalone, post-stream)
// ----------------------------------------------------------

/**
 * Runs a separate contact extraction pass on the conversation history.
 * Uses function calling to extract any contact data mentioned by the visitor.
 * This can be called after the main stream completes as a fallback or supplement.
 *
 * @param messages - The full conversation history
 * @returns Extracted contact data, or null if extraction fails or finds nothing
 */
export async function extractContactData(
  messages: EngineMessage[]
): Promise<Partial<ContactData> | null> {
  let apiKey: string;
  try {
    apiKey = getApiKey();
  } catch {
    return null;
  }

  const openai = new OpenAI({ apiKey });

  const openaiMessages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: 'Extract any contact information the visitor has shared in this conversation. Only extract data explicitly stated by the visitor. If no contact info was shared, do not call the tool.',
    },
    ...messages.map((m) => ({
      role: m.role === 'visitor' ? 'user' as const : 'assistant' as const,
      content: m.content,
    })),
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'update_contact',
            description: 'Extract and update contact information mentioned by the visitor',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Visitor first name' },
                lastName: { type: 'string', description: 'Visitor last name' },
                email: { type: 'string', description: 'Visitor email address' },
                phone: { type: 'string', description: 'Visitor phone number' },
                company: { type: 'string', description: 'Visitor company or organization' },
              },
            },
          },
        },
      ],
      tool_choice: 'auto',
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.name === 'update_contact') {
      const data = JSON.parse(toolCall.function.arguments || '{}') as Partial<ContactData>;
      const hasData = data.name || data.lastName || data.email || data.phone || data.company;
      return hasData ? data : null;
    }

    return null;
  } catch (error: any) {
    console.warn('[ChatEngine] Contact extraction failed:', error?.message || error);
    return null;
  }
}
