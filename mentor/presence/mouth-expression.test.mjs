import test from "node:test";
import assert from "node:assert/strict";
import {shapesForWord,visemesForWord,wordAt,scheduleWord} from "./mouth.mjs";
import {CUES,cueForTurn} from "./expression.mjs";

test("Greek words become letter-level mouth shapes, digraphs and accents handled",()=>{
 assert.deepEqual(shapesForWord("μάμα"),["closed","open","closed","open"]);
 assert.deepEqual(shapesForWord("ουρά"),["round","wide","open"]);
 assert.deepEqual(shapesForWord("μπορώ"),["closed","round","wide","round"]);
 assert.deepEqual(shapesForWord("123 !"),[]);
});
test("word lookup and scheduling are bounded and end at rest",()=>{
 assert.equal(wordAt("Η καρδιά χτυπά",3),"καρδιά");
 assert.equal(wordAt("",5),"");
 const plan=scheduleWord("καρδιά",400);
 assert.equal(plan.at(-1).shape,"rest");
 assert.ok(plan.every((s,i)=>i===0||s.at>=plan[i-1].at));
 assert.deepEqual(scheduleWord("...",300),[]);
});
test("activity decides the expression: explaining, refusing on exam, reassuring on safety",()=>{
 assert.deepEqual(cueForTurn({role:"mentor",mode:"local"}),CUES.explain);
 assert.equal(cueForTurn({role:"mentor",mode:"refusal",reason:"exam"}).id,"examiner");
 assert.equal(cueForTurn({role:"mentor",mode:"refusal"}).id,"caring");
 assert.equal(cueForTurn({role:"user",text:"x"}),null);
 const known=["welcoming","supportive","caring","patient","explanatory","examiner","demanding","strict"];
 assert.ok(Object.values(CUES).every(c=>known.includes(c.id)),"ids the avatar understands");
});

test("each Greek letter group maps to one of the 14 face visemes and the schedule uses them",()=>{
 assert.deepEqual(visemesForWord("μάμα"),["pp","aa","pp","aa"]);
 assert.deepEqual(visemesForWord("ουρά"),["u","rr","aa"]);
 assert.deepEqual(visemesForWord("καρδιά"),["kk","aa","rr","th","i","aa"]);
 assert.deepEqual(visemesForWord("τσάι"),["ch","e"]);
 const keys=new Set(["aa","e","i","o","u","pp","ff","th","dd","kk","ch","ss","nn","rr","rest"]);
 assert.ok(scheduleWord("αναζωογόνηση",500).every(s=>keys.has(s.shape)));
});