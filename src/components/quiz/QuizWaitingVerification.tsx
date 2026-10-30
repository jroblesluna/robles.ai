import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, Loader2, MailCheck, RotateCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface QuizWaitingVerificationProps {
  leadId: number;
  email: string;
  onVerified: (resultMessage: string | null) => void;
}

const POLL_INTERVAL_MS = 4000;

const QuizWaitingVerification = ({ leadId, email, onVerified }: QuizWaitingVerificationProps) => {
  const { t } = useTranslation();
  const [expired, setExpired] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;
  const steps = t("quiz.waiting.steps", { returnObjects: true }) as string[];

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/quiz-lead/status?leadId=${leadId}`, { credentials: "include" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.verified) {
          onVerifiedRef.current(data.resultMessage ?? null);
          return;
        }
        setExpired(Boolean(data.expired));
      } catch {
        // Network hiccup — the interval will simply try again.
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [leadId]);

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    try {
      await apiRequest("POST", "/api/quiz-lead/resend", { leadId });
      setExpired(false);
      setResent(true);
    } catch {
      // Keep the expired state visible so the user can try again.
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-2xl shadow-slate-900/10 sm:p-10"
    >
      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
        {!expired && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-blue-100 motion-safe:animate-ping" />}
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
          <MailCheck className="h-9 w-9" aria-hidden="true" />
        </span>
      </div>

      <div aria-live="polite">
        {expired ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900">{t("quiz.waiting.expiredTitle")}</h2>
            <p className="mt-2 text-gray-600">{t("quiz.waiting.expiredSubtitle")}</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900">{t("quiz.waiting.title")}</h2>
            <p className="mt-2 leading-relaxed text-gray-600">{t("quiz.waiting.subtitle", { email })}</p>
          </>
        )}
      </div>

      {!expired && (
        <ol className="mt-8 grid grid-cols-1 gap-2 text-left sm:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm ${
                i === 0
                  ? "border-emerald-100 bg-emerald-50/60 text-gray-700"
                  : i === 1
                    ? "border-blue-200 bg-blue-50 font-medium text-gray-900"
                    : "border-gray-100 text-gray-400"
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                {i === 0 ? (
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                ) : i === 1 ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-gray-300" />
                )}
              </span>
              <span className="leading-snug">{step}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 flex flex-col items-center gap-3 border-t border-gray-100 pt-6">
        <p className="text-sm text-gray-500">{t("quiz.waiting.spamHint")}</p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="tap-target inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-5 py-2 text-sm font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
        >
          <RotateCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
          {resending ? t("quiz.waiting.resending") : t("quiz.waiting.resend")}
        </button>
        {resent && !expired && <p className="text-xs text-emerald-600">{t("quiz.waiting.resent")}</p>}
      </div>
    </motion.div>
  );
};

export default QuizWaitingVerification;
