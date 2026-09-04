import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { drawServiceIconBadge } from "./pdfIcons.js";
import esCopy from "../../src/i18n/locales/es/translation.json";
import enCopy from "../../src/i18n/locales/en/translation.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_PATH = path.resolve(__dirname, "../../public/images/logo.png");

const COPY = { es: esCopy, en: enCopy } as const;

const SERVICE_COLORS: Record<string, string> = {
  diagnosis: "#6366F1",
  audit: "#F59E0B",
  chatbots: "#10B981",
  llm: "#8B5CF6",
  rag: "#2563EB",
  ml: "#EC4899",
};

const PROFILE_COLORS: Record<string, string> = {
  starting: "#F59E0B",
  promising: "#3B82F6",
  ready: "#10B981",
  priority: "#7C3AED",
};

const INK = "#0F172A";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const CARD_BG = "#F8FAFC";

export interface QuizLeadPdfInput {
  name: string;
  company?: string | null;
  score: number;
  profile: "starting" | "promising" | "ready" | "priority";
  recommendedServices: string[];
  resultMessage?: string | null;
  locale: "es" | "en";
  createdAt: string;
}

/** Recommended tags + "diagnosis" as a safe next step, max 3, deduped — mirrors src/lib/quizData.ts. */
function getReportServiceTags(recommendedServices: string[]): string[] {
  return Array.from(new Set([...recommendedServices, "diagnosis"])).slice(0, 3);
}

