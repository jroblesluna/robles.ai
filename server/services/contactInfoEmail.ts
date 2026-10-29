import path from "path";
import nodemailer from "nodemailer";
import { getEmailSettings } from "./emailSettings.js";
import { PUBLIC_CONTACT } from "../../shared/publicContent.js";
import enLocale from "../../src/i18n/locales/en/translation.json";
import esLocale from "../../src/i18n/locales/es/translation.json";

/**
 * "Send me the information" email for the /get-started quick form: the AI Assessment packages
 * (read from the same i18n copy as the landing, so prices never drift), the calendar link and
 * WhatsApp. Sent to the visitor's own address, so the only visitor-supplied text is the name.
 */

const LOGO_PATH = path.resolve(process.cwd(), "public/images/logo.png");
const WHATSAPP_NUMBER = "14085900153";

type Locale = "es" | "en";

interface PackageCopy {
  name: string;
  price: string;
  scope: string;
  desc: string;
  bonus: string;
}

const COPY = {
  es: {
    subject: "Tu Diagnóstico IA: paquetes, precios y próximos pasos",
    preheader: "Los 3 paquetes del Diagnóstico IA de 2 semanas y cómo empezar.",
    greeting: (name: string) => `Hola ${name},`,
    intro: "Gracias por tu interés en Robles.AI. Aquí tienes lo que pediste: los paquetes del Diagnóstico IA de 2 semanas, con precio fijo.",
    interest: "Te interesa:",
    next: "¿Siguiente paso? Una llamada de 30 minutos para revisar tu caso, sin compromiso.",
    book: "Agendar una llamada",
    whatsapp: "Escríbenos por WhatsApp",
    whatsappMessage: "Hola, recibí la información del Diagnóstico IA y quiero conversar.",
    reply: "También puedes responder este correo con tus preguntas.",
    footer: "Recibiste este correo porque lo pediste en robles.ai.",
  },
  en: {
    subject: "Your AI Assessment: packages, pricing and next steps",
    preheader: "The 3 packages of the 2-week AI Assessment and how to get started.",
    greeting: (name: string) => `Hi ${name},`,
    intro: "Thanks for your interest in Robles.AI. Here is what you asked for: the 2-week AI Assessment packages, at a fixed price.",
    interest: "You're interested in:",
    next: "Next step? A 30-minute call to go over your case, no commitment.",
    book: "Book a call",
    whatsapp: "Message us on WhatsApp",
    whatsappMessage: "Hi, I got the AI Assessment information and would like to talk.",
    reply: "You can also reply to this email with your questions.",
    footer: "You received this email because you asked for it on robles.ai.",
  },
} as const;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function packages(locale: Locale): { title: string; bonusLabel: string; note: string; items: PackageCopy[] } {
  const p = (locale === "en" ? enLocale : esLocale).landing.v2.packages;
  return { title: p.title, bonusLabel: p.bonusLabel, note: p.note, items: p.items as PackageCopy[] };
}

