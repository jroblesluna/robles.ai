import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.resolve(__dirname, "../../public/images/logo.png");

const COPY = {
  es: {
    subject: "Confirma tu correo para ver tu diagnóstico de IA",
    preheader: "Tu reporte personalizado está listo — confírmalo en menos de un minuto.",
    greeting: (name: string) => `Hola ${name},`,
    body: "Completaste el Test de Diagnóstico IA de Robles.AI y tu reporte personalizado ya está listo. Solo necesitamos confirmar que este es tu correo para desbloquearlo.",
    cta: "Ver mi diagnóstico completo",
    expiry: "Este enlace es válido por 30 minutos. Si expira, puedes pedir uno nuevo desde la misma página donde dejaste tus datos.",
    ignore: "Si no completaste este test, puedes ignorar este correo.",
    footerTagline: "Diagnóstico, priorización e implementación de IA para tu negocio.",
  },
  en: {
    subject: "Confirm your email to view your AI diagnosis",
    preheader: "Your personalized report is ready — confirm it in under a minute.",
    greeting: (name: string) => `Hi ${name},`,
    body: "You completed the Robles.AI AI Diagnosis Quiz and your personalized report is ready. We just need to confirm this is your email to unlock it.",
    cta: "View my full diagnosis",
    expiry: "This link is valid for 30 minutes. If it expires, you can request a new one from the same page where you left your details.",
    ignore: "If you didn't take this quiz, you can safely ignore this email.",
    footerTagline: "AI diagnosis, prioritization, and implementation for your business.",
  },
} as const;

function buildHtml(locale: "es" | "en", name: string, verifyUrl: string): string {
  const c = COPY[locale] ?? COPY.es;
  return `<!DOCTYPE html>
<html lang="${locale}">
  <head><meta charset="utf-8" /></head>
  <body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Helvetica,Arial,sans-serif;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${c.preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
            <tr>
              <td style="height:4px;background:linear-gradient(90deg,#4F6EF5,#8B5CF6);font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <img src="cid:robleslogo" alt="Robles.AI" width="140" style="display:block;" />
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <p style="margin:0 0 4px 0;font-size:15px;color:#0F172A;">${c.greeting(name)}</p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#334155;">${c.body}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px 8px 32px;">
                <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(90deg,#4F6EF5,#8B5CF6);color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:10px;">${c.cta}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <p style="margin:0;font-size:12.5px;line-height:1.6;color:#64748B;">⏱ ${c.expiry}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <hr style="border:none;border-top:1px solid #E2E8F0;margin:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px 32px;">
                <p style="margin:0 0 4px 0;font-size:12px;color:#94A3B8;">${c.ignore}</p>
                <p style="margin:12px 0 0 0;font-size:12px;color:#94A3B8;">Robles.AI · ${c.footerTagline}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendQuizVerificationEmail(params: {
  to: string;
  name: string;
  verifyUrl: string;
  locale: "es" | "en";
}): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const c = COPY[params.locale] ?? COPY.es;

  await transporter.sendMail({
    from: `"Robles.AI" <${process.env.EMAIL_USER}>`,
    to: params.to,
    subject: c.subject,
    html: buildHtml(params.locale, params.name, params.verifyUrl),
    attachments: [
      {
        filename: "robles-logo.png",
        path: LOGO_PATH,
        cid: "robleslogo",
      },
    ],
  });
}
