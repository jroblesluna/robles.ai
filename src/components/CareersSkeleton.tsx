import { useTranslation } from "react-i18next";
import { TextSkeleton } from "@/components/ui/text-skeleton";

const block = "animate-pulse bg-slate-200 motion-reduce:animate-none";

type Job = { id: string; title: string; description: string; location: string };

/** /careers while its chunk loads: same section, header and job cards as Careers. */
export default function CareersSkeleton() {
  const { t } = useTranslation();
  const jobs = (t("careers.jobs", { returnObjects: true }) as Job[]) || [];
  return (
    <section role="status" aria-busy="true" aria-label={t("state.loading")} className="py-20 bg-gray-50">
      <div aria-hidden className="container mx-auto px-6 select-none">
        <div className="text-center mb-16">
          <span className={`inline-block text-xs font-semibold tracking-wide text-transparent rounded-full px-3 py-1 mb-4 ${block}`}>
            {t("careers.eyebrow")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4"><TextSkeleton>{t("careers.title")}</TextSkeleton></h2>
          <p className="text-xl max-w-3xl mx-auto"><TextSkeleton>{t("careers.subtitle")}</TextSkeleton></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <div className={`w-14 h-14 rounded-xl mb-6 ${block}`} />
              <h3 className="text-2xl font-semibold mb-2"><TextSkeleton>{job.title}</TextSkeleton></h3>
              <p className="mb-5"><TextSkeleton>{job.description}</TextSkeleton></p>
              <div className={`inline-flex items-center gap-1.5 text-sm text-transparent border border-transparent rounded-full px-3 py-1 mb-6 ${block}`}>
                <span className="h-3.5 w-3.5" />
                {job.location}
              </div>
              <div>
                <span className="inline-flex items-center gap-1 font-medium">
                  <TextSkeleton>{t("careers.apply")}</TextSkeleton>
                  <span className="h-4 w-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
