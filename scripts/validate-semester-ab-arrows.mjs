#!/usr/bin/env node
import fs from 'node:fs';import crypto from 'node:crypto';
const d=JSON.parse(fs.readFileSync('saek-image-audit-2026.json','utf8'));
let count=0;const errors=[],hashes=new Set();
for(const c of d.courses.filter(c=>['Α','Β'].includes(c.semester)))for(let i=0;i<c.chapters.length;i++){
 const ref=c.chapters[i].images.filter(x=>x.startsWith('sem_a_')||x.startsWith('sem_b_'));
 if(ref.length<1)errors.push('Missing diagram in '+c.course+'-'+(i+1));
 for(const k of ref){const a=d.assets[k];const img=fs.readFileSync(a.localPath,'utf8');count++;
  const texts=[...img.matchAll(/<text\\b[^>]*>([\\s\\S]*?)<\\/text>/g)].map(x=>x[1]);
  const arrows=(img.match(/marker-end="url\(#arr\)"/g)||[]).length;
  if(arrows!==3)errors.push(k+': expected 3 arrows, found '+arrows);
  if(img.includes('…')||img.includes('...')||a.caption.includes('…'))errors.push(k+': truncated text');
  if(img.includes('Σενάριο κεφαλαίου')||img.includes('Ο εκπαιδευόμενος κατανοεί'))errors.push(k+': generic filler');
  if(!img.includes('role="img"')||!img.includes('<desc'))errors.push(k+': missing accessibility');
  if(texts.length<4||texts.some(x=>x.length>95))errors.push(k+': text label layout');
  const sum=crypto.createHash('sha256').update(img).digest('hex');
  if(sum!==a.sha256)errors.push(k+': hash mismatch');
  if(hashes.has(sum))errors.push(k+': duplicated diagram');hashes.add(sum);
 }
}
console.log('A/B concise-arrow diagram verification:',count,'images',errors.length,'problems');
if(errors.length){console.error(errors.slice(0,30).join('\\n'));process.exit(1);}
