import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { cleanLogLine, tailLog } from '../vpsLogs';

describe('vpsLogs', () => {
  it('masks secrets and strips colors', () => {
    const line = cleanLogLine('\u001b[31mfail\u001b[0m sk-abcdefghijklmnopqrstuvwx Bearer abc.def.ghi12 password=hunter2 {"token":"xyz"}');
    expect(line).toBe('fail [redacted] Bearer [redacted] password=[redacted] {"token":"[redacted]"}');
  });

  it('tails, filters and reports a missing file', async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vps-logs-')), 'a.log');
    fs.writeFileSync(file, 'one\n[Carousel] two\n\nthree\n[carousel] four\n');
    expect((await tailLog(file, 2)).lines).toEqual(['three', '[carousel] four']);
    expect((await tailLog(file, 50, 'CAROUSEL')).lines).toEqual(['[Carousel] two', '[carousel] four']);
    expect((await tailLog(`${file}.missing`, 50)).available).toBe(false);
  });
});
