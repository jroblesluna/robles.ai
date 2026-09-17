import { Info } from "lucide-react";

/**
 * Dependency-free info tooltip (hover + keyboard focus). Shared across the
 * live-API demo pages so contextual explanations look consistent.
 *
 * `hoverColor` lets each demo tint the icon with its own brand accent
 * (Tailwind text-color classes for hover + focus). Defaults to cyan (TryRAG).
 */
export function InfoTip({
  text,
  label,
  hoverColor = "hover:text-cyan-600 focus:text-cyan-600",
}: {
  text: string;
  label?: string;
  hoverColor?: string;
}) {
  return (
    <span className="group/tip relative inline-flex items-center align-middle">
      <button
        type="button"
        aria-label={label || text}
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition-colors focus:outline-none ${hoverColor}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-left text-xs font-normal leading-relaxed text-gray-100 opacity-0 shadow-xl transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

export default InfoTip;
