/**
 * ΕΚΑΒ Σπουδή: fast, reproducible chapter-to-image quality checks.
 * Usage: node scripts/check-saek-images.mjs [--remote]
 * Validates provenance, mapping, completeness and optional remote URLs.
 * Medical/anatomical interpretation still requires separate expert review.
 */
import { readFile, writeFile } from 'node:fs/promises';
const registry=JSON.parse(await readFile('saek-image-audit-2026.json','utf8'));
const errors=[],warnings=[],remote=[];
const addError=(detail)=>errors.push(detail);
const assets=registry.assets||{},courses=registry.courses||[];
const allowedLicenses=new Set(['Public domain','CC0 1.0','CC BY 4.0','CC BY-SA 3.0']);
const seenCourse=new Set();
const chosen=new Map();
if(courses.length!==20)addError('Αναμένονται 20 μαθήματα, βρέθηκαν '+courses.length);
for(const c of courses){
 if(seenCourse.has(c.course))addError('Διπλό μάθημα '+c.course);
 seenCourse.add(c.course);
 const expectedSemester=c.course<=6?'Α':c.course<=12?'Β':c.course<=16?'Γ':'Δ';
 if(c.semester!==expectedSemester)addError('Λανθασμένο εξάμηνο στο μάθημα '+c.course);
 if(!c.title)addError('Απουσία τίτλου μαθήματος '+c.course);
 for(const [idx,ch] of c.chapters.entries()){
  const key=String(c.course).padStart(2,'0')+'-'+String(idx+1).padStart(2,'0');
  if(ch.anchor!=='#lesson-'+(idx+1))addError('Λανθασμένος σύνδεσμος κεφαλαίου '+key);
  if(!Array.isArray(ch.images))addError('Μη έγκυρη λίστα εικόνων '+key);
  const pics=Array.isArray(ch.images)?ch.images:[];
  chosen.set(key,pics);
  if(new Set(pics).size!==pics.length)addError('Διπλή εικόνα στο '+key);
  for(const assetKey of pics)if(!assets[assetKey])addError('Άγνωστη εικόνα '+assetKey+' σε '+key);
  if(pics.length&&ch.status!=='source-selected-pending-independent-scientific-review')
   warnings.push('Επανέλεγχος σήμανσης κατάστασης στο '+key+': '+ch.status);
 }
}
const total=[...chosen.values()].length,assigned=[...chosen.values()].filter(a=>a.length>0).length;
if(total!==247)addError('Αναμένονται 247 κεφάλαια, βρέθηκαν '+total);
for(const [key,pics] of Object.entries(registry.placements||{})){
 if(!chosen.has(key))addError('Άγνωστο κεφάλαιο στη λίστα αντιστοίχισης '+key);
 else if(JSON.stringify(pics)!==JSON.stringify(chosen.get(key)))addError('Ασυμφωνία εικόνων κεφαλαίου '+key);
}
for(const [key,pics] of chosen){
 if(pics.length&&(!registry.placements||!registry.placements[key]))addError('Λείπει αντιστοίχιση '+key);
}
for(const [key,a] of Object.entries(assets)){
 if(!a.filename||!a.page||!a.author||!a.license||!a.title||!a.caption)addError('Λείπουν στοιχεία πηγής '+key);
 if(!a.page?.startsWith('https://commons.wikimedia.org/wiki/File:'))addError('Μη ελεγμένος τύπος URL '+key);
 if(!allowedLicenses.has(a.license))addError('Άγνωστη άδεια εικόνας '+key+': '+a.license);
 if(![...chosen.values()].some(p=>p.includes(key)))warnings.push('Πηγή χωρίς χρήση '+key);
}
const remoteCheck=process.argv.includes('--remote');
if(remoteCheck){
 await Promise.all(Object.entries(assets).map(async ([key,a])=>{
  const url='https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(a.filename);
  let controller=new AbortController(),timer=setTimeout(()=>controller.abort(),13000);
  try{
   const res=await fetch(url,{method:'HEAD',signal:controller.signal,headers:{'user-agent':'EKAB-Spoudi-Image-Review/1.0 (course source QA)'}});
   const type=res.headers.get('content-type')||'';
   remote.push({key,status:res.status,contentType:type,available:res.ok&&type.startsWith('image/')});
   if(res.status===404)errors.push('Πηγή εικόνας δεν βρέθηκε: '+key);
   else if(!res.ok||!type.startsWith('image/'))warnings.push('Δεν επιβεβαιώθηκε απευθείας εικόνα '+key+' ('+res.status+', '+type+')');
  }catch(e){remote.push({key,available:false,error:String(e)});warnings.push('Αποτυχία απομακρυσμένου ελέγχου '+key+': '+String(e));}
  finally{clearTimeout(timer);}
 }));
}
const bySemester={};
for(const c of courses){const n=bySemester[c.semester]||(bySemester[c.semester]={courses:0,chapters:0,sourceSelected:0});n.courses++;n.chapters+=c.chapters.length;n.sourceSelected+=c.chapters.filter(ch=>ch.images?.length).length;}
const report={
 generatedAt:new Date().toISOString(),semesters:bySemester,
 totalChapters:total,withSelectedSources:assigned,withoutSelectedSources:total-assigned,
 imageSources:Object.keys(assets).length,percentage:Math.round((assigned/total)*1000)/10,
 warnings,errors,remoteChecks:remote,
 medicalCertification:'NOT CERTIFIED: separate expert review required',
 liveDeployment:'NOT VERIFIED by this registry check'
};
await writeFile('saek-image-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({semesters:bySemester,selected:assigned,total,assets:report.imageSources,warnings:warnings.length,errors:errors.length,remote:remote.length},null,2));
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
