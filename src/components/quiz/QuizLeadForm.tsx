import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ShieldCheck, Send } from "lucide-react";

const quizLeadFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  company: z.string().optional(),
  whatsapp: z.string().optional(),
});

export type QuizLeadFormValues = z.infer<typeof quizLeadFormSchema>;

interface QuizLeadFormProps {
  onSubmit: (data: QuizLeadFormValues) => Promise<void> | void;
  isSubmitting: boolean;
}

const QuizLeadForm = ({ onSubmit, isSubmitting }: QuizLeadFormProps) => {
  const { t } = useTranslation();

  const form = useForm<QuizLeadFormValues>({
    resolver: zodResolver(quizLeadFormSchema),
    defaultValues: { name: "", email: "", company: "", whatsapp: "" },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-md mx-auto bg-blue-50 border border-blue-100 rounded-xl p-6 sm:p-8"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{t("quiz.leadForm.title")}</h3>
      <p className="text-gray-600 text-sm mb-6">{t("quiz.leadForm.subtitle")}</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{t("quiz.leadForm.name")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("quiz.leadForm.namePlaceholder")} className="bg-white" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{t("quiz.leadForm.email")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("quiz.leadForm.emailPlaceholder")} className="bg-white" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{t("quiz.leadForm.company")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("quiz.leadForm.companyPlaceholder")} className="bg-white" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="whatsapp"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{t("quiz.leadForm.whatsapp")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("quiz.leadForm.whatsappPlaceholder")} className="bg-white" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? t("quiz.leadForm.sending") : t("quiz.leadForm.submit")}
            <Send className="ml-2 h-4 w-4" />
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("quiz.leadForm.privacy")}
          </p>
        </form>
      </Form>
    </motion.div>
  );
};

export default QuizLeadForm;
