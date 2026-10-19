/** Deterministic, editable illustrations. No API calls or fabricated measured results.
 * Run from the repository root: node scripts/renderDemoPreviews.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('../public/demo-previews/', import.meta.url);
await mkdir(out, { recursive: true });
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text = (x,y,value,size=22,color='#cbd5e1',weight=400) => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(value)}</text>`;
const rect = (x,y,w,h,fill='#142238',r=16,stroke='#334155') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
const line = (x,y,w,color='#334155') => `<rect x="${x}" y="${y}" width="${w}" height="7" rx="3.5" fill="${color}"/>`;
const arrow = `<path d="M368 304 H430 m-14 -14 14 14 -14 14" fill="none" stroke="#93c5fd" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
const profile = (x,y) => `<circle cx="${x}" cy="${y}" r="27" fill="#94a3b8"/><path d="M${x-48} ${y+89} Q${x-48} ${y+32} ${x} ${y+32} Q${x+48} ${y+32} ${x+48} ${y+89}" fill="#64748b"/>`;
const wave = (x,y,color='#5eead4') => [24,42,72,38,90,56,28,64,82,44,24,62,76,40,54,28].map((h,i)=>`<rect x="${x+i*14}" y="${y-h/2}" width="7" height="${h}" rx="3.5" fill="${color}"/>`).join('');
const names = {
  rag: [['DOCUMENTS','SOURCED ANSWER'],['DOCUMENTOS','RESPUESTA CON FUENTES']],
  langchain: [['REQUEST','TOOL WORKFLOW'],['SOLICITUD','FLUJO DE HERRAMIENTAS']],
  sitechatbot: [['QUESTION','CONTEXTUAL RESPONSE'],['PREGUNTA','RESPUESTA CON CONTEXTO']],
  identity: [['SELFIE + ID','REVIEW'],['SELFIE + DOCUMENTO','REVISIÓN']],
  objectdetection: [['SCENE','OBJECT DETECTION'],['ESCENA','DETECCIÓN DE OBJETOS']],
  emotion: [['FACE LANDMARKS','MODEL OUTPUT'],['PUNTOS FACIALES','SALIDA DEL MODELO']],
  speech: [['AUDIO','TRANSCRIPT'],['AUDIO','TRANSCRIPCIÓN']],
  tts: [['TEXT','GENERATED SPEECH'],['TEXTO','VOZ GENERADA']],
  voiceagent: [['CALL','ASSISTED WORKFLOW'],['LLAMADA','FLUJO ASISTIDO']],
  forecast: [['HISTORICAL DATA','FORECAST'],['DATOS HISTÓRICOS','PRONÓSTICO']],
  anomaly: [['TIME SERIES','FLAG FOR REVIEW'],['SERIE TEMPORAL','REVISAR ALERTA']],
  imagegen: [['BRIEF','VISUAL CONCEPT'],['DESCRIPCIÓN','CONCEPTO VISUAL']],
  docextract: [['INVOICE','STRUCTURED DATA'],['FACTURA','DATOS ESTRUCTURADOS']],
};
for (const lang of ['en','es']) for (const id of Object.keys(names)) {
  const es = lang === 'es', labels = names[id][es?1:0];
  let graphic = '';
  if (['forecast','anomaly'].includes(id)) {
    graphic = rect(64,180,672,300) + [240,300,360,420].map(y=>`<path d="M88 ${y} H712" stroke="#28374e"/>`).join('') +
      (id==='forecast' ? `<path d="M90 402 L145 382 L200 390 L255 346 L310 358 L365 310 L420 324 L475 282" fill="none" stroke="#cbd5e1" stroke-width="4"/><path d="M475 282 L535 250 L595 228 L655 208 L710 198 L710 300 L655 286 L595 282 L535 292 L475 282" fill="#2563eb" opacity=".2"/><path d="M475 282 L535 270 L595 252 L655 246 L710 230" fill="none" stroke="#60a5fa" stroke-width="4" stroke-dasharray="9 8"/>` : `<rect x="88" y="285" width="624" height="60" fill="#1e3a5f" opacity=".5"/><path d="M88 320 L140 306 L192 326 L244 300 L296 318 L348 308 L400 320 L452 221 L504 316 L556 308 L608 324 L660 310 L712 318" fill="none" stroke="#93c5fd" stroke-width="4"/><circle cx="452" cy="221" r="9" fill="#fb7185"/><path d="M452 230 V420" stroke="#fb7185" stroke-dasharray="6 6"/>`);
  } else if (id==='objectdetection') {
    graphic = rect(64,180,672,300,'#111f32') + `<path d="M65 420 H735 M180 180 V420 M580 180 V420" stroke="#334155" stroke-width="2"/>` +
      rect(106,231,220,113,'#26364a',6) + `<path d="M110 245 H320 M110 275 H320 M110 305 H320" stroke="#475569" stroke-width="3"/>`+
      profile(423,282) + rect(527,326,135,86,'#2a3a50',4) + `<path d="M512 420 H682 L662 412 H527 Z" fill="#94a3b8"/>` +
      rect(364,242,118,144,'none',6,'#5eead4')+rect(515,312,168,121,'none',6,'#93c5fd') + text(366,230,es?'persona':'person',17,'#5eead4')+text(520,300,es?'portátil':'laptop',17,'#93c5fd');
  } else if (['identity','emotion'].includes(id)) {
    graphic = rect(76,200,270,260) + profile(210,270) + rect(158,225,104,125,'none',8,'#c4b5fd') + arrow + rect(452,200,272,260);
    graphic += id==='identity' ? rect(474,225,228,144,'#e2e8f0',10) + profile(526,260) + line(578,253,100,'#94a3b8')+line(578,278,76,'#94a3b8') + text(478,419,es?'Comparar y revisar':'Compare and review',18,'#c4b5fd') : [0,1,2].map((i)=>text(478,246+i*72,(es?['Neutral','Alegría','Sorpresa']:['Neutral','Happy','Surprise'])[i],17)+line(566,232+i*72,[132,86,55][i],'#c4b5fd')).join('');
    if(id==='emotion') graphic += [[186,261],[234,261],[210,282],[192,302],[228,302]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4" fill="#fda4af"/>`).join('');
  } else if (['speech','tts','voiceagent'].includes(id)) {
    graphic = rect(76,200,270,260)+rect(452,200,272,260)+arrow;
    const waveform = wave(id==='tts'?472:98,324);
    graphic += waveform;
    const x = id==='tts'?98:474;
    graphic += text(x,258,id==='voiceagent'?(es?'Consultar agenda':'Check calendar'):(es?'Texto de ejemplo':'Sample text'),20,'#e2e8f0') + [180,220,158,196].map((w,i)=>line(x,286+i*32,w)).join('');
  } else if (id==='imagegen') {
    graphic = rect(76,200,270,260)+text(98,255,es?'Luz · materiales':'Light · materials',21,'#e2e8f0')+[210,180,220].map((w,i)=>line(98,286+i*30,w)).join('')+arrow+rect(452,200,272,260)+`<circle cx="588" cy="326" r="87" fill="url(#orb)"/><ellipse cx="588" cy="416" rx="92" ry="12" fill="#020617" opacity=".5"/>`;
  } else if (id==='langchain') {
    graphic = rect(76,220,270,216)+text(98,270,es?'Preparar un informe':'Prepare a report',21,'#e2e8f0')+[208,180,198].map((w,i)=>line(98,304+i*28,w)).join('')+arrow+`<path d="M478 220 V430" stroke="#d6a65c" stroke-width="2"/>`+[0,1,2].map(i=>rect(500,202+i*86,224,66)+text(516,243+i*86,['search_docs()','calculator()','format_json()'][i],19,'#fde68a')).join('');
  } else if (id==='docextract') {
    graphic = rect(76,190,270,280,'#f1f5f9')+text(98,236,'INV-2048',22,'#0f172a',700)+line(98,257,224,'#cbd5e1')+text(98,302,es?'Proveedor de ejemplo':'Sample supplier',20,'#334155')+text(98,352,'2026-10-18',21,'#334155')+rect(94,382,234,58,'#dbeafe',8,'#93c5fd')+text(108,418,'USD 1,250.00',25,'#0f172a',700)+arrow+rect(452,190,272,280)+text(476,240,'JSON / CSV',20,'#93c5fd',600)+text(476,295,'{ "id": "2048",',21)+text(476,341,'  "total": 1250',21,'#6ee7b7')+text(476,389,'}',21);
  } else {
    graphic = rect(76,200,270,260)+rect(452,200,272,260)+arrow;
    if(id==='rag') graphic += [0,1,2].map(i=>rect(98+i*9,225+i*58,224,48)+text(114+i*9,255+i*58,`[${i+1}] ${es?'Documento':'Document'} ${i+1}`,18,'#93c5fd')).join('')+text(474,246,es?'Respuesta [1] [3]':'Answer [1] [3]',23,'#f8fafc',600);
    else graphic += text(98,256,es?'¿Cómo funciona?':'How does it work?',22,'#f8fafc')+text(474,246,es?'Con tu información':'With your information',21,'#c4b5fd',600);
    graphic += [210,180,216,154].map((w,i)=>line(474,280+i*33,w)).join('');
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#14243c"/><stop offset="1" stop-color="#020617"/></linearGradient><radialGradient id="orb" cx=".3" cy=".2"><stop stop-color="#ddd6fe"/><stop offset=".4" stop-color="#8b5cf6"/><stop offset="1" stop-color="#312e81"/></radialGradient></defs><rect width="800" height="600" fill="url(#bg)"/><g font-family="Arial, Helvetica, sans-serif">${text(40,54,'Robles.AI',22,'#f8fafc',700)}${text(40,120,labels[0],18,'#94a3b8',600)}${text(444,120,labels[1],18,'#93c5fd',600)}${graphic}<path d="M40 518 H760" stroke="#334155"/>${text(40,558,es?'Ejemplo ilustrativo · Datos de muestra':'Illustrative example · Sample data',18,'#94a3b8')}</g></svg>`;
  await writeFile(new URL(`${id}-${lang}.svg`, out), svg);
}
console.log('26 localized demo posters generated.');
