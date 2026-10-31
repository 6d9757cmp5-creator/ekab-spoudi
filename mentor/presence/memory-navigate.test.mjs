import test from "node:test";
import assert from "node:assert/strict";
import {
 appendTurn,loadTurns,clearTurns,historyForAi,normalizeTurn,loadLearning,saveLearning,normalizeLearning,
 CHAT_KEY,LEARNING_KEY,MAX_TURNS,MAX_TURN_CHARS
} from "./memory.mjs";
import {matchNavigation,ROUTES} from "./navigate.mjs";
import {existsSync} from "node:fs";
import {fileURLToPath} from "node:url";

const fakeStorage=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};

test("turns persist in order, are bounded and can be cleared",()=>{
 const s=fakeStorage();
 for(let i=0;i<20;i++)appendTurn(s,{role:i%2?"mentor":"user",text:"μήνυμα "+i});
 const t=loadTurns(s);
 assert.equal(t.length,MAX_TURNS);
 assert.equal(t.at(-1).text,"μήνυμα 19");
 assert.deepEqual(clearTurns(s),[]);
 assert.deepEqual(loadTurns(s),[]);
});

test("turn text is clipped, roles/modes validated and unsafe source links dropped",()=>{
 const t=normalizeTurn({role:"mentor",text:"α".repeat(5000),mode:"hack",sources:[{term:"Όρος",url:"javascript:alert(1)"},{term:"Άλλος",url:"https://x.example/y"},{term:""}]});
 assert.equal(t.text.length,MAX_TURN_CHARS);
 assert.equal(t.mode,"local");
 assert.deepEqual(t.sources,[{term:"Όρος",url:null},{term:"Άλλος",url:"https://x.example/y"}]);
 assert.equal(normalizeTurn({role:"system",text:"x"}),null);
 assert.equal(normalizeTurn({role:"user",text:"   "}),null);
});

test("corrupt storage does not throw",()=>{
 const s=fakeStorage();s.setItem(CHAT_KEY,"{{{");s.setItem(LEARNING_KEY,"nope");
 assert.deepEqual(loadTurns(s),[]);
 assert.deepEqual(loadLearning(s),{level:"student",autoSpeak:false,minimizeOnExam:false});
 const broken={getItem(){throw new Error("blocked");},setItem(){throw new Error("blocked");},removeItem(){throw new Error("blocked");}};
 assert.deepEqual(loadTurns(broken),[]);
 assert.doesNotThrow(()=>appendTurn(broken,{role:"user",text:"x"}));
});

test("AI history excludes refusals and info and carries text only",()=>{
 const turns=[{role:"user",text:"Q1",mode:"local",sources:[]},{role:"mentor",text:"A1",mode:"ai",sources:[{term:"T",url:null}]},
  {role:"user",text:"Q2",mode:"local",sources:[]},{role:"mentor",text:"no",mode:"refusal",sources:[]}];
 const h=historyForAi(turns);
 assert.deepEqual(h.map(x=>x.role),["user","assistant","user"]);
 assert.deepEqual(Object.keys(h[0]).sort(),["role","text"]);
});

test("learning preferences normalise and round-trip",()=>{
 const s=fakeStorage();
 assert.deepEqual(normalizeLearning({level:"god",autoSpeak:"yes"}),{level:"student",autoSpeak:false,minimizeOnExam:false});
 saveLearning(s,{level:"advanced",autoSpeak:true,minimizeOnExam:true});
 assert.deepEqual(loadLearning(s),{level:"advanced",autoSpeak:true,minimizeOnExam:true});
});

test("navigation needs an opening request and maps to allowlisted pages",()=>{
 assert.equal(matchNavigation("Άνοιξε την ανατομία").href,"anatomia.html");
 assert.equal(matchNavigation("πήγαινε στο ECG").href,"mentor-ecg.html");
 assert.equal(matchNavigation("άνοιξε τις εξετάσεις ΣΑΕΚ").href,"saek-exams.html");
 assert.equal(matchNavigation("Πάμε στα σεμινάρια").href,"seminar-prep.html");
 assert.equal(matchNavigation("Τι είναι η ανατομία;"),null);
 assert.equal(matchNavigation("άνοιξε https://evil.example"),null);
 assert.equal(matchNavigation(""),null);
});

test("every navigation target is a real same-site page, never an external URL",()=>{
 const root=fileURLToPath(new URL("../../",import.meta.url));
 for(const r of ROUTES){
  assert.match(r.href,/^[a-z0-9_-]+\.html$/i,r.href);
  assert.ok(existsSync(root+r.href),r.href+" is missing");
 }
});
