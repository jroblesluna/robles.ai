import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { QUIZ_QUESTIONS, computeQuizResult, type QuizResult } from "@/lib/quizData";
import { apiRequest } from "@/lib/queryClient";
import { tagClarityLead, trackQuizLead } from "@/lib/analytics";
import { toast } from "@/hooks/use-toast";
import QuizIntro from "@/components/quiz/QuizIntro";
import QuizProgressBar from "@/components/quiz/QuizProgressBar";
import QuizQuestionCard from "@/components/quiz/QuizQuestionCard";
import QuizAnalyzing from "@/components/quiz/QuizAnalyzing";
import QuizResultPreview from "@/components/quiz/QuizResultPreview";
import QuizLeadForm, { type QuizLeadFormValues } from "@/components/quiz/QuizLeadForm";
import QuizWaitingVerification from "@/components/quiz/QuizWaitingVerification";
import QuizResultFull from "@/components/quiz/QuizResultFull";

type QuizStep = "intro" | "question" | "analyzing" | "preview" | "form" | "waiting" | "full";

const Quiz = () => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<QuizStep>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadId, setLeadId] = useState<number | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = QUIZ_QUESTIONS[questionIndex];
  // Ignores further picks while the card animates to the next question (double click, key repeat).
  const advancing = useRef(false);

  const handleSelectOption = (optionId: string) => {
    if (advancing.current) return;
    advancing.current = true;
    const nextAnswers = { ...answers, [currentQuestion.id]: optionId };
    setAnswers(nextAnswers);

    setTimeout(() => {
      advancing.current = false;
      if (questionIndex < QUIZ_QUESTIONS.length - 1) {
        setDirection(1);
        setQuestionIndex((i) => i + 1);
      } else {
        setStep("analyzing");
      }
    }, 250);
  };

  const goBack = () => {
    if (questionIndex === 0) return;
    setDirection(-1);
    setQuestionIndex((i) => i - 1);
  };

  // Keyboard shortcuts on a question: 1-9 picks an option.
  useEffect(() => {
    if (step !== "question" || !currentQuestion) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      const n = Number(e.key);
      const option = Number.isInteger(n) && n >= 1 ? currentQuestion.options[n - 1] : undefined;
      if (option) handleSelectOption(option.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Each step starts at the top, so long steps (report, form) are read from the beginning.
  useEffect(() => {
    if (step === "question") return;
    window.scrollTo({ top: 0 });
  }, [step]);

  const handleAnalyzingDone = () => {
    setResult(computeQuizResult(answers));
    setStep("preview");
  };

  const handleLeadSubmit = async (data: QuizLeadFormValues) => {
    if (!result) return;
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/quiz-lead", {
        name: data.name,
        email: data.email,
        company: data.company || null,
        whatsapp: data.whatsapp || null,
        answers,
        score: result.score,
        profile: result.profile,
        recommendedServices: result.recommendedServices,
        locale: i18n.language.startsWith("en") ? "en" : "es",
      });
      const body = await res.json().catch(() => null);
      setLeadName(data.name);
      setLeadEmail(data.email);
      setLeadId(body?.leadId ?? null);
      // Count the lead once the API has stored it (before email verification). No form values are sent.
      if (body?.leadId) {
        trackQuizLead();
        tagClarityLead("quiz", body.leadId);
      }
      setStep("waiting");
    } catch (error) {
      toast({
        title: t("quiz.leadForm.errorTitle"),
        description: t("quiz.leadForm.errorMessage"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerified = (message: string | null) => {
    setResultMessage(message);
    setStep("full");
  };

  return (
    <section className="relative isolate min-h-[calc(100vh-var(--header-h))] overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white py-12 md:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[linear-gradient(to_right,rgba(37,99,235,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/4 -z-10 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute right-0 top-40 -z-10 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />

      <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {step === "intro" && (
            <motion.div key="intro" exit={{ opacity: 0 }}>
              <QuizIntro onStart={() => setStep("question")} />
            </motion.div>
          )}

          {step === "question" && currentQuestion && (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-3xl"
            >
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-10">
                <QuizProgressBar current={questionIndex + 1} total={QUIZ_QUESTIONS.length} />
                <div className="mt-8 overflow-hidden">
                  <QuizQuestionCard
                    question={currentQuestion}
                    selected={answers[currentQuestion.id]}
                    onSelect={handleSelectOption}
                    direction={direction}
                  />
                </div>
                <div className={`mt-8 items-center justify-between gap-4 border-t border-gray-100 pt-5 ${questionIndex > 0 ? "flex" : "hidden sm:flex"}`}>
                  {questionIndex > 0 ? (
                    <button
                      type="button"
                      onClick={goBack}
                      className="tap-target -ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {t("quiz.progress.back")}
                    </button>
                  ) : (
                    <span />
                  )}
                  <p className="hidden text-xs text-gray-400 sm:block">
                    {t("quiz.progress.keyboardHint", { max: currentQuestion.options.length })}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === "analyzing" && (
            <motion.div key="analyzing" exit={{ opacity: 0 }}>
              <QuizAnalyzing onDone={handleAnalyzingDone} />
            </motion.div>
          )}

          {step === "preview" && result && (
            <motion.div key="preview" exit={{ opacity: 0 }}>
              <QuizResultPreview result={result} onUnlock={() => setStep("form")} />
            </motion.div>
          )}

          {step === "form" && (
            <motion.div key="form" exit={{ opacity: 0 }}>
              <QuizLeadForm onSubmit={handleLeadSubmit} isSubmitting={isSubmitting} result={result} />
            </motion.div>
          )}

          {step === "waiting" && leadId && (
            <motion.div key="waiting" exit={{ opacity: 0 }}>
              <QuizWaitingVerification leadId={leadId} email={leadEmail} onVerified={handleVerified} />
            </motion.div>
          )}

          {step === "full" && result && (
            <motion.div key="full" exit={{ opacity: 0 }}>
              <QuizResultFull leadId={leadId} result={result} leadName={leadName} resultMessage={resultMessage} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Quiz;
