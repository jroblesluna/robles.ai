// Question bank, scoring weights and result computation for the AI Diagnosis Quiz.
// Copy for each question/option lives in i18n under `quiz.questions.<id>.*`;
// this file only holds structure, ids and the tag weights used for scoring.

export type ServiceTag = "diagnosis" | "audit" | "chatbots" | "llm" | "rag" | "ml";

export interface QuizOption {
  id: string;
  /** Points added per service tag when this option is picked. */
  weights?: Partial<Record<ServiceTag, number>>;
  /** Extra score points (0-30) for maturity/urgency/budget questions. */
  scorePoints?: number;
}

export interface QuizQuestion {
  id: string;
  /** i18n key suffix under quiz.questions.<id> */
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "industry",
    options: [
      { id: "retail", weights: { ml: 1, chatbots: 1 } },
      { id: "healthcare", weights: { rag: 1, chatbots: 1 } },
      { id: "finance", weights: { ml: 1, audit: 1 } },
      { id: "manufacturing", weights: { audit: 1, ml: 1 } },
      { id: "professionalServices", weights: { rag: 1, llm: 1 } },
      { id: "other", weights: { diagnosis: 1 } },
    ],
  },
  {
    id: "teamSize",
    options: [
      { id: "small", weights: { diagnosis: 1 } },
      { id: "medium", weights: { audit: 1 } },
      { id: "large", weights: { audit: 1, ml: 1 } },
      { id: "enterprise", weights: { audit: 2 } },
    ],
  },
  {
    id: "bottleneck",
    options: [
      { id: "repetitiveTasks", weights: { chatbots: 2, audit: 1 } },
      { id: "customerSupport", weights: { chatbots: 3 } },
      { id: "scatteredInfo", weights: { rag: 3 } },
      { id: "gutDecisions", weights: { ml: 3 } },
      { id: "noIdea", weights: { diagnosis: 3 } },
      { id: "manualProcesses", weights: { audit: 2, llm: 1 } },
    ],
  },
  {
    id: "priority",
    options: [
      { id: "customerChatbot", weights: { chatbots: 4 } },
      { id: "internalAssistant", weights: { rag: 4 } },
      { id: "automateWithLLM", weights: { llm: 4 } },
      { id: "forecasting", weights: { ml: 4 } },
      { id: "optimizeProcesses", weights: { audit: 4 } },
      { id: "needGuidance", weights: { diagnosis: 4 } },
    ],
  },
  {
    id: "maturity",
    options: [
      { id: "none", weights: { diagnosis: 1 }, scorePoints: 8 },
      { id: "occasionalChatGPT", weights: { diagnosis: 1 }, scorePoints: 16 },
      { id: "basicAutomation", weights: { audit: 1 }, scorePoints: 24 },
      { id: "ongoingProjects", weights: { llm: 1 }, scorePoints: 30 },
    ],
  },
  {
    id: "urgency",
    options: [
      { id: "asap", scorePoints: 30 },
      { id: "sixMonths", scorePoints: 18 },
      { id: "exploring", scorePoints: 8 },
    ],
  },
  {
    id: "budget",
    options: [
      { id: "lt2k", scorePoints: 12 },
      { id: "2kTo10k", scorePoints: 20 },
      { id: "10kTo30k", scorePoints: 30 },
      { id: "guidance", scorePoints: 15, weights: { diagnosis: 2 } },
    ],
  },
  {
    id: "outcome",
    options: [
      { id: "reduceCosts", weights: { audit: 2, ml: 2 } },
      { id: "customerExperience", weights: { chatbots: 3 } },
      { id: "betterDecisions", weights: { ml: 3 } },
      { id: "freeUpTime", weights: { chatbots: 2, llm: 2 } },
    ],
  },
];

export interface QuizResult {
  score: number;
  profile: "starting" | "promising" | "ready" | "priority";
  recommendedServices: ServiceTag[];
}

const PROFILE_THRESHOLDS: Array<{ max: number; profile: QuizResult["profile"] }> = [
  { max: 40, profile: "starting" },
  { max: 65, profile: "promising" },
  { max: 85, profile: "ready" },
  { max: 100, profile: "priority" },
];

export function computeQuizResult(answers: Record<string, string>): QuizResult {
  const tagTotals: Record<ServiceTag, number> = {
    diagnosis: 0,
    audit: 0,
    chatbots: 0,
    llm: 0,
    rag: 0,
    ml: 0,
  };

  let score = 10; // base completion points

  for (const question of QUIZ_QUESTIONS) {
    const chosenId = answers[question.id];
    const option = question.options.find((o) => o.id === chosenId);
    if (!option) continue;

    if (option.weights) {
      for (const [tag, points] of Object.entries(option.weights)) {
        tagTotals[tag as ServiceTag] += points ?? 0;
      }
    }
    if (option.scorePoints) {
      score += option.scorePoints;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const recommendedServices = (Object.entries(tagTotals) as [ServiceTag, number][])
    .sort((a, b) => b[1] - a[1])
    .filter(([, points]) => points > 0)
    .slice(0, 2)
    .map(([tag]) => tag);

  if (recommendedServices.length === 0) {
    recommendedServices.push("diagnosis");
  }

  const profile =
    PROFILE_THRESHOLDS.find((t) => score <= t.max)?.profile ?? "priority";

  return { score, profile, recommendedServices };
}

/** Services shown in the full report: recommended tags + "diagnosis" as a safe next step, max 3, deduped. */
export function getReportServiceTags(result: QuizResult): ServiceTag[] {
  return Array.from(new Set([...result.recommendedServices, "diagnosis" as ServiceTag])).slice(0, 3);
}
