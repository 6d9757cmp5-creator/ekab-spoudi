// Regression: the two existing Anatomy Lab entrypoints must open the combined view.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('tools/anatomy-3d/hires-anatomy.js','utf8');
assert.match(source,/const ui=\{sex:'male',mode:'both',/,'Combined skeleton+organs must be the initial state');
assert.match(source,/mode:\['skeleton','organs','both'\]\.includes\(mode\)\?mode:null/,'Explicit supported deep links must remain valid');
assert.match(source,/if\(deep\.mode\)ui\.mode=deep\.mode;/,'Explicit mode deep links must override the default');

for(const path of ['tools/anatomy-3d/index.html','ui-tools/anatomy-3d/index.html']){
 const html=readFileSync(path,'utf8');
 const choices=[...html.matchAll(/<button[^>]*data-mode="(skeleton|organs|both)"[^>]*>/g)];
 assert.equal(choices.length,3,path+': keep the three existing display choices');
 const controls=Object.fromEntries(choices.map(([tag,mode])=>[mode,tag]));
 for(const mode of ['skeleton','organs','both'])assert.ok(controls[mode],path+': missing '+mode);
 assert.match(controls.both,/class="active"/,path+': combined must be visibly selected');
 assert.match(controls.both,/aria-pressed="true"/,path+': combined must be accessible as selected');
 for(const mode of ['skeleton','organs']){
  assert.doesNotMatch(controls[mode],/class="active"/,path+': incorrect active '+mode);
  assert.match(controls[mode],/aria-pressed="false"/,path+': incorrect accessibility state '+mode);
 }
 assert.match(html,/id="modelTag">ΑΝΔΡΙΚΟ ΜΟΝΤΕΛΟ · ΣΥΝΔΥΑΣΜΟΣ/,path+': misleading initial label');
 assert.match(html,/hires-anatomy\.js\?v=default-combined-20261105/,path+': browser could reuse stale script');
 assert.match(html,/anatomy-full-atlas\.html/,path+': full atlas access must remain available');
}
console.log('PASS: combined initial 3D anatomy, both entrypoints, accessible controls, deep-link override and full atlas link');
