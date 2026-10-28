#!/usr/bin/env node
// Check literal image paths in every HTML/CSS file. Not a runtime or clinical test.
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), scanned=[], references=[], missing=[];
const ext=/\.(svg|png|jpe?g|webp|gif|avif)(?:[?#].*)?$/i;
function walk(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  if(['.git','node_modules','image-contact-sheets','.cache'].includes(item.name))continue;
  const absolute=path.join(dir,item.name);
  if(item.isDirectory()){walk(absolute);continue;}
  if(!/\.(html?|css)$/i.test(item.name))continue;
  const rel=path.relative(root,absolute).replaceAll(path.sep,'/');
  scanned.push(rel);
  const source=fs.readFileSync(absolute,'utf8');
  const pattern=/(?:src|href|poster|data-src)\s*=\s*(['"])(.*?)\1|url\(\s*(['"]?)(.*?)\3\s*\)/gi;
  for(const match of source.matchAll(pattern)){
   let link=(match[2]??match[4]??'').trim().replaceAll('&amp;','&');
   if(!ext.test(link)||/^(https?:|\/\/|data:|blob:|#)/i.test(link)||/[{}]/.test(link))continue;
   const pathname=link.split(/[?#]/,1)[0];
   let decoded=pathname;
   try{decoded=decodeURIComponent(pathname)}catch{}
   const file=path.resolve(pathname.startsWith('/')?root:path.dirname(absolute),decoded.replace(/^\/+/,''));
   const found=file.startsWith(root+path.sep)&&fs.existsSync(file);
   const detail={page:rel,url:link};references.push(detail);
   if(!found)missing.push(detail);
  }
 }
}
walk(root);
const report={scope:'Literal HTML/CSS image references; excludes dynamic JS and real browser',
 scanned_pages:scanned.length,total_static_image_references:references.length,
 missing_static_image_references:missing,references};
fs.writeFileSync('site-media-static-report.json',JSON.stringify(report,null,2)+'\n');
console.log('Site media:',scanned.length,'HTML/CSS;',references.length,'image links;',missing.length,'missing');
for(const m of missing.slice(0,30))console.error('MISSING:',m.page,m.url);
process.exitCode=missing.length?1:0;
