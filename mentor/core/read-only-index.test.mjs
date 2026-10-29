import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SOURCES,parsePublishedSource,transformSource,searchRecords,safeAppHref,fold} from "./read-only-index.mjs";
import {readLegacySnapshot} from "./legacy-readonly.mjs";

test("all declared read-only sources parse as existing content, without executing source JS",()=>{
 let entries=[];
 for(const source of SOURCES){
  const data=readFileSync(new URL("../../"+source.file,import.meta.url),"utf8");
  const parsed=parsePublishedSource(source,data);
  const result=transformSource(source,parsed);
  assert.ok(result.length>0,source.file+" should expose records");
  assert.ok(Object.isFrozen(result));
  entries.push(...result);
 }
 assert.ok(entries.filter(x=>x.kind==="saek").length>=247);
 assert.equal(entries.filter(x=>x.kind==="eoppep").length,314);
 assert.equal(entries.filter(x=>x.kind==="sos").length,314);
 assert.ok(entries.filter(x=>x.kind==="pharma").length>=65);
 assert.ok(entries.filter(x=>x.kind==="seminar").length>=20);
 assert.ok(entries.filter(x=>x.kind==="pages").length>=100);
 assert.ok(entries.every(x=>Object.isFrozen(x)));
 assert.ok(entries.every(x=>x.href===null||safeAppHref(x.href)===x.href));
 const example=searchRecords(entries,"ρινικων κοιλοτητων","eoppep");
 assert.ok(example.total>0,"Greek diacritics-insensitive EOPPEP search");
 assert.match(example.rows[0].body,/αέρα|αναπνοή/);
 const anatomy=searchRecords(entries,"ανατομική θέση","saek");
 assert.ok(anatomy.total>0);
 const medicine=searchRecords(entries,"Αδρεναλίνη","pharma");
 assert.ok(medicine.total>0);
 const empty=searchRecords(entries,"test-improbable-xyz","all");
 assert.equal(empty.total,0);
});

test("allowlist, safe local links and no arbitrary code",()=>{
 assert.equal(safeAppHref("saek-course-01.html#lesson-1"),"saek-course-01.html#lesson-1");
 for(const url of ["javascript:alert(1)","../../admin","//external.com","https://example.com","../theory.html","theory.html?q=secret","/index.html"]){
  assert.equal(safeAppHref(url),null,url);
 }
 assert.equal(fold("ΆΝΩ ΚΑΤΩ - Εξέταση"),"ανω κατω - εξεταση");
 assert.throws(()=>parsePublishedSource({file:"private.json",kind:"pages"},"{}"),/source-not-allowlisted/);
 assert.throws(()=>parsePublishedSource(SOURCES.find(x=>x.kind==="pharma"),"window.EKAB_PHARMA =(()=>{localStorage.clear()})();"),/pharma-format/);
});

test("legacy progress snapshot needs only getItem/key/length and never writes",()=>{
 const memory=new Map([["ekab.saek.read.v1.01.1","1"],
  ["ekab-eoppep-official-v15",JSON.stringify({"EOP-A-001":{selfAttempts:3}})],
  ["ekab.saek.exams.v1",JSON.stringify({history:{"saek-01-1":{correct:1}}})]]);
 const storage={get length(){return memory.size},key:i=>[...memory.keys()][i],
  getItem:k=>memory.get(k)||null,
  setItem(){throw Error("READ-ONLY VIOLATION")},
  removeItem(){throw Error("READ-ONLY VIOLATION")},
  clear(){throw Error("READ-ONLY VIOLATION")}};
 const snapshot=readLegacySnapshot(storage);
 assert.equal(snapshot.saek_read_records,1);
 assert.equal(snapshot.saek_exam_question_records,1);
 assert.equal(snapshot.eoppep_attempt_records,1);
 assert.equal(memory.size,3);
});

test("reader code has no legacy writes or API operations",()=>{
 const reader=readFileSync(new URL("../../mentor-readonly.js",import.meta.url),"utf8");
 assert.doesNotMatch(reader,/\b(?:setItem|removeItem|indexedDB\.open|fetch\s*\(\s*["']https?:\/\/|POST|PUT|PATCH|DELETE|cloudSync|saveProgress|gradeAnswer)\b/);
 assert.doesNotMatch(reader,/\b(?:localStorage|sessionStorage)\s*\.\s*(?:clear|setItem|removeItem)\s*\(/);
 assert.match(reader,/method:"GET"/);
});
