export interface TranscriptTurn {
  key: string;
  speaker: number;
  text: string;
  ts: number;
  isFinal: boolean;
  /** Text as heard, when a later pass corrected it with the conversation's context. */
  original?: string;
}

type Incoming = { speaker: number; text: string; ts?: number };

const joinText = (before: string, after: string) => (/^[.,;:!?…]/.test(after) ? before + after : `${before} ${after}`);

/** The provisional line is always one, at the end: the next final replaces it. */
export function applyPartial(turns: TranscriptTurn[], incoming: Incoming, newKey: () => string): TranscriptTurn[] {
  const existing = turns.find((turn) => !turn.isFinal);
  return [
    ...turns.filter((turn) => turn.isFinal),
    { key: existing?.key ?? newKey(), speaker: incoming.speaker, text: incoming.text, ts: incoming.ts ?? 0, isFinal: false },
  ];
}

/** Consecutive finals from one speaker read as one turn instead of many fragments. */
export function applyFinal(turns: TranscriptTurn[], incoming: Incoming, newKey: () => string): TranscriptTurn[] {
  const finals = turns.filter((turn) => turn.isFinal);
  const last = finals[finals.length - 1];
  if (last?.speaker === incoming.speaker) {
    return [...finals.slice(0, -1), { ...last, text: joinText(last.text, incoming.text) }];
  }
  return [...finals, { key: newKey(), speaker: incoming.speaker, text: incoming.text, ts: incoming.ts ?? 0, isFinal: true }];
}

/** Ends a session: words still provisional stay in the transcript as said. */
export function promoteProvisional(turns: TranscriptTurn[], newKey: () => string): TranscriptTurn[] {
  const provisional = turns.find((turn) => !turn.isFinal);
  const finals = turns.filter((turn) => turn.isFinal);
  return provisional ? applyFinal(finals, provisional, newKey) : turns;
}

/** Corrections apply by key: a turn cleared in the meantime is simply skipped. */
export function applyCorrections(turns: TranscriptTurn[], corrections: Map<string, string>): TranscriptTurn[] {
  return turns.map((turn) => {
    const text = corrections.get(turn.key);
    return text ? { ...turn, text, original: turn.original ?? turn.text } : turn;
  });
}

/** Finished turns not yet sent for correction; the last one may still grow while live. */
export function turnsToRefine(turns: TranscriptTurn[], seen: Set<string>, sessionOpen: boolean): string[] {
  const finals = turns.filter((turn) => turn.isFinal);
  const finished = sessionOpen ? finals.slice(0, -1) : finals;
  return finished.filter((turn) => !seen.has(turn.key)).map((turn) => turn.key);
}
