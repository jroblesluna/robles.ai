/** Build an illustrative clip with existing sharp/FFmpeg dependencies.
 * node scripts/renderInvoicePreview.mjs es   (or en)
 * No API calls, real customer data, audio or measured processing time.
 */
import sharp from 'sharp';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { mkdir, rename } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const out=fileURLToPath(new URL('../public/demo-previews/', import.meta.url));
await mkdir(out, { recursive: true });
const lang=process.argv[2] === 'en' ? 'en' : 'es';
const tr=(es,en)=>lang==='es'?es:en;
const ffmpeg=ffmpegInstaller.path;
const W=960,H=720,FPS=24,DURATION=10;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const text=(x,y,value,size=18,color='#cbd5e1',weight=400,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" ${extra}>${value}</text>`;
const box=(x,y,w,h,fill,r=12,stroke='none',extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
const check=(x,y,a=1)=>`<g opacity="${a}"><circle cx="${x}" cy="${y}" r="12" fill="#0c3440"/><path d="M${x-5},${y} l4,4 l7,-8" fill="none" stroke="#67e8b4" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></g>`;
export function frame(t,poster=false){
 const scan=ease((t-1.4)/3.7), ready=poster?1:ease((t-5.7)/.6);
 const stage=t<1.6?0:t<5.8?1:2;
 const row=(label,value,i)=>{
  const a=poster?1:ease((t-(2.7+i*1.05))/.65);
  const y=266+i*82;
  return `<g opacity="${a}" transform="translate(${(1-a)*12},0)">${box(520,y,346,68,'#111e35',10,'#2b3c56')}${text(538,y+24,label,14,'#94a3b8')}${text(538,y+49,value,20,'#f8fafc',600)}${check(842,y+36)}</g>`;
 };
 const highlight=(y,w,a)=>`<rect x="118" y="${y}" width="${w}" height="28" rx="5" fill="#dbeafe" fill-opacity="${a*.7}" stroke="#3b82f6" stroke-opacity="${a}" stroke-width="1.7"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
 <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#0b1427"/><stop offset="1" stop-color="#020617"/></linearGradient><linearGradient id="line"><stop stop-color="#2563eb" stop-opacity="0"/><stop offset=".5" stop-color="#60a5fa"/><stop offset="1" stop-color="#2563eb" stop-opacity="0"/></linearGradient></defs>
 <rect width="960" height="720" fill="url(#bg)"/>
 <g font-family="Arial, Helvetica, sans-serif">
 ${box(40,32,28,28,'#2563eb',7)}${text(49,52,'R',17,'white',700)}${text(79,53,'Robles.AI',23,'#f8fafc',700)}
 ${box(706,32,214,30,'#111e35',15,'#334155')}${text(813,52,tr('EJEMPLO ILUSTRATIVO','ILLUSTRATIVE EXAMPLE'),12,'#cbd5e1',600,'text-anchor="middle" letter-spacing="1"')}
 ${text(40,112,tr('IA DOCUMENTAL','DOCUMENT AI'),13,'#93c5fd',600,'letter-spacing="2.5"')}
 ${text(40,162,tr('De facturas a datos útiles.','From invoices to useful data.'),44,'#f8fafc',700,'letter-spacing="-1.3"')}
 ${text(40,198,tr('Extrae campos. Revisa el resultado. Integra tus procesos.','Extract fields. Review the output. Connect your workflows.'),19,'#a7b7cd')}
 ${box(40,228,880,368,'#0c1527',18,'#26354d')}
 ${box(74,248,360,328,'#101d32',13,'#26354d')}
 ${text(94,277,tr('DOCUMENTO DE ENTRADA','INPUT DOCUMENT'),11,'#91a4bf',600,'letter-spacing="1.5"')}
 ${box(98,293,312,262,'#f8fafc',9)}
 ${text(120,325,tr('FACTURA','INVOICE'),19,'#0f172a',700)}${text(388,324,'FA-2048',12,'#64748b',500,'text-anchor="end"')}
 <line x1="120" y1="340" x2="388" y2="340" stroke="#cbd5e1"/>
 ${highlight(351,268,poster?1:ease((t-2.7)/.6))}
 ${text(126,371,tr('Proveedor de ejemplo','Sample supplier'),17,'#1e293b',600)}
 ${highlight(388,268,poster?1:ease((t-3.75)/.6))}
 ${text(126,408,tr('Fecha: 18/10/2026','Date: 2026-10-18'),16,'#475569')}
 ${text(120,447,tr('Servicios profesionales','Professional services'),14,'#64748b')}
 <line x1="120" y1="464" x2="388" y2="464" stroke="#e2e8f0"/>
 ${highlight(477,268,poster?1:ease((t-4.8)/.6))}
 ${text(126,497,'TOTAL',12,'#475569',700)}${text(382,498,'USD 1,250.00',24,'#0f172a',700,'text-anchor="end"')}
 ${text(120,534,tr('Datos ficticios para esta demostración.','Fictional data for this demonstration.'),11,'#64748b')}
 ${!poster&&t>1.4&&t<5.9?`<rect x="104" y="${300+scan*237}" width="300" height="3" rx="1.5" fill="#3b82f6"/><rect x="104" y="${294+scan*237}" width="300" height="12" fill="#3b82f6" opacity=".1"/>`:''}
 <path d="M451 411 H488 M480 402 l9 9 -9 9" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
 ${text(520,257,tr('CAMPOS EXTRAÍDOS','EXTRACTED FIELDS'),11,'#93c5fd',600,'letter-spacing="1.5"')}
 ${row(tr('Proveedor','Supplier'),tr('Proveedor de ejemplo','Sample supplier'),0)}${row(tr('Fecha','Date'),tr('18/10/2026','2026-10-18'),1)}${row('Total','USD 1,250.00',2)}
 <g opacity="${ready}">${box(520,527,84,30,'#173268',7)}${text(562,547,'JSON',12,'#dbeafe',700,'text-anchor="middle"')}${box(615,527,72,30,'#173268',7)}${text(651,547,'CSV',12,'#dbeafe',700,'text-anchor="middle"')}${text(866,547,tr('Revisar y exportar','Review and export'),13,'#cbd5e1',500,'text-anchor="end"')}</g>
 ${[0,1,2].map((i)=>{let x=40+i*306,active=poster||i<=stage;return `${box(x,624,28,28,active?'#2563eb':'#172338',14)}${text(x+14,643,'0'+(i+1),11,active?'white':'#7e91ab',700,'text-anchor="middle"')}${text(x+41,644,[tr('Documento','Document'),tr('Extracción','Extraction'),tr('Datos revisables','Reviewable data')][i],17,active?'#f1f5f9':'#7e91ab',600)}`}).join('')}
 ${text(40,692,tr('Vista conceptual del flujo · Los tiempos del clip no representan tiempos de procesamiento.','Conceptual flow · Clip duration does not represent processing time.'),12,'#94a3b8')}
 </g></svg>`;
}
const poster=Buffer.from(frame(7,true));
await sharp(poster).webp({quality:86}).toFile(path.join(out,`invoice-poster-${lang}.webp`));
const moviePath=path.join(out,`invoice-preview-${lang}.mp4`);
// Publish a complete file atomically, including during concurrent local runs.
const temporaryPath=path.join(out,`.invoice-preview-${lang}-${process.pid}.mp4`);
const movie=spawn(ffmpeg,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','png','-framerate',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',temporaryPath],{stdio:['pipe','ignore','pipe']});
let errors='';movie.stderr.on('data',chunk=>{errors+=chunk});
const done=once(movie,'close');
for(let n=0;n<FPS*DURATION;n++){
 const png=await sharp(Buffer.from(frame(n/FPS))).png().toBuffer();
 if(!movie.stdin.write(png))await once(movie.stdin,'drain');
 if(n%48===0)console.log(`Rendered ${n}/${FPS*DURATION} frames`);
}
movie.stdin.end();const [code]=await done;if(code!==0)throw new Error(errors);
await rename(temporaryPath,moviePath);
console.log('Poster + 10-second MP4 ready.');
