import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, fadeIn } from "@/utils/animations";
import { useTranslation } from "react-i18next";

const Apply = () => {
  const { t } = useTranslation();
  const [jobId, setJobId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    resume: null as File | null,
  });

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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData(prev => ({ ...prev, resume: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.resume) {
      alert("Please upload your resume!");
      return;
    }

    const submission = new FormData();
    submission.append("name", formData.name);
    submission.append("email", formData.email);
    submission.append("phone", formData.phone);
    submission.append("message", formData.message);
    submission.append("jobTitle", job?.title || "Unknown Job");
    submission.append("resume", formData.resume);

    try {
      setSending(true);
      const response = await fetch("/api/send-application", {
        method: "POST",
        body: submission,
      });

      if (response.ok) {
        alert("Application sent successfully!");
        setFormData({ name: "", email: "", phone: "", message: "", resume: null });
      } else {
        alert("Failed to send application.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while sending application.");
    } finally {
      setSending(false);
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

            {/* Application Form */}
            <motion.div
              variants={fadeIn}
              custom={0.4}
              className="bg-white p-8 rounded-xl shadow-md w-full"
            >
              <form className="space-y-6" onSubmit={handleSubmit}>
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
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
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
                  className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-300"
                  disabled={sending}
                >
                  {sending ? t("contact.sending") : t("careers.submit")}
                </button>
              </form>
            </motion.div>
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