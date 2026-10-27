import { useEffect, useState } from 'react';
import { PUBLIC_CONTACT, PUBLIC_OFFICES } from '@shared/publicContent';
// i18n version of Contact.tsx
import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  MapPin,
  Send
} from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertContactSchema } from "@shared/schema";
import { trackContactClick, trackContactLead } from "@/lib/analytics";
import { useTranslation } from "react-i18next";

const contactFormSchema = insertContactSchema.extend({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters."
  }),
  email: z.string().email({
    message: "Please enter a valid email address."
  }),
  company: z.string().optional(),
  phone: z.string().optional(),
  subject: z.string().default("Website Inquiry"),
  goal: z.string().default(""),
  // Optional when a goal is chosen; see the refinement below.
  message: z.string().default(""),
  newsletter: z.boolean().default(false)
}).superRefine((data, ctx) => {
  const message = data.message.trim();
  if (message.length > 0 && message.length < 10) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["message"], message: "Message must be at least 10 characters." });
  } else if (!data.goal && message.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["message"], message: "goalOrMessage" });
  }
});

/** Goal options for "What do you want to improve?" (labels live in contact.goals.*). */
export const CONTACT_GOALS = ["service", "documents", "knowledge", "automation", "analytics", "unsure"] as const;

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  /** Classes for the card wrapper (background, padding, shadow). */
  className?: string;
  /** Visual tone: "light" (default) or "dark" for seamless integration with dark pages. */
  tone?: "light" | "dark";
  /** Show the newsletter opt-in (home). Landing pages hide it to keep the form focused. */
  showNewsletter?: boolean;
  /** i18n key for the submit button (defaults to contact.send). */
  submitLabelKey?: string;
  /** Classes for the submit button. */
  buttonClassName?: string;
  /** Show reply-time and privacy reassurance under the button. */
  showTrustNote?: boolean;
  /** Optional i18n key to override the card title. */
  titleKey?: string;
  /** Pre-selects "What do you want to improve?" (e.g. from the ad's ?s= variant). */
  defaultGoal?: (typeof CONTACT_GOALS)[number];
}

