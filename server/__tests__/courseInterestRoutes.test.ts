// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
const mail = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: mail.send }) } }));
let app: express.Express;
const interest = { courseId: 'langchain-development', email: 'visitor@example.org', locale: 'es' };
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv('EMAIL_USER', 'sender@example.org'); vi.stubEnv('EMAIL_PASS', 'secret'); vi.stubEnv('EMAIL_TO', 'owner@example.org');
  mail.send.mockResolvedValue({ accepted: ['owner@example.org'] });
  const { default: router } = await import('../courseInterestRoutes.js');
  app = express(); app.use(express.json()); app.use('/api/courses', router);
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it('delivers the selected course request only to the configured owner and sets visitor Reply-To', async () => {
  const res = await request(app).post('/api/courses/interest').send({ ...interest, to: 'attacker@example.org', title: 'Fake title' });
  expect(res.status).toBe(200); expect(res.body.success).toBe(true);
  expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ from: 'sender@example.org', to: 'owner@example.org', replyTo: interest.email, subject: 'Course enrollment notification request — LangChain Development', text: expect.stringContaining('8 h/week, 48 h total') }));
  expect(mail.send.mock.calls[0][0].text).toContain('Notify me when enrollment opens');
  expect(mail.send.mock.calls[0][0].text).not.toContain('Fake title');
  expect(res.body.nextStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
it.each([{ email: 'not-email' }, { email: 'visitor@example.org\r\nBcc: other@example.org' }, { courseId: 'unknown' }, { locale: 'invalid' }])('rejects invalid subscription data before sending mail: %j', async invalid => {
  const res = await request(app).post('/api/courses/interest').send({ ...interest, ...invalid });
  expect(res.status).toBe(400); expect(mail.send).not.toHaveBeenCalled();
});
it('does not report success before SMTP acceptance and avoids concurrent duplicate messages', async () => {
  let resolve!: (value: unknown) => void;
  mail.send.mockReturnValue(new Promise(done => { resolve = done; }));
  let completed = false;
  const first = request(app).post('/api/courses/interest').send(interest).then(res => { completed = true; return res; });
  await vi.waitFor(() => expect(mail.send).toHaveBeenCalledOnce()); expect(completed).toBe(false);
  expect((await request(app).post('/api/courses/interest').send(interest)).status).toBe(429);
  resolve({ accepted: ['owner@example.org'] }); expect((await first).body.success).toBe(true);
  expect((await request(app).post('/api/courses/interest').send(interest)).body.success).toBe(true);
  expect(mail.send).toHaveBeenCalledOnce();
});
it('escapes email content in HTML', async () => {
  await request(app).post('/api/courses/interest').send({ ...interest, email: "o'connor@example.org" });
  expect(mail.send.mock.calls[0][0].html).toContain('o&#39;connor@example.org');
});
it.each([new Error('private SMTP credentials'), { accepted: [] }])('does not acknowledge failed or rejected mail as a saved notification', async failure => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  if (failure instanceof Error) mail.send.mockRejectedValue(failure); else mail.send.mockResolvedValue(failure);
  const res = await request(app).post('/api/courses/interest').send(interest);
  expect(res.status).toBe(500); expect(res.body.success).toBe(false); expect(JSON.stringify(res.body)).not.toContain('private');
  expect(log).toHaveBeenCalledWith('Course notification request could not be sent');
  mail.send.mockResolvedValue({ accepted: ['owner@example.org'] });
  expect((await request(app).post('/api/courses/interest').send(interest)).status).toBe(200);
});
it('ignores the honeypot without relaying spam', async () => {
  expect((await request(app).post('/api/courses/interest').send({ ...interest, website: 'spam' })).body.success).toBe(true);
  expect(mail.send).not.toHaveBeenCalled();
});
it('limits bursts on the public mail endpoint', async () => {
  for (let n = 0; n < 40; n++) expect((await request(app).post('/api/courses/interest').send({ ...interest, email: `visitor${n}@example.org` })).status).toBe(200);
  const res = await request(app).post('/api/courses/interest').send({ ...interest, email: 'last@example.org' });
  expect(res.status).toBe(429); expect(res.headers['retry-after']).toBe('900'); expect(mail.send).toHaveBeenCalledTimes(40);
});
