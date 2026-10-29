import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const text=async(path)=>readFile(new URL(path,root),'utf8');
test('Mentor is accessible from home without replacing existing sections',async()=>{
 const html=await text('index.html');
 assert.match(html,/href="mentor-lab\.html"/);
 assert.match(html,/MENTOR OS/);
 assert.match(html,/ΔΟΚΙΜΑΣΤΙΚΟ/);
 assert.equal((html.match(/class="home-anatomy-single"/g)||[]).length,1,'3D Anatomy must have one dedicated entry');
 assert.equal((html.match(/class="home-mentor-single"/g)||[]).length,1,'Mentor must have one separate entry');
 for(const href of ['saek.html','eoppep.html','seminar-prep.html','ui-tools/anatomy-3d/index.html'])assert.ok(html.includes('href="'+href+'"'),href);
 assert.ok(html.indexOf('MENTOR OS')<html.indexOf('home-bottom-row'));
});
test('Official AED poster is linked and embedded with 2025 guidelines warning',async()=>{
 const html=await text('contacts.html');
 assert.match(html,/href="https:\/\/apinidotes\.crete\.gov\.gr\/files\/afisaBLS\.pdf"/);
 assert.match(html,/src="https:\/\/apinidotes\.crete\.gov\.gr\/files\/afisaBLS\.pdf#toolbar=0"/);
 assert.match(html,/Προβολή της επίσημης αφίσας εδώ/);
 assert.match(html,/2021/);
 assert.match(html,/https:\/\/www\.erc\.edu\/science-research\/guidelines\/guidelines-2025/);
 assert.match(html,/href="tel:112"/);assert.match(html,/href="tel:166"/);
 assert.ok(html.includes('id="aedNearbyMap"'));
 assert.ok(!html.includes('aed-first-aid-poster.webp'),'unreviewed locally hosted poster cannot be published');
});
test('No protected student scoring/sync or new media files',async()=>{
 const css=await text('home.css'),contactsCss=await text('contacts-aed.css');
 assert.match(css,/home-mentor-wrap/); assert.match(contactsCss,/aed-poster-frame iframe/);
 const html=await text('index.html');
 assert.ok(!html.includes('onclick='));
});


test('MENTOR cinematic entry has working voice controls and safe progressive enhancement',async()=>{
 const html=await text('index.html'),css=await text('home.css'),js=await text('mentor-home.js');
 for(const marker of ['id="mentor-home-listen"','id="mentor-home-stop"','id="mentor-home-voice"','class="mentor-cinema-wave"','src="mentor-home.js"'])
  assert.ok(html.includes(marker),marker);
 assert.match(css,/mentor-cinema/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(js,/speakGreek/);
 assert.doesNotMatch(js,/(?:localStorage|sessionStorage)\s*\.\s*(?:setItem|removeItem|clear)\s*\(/);
 assert.doesNotMatch(js,/(?:navigator\.mediaDevices\.getUserMedia|SpeechRecognition)\s*\(/);
 const {greekVoices,selectGreekVoice,speakGreek,supportsSpeech}=await import('../mentor-voice.mjs');
 const el={lang:'el-GR',name:'Melina',localService:true};
 const enhanced={lang:'el-GR',name:'Greek Enhanced',localService:true};
 const other={lang:'en-US',name:'English Premium',localService:true};
 assert.deepEqual(greekVoices([other,el,enhanced]),[enhanced,el]);
 assert.equal(selectGreekVoice([other,el,enhanced],'Melina'),el);
 const calls=[];
 const mock={speechSynthesis:{getVoices:()=>[other,enhanced],cancel:()=>calls.push('cancel'),speak:x=>calls.push(x)},
  SpeechSynthesisUtterance:class{constructor(value){this.text=value;}}};
 assert.equal(supportsSpeech(mock),true);
 assert.equal(speakGreek('Γεια σου',{env:mock,rate:1.9,pitch:1.8}),true);
 assert.equal(calls[0],'cancel');
 assert.equal(calls[1].lang,'el-GR');
 assert.equal(calls[1].voice,enhanced);
 assert.equal(calls[1].rate,1.12);
 assert.equal(calls[1].pitch,1.15);
 assert.equal(speakGreek('',{env:mock}),false);
});
