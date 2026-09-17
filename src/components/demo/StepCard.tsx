import React from "react";
import { motion } from "framer-motion";
import { InfoTip } from "./InfoTip";

/**
 * A numbered pipeline step card, shared across the live-API demo pages.
 *
 * Defined at module scope (NOT inside a page component) so it isn't recreated
 * on every render — otherwise React would remount its children on each
 * keystroke, stealing focus from inputs inside it.
 *
 * `accent` is the Tailwind gradient for the number badge (e.g.
 * "from-cyan-500 to-blue-600"); `iconColor` tints the step icon; `tipHoverColor`
 * is forwarded to the InfoTip so it matches the demo's brand color.
 */
export function StepCard({
  icon: Icon,
  number,
  title,
  tip,
  accent = "from-cyan-500 to-blue-600",
  iconColor = "text-blue-600",
  tipHoverColor,
  children,
}: {
  icon: React.ElementType;
  number: number;
  title: string;
  tip?: string;
  accent?: string;
  iconColor?: string;
  tipHoverColor?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-6 shadow-md"
    >
      <div className="mb-1 flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r ${accent} text-sm font-bold text-white`}
        >
          {number}
        </div>
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {tip && <InfoTip text={tip} hoverColor={tipHoverColor} />}
      </div>
      {children}
    </motion.section>
  );
}

export default StepCard;
