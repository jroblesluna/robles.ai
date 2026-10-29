import type { ReactNode } from "react";

/**
 * Inline skeleton bar per wrapped line: the real copy rendered transparent,
 * so the placeholder wraps exactly like the final text in every language and width.
 */
export function TextSkeleton({ children }: { children: ReactNode }) {
  return (
    <span className="animate-pulse rounded-md bg-slate-200 text-transparent [box-decoration-break:clone] motion-reduce:animate-none">
      {children}
    </span>
  );
}
