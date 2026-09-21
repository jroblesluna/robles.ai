import { useTranslation } from "react-i18next";
import { Briefcase, Target, Users, TrendingUp, ArrowRight } from "lucide-react";
import { useGoToHomeSection, type DemoBusinessId } from "./business";

/**
 * "Business case" card shown under a demo's header: the problem it solves, who
 * it is for and which metric it moves — so visitors read the demo as savings,
 * not as a model. Copy: `demoBusiness.<id>.{headline,problem,audience,metric,proof?}`.
 */
export function BusinessCase({ demoId }: { demoId: DemoBusinessId }) {
  const { t, i18n } = useTranslation();
  const goToSection = useGoToHomeSection();
  const k = `demoBusiness.${demoId}`;
  const proofKey = `${k}.proof`;
  const hasProof = i18n.exists(proofKey);

  const rows = [
    { icon: Target, label: t("demoBusiness.labels.problem"), text: t(`${k}.problem`) },
    { icon: Users, label: t("demoBusiness.labels.audience"), text: t(`${k}.audience`) },
    { icon: TrendingUp, label: t("demoBusiness.labels.metric"), text: t(`${k}.metric`) },
  ];

  return (
    <div className="mb-8 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        <Briefcase className="h-4 w-4" />
        {t("demoBusiness.labels.eyebrow")}
      </div>
      <p className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">{t(`${k}.headline`)}</p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {rows.map(({ icon: Icon, label, text }) => (
          <div key={label} className="rounded-xl bg-white/80 p-3 ring-1 ring-gray-100">
            <dt className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <Icon className="h-3.5 w-3.5 text-emerald-600" />
              {label}
            </dt>
            <dd className="text-sm leading-snug text-gray-700">{text}</dd>
          </div>
        ))}
      </dl>
      {hasProof && (
        <p className="mt-3 text-xs text-gray-500">
          {t(proofKey)}{" "}
          <button
            type="button"
            onClick={() => goToSection("case-studies")}
            className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 hover:underline"
          >
            {t("demoBusiness.labels.proof_link")}
            <ArrowRight className="h-3 w-3" />
          </button>
        </p>
      )}
    </div>
  );
}
