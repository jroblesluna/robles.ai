/**
 * Microsoft Clarity (session recordings + heatmaps). The project ID is set in
 * Admin → Settings → Analytics & Tracking (`clarity_project_id`).
 */

const PROJECT_ID = /^[a-z0-9]{6,20}$/i;
const CLARITY_ID = /^[a-z0-9]{4,40}$/i;

export function validClarityProjectId(value: unknown): string | null {
  return typeof value === "string" && PROJECT_ID.test(value.trim()) ? value.trim() : null;
}

/** Clarity user + session IDs (from its `_clck` / `_clsk` cookies) at the moment a lead was sent. */
export interface ClaritySession {
  userId: string;
  sessionId: string;
}

export function normalizeClaritySession(value: unknown): ClaritySession | null {
  if (!value || typeof value !== "object") return null;
  const { userId, sessionId } = value as Record<string, unknown>;
  return typeof userId === "string" && typeof sessionId === "string" && CLARITY_ID.test(userId) && CLARITY_ID.test(sessionId)
    ? { userId, sessionId }
    : null;
}

/** Playback page of one recorded session in the Clarity dashboard. */
export function clarityRecordingUrl(projectId: string | null, session: ClaritySession | null): string | null {
  if (!projectId || !session) return null;
  return `https://clarity.microsoft.com/player/${projectId}/${session.userId}/${session.sessionId}`;
}
