/* Floating notes: normalized per-device positions, viewport clamping and UI safety. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {clampFloating,ratiosForFloating,floatingFromRatios,readFloatingPosition,saveFloatingPosition,
 NOTES_FAB_POSITION,NOTES_WINDOW_POSITION,NOTES_FAB_HIDDEN_KEY,readFloatingVisibility,saveFloatingVisibility} from '../notes-position.js';
const approx=(a,b)=>assert(Math.abs(a-b)<.001,`Expected ${a} ≈ ${b}`);
const clip=(p,w,h,vw,vh,pad=12)=>{
 assert(p.left>=-0.01&&p.top>=-0.01);
 assert(p.left+w<=vw+0.01&&p.top+h<=vh+0.01);
 assert(p.left>=Math.min(pad,(vw-w)/2)-.01);
};
for(const viewport of [[390,844],[320,568],[1024,768],[1920,1080]]){
 const [vw,vh]=viewport;
 const w=130,h=50;
 for(const [x,y] of [[-500,-100],[200,300],[9999,9999],[0,0],[vw/2,vh/2]]){
  const p=clampFloating(x,y,w,h,vw,vh);
  clip(p,w,h,vw,vh);
  const ratios=ratiosForFloating(p.left,p.top,w,h,vw,vh);
  assert(ratios.x>=0&&ratios.x<=1&&ratios.y>=0&&ratios.y<=1);
  const restored=floatingFromRatios(ratios,w,h,vw,vh);
  approx(restored.left,p.left);approx(restored.top,p.top);
 }
}
const local=new Map();
const storage={getItem:key=>local.get(key)??null,setItem:(key,v)=>local.set(key,v),removeItem:key=>local.delete(key)};
assert.equal(readFloatingPosition(storage,NOTES_FAB_POSITION),null);
assert.equal(saveFloatingPosition(storage,NOTES_FAB_POSITION,{x:.74,y:.29}),true);
assert.deepEqual(readFloatingPosition(storage,NOTES_FAB_POSITION),{x:.74,y:.29});
const phone=floatingFromRatios(readFloatingPosition(storage,NOTES_FAB_POSITION),118,49,390,844);
const tablet=floatingFromRatios(readFloatingPosition(storage,NOTES_FAB_POSITION),118,49,1024,768);
clip(phone,118,49,390,844);clip(tablet,118,49,1024,768);
assert(phone.left!==tablet.left); // same relative position, resized to viewport
assert.equal(saveFloatingPosition(storage,NOTES_WINDOW_POSITION,{x:.3,y:.6}),true);
assert.notDeepEqual(readFloatingPosition(storage,NOTES_WINDOW_POSITION),readFloatingPosition(storage,NOTES_FAB_POSITION));
assert.equal(floatingFromRatios({x:-.1,y:1.1},118,49,390,844),null);
assert.equal(readFloatingPosition({getItem:()=>'{invalid'},NOTES_FAB_POSITION),null);
assert.equal(saveFloatingPosition({setItem:()=>{throw Error('quota')}} ,NOTES_FAB_POSITION,{x:.5,y:.5}),false);
assert.equal(floatingFromRatios({x:0,y:0},370,450,390,844).left,10);
const panel=clampFloating(-50,9999,374,510,390,844);clip(panel,374,510,390,844);
const js=fs.readFileSync('notes-panel.js','utf8');
const css=fs.readFileSync('notes-panel.css','utf8');
const upd=fs.readFileSync('updates.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert(js.includes("import { NOTES_FAB_POSITION, NOTES_WINDOW_POSITION"));
assert(js.includes("draggable(trigger,trigger,NOTES_FAB_POSITION)"));
assert(js.includes("draggable(dialog,$('ekabNotesDragHandle'),NOTES_WINDOW_POSITION)"));
assert(js.includes("handle.addEventListener('pointerdown'"));
assert(js.includes("handle.addEventListener('pointermove'"));
assert(js.includes("handle.addEventListener('pointerup'"));
assert(js.includes("handle.addEventListener('pointercancel'"));
assert(js.includes("handle.setPointerCapture"));
assert(js.includes("Math.hypot(dx,dy)<7")); // tap vs drag threshold
assert(js.includes("suppressDraggedClick")); // don't open after drag
assert(js.includes("restorePosition(trigger,NOTES_FAB_POSITION)"));
assert(js.includes("window.addEventListener('resize',refreshFloatingPositions)"));
assert(js.includes("resetFloatingPositions"));
assert(js.includes("event.altKey")); // keyboard option
assert(css.includes(".ekab-notes-fab.ekab-is-dragging"));
assert(css.includes("touch-action:none"));
assert(css.includes("background:#101d30"));
assert(css.includes("html[data-theme] .ekab-notes-dialog")); // both themes
assert(css.includes(".ekab-notes-drag-hint"));
const release=JSON.parse(fs.readFileSync('version.json','utf8')).version;
assert(upd.includes('notes-panel.js?v='+release));
assert(upd.includes('notes-panel.css?v='+release));
assert(upd.includes("CURRENT='"+release+"'"));
assert(sw.includes('"./notes-position.js"'));
assert(sw.includes("ekab-spoudi-v"+release));
assert(!js.includes("ekabGlobalSearch"));
// Visibility is a device-only UI choice, not a destructive notes change.
assert.equal(readFloatingVisibility(storage),false);
assert.equal(saveFloatingVisibility(storage,true),true);
assert.equal(storage.getItem(NOTES_FAB_HIDDEN_KEY),'1');
assert.equal(readFloatingVisibility(storage),true);
assert.equal(readFloatingVisibility({getItem:()=>{throw Error('denied')}}),false);
assert.equal(saveFloatingVisibility({setItem:()=>{throw Error('denied')}},true),false);
assert.equal(saveFloatingVisibility(storage,false),true);
assert.equal(storage.getItem(NOTES_FAB_HIDDEN_KEY),null);
assert.equal(readFloatingVisibility(storage),false);
assert(js.includes("setFloatingHidden(isFloatingHidden())"));
assert(js.includes("trigger.hidden=!!hidden"));
assert(js.includes("installVisibilityControl()"));
assert(js.includes("ekabNotesHideFloating"));
assert(js.includes("NOTES_FAB_HIDDEN_KEY"));
assert(js.includes("saveFloatingVisibility(localStorage,hidden)"));
assert(js.includes("window.addEventListener('storage'"));
assert(css.includes(".ekab-notes-fab[hidden]{display:none!important}"));
assert(css.includes(".ekab-notes-visibility-toggle"));
assert(js.includes("visibilityToggle.setAttribute('aria-label',label)"));
assert(js.includes("returnFocus=visibilityToggle"));
console.log('PASS: draggable notes, dark UI, persistent device-only full hide/restore, cross-tab visibility, keyboard movement, and independent search.');
