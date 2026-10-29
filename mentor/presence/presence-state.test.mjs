import test from "node:test";
import assert from "node:assert/strict";
import {
 layoutOf,clampSize,clampPosition,snapToEdges,cornerPosition,nearestCorner,
 dockedBox,defaultPrefs,normalizePrefs,parsePrefs,serializePrefs,
 MARGIN,LIMITS
} from "./presence-state.mjs";

const desktop={w:1440,h:900},phone={w:390,h:844};

test("layout switches to mobile at 720px and below",()=>{
 assert.equal(layoutOf(390),"mobile");
 assert.equal(layoutOf(720),"mobile");
 assert.equal(layoutOf(721),"desktop");
});

test("size stays within layout limits and the visible screen",()=>{
 assert.deepEqual(clampSize({w:9999,h:9999},desktop,"desktop"),{w:LIMITS.desktop.maxW,h:LIMITS.desktop.maxH});
 assert.deepEqual(clampSize({w:1,h:1},desktop,"desktop"),{w:LIMITS.desktop.minW,h:LIMITS.desktop.minH});
 const tiny=clampSize({w:260,h:390},{w:300,h:300},"mobile");
 assert.ok(tiny.w<=300-2*MARGIN||tiny.w===LIMITS.mobile.minW);
 assert.deepEqual(clampSize(null,phone,"mobile"),{w:LIMITS.mobile.w,h:LIMITS.mobile.h});
});

test("position can never leave the visible area or enter safe areas",()=>{
 const size={w:200,h:300};
 const p=clampPosition({x:-500,y:-500},size,desktop);
 assert.deepEqual(p,{x:MARGIN,y:MARGIN});
 const q=clampPosition({x:99999,y:99999},size,desktop);
 assert.deepEqual(q,{x:desktop.w-size.w-MARGIN,y:desktop.h-size.h-MARGIN});
 const safe={top:47,right:0,bottom:34,left:0};
 const r=clampPosition({x:0,y:0},size,phone,safe);
 assert.equal(r.y,MARGIN+47);
 const s=clampPosition({x:0,y:99999},size,phone,safe);
 assert.equal(s.y,phone.h-size.h-MARGIN-34);
});

test("a missing position defaults to the bottom-right corner",()=>{
 const size={w:150,h:225};
 assert.deepEqual(clampPosition({x:null,y:null},size,phone),{x:phone.w-size.w-MARGIN,y:phone.h-size.h-MARGIN});
});

test("snapping only happens near an edge",()=>{
 const size={w:200,h:300};
 assert.deepEqual(snapToEdges({x:20,y:500},size,desktop),{x:MARGIN,y:500});
 assert.deepEqual(snapToEdges({x:700,y:400},size,desktop),{x:700,y:400});
 assert.equal(snapToEdges({x:desktop.w-size.w-MARGIN-10,y:100},size,desktop).x,desktop.w-size.w-MARGIN);
});

test("each pin corner is inside the screen and distinct",()=>{
 const size={w:200,h:300};
 const seen=new Set();
 for(const c of ["tl","tr","bl","br"]){
  const p=cornerPosition(c,size,desktop);
  assert.ok(p.x>=MARGIN&&p.y>=MARGIN&&p.x+size.w<=desktop.w-MARGIN&&p.y+size.h<=desktop.h-MARGIN);
  seen.add(p.x+","+p.y);
 }
 assert.equal(seen.size,4);
});

test("nearest corner follows the quadrant of the widget centre",()=>{
 const size={w:200,h:300};
 assert.equal(nearestCorner({x:10,y:10},size,desktop),"tl");
 assert.equal(nearestCorner({x:1200,y:10},size,desktop),"tr");
 assert.equal(nearestCorner({x:10,y:600},size,desktop),"bl");
 assert.equal(nearestCorner({x:1200,y:600},size,desktop),"br");
});

test("docked box is a side panel on desktop and a bottom sheet on mobile",()=>{
 const d=dockedBox(desktop,"desktop");
 assert.equal(d.edge,"right");assert.equal(d.x+d.w,desktop.w);assert.equal(d.h,desktop.h);
 const m=dockedBox(phone,"mobile");
 assert.equal(m.edge,"bottom");assert.equal(m.y+m.h,phone.h);assert.equal(m.w,phone.w);
 assert.ok(m.h<=phone.h*0.42+1);
});

test("defaults load MENTOR minimized so no WebGL context starts unrequested",()=>{
 const d=defaultPrefs();
 assert.equal(d.visibility,"minimized");
 assert.equal(d.mode,"floating");
});

test("corrupt or hostile stored values fall back safely",()=>{
 assert.deepEqual(parsePrefs("{not json"),defaultPrefs());
 assert.deepEqual(parsePrefs(null),defaultPrefs());
 const n=normalizePrefs({visibility:"exploding",mode:"x",corner:"zz",desktop:{w:"big",x:NaN},mobile:5});
 assert.equal(n.visibility,"minimized");assert.equal(n.mode,"floating");assert.equal(n.corner,"br");
 assert.equal(n.desktop.w,LIMITS.desktop.w);assert.equal(n.desktop.x,null);
 assert.equal(n.mobile.h,LIMITS.mobile.h);
});

test("desktop and mobile positions are stored separately and round-trip",()=>{
 const prefs=normalizePrefs({visibility:"shown",mode:"pinned",corner:"tl",
  desktop:{w:300,h:450,x:100,y:120},mobile:{w:140,h:210,x:5,y:6}});
 const back=parsePrefs(serializePrefs(prefs));
 assert.deepEqual(back,prefs);
 assert.notDeepEqual(back.desktop,back.mobile);
});
