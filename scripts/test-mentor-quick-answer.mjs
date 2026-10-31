import test from "node:test";
import assert from "node:assert/strict";
import {matchMedicalTerm,isSimpleTermQuestion,answerStudyQuestion,loadMentorTermLibrary,OFFLINE_CORE_TERMS} from "../mentor/core/quick-answer.mjs";
const items=[
 {term:"Καρδιοπνευμονική αναζωογόνηση",symbols:["ΚΑΡΠΑ","CPR"],definition:"Θωρακικές συμπιέσεις και όπου ενδείκνυται αερισμοί.",source:"https://example.org/erc"},
 {term:"Πρωτογενής εκτίμηση ABCDE",symbols:["ABCDE"],definition:"Δομημένη αρχική εκτίμηση.",source:"https://example.org/guideline"}
];
test("answers Greek terms from local source records",()=>{
 assert.equal(matchMedicalTerm("Τι είναι ΚΑΡΠΑ;",items).term,items[0].term);
 assert.equal(matchMedicalTerm("Τι σημαίνει ABCDE;",items).term,items[1].term);
 const answer=answerStudyQuestion("Τι είναι ΚΑΡΠΑ;",{items});
 assert.equal(answer.type,"term");assert.match(answer.text,/Θωρακικές συμπιέσεις/);
 assert.equal(answer.source,"https://example.org/erc");
});
test("avoids invented answers",()=>{
 assert.equal(matchMedicalTerm("Τι σημαίνει καρπός;",items),null);
 assert.equal(answerStudyQuestion("Πόσα mg φαρμάκου;",{items}).type,"unavailable");
});
test("supports existing study planner",()=>{
 const r=answerStudyQuestion("Τι να μελετήσω;",{items});
 assert.equal(r.type,"study");
});
test("loads the local dictionary",async()=>{
 const terms=await loadMentorTermLibrary({fetcher:async path=>{
  assert.ok(path.endsWith("/medical-terms.json"),"dictionary resolves relative to Mentor module root");
  return {ok:true,json:async()=>({items})};
 }});
 assert.equal(terms.length,2);
});

test("bare Greek acronym never requires paid AI",()=>{
 for(const q of ["ΚΑΡΠΑ","καρπα","Τι είναι η ΚΑΡΠΑ;","Τι σημαίνει ΚΑΡΠΑ;","CPR"]){
  const response=answerStudyQuestion(q,{items});
  assert.equal(response.type,"term",q);
  assert.match(response.text,/Θωρακικές συμπιέσεις/);
 }
 const aed=answerStudyQuestion("AED",{items:OFFLINE_CORE_TERMS});
 assert.equal(aed.type,"term");
 assert.match(aed.text,/Συσκευή/);
 assert.match(answerStudyQuestion("ABCDE",{items:OFFLINE_CORE_TERMS}).text,/αεραγωγού/);
});

test("does not misinterpret advanced medical questions as simple glossary requests",()=>{
 const q="Πώς κάνουμε ΚΑΡΠΑ σε παιδί με πραγματικό περιστατικό;";
 assert.equal(isSimpleTermQuestion(q,items[0]),false);
 assert.equal(answerStudyQuestion(q,{items}).type,"unavailable");
 assert.equal(answerStudyQuestion("Τι είναι η ΚΑΡΠΑ και πότε δίνουμε αδρεναλίνη;",{items}).type,"unavailable");
});

test("offline core definitions work if the glossary request is unavailable",async()=>{
 assert.ok(OFFLINE_CORE_TERMS.length>=5);
 const terms=await loadMentorTermLibrary({fetcher:async()=>{throw Error("offline")}});
 assert.deepEqual(terms,OFFLINE_CORE_TERMS);
 assert.equal(answerStudyQuestion("ΚΑΡΠΑ",{items:terms}).type,"term");
});
