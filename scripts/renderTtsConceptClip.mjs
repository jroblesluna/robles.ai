/** Deterministic, self-contained TTS concept MP4. No AI calls, audio, dependencies installed or publishing.
 * node scripts/renderTtsConceptClip.mjs <new-output-directory>
 */
import {createCanvas} from 'canvas';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out=process.argv[2];
if(!out)throw new Error('Usage: node scripts/renderTtsConceptClip.mjs <new-output-directory>');
const dir=path.resolve(out);
await mkdir(dir,{recursive:true});
const master=path.join(dir,'tts-typed-master-v1.mp4');
const web=path.join(dir,'tts-typed-web-v1.mp4');
for(const file of [master,web]){try{await stat(file);throw new Error('Refusing to overwrite '+file);}catch(e){if(e.code!=='ENOENT')throw e;}}
const W=1280,H=720,FPS=24,DURATION=8,word='Welcome.';
const keys=[24,29,33,37,42,46,50,55];
const canvas=createCanvas(W,H),ctx=canvas.getContext('2d');
ctx.font='bold 64px Arial';
const advances=[...word].map(ch=>ctx.measureText(ch).width);
const clamp=x=>Math.min(1,Math.max(0,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const heights=[7,12,18,25,40,58,42,26,18,32,57,76,96,84,65,43,30,37,52,68,57,43,30,26,32,25,18,14,11,16,13,10,7,5,8,5,3,4,2,3,2,2];
function box(x,y,w,h,r,fill,stroke,line=2){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=line;ctx.strokeStyle=stroke;ctx.stroke();}}
function grad(x1,y1,x2,y2,colors){const g=ctx.createLinearGradient(x1,y1,x2,y2);colors.forEach(([p,c])=>g.addColorStop(p,c));return g;}
function line(x1,y1,x2,y2,color,width=2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineCap='round';ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();}
function text(value,x,y,size,color,weight='normal'){ctx.font=`${weight} ${size}px Arial`;ctx.fillStyle=color;ctx.fillText(value,x,y);}
export function state(frame){const t=frame/FPS;const count=keys.filter(k=>frame>=k).length;return{frame,t,text:word.slice(0,count),caret: t<1 ? Math.floor(t*4)%2===0 : true,generation:clamp((t-2.5)),playback:clamp((t-3.5)/2),playing:t>=3.5&&t<5.5};}
function render(frame){
 const s=state(frame),t=s.t;
 ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.clearRect(0,0,W,H);
 ctx.fillStyle=grad(0,0,W,H,[[0,'#0b2849'],[.5,'#061930'],[1,'#020e22']]);ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#092340';ctx.beginPath();ctx.moveTo(0,192);ctx.bezierCurveTo(220,135,320,270,630,246);ctx.bezierCurveTo(960,220,1050,110,1280,155);ctx.lineTo(1280,250);ctx.bezierCurveTo(950,220,800,330,520,305);ctx.bezierCurveTo(200,240,160,175,0,220);ctx.closePath();ctx.fill();
 ctx.fillStyle='#08213d';ctx.beginPath();ctx.moveTo(0,630);ctx.bezierCurveTo(260,570,360,560,580,621);ctx.bezierCurveTo(900,710,1050,585,1280,570);ctx.lineTo(1280,650);ctx.bezierCurveTo(900,640,850,740,530,690);ctx.bezierCurveTo(260,600,160,655,0,695);ctx.closePath();ctx.fill();
 const headerColors=['#23d7f5','#2cc3ef','#6197ff','#a477ff','#bc66f0'];
 [12,30,48,29,13].forEach((h,i)=>line(610+i*14,64-h/2,610+i*14,64+h/2,headerColors[i],7));
 ctx.font='bold 70px Arial';const first='TEXT TO ',last='VOICE';const total=ctx.measureText(first+last).width;const tx=(W-total)/2;const firstWidth=ctx.measureText(first).width;
 text(first,tx,183,70,'#f8fafc','bold');text(last,tx+firstWidth,183,70,grad(tx+firstWidth,0,tx+total,0,[[0,'#23d7f5'],[1,'#b568f4']]),'bold');line(566,215,715,215,grad(566,0,715,0,[[0,'#22d3ee'],[1,'#a78bfa']]),2);
 box(40,270,452,244,20,grad(40,270,492,514,[[0,'#0c2747'],[1,'#06182f']]),'#65b9ef',2);
 box(50,314,430,190,10,grad(50,314,480,504,[[0,'#071a32'],[1,'#04152b']]));
 // Each glyph is drawn whole, at full alpha, with fixed advances. No text mask, reveal, crop or fade.
 let x=80;for(let i=0;i<s.text.length;i++){text(word[i],x,420,64,'#f8fafc','bold');x+=advances[i];}
 if(s.caret)line(x+2,365,x+2,432,'#27c2ed',3);
 const ag=grad(520,0,579,0,[[0,'#126fba'],[1,'#22d3ee']]);ctx.beginPath();ctx.moveTo(520,388);ctx.lineTo(553,388);ctx.lineTo(553,377);ctx.lineTo(578,395);ctx.lineTo(553,413);ctx.lineTo(553,402);ctx.lineTo(520,402);ctx.closePath();ctx.fillStyle=ag;ctx.fill();
 const waveGrad=grad(613,0,1007,0,[[0,'#16d9ee'],[.45,'#39c1ff'],[1,'#bb69ef']]);
 heights.forEach((h,i)=>{const grow=clamp(s.generation*heights.length-i);if(grow<=0)return;const env=s.playing?Math.sin(Math.PI*s.playback):0;const modulation=1+.16*env*Math.sin((t-3.5)*14-i*.65);const half=h*grow*modulation;line(613+i*9.3,395-half,613+i*9.3,395+half,waveGrad,6);});
 const enabled=s.generation>=1, ring=enabled?grad(1040,340,1150,450,[[0,'#24d5f7'],[1,'#a16af1']]):'#344f77';
 ctx.beginPath();ctx.arc(1096,395,54,0,Math.PI*2);ctx.strokeStyle=ring;ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=enabled?'#d9efff':'#3b567c';
 if(s.playing){ctx.fillRect(1081,375,10,40);ctx.fillRect(1103,375,10,40);}else{ctx.beginPath();ctx.moveTo(1083,375);ctx.lineTo(1116,395);ctx.lineTo(1083,415);ctx.closePath();ctx.fill();}
 ctx.fillStyle=enabled?'#c9e8ff':'#3b567c';ctx.beginPath();ctx.moveTo(1182,385);ctx.lineTo(1195,385);ctx.lineTo(1210,372);ctx.lineTo(1210,418);ctx.lineTo(1195,405);ctx.lineTo(1182,405);ctx.closePath();ctx.fill();
 for(const r of [14,25]){ctx.beginPath();ctx.arc(1210,395,r,-.8,.8);ctx.lineWidth=3;ctx.strokeStyle=enabled?'#a4d5ff':'#3b567c';ctx.stroke();}
 line(613,500,1143,500,'#334b6f',9);if(s.playback>0)line(613,500,613+530*s.playback,500,'#18d8ee',9);
 ctx.beginPath();ctx.arc(613+530*s.playback,500,10,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
 text('0:00',603,536,20,'#a0b5d0');text('0:02',1106,536,20,'#a0b5d0');return s;
}
const qaDir=path.join(dir,'qa');await mkdir(qaDir,{recursive:true});
const qaFrames=[0,23,...keys,60,84,108,132,191];
const hashes=[];let previousCount=0;
for(let n=0;n<FPS*DURATION;n++){
 const s=render(n);assert(s.text.length>=previousCount&&s.text.length-previousCount<=1);previousCount=s.text.length;
 if(s.t<2.5)assert.equal(s.generation,0);if(s.t<3.5)assert.equal(s.playback,0);if(s.t>=5.5)assert.equal(s.playback,1);
 if(keys.includes(n)){const px=ctx.getImageData(80,360,Math.floor(advances[0])-2,70);hashes.push(createHash('sha256').update(px.data).digest('hex'));}
 if(qaFrames.includes(n))await writeFile(path.join(qaDir,`frame-${String(n).padStart(3,'0')}.png`),canvas.toBuffer('image/png'));
}
assert.equal(new Set(hashes).size,1,'The complete W must remain pixel-identical through all typing states');
const sheet=createCanvas(1280,408),sc=sheet.getContext('2d');sc.fillStyle='#0f172a';sc.fillRect(0,0,1280,408);
for(let i=0;i<keys.length;i++){render(keys[i]);const x=(i%4)*320,y=Math.floor(i/4)*204;sc.fillStyle='#e2e8f0';sc.font='16px Arial';sc.fillText(`${(keys[i]/FPS).toFixed(2)}s — ${word.slice(0,i+1)}`,x+12,y+24);sc.drawImage(canvas,40,270,452,244,x+8,y+36,304,164);}
await writeFile(path.join(dir,'typing-proof.png'),sheet.toBuffer('image/png'));
const movie=spawn(ffmpeg.path,['-n','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','png','-framerate',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',master],{stdio:['pipe','ignore','pipe']});
let errors='';movie.stderr.on('data',x=>{errors+=x;});const done=once(movie,'close');
for(let n=0;n<FPS*DURATION;n++){render(n);if(!movie.stdin.write(canvas.toBuffer('image/png')))await once(movie.stdin,'drain');}
movie.stdin.end();const [code]=await done;if(code!==0)throw new Error(errors);
const encoded=spawnSync(ffmpeg.path,['-n','-hide_banner','-loglevel','error','-i',master,'-vf','scale=640:360','-an','-c:v','libx264','-preset','slow','-crf','24','-maxrate','600k','-bufsize','1200k','-pix_fmt','yuv420p','-movflags','+faststart',web],{encoding:'utf8'});if(encoded.status!==0)throw new Error(encoded.stderr);
function probe(file,width,height){const r=spawnSync(ffprobe.path,['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);const p=JSON.parse(r.stdout),v=p.streams.find(s=>s.codec_type==='video');assert.equal(v.width,width);assert.equal(v.height,height);assert.equal(v.r_frame_rate,'24/1');assert(Math.abs(Number(p.format.duration)-8)<.01);assert(!p.streams.some(s=>s.codec_type==='audio'));return{width,height,fps:24,duration:Number(p.format.duration),audio:false};}
const report={method:'deterministic canvas animation; entire explanation baked into MP4',typing:'whole-glyph insertion; fixed glyph advances; no wipe/mask/fade',keystrokes:keys.map((frame,i)=>({frame,time:frame/FPS,text:word.slice(0,i+1)})),completeFirstGlyphPixelStableAcrossPrefixes:new Set(hashes).size===1,master:{file:master,...probe(master,1280,720),bytes:(await stat(master)).size},web:{file:web,...probe(web,640,360),bytes:(await stat(web)).size},deployed:false};
assert(report.web.bytes<=750000,'Web clip exceeds size limit');await writeFile(path.join(dir,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
