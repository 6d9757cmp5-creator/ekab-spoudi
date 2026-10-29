import test from "node:test";
import assert from "node:assert/strict";
import {matchMedicalTerm,answerStudyQuestion,loadMentorTermLibrary} from "../mentor/core/quick-answer.mjs";
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
  assert.equal(path,"./medical-terms.json");
  return {ok:true,json:async()=>({items})};
 }});
 assert.equal(terms.length,2);
});
