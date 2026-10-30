import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {retrieve,riskGuard,RISK_MESSAGE} from "./retrieve.mjs";

const lib=JSON.parse(readFileSync(new URL("../../medical-terms.json",import.meta.url),"utf8")).items;

test("an exact term question returns that term first with its source",()=>{
 const r=retrieve("Τι είναι το αγγειακό εγκεφαλικό επεισόδιο;",lib);
 assert.equal(r[0].term,"Αγγειακό εγκεφαλικό επεισόδιο");
 assert.match(r[0].source,/^https:\/\//);
 assert.equal(r[0].id,"T1");
});

test("symbols and English names retrieve the term",()=>{
 assert.equal(retrieve("τι σημαίνει ΑΕΕ",lib)[0].term,"Αγγειακό εγκεφαλικό επεισόδιο");
 assert.equal(retrieve("stroke",lib)[0].term,"Αγγειακό εγκεφαλικό επεισόδιο");
});

test("passages are capped, ranked and carry only library fields",()=>{
 const r=retrieve("καρδιά αναπνοή κυκλοφορία",lib,{k:3});
 assert.ok(r.length<=3);
 for(const p of r){
  assert.deepEqual(Object.keys(p).sort(),["category","definition","id","score","source","sourceType","term"]);
 }
 for(let i=1;i<r.length;i++)assert.ok(r[i-1].score>=r[i].score);
});

test("unrelated or empty questions return nothing instead of guessing",()=>{
 assert.deepEqual(retrieve("τι καιρό θα κάνει αύριο στη Θεσσαλονίκη",lib),[]);
 assert.deepEqual(retrieve("",lib),[]);
 assert.deepEqual(retrieve("τι είναι",lib),[]);
 assert.deepEqual(retrieve("x",null),[]);
});

test("http and non-string sources never become links",()=>{
 const items=[{term:"Δοκιμή",definition:"Ορισμός δοκιμής.",source:"http://evil.example/x"}];
 assert.equal(retrieve("δοκιμή",items)[0].source,null);
});

test("risk guard blocks dosing, real-patient and diagnosis requests",()=>{
 for(const q of ["Πόσα mg αδρεναλίνης να δώσω;","Ποια είναι η δοσολογία της ασπιρίνης","Ο ασθενής μου έχει πόνο στο στήθος","Έχω έναν ασθενή που δεν αναπνέει","Τι έχει ο παππούς μου;","Κάνε μου διάγνωση"]){
  assert.equal(riskGuard(q).blocked,true,q);
 }
 assert.match(RISK_MESSAGE,/166/);
});

test("risk guard lets ordinary study questions through",()=>{
 for(const q of ["Τι είναι η ΚΑΡΠΑ;","Εξήγησέ μου την κυκλοφορία του αίματος","Τι σημαίνει ABCDE","Ποιος είναι ο ρόλος του απινιδωτή"]){
  assert.equal(riskGuard(q).blocked,false,q);
 }
});
