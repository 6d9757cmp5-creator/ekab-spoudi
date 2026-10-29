#!/usr/bin/env node
// Quality gate for semester C; does not certify clinical accuracy or actual graphic render.
import fs from 'node:fs';
import crypto from 'node:crypto';
const registry=JSON.parse(fs.readFileSync('saek-image-audit-2026.json','utf8'));
const courses=registry.courses.filter(x=>x.semester==='Γ');
const errors=[];const shaSeen=new Set();let count=0;
if(courses.length!==4||courses.reduce((s,c)=>s+c.chapters.length,0)!==51)errors.push('expected 4 courses and 51 chapters');
for(const c of courses)for(let n=0;n<c.chapters.length;n++){
 const ch=c.chapters[n],assets=ch.images.filter(k=>k.startsWith('sem_c_')); const expected=[14,16].includes(c.course)?3:2;
 if(assets.length!==expected)errors.push('wrong number of diagrams '+c.course+'-'+(n+1));
 const captions=new Set();
 for(const id of assets){
  const a=registry.assets[id];if(!a?.localPath){errors.push('asset missing '+id);continue;}
  const svg=fs.readFileSync(a.localPath,'utf8').replace(/\r\n/g,'\n');count++;
  if(svg.includes('…')||svg.includes('...')||a.caption?.includes('…'))errors.push('cut off text '+id);
  if(/Σε εκπαιδευτικό σενάριο σχετικό|Σενάριο κεφαλαίου:|Ο εκπαιδευόμενος κατανοεί/.test(svg))errors.push('generic placeholder '+id);
  if(!svg.includes('Γ΄ ΕΞΑΜΗΝΟ')||!svg.includes('role="img"'))errors.push('no sem C/ARIA label '+id);
  if(crypto.createHash('sha256').update(svg).digest('hex')!==a.sha256)errors.push('invalid checksum '+id);
  if(shaSeen.has(a.sha256))errors.push('duplicate graphic '+id);shaSeen.add(a.sha256);
  if(captions.has(a.caption))errors.push('repeated caption within lesson '+id);captions.add(a.caption);
 }
}
console.log('Semester C illustrated-text audit:',count,'SVGs;',errors.length,'errors');
if(errors.length){for(const e of errors)console.error(e);process.exit(1);}
