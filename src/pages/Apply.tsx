import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, fadeIn } from "@/utils/animations";
import { useTranslation } from "react-i18next";

const Apply = () => {
    const { t } = useTranslation();
    const [jobId, setJobId] = useState<string | null>(null);

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

                        {/* Overview */}
                        {job.fullDescription?.overview && (
                            <motion.p
                                variants={fadeIn}
                                custom={0.1}
                                className="text-gray-600 mb-8 text-center max-w-3xl mx-auto"
                            >
                                {job.fullDescription.overview}
                            </motion.p>
                        )}

                        {/* Responsibilities */}
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

                        {/* Requirements */}
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
                            custom={0.2}
                            className="bg-white p-8 rounded-xl shadow-md w-full"
                        >
                            <form className="space-y-6">
                                <div>
                                    <label className="block mb-2 text-gray-700 font-medium">{t("careers.name")}</label>
                                    <input type="text" className="w-full border border-gray-300 rounded-md p-3" required />
                                </div>
                                <div>
                                    <label className="block mb-2 text-gray-700 font-medium">{t("careers.email")}</label>
                                    <input type="email" className="w-full border border-gray-300 rounded-md p-3" required />
                                </div>
                                <div>
                                    <label className="block mb-2 text-gray-700 font-medium">{t("careers.phone")}</label>
                                    <input type="tel" className="w-full border border-gray-300 rounded-md p-3" />
                                </div>
                                <div>
                                    <label className="block mb-2 text-gray-700 font-medium">{t("careers.uploadResume")}</label>
                                    <input type="file" className="w-full" required />
                                </div>
                                <div>
                                    <label className="block mb-2 text-gray-700 font-medium">{t("careers.message")}</label>
                                    <textarea
                                        className="w-full border border-gray-300 rounded-md p-3"
                                        rows={4}
                                        placeholder={t("careers.messagePlaceholder")}
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-300"
                                >
                                    {t("careers.submit")}
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