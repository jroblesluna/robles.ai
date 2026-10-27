// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
const mail = vi.hoisted(() => ({ send: vi.fn(), settings: vi.fn() }));
const dbMock = vi.hoisted(() => {
  const run = vi.fn().mockReturnValue({ lastInsertRowid: 1 });
  const prepare = vi.fn().mockReturnValue({ run });
  return { run, prepare };
});
vi.mock('../db.js', () => ({
  default: {
    prepare: (...args: any[]) => dbMock.prepare(...args),
  },
}));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: mail.send }) } }));
vi.mock('../services/emailSettings.js', () => ({ getEmailSettings: mail.settings }));
import contactRouter from '../contactRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/contact', contactRouter);
const inquiry = {
  name: 'QA visitor', email: 'visitor@example.org', company: 'Example',
  subject: 'Website Inquiry', message: 'Please discuss an AI project.', newsletter: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  dbMock.run.mockReturnValue({ lastInsertRowid: 1 });
  dbMock.prepare.mockReturnValue({ run: dbMock.run });
  mail.settings.mockReturnValue({ user: 'sender@example.org', appPassword: 'test-app-password', recipient: 'team@example.org' });
  mail.send.mockResolvedValue({ accepted: ['team@example.org'] });
});
afterEach(() => vi.unstubAllEnvs());

describe('contact delivery', () => {
  it('persists submission to database with pending status before attempting email delivery', async () => {
    const result = await request(app).post('/api/contact').send(inquiry);
    expect(result.status).toBe(200);
    expect(dbMock.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO contact_submissions'));
    expect(dbMock.run).toHaveBeenCalledWith(
      inquiry.name,
      inquiry.email,
      null,
      inquiry.company,
      inquiry.subject,
      inquiry.message,
      0,
      expect.any(String)
    );
  });
  it('updates database record status to sent upon successful delivery', async () => {
    await request(app).post('/api/contact').send(inquiry);
    expect(dbMock.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE contact_submissions SET email_status = 'sent'"));
  });
  it('updates database record status to failed and records error code when mail delivery fails', async () => {
    const error = new Error('SMTP failure');
    (error as any).code = 'EAUTH';
    mail.send.mockRejectedValue(error);
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    await request(app).post('/api/contact').send(inquiry);
    expect(dbMock.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE contact_submissions SET email_status = 'failed'"));
    expect(dbMock.run).toHaveBeenCalledWith('EAUTH', expect.any(String), 1);
    logger.mockRestore();
  });
  it('updates database record status to not_configured when email settings are missing', async () => {
    mail.settings.mockReturnValue(null);
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    await request(app).post('/api/contact').send(inquiry);
    expect(dbMock.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE contact_submissions SET email_status = 'not_configured'"));
    logger.mockRestore();
  });
  it('keeps authenticated From and routes replies to the validated visitor', async () => {
    const result = await request(app).post('/api/contact').send(inquiry);
    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(mail.send).toHaveBeenCalledOnce();
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({
      from: 'sender@example.org', to: 'team@example.org', replyTo: 'visitor@example.org',
      text: expect.stringContaining(inquiry.message),
    }));
  });
  it('includes an optional visitor phone number in the contact email', async () => {
    const phone = '+1 408 555 0199';
    const result = await request(app).post('/api/contact').send({ ...inquiry, phone });
    expect(result.status).toBe(200);
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining(`Phone: ${phone}`),
      html: expect.stringContaining(`<strong>Phone:</strong> ${phone}`),
    }));
  });
  it('does not acknowledge success until mail delivery resolves', async () => {
    let complete!: (value: unknown) => void;
    mail.send.mockReturnValue(new Promise(resolve => { complete = resolve; }));
    let settled = false;
    const response = request(app).post('/api/contact').send(inquiry).then(result => { settled = true; return result; });
    await vi.waitFor(() => expect(mail.send).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    complete({ accepted: ['team@example.org'] });
    expect((await response).status).toBe(200);
  });
  it('rejects invalid and header-injection email addresses without sending mail', async () => {
    for (const email of ['not-an-email', 'visitor@example.org\r\nBcc: other@example.org']) {
      expect((await request(app).post('/api/contact').send({ ...inquiry, email })).status).toBe(400);
    }
    expect(mail.send).not.toHaveBeenCalled();
  });
  it('escapes visitor input in HTML while keeping plain text readable', async () => {
    await request(app).post('/api/contact').send({ ...inquiry, name: '<b>QA & Co</b>', message: '<img src=x onerror=alert(1)>\nLine two' });
    const message = mail.send.mock.calls[0][0];
    expect(message.html).toContain('&lt;b&gt;QA &amp; Co&lt;/b&gt;');
    expect(message.html).not.toContain('<img');
    expect(message.text).toContain('Line two');
  });
  it.each([new Error('private SMTP detail'), 'unknown failure'])('returns a safe failure on mail rejection', async failure => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    mail.send.mockRejectedValue(failure);
    const result = await request(app).post('/api/contact').send(inquiry);
    expect(result.status).toBe(500);
    expect(result.body).toEqual({ success: false, error: 'An unexpected error occurred' });
    expect(logger).toHaveBeenCalledWith('Contact email could not be sent', expect.any(Object));
    logger.mockRestore();
  });
  it('does not attempt delivery when email settings are missing', async () => {
    mail.settings.mockReturnValue(null);
    const result = await request(app).post('/api/contact').send(inquiry);
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ success: false, error: 'Contact email is not configured' });
    expect(mail.send).not.toHaveBeenCalled();
  });
  it('does not expose submissions through GET', async () => {
    expect((await request(app).get('/api/contact')).status).toBe(404);
  });
});
