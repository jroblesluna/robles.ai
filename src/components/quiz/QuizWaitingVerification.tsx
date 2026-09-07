import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MailCheck, RotateCw } from "lucide-react";
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
      className="max-w-md mx-auto text-center bg-blue-50 border border-blue-100 rounded-xl p-8 sm:p-10"
    >
      <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <MailCheck className="h-8 w-8 text-blue-600" />
        </motion.div>
      </div>

      {expired ? (
        <>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t("quiz.waiting.expiredTitle")}</h3>
          <p className="text-gray-600 text-sm mb-6">{t("quiz.waiting.expiredSubtitle")}</p>
        </>
      ) : (
        <>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t("quiz.waiting.title")}</h3>
          <p className="text-gray-600 text-sm mb-6">
            {t("quiz.waiting.subtitle", { email })}
          </p>
        </>
      )}

      <button
        type="button"
        onClick={handleResend}
        disabled={resending}
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
      >
        <RotateCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
        {resending ? t("quiz.waiting.resending") : t("quiz.waiting.resend")}
      </button>
      {resent && !expired && (
        <p className="text-xs text-emerald-600 mt-3">{t("quiz.waiting.resent")}</p>
      )}
    </motion.div>
  );
};

export default QuizWaitingVerification;
