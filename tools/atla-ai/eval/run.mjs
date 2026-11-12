#!/usr/bin/env node
/**
 * ATLA answer check: asks the live ATLA (in a real browser, as a student would) a fixed set of
 * 30 study questions and writes every answer to a Markdown report, to compare versions over time.
 * Usage: node tools/atla-ai/eval/run.mjs [site-url]   (writes tools/atla-ai/eval/report.md)
 * Needs Playwright. Reads nothing private; the questions are in questions.json next to this file.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const site=(process.argv[2]||'https://6d9757cmp5-creator.github.io/ekab-spoudi/').replace(/\/?$/,'/');
// The report always goes to the same file next to the questions, so runs can be compared in git.
const out=new URL('./report.md',import.meta.url);
const questions=JSON.parse(readFileSync(new URL('./questions.json',import.meta.url),'utf8'));
const browser=await chromium.launch();
let provider='';
const rows=[];
for(const [i,q] of questions.entries()){
 // A new browser profile for every question, so answers do not depend on each other.
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await context.newPage();
 page.on('response',r=>{if(/workers\.dev\/?$/.test(r.url())&&r.request().method()==='POST'){const t=r.headers()['x-atla-trace'];provider=r.headers()['x-atla-provider']||('http '+r.status()+(t?' · '+t:''))}});
 await page.goto(site+'index.html',{waitUntil:'load'});await page.waitForTimeout(1200);
 await page.locator('.atla-launcher').click();await page.waitForTimeout(500);
 provider='';
 await page.locator('[class*=atla] textarea:visible').first().fill(q.q);
 await page.locator('.atla-send').click();
 await page.waitForFunction(()=>!document.querySelector('.atla-send')?.disabled,null,{timeout:60000}).catch(()=>{});
 await page.waitForTimeout(800);
 const answer=(await page.locator('.atla-reply').last().innerText().catch(()=>'')).trim();
 rows.push({...q,answer,provider:provider||'τοπικό (χωρίς μοντέλο)',words:answer.split(/\s+/).filter(Boolean).length});
 process.stdout.write((i+1)+'/'+questions.length+' '+(provider||'local')+'\n');
 await context.close();
}
await browser.close();
const byModel={};for(const r of rows){const k=r.provider.replace(/\+cache$/,'');byModel[k]=(byModel[k]||0)+1}
const unsure=rows.filter(r=>/Δεν είμαι σίγουρος|δεν το έπιασα/i.test(r.answer)).length;
const md=['# Έλεγχος απαντήσεων ATLA','',`Σελίδα: ${site} · ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC · ${rows.length} ερωτήσεις`,'',
 '| | |','|---|---|',`| Απάντησε μοντέλο τεχνητής νοημοσύνης | ${rows.filter(r=>!/τοπικό|http [^2]/.test(r.provider)).length}/${rows.length} |`,
 `| «Δεν είμαι σίγουρος» | ${unsure}/${rows.length} |`,`| Μέσο μήκος απάντησης | ${Math.round(rows.reduce((a,r)=>a+r.words,0)/rows.length)} λέξεις |`,
 `| Ποιος απάντησε | ${Object.entries(byModel).map(([k,n])=>k+': '+n).join(' · ')} |`,'',
 ...rows.flatMap((r,i)=>[`## ${i+1}. ${r.q}`,`*${r.topic} · ${r.provider} · ${r.words} λέξεις*`,'',r.answer.replace(/\n/g,'\n\n')||'(καμία απάντηση)',''])].join('\n');
writeFileSync(out,md);
console.log('report: tools/atla-ai/eval/report.md','| model answers',rows.filter(r=>!/τοπικό|http [^2]/.test(r.provider)).length+'/'+rows.length,'| unsure',unsure);
