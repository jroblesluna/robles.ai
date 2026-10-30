import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Read-only tail of the PM2 log files for /admin/monitoring.
 * The files come only from PM2's own env or its default location, never from the request.
 */
export type LogStream = 'error' | 'out';

const MAX_READ_BYTES = 2 * 1024 * 1024;

const ANSI = /\u001b\[[0-9;]*m/g;
const SECRETS: [RegExp, string][] = [
  [/\bsk-[A-Za-z0-9_-]{16,}/g, '[redacted]'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, '[redacted]'],
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 [redacted]'],
  [/\b(password|passwd|pass|secret|token|api[_-]?key|authorization)(["']?\s*[:=]\s*["']?)[^\s"',&]+/gi, '$1$2[redacted]'],
];

export function cleanLogLine(line: string): string {
  return SECRETS.reduce((text, [pattern, mask]) => text.replace(pattern, mask), line.replace(ANSI, ''));
}

export function logFilePath(stream: LogStream): string {
  const fromPm2 = stream === 'error' ? process.env.pm_err_log_path : process.env.pm_out_log_path;
  return fromPm2 || path.join(process.env.PM2_HOME || path.join(os.homedir(), '.pm2'), 'logs', `robles-ai-${stream}.log`);
}

export interface LogTail { available: boolean; lines: string[]; sizeBytes: number; updatedAt: string | null }

/** Last `limit` lines of the file, optionally only those containing `query` (case-insensitive). */
export async function tailLog(file: string, limit: number, query = ''): Promise<LogTail> {
  let handle: fs.promises.FileHandle;
  try {
    handle = await fs.promises.open(file, 'r');
  } catch {
    return { available: false, lines: [], sizeBytes: 0, updatedAt: null };
  }
  try {
    const { size, mtime } = await handle.stat();
    const length = Math.min(size, MAX_READ_BYTES);
    const { buffer } = await handle.read(Buffer.alloc(length), 0, length, size - length);
    const rows = buffer.toString('utf8').split('\n');
    if (length < size) rows.shift(); // the read started mid-line
    const needle = query.toLowerCase();
    const lines = rows
      .filter(row => row.trim())
      .map(cleanLogLine)
      .filter(row => !needle || row.toLowerCase().includes(needle));
    return { available: true, lines: lines.slice(-limit), sizeBytes: size, updatedAt: mtime.toISOString() };
  } finally {
    await handle.close();
  }
}
