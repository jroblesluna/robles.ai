import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export type RunnerStepStatus = "pending" | "running" | "done" | "error";
export type RunnerMode = "waiting" | "running" | "done" | "error";

/** Full Tailwind class strings, so the JIT compiler can see them. */
export interface RunnerTheme {
  gradient: string;
  surface: string;
  activeTick: string;
}

const ROBLY_POSES: { mode: Exclude<RunnerMode, "error">; src: string }[] = [
  { mode: "waiting", src: "/robly-avatar/robly-standby.svg" },
  { mode: "running", src: "/robly-avatar/robly-running.svg" },
  { mode: "done", src: "/robly-avatar/robly-idle.svg" },
];

/**
 * Progress track shared by the demos with a multi-step process: Robly runs
 * along it to the current step, waits when it needs the visitor, and rests at
 * the finish. All poses stay mounted and cross-fade, so switching pose never
 * flashes an image reload.
 */
export function RunnerTrack({
  mode,
  position,
  steps,
  label,
  elapsed,
  theme,
  className = "",
}: {
  mode: RunnerMode;
  /** 0–1 along the track; ticks sit at equal intervals from 0 to 1. */
  position: number;
  steps: { id: string; name: string; status: RunnerStepStatus }[];
  label: string;
  elapsed?: string;
  theme: RunnerTheme;
  className?: string;
}) {
  const pose = mode === "error" ? "waiting" : mode;
  const spring = { type: "spring" as const, stiffness: 60, damping: 18 };
  return (
    <div className={`rounded-xl border border-gray-100 bg-gradient-to-b ${theme.surface} to-white px-4 pb-3 pt-1 ${className}`}>
      <div className="relative mx-5 h-[76px]">
        {/* Track + fill */}
        <div className="absolute inset-x-0 bottom-3 h-1 rounded-full bg-gray-100" />
        <motion.div
          className={`absolute bottom-3 left-0 h-1 rounded-full bg-gradient-to-r ${theme.gradient}`}
          initial={false}
          animate={{ width: `${position * 100}%` }}
          transition={spring}
        />
        {/* One tick per step */}
        {steps.map((s, i) => (
          <span
            key={s.id}
            title={s.name}
            style={{ left: `${(i / (steps.length - 1)) * 100}%` }}
            className={`absolute bottom-[9px] h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-2 ring-white ${
              s.status === "done"
                ? "bg-emerald-500"
                : s.status === "running"
                  ? `animate-pulse ${theme.activeTick}`
                  : s.status === "error"
                    ? "bg-red-500"
                    : "bg-gray-200"
            }`}
          />
        ))}
        {/* Robly */}
        <motion.div
          aria-hidden
          className="absolute bottom-1 h-[68px] w-[68px] -translate-x-1/2"
          initial={false}
          animate={{ left: `${position * 100}%` }}
          transition={spring}
        >
          {ROBLY_POSES.map(({ mode: m, src }) => (
            <img
              key={m}
              src={src}
              alt=""
              draggable={false}
              className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${pose === m ? "opacity-100" : "opacity-0"} ${
                mode === "error" ? "grayscale" : ""
              }`}
            />
          ))}
        </motion.div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs">
        <p
          key={label}
          aria-live="polite"
          className={`line-clamp-2 animate-in fade-in duration-300 ${mode === "error" ? "text-red-600" : "text-gray-600"}`}
        >
          {label}
        </p>
        {elapsed && <span className="shrink-0 font-mono tabular-nums text-gray-400">{elapsed}</span>}
      </div>
    </div>
  );
}

/** Steps + Robly's place for a linear process: `index` is the running step, or `count` when finished. */
export function linearRunner(ids: string[], index: number, failed = false) {
  const last = ids.length - 1;
  return {
    position: Math.min(index, last) / last,
    statuses: ids.map((_, i): RunnerStepStatus =>
      i < index ? "done" : i === index ? (failed ? "error" : "running") : "pending",
    ),
  };
}

/** Time since `active` turned on, kept on screen after it ends. */
export function useRunnerElapsed(active: boolean) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    setMs(0);
    const id = setInterval(() => setMs(Date.now() - started), 100);
    return () => clearInterval(id);
  }, [active]);
  return ms > 0 ? `${(ms / 1000).toFixed(1)} s` : "";
}
