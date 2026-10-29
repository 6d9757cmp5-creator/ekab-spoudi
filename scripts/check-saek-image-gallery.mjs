/* Registry-to-gallery integration guard. Does not certify image content. */
import {readFile,stat} from 'node:fs/promises';
const read=p=>readFile(p,'utf8');
const page=await read('saek-images.html');
const js=await read('saek-images.js');
const hub=await read('saek.html');
const sw=await read('sw.js');
const registry=JSON.parse(await read('saek-image-audit-2026.json'));
const errors=[];
for(const file of ['saek-images.html','saek-images.js','saek-images.css']){
 if(!sw.includes('./'+file))errors.push('Gallery missing offline asset: '+file);
 try{if(!(await stat(file)).isFile())errors.push('Missing gallery file: '+file)}catch{errors.push('Missing gallery file: '+file)}
}
if(!hub.includes('href="saek-images.html"'))errors.push('Missing SAEK hub image gallery link');
if(!page.includes('src="saek-images.js"')||!page.includes('href="saek-images.css"'))
 errors.push('Gallery page missing scripts/style');
if(!js.includes("fetch('saek-image-audit-2026.json')"))
 errors.push('Gallery does not load image registry');
if(!page.includes('imageGalleryGrid')||!page.includes('imageSemester')||!page.includes('imageCourse'))
 errors.push('Gallery page missing accessible filtering controls');
const chapters=registry.courses.reduce((n,c)=>n+c.chapters.length,0);
const placed=registry.courses.reduce((n,c)=>n+c.chapters.reduce((t,ch)=>t+ch.images.length,0),0);
const placedIds=new Set(registry.courses.flatMap(c=>c.chapters.flatMap(ch=>ch.images)));
if(registry.courses.length!==20||chapters!==247||!placed||[...placedIds].some(id=>!registry.assets[id]))
 errors.push('Expected 20 courses, 247 chapters and every placed image present in the registry');
console.log(JSON.stringify({courses:registry.courses.length,chapters,placedImages:placed,errors},null,2));
if(errors.length)process.exitCode=1;
