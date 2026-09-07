// Minimalist line-icon set drawn with pdfkit vector primitives — one per quiz service tag.
// Keeps the PDF report self-contained (no icon font/image assets to ship).

type IconFn = (doc: PDFKit.PDFDocument, x: number, y: number, size: number, color: string) => void;

const drawMagnifier: IconFn = (doc, x, y, size, color) => {
  const r = size * 0.28;
  const cx = x + size * 0.38;
  const cy = y + size * 0.38;
  doc.lineWidth(size * 0.09).strokeColor(color);
  doc.circle(cx, cy, r).stroke();
  doc
    .moveTo(cx + r * 0.72, cy + r * 0.72)
    .lineTo(x + size * 0.82, y + size * 0.82)
    .stroke();
};

const drawClipboardCheck: IconFn = (doc, x, y, size, color) => {
  doc.strokeColor(color).fillColor(color).lineWidth(size * 0.08);
  const bx = x + size * 0.2;
  const by = y + size * 0.12;
  const bw = size * 0.6;
  const bh = size * 0.76;
  doc.roundedRect(bx, by, bw, bh, size * 0.06).stroke();
  const tabW = size * 0.24;
  doc.roundedRect(x + size / 2 - tabW / 2, by - size * 0.05, tabW, size * 0.1, size * 0.02).fill();
  doc.lineWidth(size * 0.09);
  doc
    .moveTo(bx + bw * 0.22, by + bh * 0.52)
    .lineTo(bx + bw * 0.42, by + bh * 0.7)
    .lineTo(bx + bw * 0.8, by + bh * 0.3)
    .stroke();
};

const drawChatBubble: IconFn = (doc, x, y, size, color) => {
  doc.strokeColor(color).fillColor(color).lineWidth(size * 0.08);
  const bx = x + size * 0.1;
  const by = y + size * 0.14;
  const bw = size * 0.8;
  const bh = size * 0.54;
  doc.roundedRect(bx, by, bw, bh, size * 0.12).stroke();
  doc
    .polygon([x + size * 0.26, by + bh], [x + size * 0.4, by + bh], [x + size * 0.2, by + bh + size * 0.16])
    .fill();
  const dotY = by + bh / 2;
  const r = size * 0.045;
  [0.32, 0.5, 0.68].forEach((f) => {
    doc.circle(x + size * f, dotY, r).fill();
  });
};

const drawLink: IconFn = (doc, x, y, size, color) => {
  doc.strokeColor(color).lineWidth(size * 0.1);
  const r = size * 0.22;
  doc.circle(x + size * 0.36, y + size * 0.4, r).stroke();
  doc.circle(x + size * 0.64, y + size * 0.6, r).stroke();
};

const drawOpenBook: IconFn = (doc, x, y, size, color) => {
  doc.strokeColor(color).lineWidth(size * 0.07);
  const cx = x + size / 2;
  const topY = y + size * 0.18;
  const botY = y + size * 0.82;
  doc.moveTo(cx, topY).lineTo(cx, botY).stroke();
  doc
    .moveTo(cx, topY)
    .quadraticCurveTo(x + size * 0.1, y + size * 0.3, x + size * 0.13, botY - size * 0.05)
    .stroke();
  doc
    .moveTo(cx, topY)
    .quadraticCurveTo(x + size * 0.9, y + size * 0.3, x + size * 0.87, botY - size * 0.05)
    .stroke();
};

const drawTrendingBars: IconFn = (doc, x, y, size, color) => {
  doc.fillColor(color);
  const baseline = y + size * 0.82;
  const barW = size * 0.16;
  const heights = [size * 0.28, size * 0.46, size * 0.64];
  heights.forEach((h, i) => {
    const bx = x + size * 0.18 + i * (barW + size * 0.11);
    doc.roundedRect(bx, baseline - h, barW, h, size * 0.02).fill();
  });
};

const SERVICE_ICON_DRAWERS: Record<string, IconFn> = {
  diagnosis: drawMagnifier,
  audit: drawClipboardCheck,
  chatbots: drawChatBubble,
  llm: drawLink,
  rag: drawOpenBook,
  ml: drawTrendingBars,
};

/** Draws a filled color circle badge with the given service's icon centered inside it. */
export function drawServiceIconBadge(
  doc: PDFKit.PDFDocument,
  tag: string,
  centerX: number,
  centerY: number,
  radius: number,
  bgColor: string,
  iconColor = "#ffffff"
): void {
  doc.save();
  doc.circle(centerX, centerY, radius).fill(bgColor);
  const size = radius * 1.5;
  const drawer = SERVICE_ICON_DRAWERS[tag] ?? drawMagnifier;
  drawer(doc, centerX - size / 2, centerY - size / 2, size, iconColor);
  doc.restore();
}
