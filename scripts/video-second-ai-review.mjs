#!/usr/bin/env node
// Independent AI quality review of the actual exported MP4, not just a video URL.
// Requires ffmpeg/ffprobe and OPENAI_API_KEY. Read-only: never publishes or approves.
import {readFile,writeFile,mkdtemp,readdir,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';

const args=Object.fromEntries(process.argv.slice(2).filter((_,i)=>i%2===0).map((k,i)=>[k,process.argv.slice(2)[i*2+1]]));
const video=args['--video'],reference=args['--reference'],output=args['--report']||'video-ai-review-report.json';
const course=args['--course'],chapter=Number(args['--chapter']),publishedUrl=args['--published-url'];
const model=process.env.AI_VIDEO_REVIEW_MODEL||'gpt-4.1';
const key=process.env.OPENAI_API_KEY;
const fail=(message)=>{throw Error(message);};
if(!/^\d{2}$/.test(course||'')||Number(course)>20||Number(course)<1||!Number.isInteger(chapter)||chapter<1||chapter>50)fail('Invalid course/chapter');
if(!video||!reference||!publishedUrl||!/^https:\/\//.test(publishedUrl)||!key)fail('MP4, reviewed reference, published URL and OPENAI_API_KEY are required');
if(!reference.startsWith('video-reviews/references/')||!reference.endsWith('.md'))fail('Reference must be a reviewed Markdown file under video-reviews/references/');
const media=await readFile(video);
const digest=createHash('sha256').update(media).digest('hex');
const referenceText=await readFile(reference,'utf8');
if(referenceText.length<350||referenceText.length>35000||!referenceText.includes('Πηγές:'))fail('A 350–35000 character approved reference with a Πηγές: section is mandatory');
function command(binary,params){const r=spawnSync(binary,params,{encoding:'utf8',maxBuffer:10*1024*1024});if(r.status!==0)fail(binary+' failed: '+String(r.stderr||'').slice(-500));return r.stdout;}
const probe=JSON.parse(command('ffprobe',['-v','error','-show_entries','format=duration','-of','json',video]));
const duration=Number(probe.format?.duration);
if(!Number.isFinite(duration)||duration<10||duration>1200)fail('Invalid duration or greater than 20 minutes; divide into chapters');
const folder=await mkdtemp(join(tmpdir(),'ekab-review-'));
const result={schemaVersion:1,course,chapter,publishedUrl,videoSha256:digest,reference,referenceSha256:createHash('sha256').update(referenceText).digest('hex'),durationSeconds:Math.round(duration),model,reviewedAt:new Date().toISOString(),status:'hold',score:0,findings:[],limitations:['Sampling frames cannot verify every individual video frame','Second AI is not a substitute for an appropriate medical instructor']};
async function apiJson(url,options){const r=await fetch(url,options);const t=await r.text();if(!r.ok)fail('OpenAI API '+r.status+' '+t.slice(0,350));try{return JSON.parse(t)}catch{fail('Invalid OpenAI response')}}
async function ask(system,parts){const payload={model,temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:parts}]};const data=await apiJson('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(payload)});const answer=data.choices?.[0]?.message?.content;if(!answer)fail('Empty AI review');try{return JSON.parse(answer)}catch{fail('Reviewer did not return valid JSON')}}
function rubric(text){return 'You are a SECOND, INDEPENDENT medical education auditor. Do not trust the video generator. Compare ONLY supplied evidence and cite exact times/quotes; mark any unverified clinical, legal or source claims as uncertain. NEVER invent visual findings. Respond ONLY JSON: {"score":0-100,"critical":boolean,"findings":[{"timeSeconds":number|null,"severity":"critical|major|minor","category":"medical|visual|pedagogy|audio|coverage|source","reason":string,"fix":string}],"missingEvidence":[string]}. A critical error includes a dangerous intervention, incorrect anatomy or mismatched labeled medical visual. '+text;}
try{
 const audio=join(folder,'audio.mp3');
 command('ffmpeg',['-y','-v','error','-i',video,'-vn','-ac','1','-ar','16000','-b:a','64k',audio]);
 const voice=new FormData();voice.append('file',new Blob([await readFile(audio)],{type:'audio/mpeg'}),'audio.mp3');voice.append('model','whisper-1');voice.append('response_format','verbose_json');voice.append('language','el');
 const spoken=await apiJson('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+key},body:voice});
 const segments=(spoken.segments||[]).map(x=>({start:Number(x.start),end:Number(x.end),text:String(x.text||'')})).filter(x=>x.text);
 const transcript=String(spoken.text||segments.map(x=>x.text).join(' ')).trim();
 if(transcript.length<100)fail('Too little spoken content for a teaching audit');
 result.transcriptLength=transcript.length;
 const textReview=await ask(rubric('Focus on factual accuracy, omissions, explanations for novice rescuers, contraindications, professional limits and alignment with referenced approved curriculum.'),[{type:'text',text:'REFERENCE (not a substitute for primary sources):\n'+referenceText+'\n\nFULL SPOKEN TRANSCRIPT:\n'+transcript.slice(0,45000)}]);
 // Sample the actual rendered video evenly at <= 10 second intervals.
 const interval=10;
 command('ffmpeg',['-y','-v','error','-i',video,'-vf','fps=1/'+interval+',scale=768:-2','-q:v','4',join(folder,'frame-%04d.jpg')]);
 const frames=(await readdir(folder)).filter(x=>/^frame-\d+\.jpg$/.test(x)).sort();
 if(frames.length<2||frames.length>125)fail('Insufficient or excessive frame coverage');
 const visionReviews=[];
 for(let offset=0;offset<frames.length;offset+=12){
   const group=frames.slice(offset,offset+12),parts=[{type:'text',text:'COURSE '+course+' CHAPTER '+chapter+'\nREFERENCE:\n'+referenceText.slice(0,12500)+'\nCheck EVERY screenshot against spoken words near its exact timestamp: labels, anatomy, sequence, clinical demonstrations, Greek terminology, readability, pedagogy. Only claim things actually visible in the given screenshots.'}];
   for(let i=0;i<group.length;i++){
     const seconds=(offset+i)*interval;
     const nearby=segments.filter(s=>s.end>=seconds-8&&s.start<=seconds+10).map(s=>s.text).join(' ').slice(0,1600);
     parts.push({type:'text',text:'FRAME '+(offset+i+1)+' at '+seconds+' seconds. AUDIO NEAR FRAME: '+nearby});
     parts.push({type:'image_url',image_url:{url:'data:image/jpeg;base64,'+(await readFile(join(folder,group[i]))).toString('base64'),detail:'high'}});
   }
   visionReviews.push(await ask(rubric('Focus on visible anatomy, labels, signs, diagrams and whether each visual matches simultaneous narration. Do not infer what occurs in unsampled intervals.'),parts));
 }
 const valid=x=>x&&Number.isFinite(Number(x.score))&&Number(x.score)>=0&&Number(x.score)<=100&&typeof x.critical==='boolean'&&Array.isArray(x.findings)&&Array.isArray(x.missingEvidence);
 if(!valid(textReview)||!visionReviews.every(valid))fail('Invalid/incomplete AI judgments');
 const minVision=Math.min(...visionReviews.map(x=>Number(x.score)));
 result.scores={spokenAndTeaching:Number(textReview.score),visualMin:minVision,technical:100};
 result.findings=[...textReview.findings,...visionReviews.flatMap(x=>x.findings)];
 result.missingEvidence=[...textReview.missingEvidence,...visionReviews.flatMap(x=>x.missingEvidence)];
 result.critical=Boolean(textReview.critical||visionReviews.some(x=>x.critical));
 result.score=Math.round(0.55*Number(textReview.score)+0.40*minVision+0.05*100);
 result.frameIntervalSeconds=interval;result.framesReviewed=frames.length;
 result.status=(!result.critical&&!result.findings.some(f=>f.severity==='major'||f.severity==='critical')&&result.score>=90&&Number(textReview.score)>=90&&minVision>=90&&result.missingEvidence.length===0)?'ai_pass_human_review_required':'hold';
 result.humanApprovalRequired=true;
 await writeFile(output,JSON.stringify(result,null,2)+'\n');
 console.log('Second AI review: '+result.status+' — '+result.score+'/100 — '+result.findings.length+' findings. Human review required.');
 if(result.status!=='ai_pass_human_review_required')process.exitCode=2;
}finally{await rm(folder,{recursive:true,force:true})}