/** The contact form card. Fires generate_lead (via trackContactLead) only after the API accepts it. */
export const ContactForm = ({
  className = "bg-blue-100 p-5 sm:p-8 rounded-xl shadow-sm",
  tone = "light",
  showNewsletter = true,
  submitLabelKey = "contact.send",
  buttonClassName = "bg-blue-600 hover:bg-blue-700",
  showTrustNote = false,
  titleKey = "contact.formTitle",
  defaultGoal,
}: ContactFormProps) => {
  const { t } = useTranslation();
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => { setClientReady(true); }, []);

  const isDark = tone === "dark";
  const inputClass = isDark
    ? "bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/20"
    : "bg-white text-gray-900";
  const labelClass = isDark ? "text-sm text-slate-200" : "text-sm text-gray-900";

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      phone: "",
      subject: "Website Inquiry",
      goal: defaultGoal ?? "",
      message: "",
      newsletter: false
    }
  });

  const { isSubmitting } = form.formState;

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

  const onSubmit = async (data: ContactFormValues) => {
    try {
      // The API expects subject + message; fold the chosen goal into both so the email stays readable.
      const goalLabel = data.goal ? t(`contact.goals.${data.goal}`) : "";
      const message = data.message.trim();
      const payload = {
        name: data.name,
        email: data.email,
        company: data.company,
        phone: data.phone,
        newsletter: showNewsletter ? data.newsletter : false,
        subject: goalLabel ? `Website Inquiry — ${goalLabel}` : data.subject,
        message: goalLabel
          ? `${t("contact.interestedIn")}: ${goalLabel}${message ? `\n\n${message}` : ""}`
          : message,
      };
      const response = await apiRequest("POST", "/api/contact", payload);
      const result = await response.json();
      if (result.success !== true) throw new Error('Contact was not accepted');
      trackContactLead();
      toast({
        title: t("contact.successTitle"),
        description: t("contact.successMessage"),
        variant: "success"
      });
      form.reset();
    } catch (error) {
      toast({
        title: t("contact.errorTitle"),
        description: t("contact.errorMessage"),
        variant: "destructive"
      });
    }
  };

  return (
    <div className={`text-left ${className}`}>
      <h3 className={`text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>{t(titleKey)}</h3>

      <Form {...form}>
        <form method="post" action="/api/contact" onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>{t("contact.name")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("contact.namePlaceholder")} className={inputClass} {...field} />
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
                <FormLabel className={labelClass}>{t("contact.email")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("contact.emailPlaceholder")} className={inputClass} {...field} />
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
                <FormLabel className={labelClass}>{t("contact.company")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("contact.companyPlaceholder")} className={inputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>{t("contact.phoneOptional")}</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" placeholder={t("contact.phonePlaceholder")} className={inputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="goal"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className={labelClass}>{t("contact.goalLabel")}</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className={`flex h-10 w-full rounded-md border px-3 py-2 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isDark
                        ? "bg-slate-950/80 border-slate-700 text-white focus-visible:border-emerald-400 focus-visible:ring-emerald-400/20"
                        : "border-input bg-white text-gray-900"
                    }`}
                  >
                    <option value="" className={isDark ? "bg-slate-900 text-white" : ""}>{t("contact.goalPlaceholder")}</option>
                    {CONTACT_GOALS.map((goal) => (
                      <option key={goal} value={goal} className={isDark ? "bg-slate-900 text-white" : ""}>{t(`contact.goals.${goal}`)}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className={labelClass}>{t("contact.messageOptional")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("contact.messagePlaceholder")}
                    className={`min-h-[100px] sm:min-h-[120px] ${inputClass}`}
                    {...field}
                  />
                </FormControl>
                {form.formState.errors.message?.message === "goalOrMessage" ? (
                  <p className="text-sm font-medium text-destructive">{t("contact.goalOrMessage")}</p>
                ) : (
                  <FormMessage />
                )}
              </FormItem>
            )}
          />

          {showNewsletter && (
          <FormField
              control={form.control}
              name="newsletter"
              render={({ field }) => (
                <FormItem className={`md:col-span-2 flex flex-row items-start gap-3 space-y-0 rounded-md border p-3 sm:p-4 ${isDark ? "bg-slate-950/40 border-slate-700" : "bg-white/60"}`}>
                  <FormControl>
                    <Checkbox className="mt-0.5" checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className={labelClass}>{t("contact.subscribe")}</FormLabel>
                    <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>{t("contact.subscribeDesc")}</p>
                  </div>
                </FormItem>
              )}
            />
          )}

          {!clientReady && <p className={`text-sm md:col-span-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>{t("contact.javascriptRequired")}</p>}
          <Button
            type="submit"
            className={`tap-target w-full md:col-span-2 ${buttonClassName}`}
            disabled={!clientReady || isSubmitting}
          >
            {isSubmitting ? t("contact.sending") : t(submitLabelKey)}
            <Send className="ml-2 h-4 w-4" />
          </Button>
          {showTrustNote && (
            <p className={`text-xs text-center md:col-span-2 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              {t("contact.replyNote")} {t("contact.privacyNote")}
            </p>
          )}
        </form>
      </Form>
    </div>
  );
};

const Contact = () => {
  const { t } = useTranslation();

  return (
    <section id="contact" className="py-16 bg-gray-50 scroll-mt-10">
      <motion.div
        className="container mx-auto px-6"
        variants={staggerContainer}
        initial={false}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="text-center mb-16">
          <motion.h2
            variants={fadeIn}
            custom={0}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            {t("contact.title")}
          </motion.h2>
          <motion.p
            variants={fadeIn}
            custom={0.1}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            {t("contact.subtitle")}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <motion.div variants={fadeIn} custom={0.2} className="space-y-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">{t("contact.infoTitle")}</h3>

            <div className="space-y-6">
              <div className="flex items-start">
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{t("contact.phone")}</h4>
                  <a className="text-gray-600 hover:underline" href={PUBLIC_CONTACT.phoneHref} onClick={() => trackContactClick("phone", "home_contact")}>{PUBLIC_CONTACT.phone}</a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{t("contact.email")}</h4>
                  <a className="text-gray-600 hover:underline" href={`mailto:${PUBLIC_CONTACT.email}`} onClick={() => trackContactClick("email", "home_contact")}>{PUBLIC_CONTACT.email}</a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{t("contact.address")}</h4>
                  {PUBLIC_OFFICES.map((office) => (
                    <p key={office.id} className="text-gray-600 mb-2 last:mb-0">
                      <span className="font-medium text-gray-800">{t(`landing.v2.presence.offices.${office.id}.country`)}</span>
                      <br />
                      {office.street}
                      <br />
                      {office.city}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">{t("contact.hoursTitle")}</h4>
              <p className="text-gray-600">{t("contact.hoursWeek")}</p>
              <p className="text-gray-600">{t("contact.hoursWeekend")}</p>
            </div>
          </motion.div>

          <motion.div
            variants={fadeIn}
            custom={0.3}
          >
            <ContactForm />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Contact;
