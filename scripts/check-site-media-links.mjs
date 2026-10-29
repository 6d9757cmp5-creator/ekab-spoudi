#!/usr/bin/env node
// Check literal image paths in every HTML/CSS file. Not a runtime or clinical test.
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), scanned=[], references=[], missing=[];
const scannedJs=[], jsReferences=[], jsMissing=[];
const srcsetReferences=[], srcsetMissing=[];
const ext=/\.(svg|png|jpe?g|webp|gif|avif)(?:[?#].*)?$/i;
function walk(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  if(['.git','node_modules','image-contact-sheets','.cache'].includes(item.name))continue;
  const absolute=path.join(dir,item.name);
  if(item.isDirectory()){walk(absolute);continue;}
  const isJS=/\.js$/i.test(item.name);
  // Root-level application JS and service worker only; vendor/test scripts are out of scope.
  if(isJS&&path.dirname(absolute)!==root)continue;
  if(!isJS&&!/\.(html?|css)$/i.test(item.name))continue;
  const rel=path.relative(root,absolute).replaceAll(path.sep,'/');
  if(isJS)scannedJs.push(rel);else scanned.push(rel);
  const source=fs.readFileSync(absolute,'utf8');
  // Literal image strings in JS include service-worker precache and direct DOM src values.
  // Computed URLs, registry-driven runtime image loading, and template interpolation remain out of scope.
  if(isJS){
   const jsPattern=/(['"`])((?:\.{1,2}\/|\/)?[^'"`\s<>\\]*?\.(?:svg|png|jpe?g|webp|gif|avif)(?:[?#][^'"`\s<>\\]*)?)\1/gi;
   for(const match of source.matchAll(jsPattern)){
    let link=match[2].trim();
    if(/^(https?:|\/\/|data:|blob:|#)/i.test(link)||/[{}]/.test(link))continue;
    const pathname=link.split(/[?#]/,1)[0];
    let decoded=pathname;
    try{decoded=decodeURIComponent(pathname)}catch{}
    const file=path.resolve(pathname.startsWith('/')?root:path.dirname(absolute),decoded.replace(/^\/+/,''));
    const found=file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile();
    const detail={page:rel,url:link};jsReferences.push(detail);
    if(!found)jsMissing.push(detail);
   }
   continue;
  }
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
  // Responsive HTML <img>/<source> srcset URLs are not covered by src/href.
  // Inspect only literal local candidates; data/remote URLs and computed values
  // still require browser review. Each descriptor (1x, 2x, 640w) is ignored.
  if(/\.html?$/i.test(item.name)){
   const srcsetPattern=/\b(?:srcset|data-srcset)\s*=\s*(['"])([\s\S]*?)\1/gi;
   for(const match of source.matchAll(srcsetPattern)){
    for(const candidate of match[2].split(',')){
     const link=candidate.trim().split(/\s+/,1)[0].replaceAll('&amp;','&');
     if(!ext.test(link)||/^(https?:|\/\/|data:|blob:|#)/i.test(link)||/[{}]/.test(link))continue;
     const pathname=link.split(/[?#]/,1)[0];
     let decoded=pathname;
     try{decoded=decodeURIComponent(pathname)}catch{}
     const file=path.resolve(pathname.startsWith('/')?root:path.dirname(absolute),decoded.replace(/^\/+/,''));
     const found=file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile();
     const detail={page:rel,url:link,attribute:'srcset'};
     references.push(detail);srcsetReferences.push(detail);
     if(!found){missing.push(detail);srcsetMissing.push(detail);}
    }
   }
  }
 }
}
walk(root);
const report={scope:'Literal HTML/CSS image references plus literal root-level application JS image paths; excludes computed JS URLs, runtime/browser and clinical review',
 scanned_pages:scanned.length,total_static_image_references:references.length,
 missing_static_image_references:missing,references,
 srcset_image_references:srcsetReferences.length,missing_srcset_image_references:srcsetMissing,
 scanned_js_files:scannedJs.length,total_literal_js_image_references:jsReferences.length,
 missing_literal_js_image_references:jsMissing,js_references:jsReferences};
fs.writeFileSync('site-media-static-report.json',JSON.stringify(report,null,2)+'\n');
console.log('Site media:',scanned.length,'HTML/CSS;',references.length,'image links;',missing.length,'missing;',srcsetReferences.length,'srcset;',scannedJs.length,'root JS;',jsReferences.length,'literal image paths;',jsMissing.length,'missing JS paths');
for(const m of missing.slice(0,30))console.error('MISSING:',m.page,m.url);
for(const m of jsMissing.slice(0,30))console.error('MISSING JS:',m.page,m.url);
process.exitCode=(missing.length||jsMissing.length)?1:0;
