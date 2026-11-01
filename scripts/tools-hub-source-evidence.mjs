import {readFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {writeFileSync,mkdirSync} from 'node:fs';

const read=(root,path)=>readFileSync(resolve(root,path),'utf8');
const sha=(content)=>createHash('sha256').update(content).digest('hex');
function must(condition,label){if(!condition)throw Error('Evidence not verified: '+label)}
export function collectToolsHubEvidence(root=process.cwd()){
 const home=read(root,'index.html'),tools=read(root,'tools.html');
 const pageLinks=[...tools.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
 const verifiedReferences=['tools.html','navigation.js','theme-init.js','styles.css','home.css','protocols.html','mentor-protocol-suite.html'];
 const local=[...new Set([...pageLinks.filter(v=>!v.startsWith('#')&&!/^(?:https?:|mailto:|tel:)/i.test(v)),...verifiedReferences])];
 const inventory=[];
 for(const href of local){
   const path=href.split(/[?#]/)[0];
   must(Boolean(path)&&!path.startsWith('/')&&!path.split('/').includes('..'),'safe relative link '+href);
   must(existsSync(resolve(root,path)),'target exists '+href);
   const value=read(root,path);
   inventory.push({href,path,sha256:sha(value),bytes:Buffer.byteLength(value),title:(value.match(/<title[^>]*>([^<]+)/i)||[])[1]?.trim()||'not provided'});
 }
 const claims=[
  {id:'home-tools-entry',path:'index.html',verified:home.includes('href="tools.html"')&&home.includes('3D Ανατομία · Συνθετικό ΗΚΓ · Φαρμακολογία · Εικονικοί ασθενείς')},
  {id:'tools-not-official-ekab-protocols',path:'tools.html',verified:tools.includes('όχι επίσημες επιχειρησιακές οδηγίες ΕΚΑΒ')},
  {id:'protocol-lab-route',path:'protocols.html',verified:read(root,'protocols.html').includes('mentor-protocol-suite.html?topic=trauma&amp;view=lab')},
  {id:'protocol-debrief-route',path:'protocols.html',verified:read(root,'protocols.html').includes('mentor-protocol-suite.html?topic=trauma&amp;view=debrief')},
  {id:'protocol-not-certified',path:'protocols.html',verified:read(root,'protocols.html').includes('όχι δημοσιευμένα ή πιστοποιημένα επιχειρησιακά πρωτόκολλα ΕΚΑΒ')},
  {id:'protocol-notice-above-hero',path:'protocols.html',verified:read(root,'protocols.html').indexOf('protocol-release-notice')<read(root,'protocols.html').indexOf('<header class="hero">')},
  {id:'lab-notice-above-hero',path:'mentor-protocol-suite.html',verified:read(root,'mentor-protocol-suite.html').indexOf('protocol-release-notice')<read(root,'mentor-protocol-suite.html').indexOf('<header class="hero">')},
  {id:'MENTOR-clearly-demo',path:'tools.html',verified:tools.includes('MENTOR OS · Δοκιμαστική έκδοση')},
  {id:'ecg-synthetic-disclaimer',path:'mentor-ecg.html',verified:read(root,'mentor-ecg.html').includes('δεν είναι πιστό κλινικό ΗΚΓ')},
  {id:'patient-simulator-synthetic',path:'mentor-next.html',verified:read(root,'mentor-next.html').includes('Τα δεδομένα είναι συνθετικά')},
  {id:'seminars-not-certification',path:'seminar-prep.html',verified:read(root,'seminar-prep.html').toLowerCase().includes('δεν απονέμει πιστοποίηση')},
  {id:'anatomy-3d-description',path:'ui-tools/anatomy-3d/index.html',verified:read(root,'ui-tools/anatomy-3d/index.html').includes('Περιστροφή 360°')},
  {id:'pharmacology-target',path:'farmaka.html',verified:read(root,'farmaka.html').includes('Φαρμακολογία προνοσοκομειακής φροντίδας')},
  {id:'mentor-has-own-entry',path:'tools.html',verified:tools.includes('href="mentor-lab.html"')},
  {id:'one-h1',path:'tools.html',verified:(tools.match(/<h1(?:\s|>)/g)||[]).length===1},
  {id:'tool-hub-no-grading-writes',path:'tools.html',verified:!/(?:localStorage|sessionStorage)\.(?:setItem|removeItem|clear)\s*\(/.test(tools)}
 ];
 for(const c of claims)must(c.verified,c.id);
 const scope='Visible navigation, local link existence, matching on-page descriptions, absence of grading writes in tools.html; NOT clinical validity of linked tools';
 return {schema_version:1,scope,files:{'index.html':sha(home),'tools.html':sha(tools)},linked_targets:inventory,source_checks:claims,unverified_domains:['independent clinical validity of underlying teaching materials','official operational endorsement of individual protocols','formal BLS/ERC/other course certification','complete cross-device accessibility certification']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const doc=collectToolsHubEvidence(process.cwd());
 mkdirSync('audit-results',{recursive:true});
 writeFileSync('audit-results/tools-hub-source-evidence.json',JSON.stringify(doc,null,2)+'\n','utf8');
 console.log('PASS: tools hub evidence '+doc.linked_targets.length+' existing links and '+doc.source_checks.length+' source checks; no clinical certification claimed');
}
