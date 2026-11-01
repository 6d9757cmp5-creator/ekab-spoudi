import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const read=(root,path)=>readFileSync(resolve(root,path),'utf8');
const sha=text=>createHash('sha256').update(text).digest('hex');
export function collectToolsHubEvidence(root=process.cwd()){
 const html=read(root,'tools.html'),home=read(root,'index.html');
 const links=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]).filter(x=>!x.startsWith('#')&&!/^(https?:|mailto:|tel:)/i.test(x));
 const inventory=[];
 for(const href of new Set(links)){
  const path=href.split(/[?#]/)[0];
  if(!path||path.startsWith('/')||path.split('/').includes('..')||!existsSync(resolve(root,path)))throw Error('Missing/unsafe tools link: '+href);
  const source=read(root,path);
  inventory.push({href,path,bytes:Buffer.byteLength(source),sha256:sha(source),title:(source.match(/<title[^>]*>([^<]+)/i)||[])[1]?.trim()||null});
 }
 const checks=[
  ['home-launches-tools',home.includes('href="tools.html"')],
  ['single-tool-directory',(html.match(/<h1(?:\s|>)/g)||[]).length===1],
  ['anatomy-3d',html.includes('href="ui-tools/anatomy-3d/index.html"')],
  ['ecg-lab',html.includes('href="mentor-ecg.html"')],
  ['clinical-cockpit',html.includes('href="mentor-next.html"')],
  ['protocols',html.includes('href="protocols.html"')&&html.includes('όχι επίσημες επιχειρησιακές οδηγίες ΕΚΑΒ')],
  ['eoppep',html.includes('href="eoppep.html"')],
  ['saek',html.includes('href="saek.html"')],
  ['separate-mentor-removed',!html.includes('href="mentor-lab.html"')],
  ['accurate-not-online-atlas',html.includes('θα συνδέει σταδιακά')],
  ['no-grading-writes',!/(?:localStorage|sessionStorage)\.(?:setItem|removeItem|clear)\s*\(/.test(html)],
  ['no-iframe',!/<iframe\b/i.test(html)],
  ['sources-present',inventory.length>=13]
 ].map(([id,verified])=>({id,verified}));
 for(const c of checks)if(!c.verified)throw Error('Tools hub evidence failed: '+c.id);
 return {schema_version:2,scope:'Structural tool directory and link integrity only; no evaluation of scientific correctness or live external services',files:{'index.html':sha(home),'tools.html':sha(html)},linked_targets:inventory,source_checks:checks,unverified_domains:['scientific/clinical correctness of linked content','official protocols endorsement','actual iOS Safari/browser-device tests','remote model or AI service availability','complete WCAG and offline PWA regression']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const report=collectToolsHubEvidence();
 mkdirSync('audit-results',{recursive:true});
 writeFileSync('audit-results/tools-hub-source-evidence.json',JSON.stringify(report,null,2)+'\n','utf8');
 console.log('PASS: '+report.linked_targets.length+' real links and '+report.source_checks.length+' checks; no scientific certification claimed');
}