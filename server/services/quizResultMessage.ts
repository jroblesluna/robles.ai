import OpenAI from 'openai';
import db from '../db.js';

// ============================================================
// Generates the short personalized paragraph shown at the top
// of the AI Diagnosis Quiz full report. Written as a private,
// specific reflection on the visitor's own answers — never as
// a pitch for a service, price, or CTA (those already exist as
// separate buttons in the UI).
// ============================================================

export interface QuizResultMessageInput {
  answers: Record<string, string>;
  score: number;
  profile: string;
  recommendedServices: string[];
  locale: 'es' | 'en';
}

/** Short, plain-English glossary so the model understands the raw answer ids without duplicating full site i18n. */
const ANSWER_LABELS: Record<string, Record<string, string>> = {
  industry: {
    retail: 'Retail / commerce',
    healthcare: 'Healthcare',
    finance: 'Finance / insurance',
    manufacturing: 'Manufacturing / industry',
    professionalServices: 'Professional services / consulting',
    other: 'Other industry',
  },
  teamSize: {
    small: '1-10 employees',
    medium: '11-50 employees',
    large: '51-200 employees',
    enterprise: '200+ employees',
  },
  bottleneck: {
    repetitiveTasks: "Repetitive tasks eating up the team's time",
    customerSupport: 'Customer support is overwhelming the team',
    scatteredInfo: 'Information is scattered and hard to find',
    gutDecisions: 'Decisions are made on gut feeling, not data',
    noIdea: "Doesn't know where to start with AI",
    manualProcesses: 'Manual processes that should be automated',
  },
  priority: {
    customerChatbot: 'Wants a customer support chatbot first',
    internalAssistant: 'Wants an internal assistant over their documents first',
    automateWithLLM: 'Wants to automate tasks with LLMs first',
    forecasting: 'Wants forecasting / predictive ML first',
    optimizeProcesses: 'Wants to optimize existing processes first',
    needGuidance: "Doesn't know yet, wants guidance",
  },
  maturity: {
    none: 'No AI tools in use yet',
    occasionalChatGPT: 'Uses ChatGPT or similar occasionally',
    basicAutomation: 'Has some basic automations already',
    ongoingProjects: 'Already has AI projects underway',
  },
  urgency: {
    asap: 'Wants to start this quarter, as soon as possible',
    sixMonths: 'Plans to start within 6 months',
    exploring: 'Still just exploring options',
  },
  budget: {
    lt2k: 'Budget under $2,000',
    '2kTo10k': 'Budget between $2,000 and $10,000',
    '10kTo30k': 'Budget between $10,000 and $30,000',
    guidance: "Doesn't have a budget defined, wants guidance first",
  },
  outcome: {
    reduceCosts: 'Wants to reduce operating costs',
    customerExperience: "Wants to improve customers' experience",
    betterDecisions: 'Wants better data-driven decisions',
    freeUpTime: "Wants to free up the team's time",
  },
};

function describeAnswers(answers: Record<string, string>): string {
  return Object.entries(answers)
    .map(([questionId, optionId]) => {
      const label = ANSWER_LABELS[questionId]?.[optionId] ?? optionId;
      return `- ${questionId}: ${label}`;
    })
    .join('\n');
}

function buildSystemPrompt(locale: 'es' | 'en'): string {
  const languageInstruction =
    locale === 'en'
      ? 'Write in natural, professional English.'
      : 'Escribe en español neutro, profesional y directo.';

  return `You are a blunt, credible business analyst who just reviewed someone's answers to a short AI-readiness quiz on a consulting firm's website. The reader is a business owner or decision-maker — direct and specific language moves them, not poetic language.

Write EXACTLY 2 short sentences (no greeting, no sign-off), addressed directly to them in second person:

1. First sentence: state plainly why they landed in this specific result — reference 1-2 of their actual answers (their bottleneck, urgency, or maturity level) as the concrete reason. This is a justification, not a compliment.
2. Second sentence: state the single most concrete business stake — the clearest cost of staying as-is, or the clearest gain of fixing it (time, money, or competitive position) — tied to the outcome they said they want.

Strict rules:
- Maximum 40 words total. Short, declarative sentences. No run-on sentences, no clauses stacked with "which" / "lo que" / "no solo... sino que".
- Zero metaphors or imagery ("flourish", "unlock", "florecer", "imagina un mundo donde"). State facts and stakes directly, like a consultant briefing an executive, not a motivational quote.
- Never mention a company name, a service name, a price, or a call to action ("contact us", "book a call", "our services", etc.) — those exist elsewhere on the page.
- Never name the type of solution or technology (no "chatbot", "machine learning", "automation", "AI system", etc.) — describe only the business outcome, never the mechanism.
- Never invent statistics, numbers, or facts they didn't give you.
- No hype words, no exclamation marks, no emojis.
- ${languageInstruction}
- Respond with the message text only, nothing else (no quotes, no labels).`;
}

function buildUserPrompt(input: QuizResultMessageInput): string {
  return `Quiz answers:\n${describeAnswers(input.answers)}\n\nReadiness score: ${input.score}/100\nProfile: ${input.profile}`;
}

function getApiKey(): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('openai_api_key') as
    | { value: string | null }
    | undefined;
  return row?.value || process.env.OPENAI_API_KEY || null;
}

/**
 * Generates the personalized result message. Returns null (never throws) if the
 * API key is missing or generation fails after retrying once — callers should
 * fall back to the static profile copy already shown in the UI.
 */
export async function generateQuizResultMessage(
  input: QuizResultMessageInput
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const systemPrompt = buildSystemPrompt(input.locale);
  const userPrompt = buildUserPrompt(input);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 100,
      });

      const content = response.choices?.[0]?.message?.content?.trim();
      if (content) return content;
    } catch (error) {
      console.error(`❌ Quiz result message generation failed (attempt ${attempt + 1}):`, error);
    }
  }

  return null;
}
