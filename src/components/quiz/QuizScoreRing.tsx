import { useId } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Brain,
  ClipboardCheck,
  MessageSquare,
  Link2,
  BookOpen,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { QuizResult, ServiceTag } from "@/lib/quizData";

export const SERVICE_ICONS: Record<ServiceTag, LucideIcon> = {
  diagnosis: Brain,
  audit: ClipboardCheck,
  chatbots: MessageSquare,
  llm: Link2,
  rag: BookOpen,
  ml: TrendingUp,
};

const PROFILES: QuizResult["profile"][] = ["starting", "promising", "ready", "priority"];

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface QuizScoreRingProps {
  score: number;
  /** "dark" for rings drawn on the navy panels. */
  tone?: "light" | "dark";
  className?: string;
}

/** Animated 0-100 score ring with a blue→indigo gradient stroke. */
export const QuizScoreRing = ({ score, tone = "light", className = "h-40 w-40" }: QuizScoreRingProps) => {
  const gradientId = useId();
  const dark = tone === "dark";

  return (
    <div className={`relative shrink-0 ${className}`}>
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={dark ? "#60a5fa" : "#2563eb"} />
            <stop offset="100%" stopColor={dark ? "#a5b4fc" : "#4f46e5"} />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={RADIUS} fill="none" stroke={dark ? "rgba(255,255,255,0.12)" : "#e5e7eb"} strokeWidth="10" />
        <motion.circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - score / 100) }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold tabular-nums ${dark ? "text-white" : "text-gray-900"}`}>{score}</span>
        <span className={`text-xs font-medium ${dark ? "text-blue-200/80" : "text-gray-500"}`}>/100</span>
      </div>
    </div>
  );
};

/** Four-step readiness scale with the visitor's profile highlighted. */
export const QuizProfileScale = ({ profile, tone = "light" }: { profile: QuizResult["profile"]; tone?: "light" | "dark" }) => {
  const { t } = useTranslation();
  const active = PROFILES.indexOf(profile);
  const dark = tone === "dark";

  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {PROFILES.map((p, i) => (
          <span
            key={p}
            className={`h-1.5 rounded-full ${
              i <= active
                ? "bg-gradient-to-r from-blue-400 to-indigo-400"
                : dark
                  ? "bg-white/15"
                  : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <ol className="mt-2 grid grid-cols-4 gap-1.5 text-[11px] leading-tight sm:text-xs">
        {PROFILES.map((p, i) => (
          <li
            key={p}
            aria-current={i === active ? "step" : undefined}
            className={
              i === active
                ? `font-semibold ${dark ? "text-white" : "text-blue-700"}`
                : dark
                  ? "text-blue-100/60"
                  : "text-gray-400"
            }
          >
            {t(`quiz.results.scale.${p}`)}
          </li>
        ))}
      </ol>
    </div>
  );
};
