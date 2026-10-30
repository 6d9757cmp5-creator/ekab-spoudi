import test from "node:test";
import assert from "node:assert/strict";
import {kindOfPath,examMode,sanitizeAnnouncement,readPageContext,describeContext,composeQuestion,MAX_LABEL} from "./bridge.mjs";

test("exam pages and announced active exams switch MENTOR to no-answer mode",()=>{
 for(const p of ["/written_exam.html","/practical_exam.html","/exam_focus.html","/saek-exams.html","/app/saek-exams.html"])assert.equal(examMode(p),true,p);
 assert.equal(examMode("/saek-course-01.html"),false);
 assert.equal(examMode("/anatomia.html",{kind:"exam",active:true}),true);
 assert.equal(examMode("/anatomia.html",{kind:"exam",active:false}),false);
});

test("announcements accept only whitelisted kinds and bounded text",()=>{
 assert.equal(sanitizeAnnouncement({kind:"anatomy-object",label:"Καρδιά"}).label,"Καρδιά");
 assert.equal(sanitizeAnnouncement({kind:"password",label:"x"}),null);
 assert.equal(sanitizeAnnouncement({kind:"course"}),null);
 assert.equal(sanitizeAnnouncement(null),null);
 assert.equal(sanitizeAnnouncement({kind:"course",label:"α".repeat(500)}).label.length,MAX_LABEL);
 assert.equal(sanitizeAnnouncement({kind:"exam"}).kind,"exam");
});

test("page context reads only title, first heading and path",()=>{
 const brand={textContent:"ΕΚΑΒ Σπουδή v27",closest:()=>({})};
 const nav={textContent:"Μενού",closest:sel=>sel.includes("nav")?{}:null};
 const lesson={textContent:"Η καρδιά\n και τα αγγεία",closest:()=>null};
 const doc={title:"  Κυκλοφορικό  ",querySelectorAll:()=>[brand,nav,lesson]};
 const ctx=readPageContext(doc,{pathname:"/saek-course-05.html",search:"?secret=1",hash:"#x"});
 assert.deepEqual(ctx,{path:"/saek-course-05.html",kind:"course",title:"Κυκλοφορικό",heading:"Η καρδιά και τα αγγεία"});
 assert.equal(Object.keys(ctx).length,4);
});

test("the learner always sees what context is used, and can turn it off",()=>{
 const page={title:"T",heading:"Η καρδιά"};
 assert.match(describeContext({page,enabled:true,exam:false}),/Η καρδιά/);
 assert.match(describeContext({page,enabled:false,exam:false}),/απενεργοποιημένο/);
 assert.match(describeContext({page,enabled:true,exam:true}),/εξέταση/);
 assert.match(describeContext({page,enabled:false,exam:true}),/εξέταση/);
 assert.match(describeContext({page:{title:"",heading:""},enabled:true,exam:false}),/δεν υπάρχει/);
});

test("explicit selection wins over the typed question",()=>{
 const r=composeQuestion({question:"Τι είναι αυτό;",selection:"  υπογλυκαιμία  ",context:{enabled:true,page:{heading:"Σακχαρώδης διαβήτης"}}});
 assert.deepEqual(r,{text:"υπογλυκαιμία",used:"selection"});
});

test("a vague question borrows the page subject only when context is on",()=>{
 const base={page:{heading:"Η καρδιά"},exam:false};
 assert.deepEqual(composeQuestion({question:"Εξήγησέ μου αυτό",context:{...base,enabled:true}}),{text:"Εξήγησέ μου αυτό Η καρδιά",used:"page"});
 assert.deepEqual(composeQuestion({question:"Εξήγησέ μου αυτό",context:{...base,enabled:false}}),{text:"Εξήγησέ μου αυτό",used:"question"});
 assert.equal(composeQuestion({question:"Τι είναι η ΚΑΡΠΑ;",context:{...base,enabled:true}}).used,"question");
 assert.equal(composeQuestion({question:"Εξήγησέ μου αυτό",context:{...base,enabled:true,exam:true}}).used,"question");
});

test("empty input produces no question and long input is bounded",()=>{
 assert.equal(composeQuestion({question:"   "}).used,"none");
 assert.equal(composeQuestion({question:"α".repeat(900)}).text.length,300);
});

test("learning pages are recognised from their address only; oral practice is guided unless the learner starts an active exam",()=>{
 assert.equal(kindOfPath("/ekab-spoudi/saek-course-07.html"),"course");
 assert.equal(kindOfPath("/anatomia.html"),"anatomy-object");
 assert.equal(kindOfPath("/ui-tools/anatomy-3d/index.html"),"anatomy-object");
 assert.equal(kindOfPath("/mentor-scenarios.html"),"scenario");
 assert.equal(kindOfPath("/contacts.html"),"");
 assert.equal(examMode("/mentor-oral.html"),false);
 assert.equal(examMode("/mentor-oral.html",sanitizeAnnouncement({kind:"exam",active:true})),true);
 assert.equal(examMode("/mentor-oral.html",sanitizeAnnouncement({kind:"exam",active:false})),false);
 const text=describeContext({page:{kind:"course",heading:"Καρδιά"},announced:null,enabled:true,exam:false});
 assert.match(text,/μάθημα.*Καρδιά/);
});