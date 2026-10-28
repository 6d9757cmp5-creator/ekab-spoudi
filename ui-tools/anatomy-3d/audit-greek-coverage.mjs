#!/usr/bin/env node
/** Full-mesh Greek naming audit. Reads exactly the two SHA-pinned atlases used
 * by the viewer, not a hand-picked subset. Writes inspectable missing labels.
 * This verifies completeness, NOT independent medical accuracy.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {anatomicalGreek} from './greek-names.js';
import {suggestGreek} from './greek-candidates.js';
const src=readFileSync(new URL('./hires-anatomy.js',import.meta.url),'utf8');
const sourceEntries=[...src.matchAll(/root:'(https:\/\/cdn\.jsdelivr\.net\/gh\/[^']+\/public\/models\/)'[\s\S]*?expectedParts:(\d+)/g)];
if(sourceEntries.length!==2)throw Error('Expected exactly two SHA-pinned anatomy sources');
const out=new URL('./translation-audit/',import.meta.url);
mkdirSync(out,{recursive:true});
const manifests=[];
let globalAll=0,globalTranslated=0,globalCandidates=0;
const frequencies=new Map(), untrans=new Map();
for(let k=0;k<sourceEntries.length;k++){
 const sex=k===0?'male':'female', [_,root,countRaw]=sourceEntries[k],expected=Number(countRaw);
 const response=await fetch(root+'atlas.json',{headers:{'User-Agent':'ekab-greek-terminology-coverage/1.0'}});
 if(!response.ok)throw Error(sex+': cannot fetch source manifest ('+response.status+')');
 const manifest=await response.json();
 if(manifest.parts.length!==expected)throw Error(sex+': source manifest unexpectedly changed');
 const entries=[], unresolved=[], translated=[], suggested=[];
 const perSystem={};
 for(const part of manifest.parts){
  const en=String(part.name||'').trim();
  if(!en)throw Error(sex+': empty anatomical part name');
  const el=anatomicalGreek(en);
  const system=part.system||'unknown';
  const ps=perSystem[system] ||= {total:0,translated:0};
  ps.total++;
  const record={id:part.id,system,sourceName:en};
  if(el){
   if(/[a-z]/i.test(el))throw Error('Latin characters in Greek term: '+JSON.stringify({en,el}));
   record.greekName=el;translated.push(record);ps.translated++;
  }else {
   unresolved.push(record);
   const candidate=suggestGreek(en);
   if(candidate){
    if(/[a-z]/i.test(candidate.el))throw Error('Latin characters in Greek candidate '+en+' => '+candidate.el);
    suggested.push({...record,suggestedGreek:candidate.el,status:'needs-medical-review',translationSource:candidate.source});
   }
   const key=en.toLowerCase();
   let x=untrans.get(key);
   if(!x){x={sourceName:en,systems:new Set(),sexes:new Set(),count:0};untrans.set(key,x);}
   x.systems.add(system);x.sexes.add(sex);x.count++;
   for(const w of key.match(/[a-z][a-z'-]*/g)||[])frequencies.set(w,(frequencies.get(w)||0)+1);
  }
  entries.push(record);
 }
 let coverage=translated.length/entries.length*100;
 globalAll+=entries.length;globalTranslated+=translated.length;
 const summary={sex,sourceRoot:root,total:entries.length,translated:translated.length,untranslated:unresolved.length,reviewCandidates:suggested.length,percent:+coverage.toFixed(2),systems:perSystem};
 globalCandidates+=suggested.length;
 writeFileSync(new URL(sex+'-translated.json',out),JSON.stringify({source:root,entries:translated},null,2)+'\n');
 writeFileSync(new URL(sex+'-missing.json',out),JSON.stringify({source:root,entries:unresolved},null,2)+'\n');
 writeFileSync(new URL(sex+'-suggestions-NEED-REVIEW.json',out),JSON.stringify({source:root,entries:suggested},null,2)+'\n');
 manifests.push(summary);
 console.log('Greek anatomy '+sex+': '+translated.length+'/'+entries.length+' translated ('+coverage.toFixed(1)+'%); missing '+unresolved.length);
 console.log('First 35 missing '+sex+': '+unresolved.slice(0,35).map(x=>x.sourceName).join(' | '));
}
const unique=[...untrans.values()].map(x=>({sourceName:x.sourceName,count:x.count,sexes:[...x.sexes],systems:[...x.systems]})).sort((a,b)=>b.count-a.count||a.sourceName.localeCompare(b.sourceName));
writeFileSync(new URL('unique-untranslated.json',out),JSON.stringify(unique,null,2)+'\n');
const common=[...frequencies].sort((a,b)=>b[1]-a[1]).slice(0,120).map(([name,count])=>({word:name,count}));
writeFileSync(new URL('top-untranslated-words.json',out),JSON.stringify(common,null,2)+'\n');
const final={generatedAt:new Date().toISOString(),meshes:globalAll,translated:globalTranslated,untranslated:globalAll-globalTranslated,unreviewedGreekSuggestions:globalCandidates,coverage:+(100*globalTranslated/globalAll).toFixed(2),uniqueUntranslated:unique.length,atlases:manifests};
writeFileSync(new URL('summary.json',out),JSON.stringify(final,null,2)+'\n');
console.log('Total '+final.translated+'/'+final.meshes+' Greek names; '+final.uniqueUntranslated+' unique English names to translate');
console.log('Additional raw Greek candidate phrases, NOT approved: '+globalCandidates+'/'+(globalAll-globalTranslated));
console.log('Common missing tokens:',common.slice(0,60).map(x=>x.word+'='+x.count).join(', '));
console.log('First 60 unique missing names:',unique.slice(0,60).map(x=>x.sourceName).join(' | '));
console.log('Machine verified label coverage only: NOT a medical expert certification.');
if(process.env.REQUIRE_ALL_GREEK==='1'&&final.untranslated)process.exitCode=1;
