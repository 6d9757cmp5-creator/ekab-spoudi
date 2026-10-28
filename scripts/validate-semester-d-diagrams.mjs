#!/usr/bin/env node
import fs from 'node:fs';import crypto from 'node:crypto';
const d=JSON.parse(fs.readFileSync('saek-image-audit-2026.json','utf8'));let count=0;const errors=[],hashes=new Set(),refs=new Set();
for(const c of d.courses)for(let i=0;i<c.chapters.length;i++){
 const chapter=c.chapters[i];if(chapter.images.length<2)errors.push('under-illustrated '+c.course+'-'+(i+1));
 for(const k of chapter.images){if(refs.has(k))errors.push('asset duplicated across chapters: '+k);refs.add(k);}
 if(c.semester!=='Δ')continue;
 const keys=chapter.images.filter(k=>k.startsWith('sem_d_'));if(keys.length!==([17,18].includes(c.course)?3:2))errors.push('diagram count '+c.course+'-'+i);
 for(const k of keys){const a=d.assets[k],svg=fs.readFileSync(a.localPath,'utf8');count++;
  if((svg.match(/marker-end="url\(#arrow\)"/g)||[]).length!==3)errors.push('missing arrows '+k);
  if(svg.includes('…')||a.caption.includes('…'))errors.push('truncated '+k);
  if(!svg.includes('role="img"')||!svg.includes('<desc'))errors.push('missing alt text '+k);
  const sum=crypto.createHash('sha256').update(svg).digest('hex');
  if(sum!==a.sha256)errors.push('SHA mismatch '+k);if(hashes.has(sum))errors.push('identical SVG '+k);hashes.add(sum);
 }
}
console.log('4-semester coverage:',d.courses.length,'courses,',d.courses.reduce((n,c)=>n+c.chapters.length,0),'chapters; D images:',count,'errors:',errors.length);
if(errors.length){console.error(errors.slice(0,30).join('\n'));process.exit(1);}