export function buildContactInfoEmail(params: { locale: Locale; name: string; goal?: string; bookingUrl: string }) {
  const c = COPY[params.locale];
  const pkg = packages(params.locale);
  // The name is the only visitor-supplied text; keep it short so the email can't carry a message.
  const name = escapeHtml(params.name.trim().slice(0, 60));
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(c.whatsappMessage)}`;
  const button = (href: string, label: string, bg: string) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 26px;border-radius:10px;margin:4px;">${escapeHtml(label)}</a>`;

  const rows = pkg.items
    .map(
      (item) => `
            <tr>
              <td style="padding:0 32px 12px 32px;">
                <div style="border:1px solid #E2E8F0;border-radius:12px;padding:16px;">
                  <p style="margin:0;font-size:16px;font-weight:bold;color:#0F172A;">${escapeHtml(item.name)} · <span style="color:#059669;">${escapeHtml(item.price)}</span></p>
                  <p style="margin:4px 0 0 0;font-size:13px;color:#475569;">${escapeHtml(item.scope)} — ${escapeHtml(item.desc)}</p>
                  <p style="margin:8px 0 0 0;font-size:13px;color:#334155;"><strong>${escapeHtml(pkg.bonusLabel)}:</strong> ${escapeHtml(item.bonus)}</p>
                </div>
              </td>
            </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="${params.locale}">
  <head><meta charset="utf-8" /></head>
  <body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Helvetica,Arial,sans-serif;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${c.preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
            <tr><td style="height:4px;background:linear-gradient(90deg,#4F6EF5,#8B5CF6);font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr><td style="padding:32px 32px 8px 32px;"><img src="cid:robleslogo" alt="Robles.AI" width="140" style="display:block;" /></td></tr>
            <tr>
              <td style="padding:16px 32px 8px 32px;">
                <p style="margin:0 0 4px 0;font-size:15px;color:#0F172A;">${c.greeting(name)}</p>
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#334155;">${c.intro}</p>
                ${params.goal ? `<p style="margin:0 0 12px 0;font-size:14px;color:#334155;">${c.interest} <strong>${escapeHtml(params.goal)}</strong></p>` : ""}
                <p style="margin:8px 0 12px 0;font-size:17px;font-weight:bold;color:#0F172A;">${escapeHtml(pkg.title)}</p>
              </td>
            </tr>
            ${rows}
            <tr><td style="padding:0 32px 8px 32px;"><p style="margin:0;font-size:13px;color:#64748B;">${escapeHtml(pkg.note)}</p></td></tr>
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#334155;">${c.next}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 24px 8px 24px;">
                ${button(params.bookingUrl, c.book, "linear-gradient(90deg,#4F6EF5,#8B5CF6)")}
                ${button(whatsappUrl, c.whatsapp, "#25D366")}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0 32px;">
                <p style="margin:0;font-size:13px;color:#64748B;">${c.reply} ${escapeHtml(PUBLIC_CONTACT.email)} · ${escapeHtml(PUBLIC_CONTACT.phone)}</p>
              </td>
            </tr>
            <tr><td style="padding:24px 32px 0 32px;"><hr style="border:none;border-top:1px solid #E2E8F0;margin:0;" /></td></tr>
            <tr><td style="padding:16px 32px 32px 32px;"><p style="margin:0;font-size:12px;color:#94A3B8;">Robles.AI · ${c.footer}</p></td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    c.greeting(params.name.trim().slice(0, 60)),
    "",
    c.intro,
    ...(params.goal ? [`${c.interest} ${params.goal}`] : []),
    "",
    pkg.title,
    ...pkg.items.map((item) => `- ${item.name} (${item.price}): ${item.scope}. ${item.desc} ${pkg.bonusLabel}: ${item.bonus}`),
    pkg.note,
    "",
    c.next,
    `${c.book}: ${params.bookingUrl}`,
    `${c.whatsapp}: ${whatsappUrl}`,
    "",
    c.reply,
  ].join("\n");

  return { subject: c.subject, html, text };
}

// Abuse guard: this email goes to an address typed into a public form. At most one per
// recipient per day and a few per IP per hour (in memory; resets on restart, which is fine).
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const sentTo = new Map<string, number>();
const sentFrom = new Map<string, number[]>();

export function allowContactInfoEmail(to: string, ip: string, now = Date.now()): boolean {
  const key = to.trim().toLowerCase();
  const last = sentTo.get(key);
  if (last && now - last < DAY) return false;
  const recent = (sentFrom.get(ip) ?? []).filter((t) => now - t < HOUR);
  if (recent.length >= 5) return false;
  sentTo.set(key, now);
  sentFrom.set(ip, [...recent, now]);
  if (sentTo.size > 5000) sentTo.forEach((t, k) => now - t >= DAY && sentTo.delete(k));
  return true;
}

export async function sendContactInfoEmail(params: {
  to: string;
  name: string;
  goal?: string;
  locale: Locale;
  bookingUrl?: string;
}): Promise<void> {
  const emailSettings = getEmailSettings();
  if (!emailSettings) throw new Error("Email is not configured");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: emailSettings.user, pass: emailSettings.appPassword },
  });
  const { subject, html, text } = buildContactInfoEmail({
    locale: params.locale,
    name: params.name,
    goal: params.goal,
    bookingUrl: params.bookingUrl ?? PUBLIC_CONTACT.bookingUrl,
  });
  await transporter.sendMail({
    from: `"Robles.AI" <${emailSettings.user}>`,
    to: params.to,
    // Replies reach the team inbox, not the sending account.
    replyTo: emailSettings.recipient,
    subject,
    text,
    html,
    attachments: [{ filename: "logo.png", path: LOGO_PATH, cid: "robleslogo" }],
  });
}
