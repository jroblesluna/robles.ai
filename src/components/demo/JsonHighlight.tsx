import React, { useState } from "react";
import { ChevronRight } from "lucide-react";

/**
 * Collapsible JSON tree viewer with One-Dark–style syntax colors.
 * Dependency-free. Shared across the live-API demo pages (TryRAG, TryIdentity,
 * TryLangChain) so the API log panels look identical.
 *
 * Behaviour:
 * - Objects/arrays render as collapsible nodes with a chevron.
 * - Only the top level is expanded by default; nested objects/arrays start
 *   COLLAPSED so the initial view shows just the first-level keys (e.g. the
 *   `data` object is collapsed until clicked).
 * - Primitives (string/number/boolean/null) are colored inline.
 */

const KEY_CLS = "text-sky-300";
const STRING_CLS = "text-emerald-300";
const NUMBER_CLS = "text-cyan-300";
const BOOL_CLS = "text-orange-300";
const NULL_CLS = "text-rose-300";
const PUNCT_CLS = "text-slate-500";

function Primitive({ value }: { value: string | number | boolean | null }) {
  if (value === null) return <span className={NULL_CLS}>null</span>;
  switch (typeof value) {
    case "string":
      return <span className={STRING_CLS}>"{value}"</span>;
    case "number":
      return <span className={NUMBER_CLS}>{String(value)}</span>;
    case "boolean":
      return <span className={BOOL_CLS}>{String(value)}</span>;
    default:
      return <span>{String(value)}</span>;
  }
}

function isContainer(v: unknown): v is object {
  return v !== null && typeof v === "object";
}

/** A single JSON node. `k` is the object key or array index label (optional). */
function Node({
  k,
  value,
  depth,
  defaultOpen,
  isLast,
}: {
  k?: string;
  value: unknown;
  depth: number;
  defaultOpen: boolean;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const indent = { paddingLeft: `${depth * 1.1}rem` };
  const comma = isLast ? "" : ",";
  const keyLabel = k !== undefined ? <span className={KEY_CLS}>"{k}"</span> : null;

  // Primitive leaf.
  if (!isContainer(value)) {
    return (
      <div style={indent} className="whitespace-pre-wrap break-words">
        {keyLabel}
        {keyLabel && <span className={PUNCT_CLS}>: </span>}
        <Primitive value={value as string | number | boolean | null} />
        <span className={PUNCT_CLS}>{comma}</span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);
  const openBrace = isArray ? "[" : "{";
  const closeBrace = isArray ? "]" : "}";
  const count = entries.length;

  return (
    <div className="break-words">
      {/* Header row: chevron + key + opening brace (or collapsed summary) */}
      <div
        style={indent}
        className="flex cursor-pointer items-start gap-1 rounded hover:bg-slate-700/40"
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronRight
          className={`mt-[3px] h-3 w-3 shrink-0 text-slate-500 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="min-w-0">
          {keyLabel}
          {keyLabel && <span className={PUNCT_CLS}>: </span>}
          <span className={PUNCT_CLS}>{openBrace}</span>
          {!open && (
            <>
              <span className="text-slate-600">
                {isArray ? ` ${count} ` : ` … `}
              </span>
              <span className={PUNCT_CLS}>{closeBrace}{comma}</span>
            </>
          )}
        </span>
      </div>

      {open && (
        <>
          {entries.map(([childKey, childVal], i) => (
            <Node
              key={childKey}
              k={isArray ? undefined : childKey}
              value={childVal}
              depth={depth + 1}
              defaultOpen={false}
              isLast={i === entries.length - 1}
            />
          ))}
          <div style={indent} className={PUNCT_CLS}>
            {closeBrace}
            {comma}
          </div>
        </>
      )}
    </div>
  );
}

export function JsonHighlight({ data }: { data: unknown }) {
  return (
    <div className="max-h-80 max-w-full overflow-auto rounded-lg border border-slate-700/60 bg-slate-800/90 p-3 font-mono text-xs leading-relaxed text-slate-300 shadow-inner">
      {/* Root is expanded so first-level keys are visible; children start collapsed. */}
      <Node value={data} depth={0} defaultOpen={true} isLast={true} />
    </div>
  );
}

export default JsonHighlight;
