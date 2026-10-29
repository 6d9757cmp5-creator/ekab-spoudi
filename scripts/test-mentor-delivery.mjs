import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseMentorDelivery,deliverySpeechSettings,publicDeliveryCue,MENTOR_DELIVERY} from '../mentor/core/presence-director.mjs';
import {greekVoices,isKnownMaleGreekVoice,resolveMentorGreekVoice,speakGreek,stopGreek} from '../mentor-voice.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const overview=(needs_review,practiced=0,attempts=0)=>({competencies:{scene:{needs_review,practiced,attempts}}});
test('One autonomous teacher covers eight styles without changing medical facts',()=>{
 const combinations=[
  [{},'welcoming'],
  [{intent:'explain'},'explanatory'],
  [{intent:'exercise'},'examiner'],
  [{intent:'exercise',overview:overview(0,5,9)},'demanding'],
  [{intent:'focus',overview:overview(4)},'patient'],
  [{intent:'progress',overview:overview(5)},'supportive'],
  [{intent:'explain',corrected:true,overview:overview(3)},'caring'],
  [{intent:'exercise',safety:true},'strict'],
  [{intent:'exam'},'examiner'],
  [{intent:'focus',repeatedHelp:true},'patient']
 ];
 for(const [input,expected] of combinations){
   const mood=chooseMentorDelivery(input);
   assert.equal(mood.id,expected,JSON.stringify(input));
   assert.equal(typeof mood.rate,'number');
   assert.equal(typeof mood.gesture,'string');
   assert.ok(mood.rate>=.8&&mood.rate<=1.12);
 }
 assert.equal(Object.keys(MENTOR_DELIVERY).length,8);
 assert.deepEqual(publicDeliveryCue({id:'strict',gesture:'caution',expression:'serious',posture:'upright'}),{
   id:'strict',gesture:'caution',expression:'serious',posture:'upright'
 });
});
test('Teacher voice dynamics follow lesson style, with safe pitch/rate/intensity bounds',()=>{
 const strict=deliverySpeechSettings(chooseMentorDelivery({safety:true}),.95);
 const caring=deliverySpeechSettings(chooseMentorDelivery({corrected:true,overview:overview(3)}),.95);
 const explaining=deliverySpeechSettings(chooseMentorDelivery({intent:'explain'}),.95);
 assert.ok(strict.pitch<caring.pitch);
 assert.ok(caring.rate<explaining.rate);
 assert.ok(strict.volume>caring.volume);
 assert.ok(deliverySpeechSettings(chooseMentorDelivery(),999).rate<=1.12);
});
test('Known Greek male voice receives priority over female and unknown; no fake gender',()=>{
 const athina={lang:'el-GR',name:'Microsoft Athina',voiceURI:'el-GR-AthinaNeural',localService:false};
 const nestoras={lang:'el_GR',name:'Microsoft Nestoras',voiceURI:'el-GR-NestorasNeural',localService:true};
 const unknown={lang:'el-GR',name:'Generic Greek',voiceURI:'el-GR',localService:true};
 const english={lang:'en-US',name:'Male John',voiceURI:'en-US',localService:true};
 assert.deepEqual(greekVoices([athina,english,unknown,nestoras]).map(x=>x.name),['Microsoft Nestoras','Generic Greek','Microsoft Athina']);
 assert.equal(isKnownMaleGreekVoice(nestoras),true);
 assert.equal(isKnownMaleGreekVoice(athina),false);
 assert.equal(resolveMentorGreekVoice([athina,nestoras]).maleVerified,true);
 assert.equal(resolveMentorGreekVoice([athina,unknown]).maleVerified,false);
 assert.match(resolveMentorGreekVoice([]).label,/Δεν βρέθηκε/);
 assert.equal(resolveMentorGreekVoice([athina,nestoras],'Microsoft Athina').voice,athina);
 const greekName={lang:'el-GR',name:'Νέστορας'};
 assert.equal(isKnownMaleGreekVoice(greekName),true);
});
test('Web Speech receives exact chosen voice and adaptive parameters without recording or AI',()=>{
 const calls=[];
 class SpeechSynthesisUtterance {constructor(text){this.text=text;}}
 const nestoras={lang:'el-GR',name:'Nestoras',voiceURI:'Nestoras',localService:true};
 const env={SpeechSynthesisUtterance,speechSynthesis:{
   getVoices:()=>[nestoras],
   cancel:()=>calls.push('cancel'),
   speak:u=>calls.push(u)
 }};
 let selection=null;
 const ok=speakGreek('Γεια σου. Θα εξασκηθούμε μαζί.',{
   env,rate:.86,pitch:.96,volume:.88,onVoiceResolved:x=>selection=x
 });
 assert.equal(ok,true);
 assert.equal(selection.maleVerified,true);
 assert.equal(calls.length,2);
 assert.equal(calls[1].voice,nestoras);
 assert.equal(calls[1].lang,'el-GR');
 assert.equal(calls[1].pitch,.96);
 assert.equal(calls[1].volume,.88);
 assert.equal(calls[1].rate,.86);
 stopGreek(env);
 assert.equal(calls.at(-1),'cancel');
});
test('Classroom events and rig consume the same delivery; no manual mood chooser',()=>{
 const classroom=read('mentor-lab.js');
 const rig=read('mentor/real-avatar/entry.mjs');
 const html=read('mentor-lab.html');
 assert.match(classroom,/mentor:presence/);
 assert.match(classroom,/deliverySpeechSettings/);
 assert.match(rig,/mentor:presence/);
 assert.match(rig,/mentorMood/);
 assert.match(rig,/mood\.smile/);
 assert.match(html,/id="mentor-male-voice-status"/);
 assert.match(html,/id="mentor-delivery-status"/);
 assert.doesNotMatch(html,/id="manual-personality"/);
});
