import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const raw=file=>readFileSync(new URL('../'+file,import.meta.url));
test('Cinematic user-approved full-body asset and 3 training images are actual WebP',()=>{
  for(const path of ['assets/mentor-cinematic.webp','assets/mentor-scenario-thumbs.webp']){
    const bytes=raw(path);
    assert.ok(bytes.length>5000,path);
    assert.equal(bytes.subarray(0,4).toString(),'RIFF');
    assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  }
});
test('Cinematic MENTOR page has visible character, modes, answers and actual study links',()=>{
  const html=read('mentor-lab.html');
  for(const file of ['mentor-cinematic.mjs','mentor/styles/mentor-cinematic.css','mentor-real3d.bundle.mjs'])
    assert.ok(html.includes(file),file);
  for(const id of ['mentor-cinematic-stage','mentor-hero-form','mentor-presence-line','mentor-hero-question','mentor-real3d-canvas','mentor-avatar'])
    assert.ok(html.includes('id="'+id+'"'),id);
  for(const mode of ['hologram','voice','text'])
    assert.ok(html.includes('data-cinematic-mode="'+mode+'"'));
  for(const url of ['mentor-live.html','mentor-scenarios.html','seminar-prep.html'])
    assert.ok(html.includes('href="'+url+'"'),url);
});
test('No fake 3D claims or unconsented AI and no legacy student state writes',()=>{
  const js=read('mentor/avatar/cinematic.mjs'),css=read('mentor/styles/mentor-cinematic.css'),hologram=read('mentor/avatar/hologram.mjs');
  assert.match(js,/δεν είναι ακόμη πλήρες 3D/);
  assert.match(hologram,/setView\("photo"\)/);
  assert.match(css,/mentor-intro-visual>.mentor-3d-panel/);
  assert.doesNotMatch(js,/indexedDB|localStorage|sessionStorage|fetch\(|XMLHttpRequest|geolocation|SpeechRecognition|openai/i);
  assert.doesNotMatch(css,/@import|url\(['"]?https?:/i);
});
test('Responsive mobile first layout and reduced motion safety',()=>{
  const css=read('mentor-cinematic.css');
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
});
