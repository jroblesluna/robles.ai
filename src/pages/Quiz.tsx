import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { QUIZ_QUESTIONS, computeQuizResult, type QuizResult } from "@/lib/quizData";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import QuizIntro from "@/components/quiz/QuizIntro";
import QuizProgressBar from "@/components/quiz/QuizProgressBar";
import QuizQuestionCard from "@/components/quiz/QuizQuestionCard";
import QuizAnalyzing from "@/components/quiz/QuizAnalyzing";
import QuizResultPreview from "@/components/quiz/QuizResultPreview";
import QuizLeadForm, { type QuizLeadFormValues } from "@/components/quiz/QuizLeadForm";
import QuizResultFull from "@/components/quiz/QuizResultFull";

type QuizStep = "intro" | "question" | "analyzing" | "preview" | "form" | "full";

const Quiz = () => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<QuizStep>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [leadName, setLeadName] = useState("");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = QUIZ_QUESTIONS[questionIndex];

  const handleSelectOption = (optionId: string) => {
    const nextAnswers = { ...answers, [currentQuestion.id]: optionId };
    setAnswers(nextAnswers);

    setTimeout(() => {
      if (questionIndex < QUIZ_QUESTIONS.length - 1) {
        setDirection(1);
        setQuestionIndex((i) => i + 1);
      } else {
        setStep("analyzing");
      }
    }, 250);
  };

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
      setResultMessage(body?.resultMessage ?? null);
      setLeadName(data.name);
      setStep("full");
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

  return (
    <section className="py-16 md:py-24 bg-white min-h-[70vh]">
      <div className="container mx-auto px-6">
        <AnimatePresence mode="wait">
          {step === "intro" && (
            <motion.div key="intro" exit={{ opacity: 0 }}>
              <QuizIntro onStart={() => setStep("question")} />
            </motion.div>
          )}

          {step === "question" && currentQuestion && (
            <motion.div key="question" exit={{ opacity: 0 }}>
              <QuizProgressBar current={questionIndex + 1} total={QUIZ_QUESTIONS.length} />
              <QuizQuestionCard
                question={currentQuestion}
                selected={answers[currentQuestion.id]}
                onSelect={handleSelectOption}
                direction={direction}
              />
              {questionIndex > 0 && (
                <div className="max-w-xl mx-auto mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setDirection(-1);
                      setQuestionIndex((i) => i - 1);
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {t("quiz.progress.back")}
                  </button>
                </div>
              )}
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
              <QuizLeadForm onSubmit={handleLeadSubmit} isSubmitting={isSubmitting} />
            </motion.div>
          )}

          {step === "full" && result && (
            <motion.div key="full" exit={{ opacity: 0 }}>
              <QuizResultFull result={result} leadName={leadName} resultMessage={resultMessage} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Quiz;
