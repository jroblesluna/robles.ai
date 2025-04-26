import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, fadeIn } from "@/utils/animations";
import { useTranslation } from "react-i18next";
import { AnimatePresence } from "framer-motion";

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  message: "",
  resume: null as File | null,
};

const Apply = () => {
  console.log("Sending application...");
  const { t } = useTranslation();
  const [jobId, setJobId] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobParam = params.get("job");
    setJobId(jobParam);
    if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const jobs = t("careers.jobs", { returnObjects: true }) as Array<{
    id: string;
    title: string;
    description: string;
    fullDescription?: {
      overview: string;
      responsibilities: string[];
      requirements: string[];
    };
  }>;

  const job = jobs.find((j) => j.id === jobId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as HTMLInputElement;
    if (files && files.length > 0) {
      setFormData((prev) => ({ ...prev, resume: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.resume) return;

    setSubmitting(true);
    setSuccess(false);
    setError(false);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("email", formData.email);
    data.append("phone", formData.phone);
    data.append("message", formData.message);
    data.append("jobTitle", job?.title || "");
    data.append("resume", formData.resume);

    try {
      const response = await fetch("https://apis.robles.ai/api/send-application", {
        method: "POST",
        body: data,
      });

      const result = await response.json();

      if (response.ok && result.message === 'Application sent successfully') {
        console.log("✅ SENT!");
        setSuccess(true);
        setFormData({ name: "", email: "", phone: "", message: "", resume: null });
        // 🔥 Limpia el input file manualmente
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        console.error("❌ Unexpected server response:", result);
        setError(true);
      }
    } catch (err) {
      console.error("❌ Network error:", err);
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="apply" className="py-16 bg-gray-50 min-h-[80vh]">
      <motion.div
        className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {job ? (
          <>
            <motion.h2
              variants={fadeIn}
              custom={0}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center"
            >
              {t("careers.apply")} — {job.title}
            </motion.h2>

            {job.fullDescription?.overview && (
              <motion.p
                variants={fadeIn}
                custom={0.1}
                className="text-gray-600 mb-8 text-center max-w-3xl mx-auto"
              >
                {job.fullDescription.overview}
              </motion.p>
            )}

            {job.fullDescription?.responsibilities && (
              <motion.div variants={fadeIn} custom={0.2} className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">{t("careers.responsibilities")}</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  {job.fullDescription.responsibilities.map((resp, index) => (
                    <li key={index}>{resp}</li>
                  ))}
                </ul>
              </motion.div>
            )}

            {job.fullDescription?.requirements && (
              <motion.div variants={fadeIn} custom={0.3} className="mb-12">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">{t("careers.requirements")}</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  {job.fullDescription.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </motion.div>
            )}


            <AnimatePresence mode="wait">
              {!success && (
                <motion.div
                  key="form"
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="bg-white p-8 rounded-xl shadow-md w-full"
                >
                  <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
                    <input type="hidden" name="jobTitle" value={job?.title || ""} />
                    <div>
                      <label className="block mb-2 text-gray-700 font-medium">{t("careers.name")}</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md p-3"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-gray-700 font-medium">{t("careers.email")}</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md p-3"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-gray-700 font-medium">{t("careers.phone")}</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md p-3"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-gray-700 font-medium">{t("careers.uploadResume")}</label>
                      <input
                        type="file"
                        name="resume"
                        accept=".pdf,.doc,.docx"
                        onChange={handleChange}
                        ref={fileInputRef}
                        className="w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-gray-700 font-medium">{t("careers.message")}</label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md p-3"
                        rows={4}
                        placeholder={t("careers.messagePlaceholder")}
                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-300 ${submitting ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                    >
                      {submitting ? t("contact.sending") : t("careers.submit")}
                    </button>
                    {error && (
                      <p className="text-red-600 text-sm mt-4 text-center">{t("contact.errorMessage")}</p>
                    )}
                  </form>
                </motion.div>
              )}

              {success && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white p-8 rounded-xl shadow-md w-full text-center"
                >
                  <p className="text-green-600 text-lg">{t("contact.successMessage")}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.div
            variants={fadeIn}
            custom={0.1}
            className="text-center text-gray-500 text-xl"
          >
            {t("careers.jobNotFound")}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
};

export default Apply;