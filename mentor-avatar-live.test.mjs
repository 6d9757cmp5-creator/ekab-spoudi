import test from "node:test";
import assert from "node:assert/strict";
import {chooseMouthShape,createMentorAvatar} from "./mentor-avatar-live.mjs";
import {speakGreek} from "./mentor-voice.mjs";

test("Greek shape estimation: open/wide/rounded/closed mouth",()=>{
 assert.equal(chooseMouthShape("Ά"),"open");
 assert.equal(chooseMouthShape("έ"),"wide");
 assert.equal(chooseMouthShape("ό"),"round");
 assert.equal(chooseMouthShape("μπ"),"closed");
 assert.equal(chooseMouthShape(""),"rest");
 assert.equal(chooseMouthShape("καλημέρα",1),"open");
});

test("avatar starts, consumes browser word boundaries and stops without persistence",()=>{
 const classes=new Set();let callback=null;
 const element={
   dataset:{viseme:"rest"},
   ownerDocument:{hidden:false,addEventListener(){}},
   querySelector(){return null},
   classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}
 };
 const clock={
  matchMedia:()=>({matches:false}),
  setInterval:fn=>{callback=fn;return 1},
  clearInterval:id=>{assert.equal(id,1);callback=null;}
 };
 const avatar=createMentorAvatar(element,{clock});
 avatar.start("Άλφα ωμέγα",{speed:1});
 assert.equal(classes.has("mentor-photo-speaking"),true);
 assert.equal(element.dataset.viseme,"wide");
 avatar.boundary({charIndex:0});
 assert.equal(element.dataset.viseme,"open");
 avatar.boundary({charIndex:5});
 assert.equal(element.dataset.viseme,"round");
 avatar.stop();
 assert.equal(classes.has("mentor-photo-speaking"),false);
 assert.equal(element.dataset.viseme,"rest");
 assert.equal(callback,null);
 avatar.destroy();
});

test("browser word-boundary events reach the external avatar controller",()=>{
 let utterance=null,cancelled=0,count=0;
 const env={SpeechSynthesisUtterance:class{constructor(text){this.text=text}},
  speechSynthesis:{getVoices:()=>[],cancel:()=>cancelled++,speak:u=>{utterance=u}}
 };
 assert.equal(speakGreek("Εκπαίδευση",{env,onBoundary:()=>count++}),true);
 assert.equal(utterance.lang,"el-GR");
 utterance.onboundary({charIndex:2});
 assert.equal(count,1);
 assert.equal(cancelled,1);
});
