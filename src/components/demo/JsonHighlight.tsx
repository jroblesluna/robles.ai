import React from "react";

/**
 * Lightweight JSON syntax highlighter (VS Code "One Dark"–style palette).
 * Dependency-free: stringifies the value, tokenizes with a regex and colors
 * keys/strings/numbers/booleans/null with Tailwind classes.
 *
 * Shared across the live-API demo pages (TryRAG, TryIdentity, TryLangChain) so
 * the API log panels look identical.
 */
export function JsonHighlight({ data }: { data: unknown }) {
  const json = JSON.stringify(data, null, 2);
  const tokenRegex =
    /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = tokenRegex.exec(json)) !== null) {
    if (match.index > lastIndex) parts.push(json.slice(lastIndex, match.index));
    const token = match[0];
    let cls = "text-cyan-300";
    if (/^"/.test(token)) cls = /:\s*$/.test(token) ? "text-sky-300" : "text-emerald-300";
    else if (/true|false/.test(token)) cls = "text-orange-300";
    else if (/null/.test(token)) cls = "text-rose-300";
    parts.push(
      <span key={key++} className={cls}>
        {token}
      </span>
    );
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < json.length) parts.push(json.slice(lastIndex));
  return (
    <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-slate-700/60 bg-slate-800/90 p-3 font-mono text-xs leading-relaxed text-slate-300 shadow-inner">
      {parts}
    </pre>
  );
}

export default JsonHighlight;
