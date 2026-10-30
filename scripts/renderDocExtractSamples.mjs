/** Render the fictional sample documents used by /try-docextract.
 * node scripts/renderDocExtractSamples.mjs
 * Writes public/demo-samples/docextract-{invoice,receipt,contract}-{en,es}.jpg (+ .thumb.webp).
 * All companies, people, tax IDs and amounts are invented for the demo.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const out = fileURLToPath(new URL('../public/demo-samples/', import.meta.url));
await mkdir(out, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const T = (x, y, v, size = 16, color = '#1f2937', weight = 400, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" ${extra}>${esc(v)}</text>`;
const R = (x, y, w, h, fill, r = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const L = (x1, y1, x2, y2, c = '#e5e7eb', w = 1) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}"/>`;
const svg = (w, h, body, bg = '#ffffff') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/><g font-family="Arial, Helvetica, sans-serif">${body}</g></svg>`;

// ── Invoice ───────────────────────────────────────────────────────────────
function invoice(lang) {
  const es = lang === 'es';
  const tr = (a, b) => (es ? a : b);
  const W = 1000, H = 1130;
  const items = es
    ? [
        ['Licencia anual plataforma de inventario', '1', '3,200.00'],
        ['Implementación e integración con ERP', '24 h', '2,160.00'],
        ['Capacitación a usuarios (remota)', '6 h', '480.00'],
        ['Soporte prioritario — trimestre', '1', '650.00'],
      ]
    : [
        ['Inventory platform — annual license', '1', '3,200.00'],
        ['ERP implementation and integration', '24 h', '2,160.00'],
        ['User training (remote)', '6 h', '480.00'],
        ['Priority support — quarter', '1', '650.00'],
      ];
  const cur = es ? 'S/' : 'USD';
  let rows = '';
  items.forEach(([d, q, a], i) => {
    const y = 640 + i * 52;
    rows += T(70, y, d, 17) + T(640, y, q, 17, '#374151', 400, 'text-anchor="end"') + T(930, y, `${cur} ${a}`, 17, '#111827', 600, 'text-anchor="end"') + L(70, y + 20, 930, y + 20, '#f1f5f9');
  });
  const body = `
  ${R(0, 0, W, 14, '#0f766e')}
  ${R(70, 70, 54, 54, '#0f766e', 12)}${T(97, 107, 'N', 30, '#fff', 700, 'text-anchor="middle"')}
  ${T(140, 94, tr('Nortesur Soluciones S.A.C.', 'Northbay Software Inc.'), 24, '#0f172a', 700)}
  ${T(140, 120, tr('RUC 20601234567 · Av. Javier Prado 1450, Lima', 'EIN 12-3456789 · 410 Market St, San Jose, CA'), 15, '#64748b')}
  ${T(930, 96, tr('FACTURA', 'INVOICE'), 40, '#0f766e', 700, 'text-anchor="end" letter-spacing="2"')}
  ${T(930, 128, tr('N.º F001-004821', 'No. INV-2026-0418'), 18, '#334155', 600, 'text-anchor="end"')}
  ${L(70, 170, 930, 170, '#e2e8f0', 2)}
  ${T(70, 212, tr('FACTURAR A', 'BILL TO'), 13, '#94a3b8', 700, 'letter-spacing="1.5"')}
  ${T(70, 242, tr('Distribuidora Andina del Pacífico S.A.', 'Pacific Ridge Distribution LLC'), 19, '#111827', 700)}
  ${T(70, 268, tr('RUC 20509876543', 'Attn: Accounts Payable'), 16, '#475569')}
  ${T(70, 292, tr('Calle Las Begonias 220, San Isidro, Lima', '88 Harbor Way, Oakland, CA 94607'), 16, '#475569')}
  ${T(600, 212, tr('FECHA DE EMISIÓN', 'ISSUE DATE'), 13, '#94a3b8', 700, 'letter-spacing="1.5"')}${T(930, 212, tr('14/10/2026', 'Oct 14, 2026'), 17, '#111827', 600, 'text-anchor="end"')}
  ${T(600, 246, tr('VENCIMIENTO', 'DUE DATE'), 13, '#94a3b8', 700, 'letter-spacing="1.5"')}${T(930, 246, tr('13/11/2026', 'Nov 13, 2026'), 17, '#111827', 600, 'text-anchor="end"')}
  ${T(600, 280, tr('ORDEN DE COMPRA', 'PURCHASE ORDER'), 13, '#94a3b8', 700, 'letter-spacing="1.5"')}${T(930, 280, 'PO-77310', 17, '#111827', 600, 'text-anchor="end"')}
  ${T(600, 314, tr('CONDICIONES', 'TERMS'), 13, '#94a3b8', 700, 'letter-spacing="1.5"')}${T(930, 314, tr('Crédito 30 días', 'Net 30'), 17, '#111827', 600, 'text-anchor="end"')}
  <g transform="translate(0,-150)">${R(70, 560, 860, 46, '#f1f5f9', 8)}
  ${T(90, 590, tr('DESCRIPCIÓN', 'DESCRIPTION'), 13, '#475569', 700, 'letter-spacing="1.2"')}
  ${T(640, 590, tr('CANT.', 'QTY'), 13, '#475569', 700, 'text-anchor="end" letter-spacing="1.2"')}
  ${T(910, 590, tr('IMPORTE', 'AMOUNT'), 13, '#475569', 700, 'text-anchor="end" letter-spacing="1.2"')}
  ${rows}
  ${T(760, 900, 'Subtotal', 17, '#475569', 400, 'text-anchor="end"')}${T(930, 900, `${cur} 6,490.00`, 17, '#111827', 600, 'text-anchor="end"')}
  ${T(760, 936, tr('IGV (18%)', 'Sales tax (8.25%)'), 17, '#475569', 400, 'text-anchor="end"')}${T(930, 936, es ? 'S/ 1,168.20' : 'USD 535.43', 17, '#111827', 600, 'text-anchor="end"')}
  ${R(560, 960, 370, 64, '#0f766e', 10)}
  ${T(590, 1000, tr('TOTAL A PAGAR', 'TOTAL DUE'), 15, '#ccfbf1', 700, 'letter-spacing="1.5"')}${T(910, 1003, es ? 'S/ 7,658.20' : 'USD 7,025.43', 26, '#ffffff', 700, 'text-anchor="end"')}
  ${T(70, 900, tr('DATOS DE PAGO', 'PAYMENT DETAILS'), 13, '#94a3b8', 700, 'letter-spacing="1.5"')}
  ${T(70, 930, tr('Banco: Banco Ficticio del Perú', 'Bank: First Example Bank'), 16, '#334155')}
  ${T(70, 956, tr('Cuenta: 191-0000000-0-00', 'Account: 000123456789 · ABA 000000000'), 16, '#334155')}
  ${T(70, 982, tr('CCI: 002-191-000000000000-00', 'Reference: INV-2026-0418'), 16, '#334155')}
  ${L(70, 1110, 930, 1110, '#e2e8f0')}
  ${T(500, 1150, tr('Gracias por su preferencia · facturacion@nortesur.example', 'Thank you for your business · billing@northbay.example'), 15, '#64748b', 400, 'text-anchor="middle"')}</g>
  ${T(500, 1090, tr('DOCUMENTO DE EJEMPLO — DATOS FICTICIOS', 'SAMPLE DOCUMENT — FICTIONAL DATA'), 13, '#cbd5e1', 700, 'text-anchor="middle" letter-spacing="2"')}`;
  return { w: W, h: H, svg: svg(W, H, body) };
}

// ── Receipt ───────────────────────────────────────────────────────────────
function receipt(lang) {
  const es = lang === 'es';
  const tr = (a, b) => (es ? a : b);
  const W = 640, H = 1120;
  const mono = 'font-family="Courier New, monospace"';
  const items = es
    ? [['2 x Café americano', '15.00'], ['1 x Sándwich de pollo', '18.50'], ['1 x Jugo de naranja', '9.00'], ['1 x Torta de chocolate', '12.50']]
    : [['2 x Americano', '7.00'], ['1 x Chicken sandwich', '9.75'], ['1 x Orange juice', '4.50'], ['1 x Chocolate cake', '5.25']];
  const cur = es ? 'S/' : '$';
  let rows = '';
  items.forEach(([d, a], i) => {
    const y = 410 + i * 40;
    rows += T(60, y, d, 20, '#1f2937', 400, mono) + T(580, y, `${cur} ${a}`, 20, '#1f2937', 400, `${mono} text-anchor="end"`);
  });
  const dash = (y) => `<line x1="50" y1="${y}" x2="590" y2="${y}" stroke="#9ca3af" stroke-width="2" stroke-dasharray="8 6"/>`;
  const body = `
  ${T(320, 90, tr('CAFÉ LA ESQUINA', 'CORNER CAFÉ'), 34, '#111827', 700, `${mono} text-anchor="middle" letter-spacing="2"`)}
  ${T(320, 128, tr('Av. Larco 345, Miraflores', '1200 Elm Ave, Palo Alto, CA'), 18, '#374151', 400, `${mono} text-anchor="middle"`)}
  ${T(320, 156, tr('RUC 10456789012', 'Tel (650) 555-0142'), 18, '#374151', 400, `${mono} text-anchor="middle"`)}
  ${dash(190)}
  ${T(60, 230, tr('BOLETA B002-019334', 'RECEIPT #019334'), 20, '#111827', 700, mono)}
  ${T(60, 266, tr('Fecha: 27/10/2026  13:42', 'Date: 10/27/2026  1:42 PM'), 20, '#1f2937', 400, mono)}
  ${T(60, 302, tr('Cajero: M. Quispe  Mesa: 7', 'Server: Dana  Table: 7'), 20, '#1f2937', 400, mono)}
  ${dash(340)}
  ${rows}
  ${dash(580)}
  ${T(60, 622, 'Subtotal', 20, '#1f2937', 400, mono)}${T(580, 622, es ? 'S/ 46.61' : '$ 26.50', 20, '#1f2937', 400, `${mono} text-anchor="end"`)}
  ${T(60, 658, tr('IGV 18%', 'Tax 9.125%'), 20, '#1f2937', 400, mono)}${T(580, 658, es ? 'S/ 8.39' : '$ 2.42', 20, '#1f2937', 400, `${mono} text-anchor="end"`)}
  ${T(60, 694, tr('Propina', 'Tip'), 20, '#1f2937', 400, mono)}${T(580, 694, es ? 'S/ 5.00' : '$ 4.00', 20, '#1f2937', 400, `${mono} text-anchor="end"`)}
  ${T(60, 748, 'TOTAL', 30, '#111827', 700, mono)}${T(580, 748, es ? 'S/ 60.00' : '$ 32.92', 30, '#111827', 700, `${mono} text-anchor="end"`)}
  ${dash(786)}
  ${T(60, 828, tr('Pago: VISA **** 4821', 'Paid: VISA **** 4821'), 20, '#1f2937', 400, mono)}
  ${T(60, 864, tr('Autorización: 552190', 'Auth code: 552190'), 20, '#1f2937', 400, mono)}
  ${T(320, 940, tr('¡Gracias por su visita!', 'Thank you, come again!'), 22, '#111827', 700, `${mono} text-anchor="middle"`)}
  ${T(320, 1060, tr('RECIBO DE EJEMPLO — DATOS FICTICIOS', 'SAMPLE RECEIPT — FICTIONAL DATA'), 14, '#9ca3af', 700, `${mono} text-anchor="middle"`)}`;
  return { w: W, h: H, svg: svg(W, H, body, '#fbfaf6') };
}

// ── Contract (one page) ───────────────────────────────────────────────────
function contract(lang) {
  const es = lang === 'es';
  const tr = (a, b) => (es ? a : b);
  const W = 1000, H = 1294;
  const clauses = es
    ? [
        ['1. Objeto', ['El Proveedor prestará servicios de mantenimiento preventivo y correctivo de los', 'equipos de climatización del Cliente en su sede de Arequipa.']],
        ['2. Vigencia', ['El contrato rige desde el 1 de noviembre de 2026 por un plazo de doce (12) meses,', 'renovable automáticamente salvo aviso escrito con 30 días de anticipación.']],
        ['3. Contraprestación', ['El Cliente pagará S/ 4,800.00 mensuales más IGV, dentro de los 15 días siguientes', 'a la recepción de la factura.']],
        ['4. Nivel de servicio', ['Tiempo de respuesta máximo de 4 horas hábiles ante incidencias críticas.']],
        ['5. Confidencialidad', ['Las partes mantendrán reservada la información intercambiada durante la', 'vigencia del contrato y hasta dos (2) años después de su término.']],
        ['6. Ley aplicable', ['Este contrato se rige por las leyes de la República del Perú. Toda controversia se', 'someterá a los jueces y tribunales de Lima.']],
      ]
    : [
        ['1. Scope', ['Provider will deliver preventive and corrective maintenance of the HVAC', "equipment at Client's Sacramento facility."]],
        ['2. Term', ['This Agreement starts on November 1, 2026 and runs for twelve (12) months, renewing', 'automatically unless either party gives 30 days written notice.']],
        ['3. Fees', ['Client will pay USD 4,800.00 per month, plus applicable taxes, within fifteen (15)', 'days of receiving each invoice.']],
        ['4. Service levels', ['Maximum response time of 4 business hours for critical incidents.']],
        ['5. Confidentiality', ['The parties will keep shared information confidential during the term and', 'for two (2) years after it ends.']],
        ['6. Governing law', ['This Agreement is governed by the laws of the State of California. Disputes', 'will be heard in the courts of Santa Clara County.']],
      ];
  let y = 450;
  let blocks = '';
  for (const [h, lines] of clauses) {
    blocks += T(80, y, h, 19, '#111827', 700);
    y += 30;
    for (const line of lines) {
      blocks += T(80, y, line, 17, '#374151');
      y += 27;
    }
    y += 22;
  }
  const body = `
  ${T(500, 110, tr('CONTRATO DE PRESTACIÓN DE SERVICIOS', 'SERVICES AGREEMENT'), 30, '#111827', 700, 'text-anchor="middle" letter-spacing="1.5"')}
  ${T(500, 146, tr('Contrato N.º CS-2026-117', 'Agreement No. SA-2026-117'), 17, '#6b7280', 400, 'text-anchor="middle"')}
  ${L(80, 180, 920, 180, '#d1d5db', 2)}
  ${T(80, 228, tr('Celebrado en Lima, el 20 de octubre de 2026, entre:', 'Entered into on October 20, 2026, between:'), 18, '#374151')}
  ${T(80, 270, tr('EL PROVEEDOR: Climatec Servicios Integrales S.A.C., RUC 20554433221,', 'PROVIDER: Coolwave Facility Services Inc., a California corporation,'), 17, '#111827', 600)}
  ${T(80, 296, tr('representada por Carla Méndez Ruiz, Gerente General; y', 'represented by Carla Mendez, CEO; and'), 17, '#374151')}
  ${T(80, 338, tr('EL CLIENTE: Hoteles del Sur S.A., RUC 20112233445,', 'CLIENT: Sierra Vista Hotels LLC, a Delaware limited liability company,'), 17, '#111827', 600)}
  ${T(80, 364, tr('representada por Jorge Salas Vega, Director de Operaciones.', 'represented by George Salas, Director of Operations.'), 17, '#374151')}
  ${L(80, 400, 920, 400, '#e5e7eb')}
  ${blocks}
  ${L(120, 1120, 420, 1120, '#6b7280')}${L(580, 1120, 880, 1120, '#6b7280')}
  <path d="M150 1105 c20 -30 40 10 60 -12 s30 -20 50 4 s40 -10 70 -8" fill="none" stroke="#1e3a8a" stroke-width="2"/>
  <path d="M610 1108 c25 -25 35 5 55 -10 s35 -22 55 2 s40 -6 65 -12" fill="none" stroke="#1e3a8a" stroke-width="2"/>
  ${T(270, 1148, tr('Carla Méndez Ruiz — EL PROVEEDOR', 'Carla Mendez — PROVIDER'), 15, '#374151', 400, 'text-anchor="middle"')}
  ${T(730, 1148, tr('Jorge Salas Vega — EL CLIENTE', 'George Salas — CLIENT'), 15, '#374151', 400, 'text-anchor="middle"')}
  ${T(500, 1240, tr('CONTRATO DE EJEMPLO — DATOS FICTICIOS', 'SAMPLE AGREEMENT — FICTIONAL DATA'), 13, '#cbd5e1', 700, 'text-anchor="middle" letter-spacing="2"')}`;
  return { w: W, h: H, svg: svg(W, H, body) };
}

for (const lang of ['en', 'es']) {
  for (const [name, build] of [['invoice', invoice], ['receipt', receipt], ['contract', contract]]) {
    const { svg: s } = build(lang);
    const base = path.join(out, `docextract-${name}-${lang}`);
    await sharp(Buffer.from(s)).jpeg({ quality: 86, mozjpeg: true }).toFile(`${base}.jpg`);
    await sharp(Buffer.from(s)).resize({ width: 320 }).webp({ quality: 78 }).toFile(`${base}.thumb.webp`);
    console.log('wrote', `${base}.jpg`);
  }
}
