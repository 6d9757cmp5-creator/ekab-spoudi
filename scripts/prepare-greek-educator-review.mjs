/**
 * Two-blind-reviewer preparation for EKAB Spoudi's PROVISIONAL Greek examples.
 * No model calls. No learner information. Never outputs the provisional labels
 * or fixture-generation hints in the reviewer packet.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {QUESTIONS as mentor} from '../mentor/core/oral-practice.mjs';

const read = path => JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const fixture=read('../functions/answer-grader/greek-answer-fixtures.json');
const eop=read('../functions/answer-grader/eoppep-rubrics.json');
const saek=read('../functions/answer-grader/saek-exam-rubrics.json');
const seminars=read('../functions/answer-grader/seminar-rubrics.json');
const eopBank=new Map(eop.map(x=>[x.id,x]));
const saekBank=new Map(saek.items.map(x=>[x.id,x]));
const oralBank=new Map(mentor.map(x=>[x.id,x]));
const hash = id => createHash('sha256').update('ekab-review-v1:'+id).digest('hex');
const topic = c => c.section+':'+(c.questionId || c.courseId+':'+(c.caseIndex??c.questionIndex));
const SECTION_TARGETS={eoppep:12,saek:10,mentor_oral:4,seminar:2,seminar_case:2};

export function selectReviewCases(cases,perLabel=30){
 const source=cases.filter(x=>x.provenance==='synthetic_written_for_regression' &&
   x.reviewStatus==='pending_independent_educator_review' &&
   x.fixtureGeneration!=='deterministic_source_preserving');
 const selected=[],used=new Set(),topics=new Set();
 for(const label of ['correct','partial','incorrect','uncertain']){
  const candidates=source.filter(x=>x.expected===label).sort((a,b)=>hash(a.id).localeCompare(hash(b.id)));
  let picked=[];
  // Prefer distinct questions, and sample across every educational section.
  for(const section of Object.keys(SECTION_TARGETS)){
   const priority=candidates.filter(x=>x.section===section&&!used.has(x.id)&&!topics.has(topic(x)));
   for(const row of priority.slice(0,SECTION_TARGETS[section])){picked.push(row);used.add(row.id);topics.add(topic(row));}
  }
  for(const row of candidates){
   if(picked.length>=perLabel)break;
   if(!used.has(row.id)&&!topics.has(topic(row))){picked.push(row);used.add(row.id);topics.add(topic(row));}
  }
  for(const row of candidates){
   if(picked.length>=perLabel)break;
   if(!used.has(row.id)){picked.push(row);used.add(row.id);topics.add(topic(row));}
  }
  if(picked.length!==perLabel)throw Error('Insufficient original varied examples for '+label);
  selected.push(...picked);
 }
 return selected.sort((a,b)=>hash(a.id).localeCompare(hash(b.id)));
}
function questionDetails(c){
 if(c.section==='eoppep'){
  const q=eopBank.get(c.questionId);if(!q)throw Error('Missing EOP source '+c.questionId);
  return {question:q.question,educationalReference:q.answer,source:'ΕΟΠΠΕΠ / εσωτερική εκπαιδευτική αναφορά (όχι επίσημο λυσάρι)'};
 }
 if(c.section==='saek'){
  const q=saekBank.get(c.questionId);if(!q)throw Error('Missing SAEK source '+c.questionId);
  return {question:q.question,educationalReference:q.answer,source:'ΣΑΕΚ / '+q.course+' / εσωτερική εκπαιδευτική αναφορά'};
 }
 if(c.section==='mentor_oral'){
  const q=oralBank.get(c.questionId);if(!q)throw Error('Missing MENTOR source '+c.questionId);
  return {question:q.prompt,educationalReference:q.checks.join(' | '),source:'MENTOR οργανωτικό checklist (όχι κλινική οδηγία)'};
 }
 const tr=seminars.find(x=>x.id===c.courseId);
 if(!tr)throw Error('Missing seminar source '+c.courseId);
 if(c.section==='seminar_case'){
  const u=tr.units[c.caseIndex];if(!u)throw Error('Missing case');
  return {question:'Περίγραψε τις ενέργειές σου, βήμα προς βήμα, για το περιστατικό «'+u[0]+'».',
   educationalReference:'Εκπαιδευτικό πλαίσιο: '+u[1]+' | Βασική προτεραιότητα: '+u[2]+' | Προς αποφυγή: '+u[3],
   source:'Συνθετικό σενάριο '+tr.name,scenarioContext:u[4]};
 }
 if(c.section==='seminar'){
  const u=tr.units[Math.floor(c.questionIndex/4)],i=c.questionIndex%4;
  if(!u)throw Error('Missing seminar item');
  const prompts=[t=>'Ποια είναι η βασική γνώση που πρέπει να θυμάσαι για «'+t+'»;',
   t=>'Ποια είναι η κύρια προτεραιότητα στο θέμα «'+t+'»;',
   t=>'Ποιο σφάλμα πρέπει να αποφεύγεται κατά το «'+t+'»;',
   t=>'Πώς θα αντιμετώπιζες ένα ενδεικτικό σενάριο για «'+t+'»;'];
  return {question:prompts[i](u[0]),educationalReference:u[i+1],source:'Ανεπίσημη άσκηση '+tr.name,scenarioContext:u[4]};
 }
 throw Error('Unexpected section '+c.section);
}
export function buildReviewPacket(cases){
 return {packetVersion:1,purpose:'Blind independent educational review; not model training',
  reviewRules:'Grade only what the question requires. Ignore spelling unless clinical meaning changes. Explicit negations/doses/safety errors matter. Unclear => uncertain, without a grade. Verify clinical source, do not assume reference is official.',
  students:'Synthetic examples ONLY; not actual learner records',
  containsProvisionalLabels:false,
  items:cases.map(c=>({caseId:'R-'+hash(c.id).slice(0,18),section:c.section,questionId:c.questionId||null,
   courseId:c.courseId||null,caseIndex:c.caseIndex??null,
   ...questionDetails(c),studentAnswer:c.answer}))
 };
}
export function buildBlankBallot(cases){
 return {schemaVersion:1,reviewerCode:'',qualification:'',independentAttestation:false,
  reviewedAt:'',entries:cases.map(c=>({caseId:c.id,verdict:null,rationale:'',sourceCitation:'',criticalSafetyError:false}))};
}
if(process.argv[1] && new URL('file://'+process.argv[1]).pathname===new URL(import.meta.url).pathname){
 const selected=selectReviewCases(fixture.cases);
 const packet=buildReviewPacket(selected),ballot=buildBlankBallot(selected);
 mkdirSync('audit-results/educator-review',{recursive:true});
 writeFileSync('audit-results/educator-review/blind-review-packet.json',JSON.stringify(packet,null,2)+'\n');
 writeFileSync('audit-results/educator-review/blank-ballot.json',JSON.stringify(ballot,null,2)+'\n');
 writeFileSync('audit-results/educator-review/selection-metadata.json',JSON.stringify({
  selected:packet.items.length,
  sections:Object.fromEntries([...new Set(selected.map(x=>x.section))].sort().map(k=>[k,selected.filter(x=>x.section===k).length])),
  rationale:'120 distinct cases selected from the original 300 varied cases; 500 mechanical spelling examples excluded',
  independentlyReviewedCount:0,
  labelsWithheld:true,
  reviewProtocol:'Two different independently qualified reviewers; disagreement must be adjudicated before gold status. No automatic promotions.'
 },null,2)+'\n');
 console.log('BLIND_REVIEW_PACKET',packet.items.length,'withheld expected grades and orthography provenance; no AI calls');
}
