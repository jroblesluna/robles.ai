import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ShieldCheck, Send, Loader2, CheckCircle2 } from "lucide-react";
import type { QuizResult } from "@/lib/quizData";
import { QuizScoreRing } from "@/components/quiz/QuizScoreRing";

const buildSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().trim().min(2, { message: t("quiz.leadForm.nameError") }),
    email: z.string().trim().email({ message: t("quiz.leadForm.emailError") }),
    company: z.string().optional(),
    whatsapp: z.string().optional(),
  });

export type QuizLeadFormValues = z.infer<ReturnType<typeof buildSchema>>;

interface QuizLeadFormProps {
  onSubmit: (data: QuizLeadFormValues) => Promise<void> | void;
  isSubmitting: boolean;
  /** Shown in the summary column so the visitor sees what they are unlocking. */
  result?: QuizResult | null;
}

const QuizLeadForm = ({ onSubmit, isSubmitting, result }: QuizLeadFormProps) => {
  const { t, i18n } = useTranslation();
  const schema = useMemo(() => buildSchema(t), [t, i18n.language]);
  const lockedItems = t("quiz.results.lockedItems", { returnObjects: true }) as string[];

  const form = useForm<QuizLeadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", company: "", whatsapp: "" },
  });

  // On mobile, bring the first invalid field (and its validation message) into view.
  const onInvalid = (errors: Record<string, unknown>) => {
    const firstKey = Object.keys(errors)[0];
    if (!firstKey) return;
    const el = document.querySelector(`[name="${firstKey}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  };

  const fields = [
    { name: "name", type: "text", autoComplete: "name" },
    { name: "email", type: "email", autoComplete: "email" },
    { name: "company", type: "text", autoComplete: "organization" },
    { name: "whatsapp", type: "tel", autoComplete: "tel" },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto grid max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-5"
    >
      {/* Summary of what unlocks */}
      <aside className="order-last bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-7 sm:p-10 lg:order-first lg:col-span-2">
        {result && (
          <div className="flex items-center gap-4">
            <QuizScoreRing score={result.score} tone="dark" className="h-24 w-24" />
            <p className="font-semibold leading-snug text-white">{t(`quiz.results.profiles.${result.profile}.title`)}</p>
          </div>
        )}
        <p className={`text-xs font-semibold uppercase tracking-wider text-blue-200 ${result ? "mt-8" : ""}`}>
          {t("quiz.leadForm.summaryTitle")}
        </p>
        <ul className="mt-4 space-y-3">
          {lockedItems.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm leading-snug text-blue-50/90">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-8 flex items-start gap-2 border-t border-white/10 pt-6 text-xs leading-relaxed text-blue-100/70">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t("quiz.leadForm.privacy")}
        </p>
      </aside>

      <div className="p-7 sm:p-10 lg:col-span-3">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t("quiz.leadForm.title")}</h2>
        <p className="mt-2 text-gray-600">{t("quiz.leadForm.subtitle")}</p>

        <Form {...form}>
          <form
            data-clarity-mask="true"
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            className="mt-7 grid min-w-0 grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2"
            noValidate
          >
            {fields.map(({ name, type, autoComplete }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">{t(`quiz.leadForm.${name}`)}</FormLabel>
                    <FormControl>
                      <Input
                        type={type}
                        autoComplete={autoComplete}
                        placeholder={t(`quiz.leadForm.${name}Placeholder`)}
                        className="h-11 bg-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <div className="sm:col-span-2">
              <Button
                type="submit"
                className="tap-target h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-semibold shadow-lg shadow-blue-600/20 hover:opacity-95"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("quiz.leadForm.sending") : t("quiz.leadForm.submit")}
                {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
              </Button>
              {isSubmitting ? (
                <p className="flex items-center justify-center gap-1.5 pt-3 text-xs text-amber-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("quiz.leadForm.dontClose")}
                </p>
              ) : (
                <p className="pt-3 text-center text-xs text-gray-500">{t("quiz.leadForm.verifyNote")}</p>
              )}
            </div>
          </form>
        </Form>
      </div>
    </motion.div>
  );
};

export default QuizLeadForm;