export async function generateQuizLeadPdf(input: QuizLeadPdfInput): Promise<Buffer> {
  const copy = COPY[input.locale] ?? COPY.es;
  const t = copy.quiz;
  const isEs = input.locale === "es";

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const ready = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width;
  const marginX = 50;
  const contentWidth = pageWidth - marginX * 2;

  // ─── Header ───
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, marginX, 44, { width: 130 });
  }
  doc
    .fontSize(9)
    .fillColor(MUTED)
    .font("Helvetica")
    .text(isEs ? "REPORTE DE DIAGNÓSTICO IA" : "AI DIAGNOSIS REPORT", marginX, 50, {
      width: contentWidth,
      align: "right",
    });
  const generatedDate = new Date(input.createdAt).toLocaleDateString(isEs ? "es-PE" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.fontSize(9).fillColor(MUTED).text(generatedDate, marginX, 64, { width: contentWidth, align: "right" });

  const headerGradient = doc.linearGradient(marginX, 96, marginX + contentWidth, 96);
  headerGradient.stop(0, "#4F6EF5").stop(1, "#8B5CF6");
  doc.rect(marginX, 96, contentWidth, 3).fill(headerGradient);

  // ─── Title ───
  let y = 128;
  doc
    .fontSize(21)
    .fillColor(INK)
    .font("Helvetica-Bold")
    .text(isEs ? "Diagnóstico de Madurez en IA" : "AI Maturity Diagnosis", marginX, y);
  y = doc.y + 4;
  const forWhom = input.company ? `${input.name} · ${input.company}` : input.name;
  doc.fontSize(11).fillColor(MUTED).font("Helvetica").text((isEs ? "Preparado para " : "Prepared for ") + forWhom, marginX, y);
  y = doc.y + 20;

  // ─── Score card ───
  const cardH = 108;
  doc.roundedRect(marginX, y, contentWidth, cardH, 10).fillColor(CARD_BG).fill();
  doc.roundedRect(marginX, y, contentWidth, cardH, 10).strokeColor(BORDER).lineWidth(1).stroke();

  const profileColor = PROFILE_COLORS[input.profile] ?? PROFILE_COLORS.starting;

  doc
    .fontSize(38)
    .fillColor(profileColor)
    .font("Helvetica-Bold")
    .text(`${input.score}`, marginX + 24, y + 20, { continued: true });
  doc.fontSize(18).fillColor(MUTED).font("Helvetica-Bold").text("/100");
  doc.fontSize(10).fillColor(MUTED).font("Helvetica").text(t.results.scoreLabel, marginX + 24, y + 70, { width: 190 });

  // profile pill
  const profileTitle = (t.results.profiles as Record<string, { title: string }>)[input.profile]?.title ?? input.profile;
  doc.font("Helvetica-Bold").fontSize(10);
  const pillPaddingX = 12;
  const pillTextWidth = doc.widthOfString(profileTitle);
  const pillW = Math.min(pillTextWidth + pillPaddingX * 2, 230);
  const pillX = marginX + contentWidth - pillW - 24;
  const pillY = y + 24;
  doc.roundedRect(pillX, pillY, pillW, 24, 12).fill(profileColor);
  doc.fillColor("#ffffff").fontSize(9.5).text(profileTitle, pillX, pillY + 7, { width: pillW, align: "center" });

  // progress bar
  const barX = pillX;
  const barY = pillY + 40;
  const barW = pillW;
  doc.roundedRect(barX, barY, barW, 8, 4).fill(BORDER);
  doc.roundedRect(barX, barY, barW * (input.score / 100), 8, 4).fill(profileColor);

  y = y + cardH + 22;

  // ─── Personalized message ───
  const message =
    input.resultMessage?.trim() ||
    (t.results.profiles as Record<string, { desc: string }>)[input.profile]?.desc ||
    "";
  if (message) {
    const msgBoxTop = y;
    doc.fontSize(10.5).font("Helvetica-Oblique").fillColor(INK);
    const msgHeight = doc.heightOfString(message, { width: contentWidth - 20, lineGap: 2 });
    doc.rect(marginX, msgBoxTop, 3, msgHeight + 16).fill(profileColor);
    doc.fillColor(INK).text(message, marginX + 16, msgBoxTop + 8, { width: contentWidth - 20, lineGap: 2 });
    y = msgBoxTop + msgHeight + 16 + 20;
  }

  // ─── Services ───
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(MUTED)
    .text((t.results.servicesHeading as string).toUpperCase(), marginX, y);
  y += 18;

  const reportTags = getReportServiceTags(input.recommendedServices);
  const services = t.services as Record<string, { title: string; why: string }>;

  for (const tag of reportTags) {
    const service = services[tag];
    if (!service) continue;

    const rowPaddingY = 14;
    const textX = marginX + 66;
    const textWidth = contentWidth - 66 - 16;
    doc.font("Helvetica-Bold").fontSize(11.5);
    const titleHeight = doc.heightOfString(service.title, { width: textWidth });
    doc.font("Helvetica").fontSize(9.5);
    const whyHeight = doc.heightOfString(service.why, { width: textWidth, lineGap: 1 });
    const rowH = Math.max(56, rowPaddingY * 2 + titleHeight + whyHeight + 4);

    doc.roundedRect(marginX, y, contentWidth, rowH, 8).fillColor("#ffffff").fill();
    doc.roundedRect(marginX, y, contentWidth, rowH, 8).strokeColor(BORDER).lineWidth(1).stroke();

    const badgeColor = SERVICE_COLORS[tag] ?? "#6366F1";
    drawServiceIconBadge(doc, tag, marginX + 32, y + rowH / 2, 20, badgeColor);

    doc.fillColor(INK).font("Helvetica-Bold").fontSize(11.5).text(service.title, textX, y + rowPaddingY, { width: textWidth });
    doc.fillColor(MUTED).font("Helvetica").fontSize(9.5).text(service.why, textX, doc.y + 2, { width: textWidth, lineGap: 1 });

    y += rowH + 12;
  }

  // ─── Footer CTA ───
  y += 6;
  doc.moveTo(marginX, y).lineTo(marginX + contentWidth, y).strokeColor(BORDER).lineWidth(1).stroke();
  y += 18;

  doc.fontSize(12).font("Helvetica-Bold").fillColor(INK).text(isEs ? "¿Conversamos?" : "Let's talk", marginX, y);
  y = doc.y + 4;
  doc
    .fontSize(9.5)
    .font("Helvetica")
    .fillColor(MUTED)
    .text(t.results.nextStep, marginX, y, { width: contentWidth });
  y = doc.y + 10;

  doc
    .fontSize(9.5)
    .font("Helvetica-Bold")
    .fillColor("#10B981")
    .text("WhatsApp: +1 408 590 0153", marginX, y, { continued: true })
    .fillColor(MUTED)
    .font("Helvetica")
    .text("   ·   ", { continued: true })
    .fillColor("#2563EB")
    .font("Helvetica-Bold")
    .text("info@robles.ai", { continued: true })
    .fillColor(MUTED)
    .font("Helvetica")
    .text("   ·   ", { continued: true })
    .fillColor(INK)
    .font("Helvetica-Bold")
    .text("robles.ai");

  if (fs.existsSync(LOGO_PATH)) {
    doc.opacity(0.12);
    doc.image(LOGO_PATH, pageWidth - marginX - 90, doc.page.height - 70, { width: 90 });
    doc.opacity(1);
  }

  doc.end();
  return ready;
}
