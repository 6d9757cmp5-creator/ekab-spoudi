#!/usr/bin/env node
/**
 * Basic site checks for every pull request and push (no dependencies, Node 22+).
 * 1. Every JavaScript module parses.
 * 2. Every JSON file parses.
 * 3. Every file the service worker caches exists.
 * 4. Every local link and script/style/image in the published pages points to a real file.
 * Exits 1 with a list of problems; prints a short summary otherwise.
 */
import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {join,dirname,relative,extname,posix} from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd();
const problems=[];
const fail=(kind,where,what)=>problems.push(kind+' · '+where+' · '+what);

// Folders that are not part of the site or are third-party/archived.
const SKIP=new Set(['.git','node_modules','vendor','third_party','audit-results','docs','functions','workers','services','scripts']);
const SKIP_PATHS=['tools/atla-ai/knowledge-base/full-books/complete','tools/anatomy-3d/resources','tools/patient-simulator/resources/nih3d-approved','tools/atla-ai/resources/nih3d-'];
function walk(dir,out=[]){
 for(const name of readdirSync(dir)){
  const full=join(dir,name),rel=relative(ROOT,full).replace(/\\/g,'/');
  if(SKIP.has(name)||SKIP_PATHS.some(p=>rel.startsWith(p)))continue;
  const st=statSync(full);
  if(st.isDirectory())walk(full,out);else out.push(rel);
 }
 return out;
}
const files=walk(ROOT);

// 1. JavaScript syntax.
const scripts=files.filter(f=>/\.(mjs|js)$/.test(f)&&!/\.min\.js$/.test(f));
for(const f of scripts){
 try{execFileSync(process.execPath,['--check',f],{stdio:'pipe'})}
 catch(e){fail('JS',f,String(e.stderr||e.message).split('\n').find(l=>/Error/.test(l))||'syntax error')}
}

// 2. JSON.
const jsons=files.filter(f=>f.endsWith('.json')&&statSync(f).size<60e6);
for(const f of jsons){try{JSON.parse(readFileSync(f,'utf8'))}catch(e){fail('JSON',f,e.message)}}

// 3. Service worker cache list.
const sw=readFileSync('sw.js','utf8');
const assets=JSON.parse(sw.match(/const ASSETS=(\[[\s\S]*?\]);/)?.[1]||'[]');
if(!assets.length)fail('SW','sw.js','ASSETS list not found');
for(const a of assets){const p=decodeURI(a.replace(/^\.\//,'').split(/[?#]/)[0]);if(p&&!existsSync(p))fail('SW','sw.js','missing '+a)}

// 4. Local references in published HTML pages.
const pages=files.filter(f=>f.endsWith('.html')&&!/(^|\/)(ekab-ui-v1|ekab-intelligent-v2|paramind-inspired-preview|pr6-images-preview)\.html$/.test(f));
const ATTR=/\b(?:href|src)\s*=\s*["']([^"'<>{}$]+)["']/gi;
let refs=0;
for(const page of pages){
 const html=readFileSync(page,'utf8').replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>(?!\s*<\/script>)[\s\S]*?<\/script>/gi,m=>/^<script[^>]*\bsrc=/i.test(m)?m.replace(/>[\s\S]*$/,'>'):'');
 for(const [,url] of html.matchAll(ATTR)){
  if(/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url))continue;      // external, data:, mailto:, anchors
  const path=decodeURI(url.split(/[?#]/)[0]);if(!path)continue;
  const target=path.startsWith('/')?path.replace(/^\/(ekab-spoudi\/)?/,''):posix.join(dirname(page),path);
  refs++;
  const ok=existsSync(target)&&(!statSync(target).isDirectory()||existsSync(join(target,'index.html')));
  if(!ok)fail('LINK',page,url);
 }
}

if(problems.length){
 console.error(problems.length+' problem(s):\n'+problems.join('\n'));
 process.exit(1);
}
console.log('OK · '+scripts.length+' scripts, '+jsons.length+' JSON files, '+assets.length+' cached files, '+refs+' local links in '+pages.length+' pages');
