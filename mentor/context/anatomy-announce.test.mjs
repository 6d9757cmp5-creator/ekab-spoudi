import test from "node:test";
import assert from "node:assert/strict";
import {anatomyContext} from "./anatomy-announce.mjs";
import {sanitizeAnnouncement,examMode} from "./bridge.mjs";

test("anatomy page: selection, exploration and a running self-test map to MENTOR contexts",()=>{
 assert.equal(anatomyContext({name:"Μηριαίο οστό",bannerHidden:false}).kind,"anatomy-object");
 assert.equal(anatomyContext({name:"Μηριαίο οστό",bannerHidden:true}).kind,"study-mode");
 assert.equal(anatomyContext({}).kind,"study-mode");
 const quiz=anatomyContext({quizOpen:true,quizStartHidden:true,name:"Μηριαίο οστό",bannerHidden:false});
 assert.equal(quiz.kind,"exam");
 assert.equal(examMode("/ui-tools/anatomy-3d/index.html",sanitizeAnnouncement(quiz)),true,"MENTOR stays silent during the self-test");
 assert.equal(examMode("/ui-tools/anatomy-3d/index.html",sanitizeAnnouncement(anatomyContext({quizOpen:true,quizStartHidden:false}))),false,"before the test starts MENTOR may explain");
 assert.ok(anatomyContext({name:"x ".repeat(200),bannerHidden:false}).label.length<=120);
});
