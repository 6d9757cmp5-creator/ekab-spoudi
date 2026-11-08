#!/usr/bin/env node
/**
 * Adopt display copies made by nih3d-compress-models.mjs into the library: each accepted copy
 * replaces models/<accession>.glb and is recorded in display-copies.json with the size, SHA-256
 * and archive location of the verified original it was made from.
 *
 * usage: node scripts/nih3d-adopt-display-copies.mjs <compressed-dir>...
 * A directory holding EXTRACTED.json came from the release archive; otherwise the original must
 * be the ledger's chosen GLB.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {MODELS_DIR} from './nih3d-build-library.mjs';

const LEDGER='tools/atla-ai/resources/nih3d-verified-originals-2026.json';
const DISPLAY='tools/atla-ai/resources/nih3d-library/display-copies.json';
const readJson=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const exists=file=>fs.access(file).then(()=>true,()=>false);
const chooseGlb=model=>model.verifiedFiles.filter(f=>f.format==='GLB').sort((a,b)=>a.size-b.size||a.sha256.localeCompare(b.sha256))[0]??null;

const dirs=process.argv.slice(2);
if(!dirs.length)throw Error('usage: node scripts/nih3d-adopt-display-copies.mjs <compressed-dir>...');
const ledger=new Map((await readJson(LEDGER)).models.map(m=>[m.accession,m]));
const display=await readJson(DISPLAY);
let adopted=0,skipped=0;
for(const dir of dirs){
 const compressed=await readJson(path.join(dir,'COMPRESSED.json'));
 const extracted=await exists(path.join(dir,'EXTRACTED.json'))
  ?new Map((await readJson(path.join(dir,'EXTRACTED.json'))).extracted.map(e=>[e.accession,e])):null;
 if(compressed.settings!==display.settings)throw Error('Copies in '+dir+' were made with other settings: '+compressed.settings);
 for(const row of compressed.rows){
  if(row.problem){skipped++;continue;}
  const accession=row.file.replace(/\.glb$/,''),ledgerGlb=ledger.has(accession)?chooseGlb(ledger.get(accession)):null;
  let original;
  if(ledgerGlb){
   // The library serves the ledger's chosen file, so only a copy of that exact file may replace it.
   if(ledgerGlb.sha256!==row.originalSha256){skipped++;continue;}
   original={bytes:ledgerGlb.size,sha256:ledgerGlb.sha256,archive:{image:ledgerGlb.verifiedOCI.digest,file:ledgerGlb.verifiedOCI.filePath}};
  }else{
   const source=extracted?.get(accession);
   if(!source||source.sha256!==row.originalSha256)throw Error('No verified original recorded for '+accession);
   original={bytes:source.bytes,sha256:source.sha256,archive:{release:source.tag,package:source.package,file:source.archiveFilename}};
  }
  await fs.copyFile(path.join(dir,row.file),MODELS_DIR+row.file);
  display.models[accession]={entryId:ledger.get(accession)?.entryId??extracted.get(accession).entryId,original,
   display:{bytes:row.bytes,sha256:row.sha256,triangles:row.triangles,boundsDrift:row.boundsDrift}};
  adopted++;
 }
}
display.models=Object.fromEntries(Object.entries(display.models).sort(([a],[b])=>a.localeCompare(b)));
await fs.writeFile(DISPLAY,JSON.stringify(display,null,1)+'\n');
console.log('DISPLAY COPIES',JSON.stringify({adopted,skipped,total:Object.keys(display.models).length}));
