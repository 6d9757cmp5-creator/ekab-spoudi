/**
 * Pre-cleanup review — executes existing tests without mutating application state.
 * Explicit legacy tests are reported separately, never silently ignored.
 * Output: docs/audit-runtime/ci-results.json (generated artifact, not committed).
 * This is a technical test, not a clinical/medical certification.
 */
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readdirSync,statSync,readFileSync} from 'node:fs';
import {join,relative} from 'node:path';
const testCases=[
  ['SAEK structure','scripts/verify-saek.mjs'],
  ['EOPPEP catalogue','scripts/verify-eoppep.mjs'],
  ['Education quality','scripts/verify-education.mjs'],
  ['Pharmacology structure','scripts/verify-pharmacology.mjs'],
  ['Reader and SOS search','scripts/verify-reader-search.mjs'],
  ['Reader read/undo','scripts/verify-eoppep-read-progress.mjs'],
  ['SAEK read/storage','scripts/verify-saek-reader-safety.cjs'],
  ['Seminar sync','scripts/test-seminar-sync.cjs'],
  ['Progress merge','scripts/verify-sync.mjs'],
  ['Compressed sync','scripts/verify-sync-codec.mjs'],
  ['Personal notes','scripts/verify-notes-panel.mjs'],
  ['Floating notes','scripts/verify-notes-position.mjs'],
  ['Study scheduling','scripts/verify-study-scheduler.mjs'],
  ['Account OAuth','scripts/verify-account.mjs','--experimental-vm-modules'],
  ['Appwrite transport','scripts/verify-appwrite.mjs','--experimental-vm-modules'],
  ['AI feedback UI','scripts/verify-ai-feedback.mjs'],
  ['Profession acts','scripts/verify-profession-acts.mjs'],
  ['MENTOR unified core','scripts/test-mentor-v1-unified.cjs'],
  ['MENTOR source index','scripts/test-mentor-source-index.mjs'],
  ['MENTOR speech','scripts/test-mentor-voice.mjs'],
  ['MENTOR quick answers','scripts/test-mentor-quick-answer.mjs'],
  ['MENTOR protocols','scripts/test-mentor-protocols.mjs'],
  ['MENTOR debrief export','scripts/test-mentor-debrief-export.mjs'],
  ['MENTOR patient interview','scripts/test-mentor-patient-interview.mjs'],
  ['MENTOR roadmap','scripts/verify-mentor-roadmap.test.mjs'],
  ['Home progress panel','scripts/verify-progress-panel.cjs'],
  ['Release manifest','scripts/release_smoke.py','python3'],
];
const legacy=[
  ['Old home/Mentor snapshot','scripts/verify-home-mentor-aed.mjs'],
  ['Old procedural 3D snapshot','scripts/test-mentor-3d.mjs'],
  ['Old cinematic snapshot','scripts/test-mentor-cinematic.mjs']
];
const logs=[], errors=[];
function run(cmd,args,label,category){
  const output=spawnSync(cmd,args,{encoding:'utf8',timeout:45_000,maxBuffer:3_000_000});
  const msg=[output.stdout,output.stderr].filter(Boolean).join('\n').trim();
  const ok=output.status===0&&!output.error;
  logs.push({label,category,ok,exitCode:output.status,error:output.error?.message||null,log:msg.slice(-4000)});
  console.log((ok?'PASS ':'FAIL ')+category+' — '+label);
  if(!ok)console.error(msg.slice(-700));
  if(!ok&&category==='required')errors.push(label);
}
function recursive(directory){
  const found=[];
  for(const ent of readdirSync(directory,{withFileTypes:true})){
    if(['.git','node_modules','browser-qa-results','dist','build','.cache'].includes(ent.name))continue;
    const p=join(directory,ent.name);
    if(ent.isDirectory())found.push(...recursive(p));
    else if(ent.isFile())found.push(p);
  }
  return found;
}
const files=recursive('.');
const scripts=files.filter(p=>/\.(js|mjs|cjs)$/.test(p));
const jsons=files.filter(p=>/\.json$/.test(p));
let syntaxFailure=0,jsonFailure=0;
for(const file of scripts){const p=spawnSync('node',['--check',file],{encoding:'utf8',timeout:20_000});if(p.status!==0){console.error('Syntax error '+file+': '+p.stderr?.slice(0,500));syntaxFailure++;}}
for(const file of jsons){try{JSON.parse(readFileSync(file,'utf8'));}catch(e){console.error('JSON error '+file+': '+e.message);jsonFailure++;}}
logs.push({label:'All JavaScript syntax',category:'required',ok:syntaxFailure===0,files:scripts.length,failures:syntaxFailure});
logs.push({label:'All JSON parses',category:'required',ok:jsonFailure===0,files:jsons.length,failures:jsonFailure});
if(syntaxFailure)errors.push('JavaScript syntax');if(jsonFailure)errors.push('JSON');
for(const [name,path,flag] of testCases)run(flag==='python3'?'python3':'node',flag==='python3'?[path]:[...(flag?[flag]:[]),path],name,'required');
for(const [name,path,command] of legacy)run(command||'node',[path],name,'legacy-review');
mkdirSync('audit-results',{recursive:true});
writeFileSync('audit-results/pre-cleanup-tests.json',JSON.stringify({timestamp:new Date().toISOString(),scripts:scripts.length,jsonFiles:jsons.length,results:logs,requiredFailures:errors},null,2));
console.log('SUMMARY: '+logs.filter(x=>x.category==='required'&&x.ok).length+'/'+logs.filter(x=>x.category==='required').length+' required checks; '+logs.filter(x=>x.category==='legacy-review'&&x.ok).length+'/'+logs.filter(x=>x.category==='legacy-review').length+' legacy snapshots; legacy failures must be reviewed before deletion.');
if(errors.length){console.error('REQUIRED FAILURES: '+errors.join(', '));process.exitCode=1;}
