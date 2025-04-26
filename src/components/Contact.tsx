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
import { useTranslation } from "react-i18next";

const contactFormSchema = insertContactSchema.extend({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters."
  }),
  email: z.string().email({
    message: "Please enter a valid email address."
  }),
  company: z.string().optional(),
  subject: z.string().default("Website Inquiry"),
  message: z.string().min(10, {
    message: "Message must be at least 10 characters."
  }),
  newsletter: z.boolean().default(false)
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const Contact = () => {
  const { t } = useTranslation();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      subject: "Website Inquiry",
      message: "",
      newsletter: false
    }
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: ContactFormValues) => {
    try {
      await apiRequest("POST", "/api/contact", data);
      toast({
        title: t("contact.successTitle"),
        description: t("contact.successMessage")
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
    <section id="contact" className="py-16 bg-gray-50 scroll-mt-10">
      <motion.div
        className="container mx-auto px-6"
        variants={staggerContainer}
        initial="hidden"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div variants={fadeIn} custom={0.2} className="space-y-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">{t("contact.infoTitle")}</h3>

            <div className="space-y-6">
              <div className="flex items-start">
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{t("contact.phone")}</h4>
                  <p className="text-gray-600">+1 (408) 590-0153</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{t("contact.email")}</h4>
                  <p className="text-gray-600">info@robles.ai</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{t("contact.address")}</h4>
                  <p className="text-gray-600">20380 Stevens Creek Blvd, Suite 205<br />Cupertino, CA 95014</p>
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
            className="bg-blue-100 p-8 rounded-xl shadow-sm"
          >
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">{t("contact.formTitle")}</h3>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contact.name")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("contact.namePlaceholder")} {...field} />
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
                      <FormLabel>{t("contact.email")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("contact.emailPlaceholder")} {...field} />
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
                      <FormLabel>{t("contact.company")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("contact.companyPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contact.message")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("contact.messagePlaceholder")}
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newsletter"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t("contact.subscribe")}</FormLabel>
                        <p className="text-sm text-gray-500">{t("contact.subscribeDesc")}</p>
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t("contact.sending") : t("contact.send")}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Form>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Contact;