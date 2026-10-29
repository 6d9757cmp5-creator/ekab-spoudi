/**
 * MENTOR OS review-only corpus audit: integrity, citation granularity,
 * source rights and clinician-review queue. NOT clinical authorization.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {validateReviewManifest} from './book-loader.mjs';
import {assertReviewBook} from './review-search.mjs';
import {SOURCE_POLICY,assertNoClinicalApproval} from './rights-policy.mjs';

const DIR=resolve(dirname(fileURLToPath(import.meta.url)),'../review-corpus');
const ROOT=resolve(DIR,'../..');
const TOPICS=Object.freeze({
 airway:/\bairway\b|\bintubat|\bventilat|\boxygen\b/i,
 resuscitation:/\bcpr\b|\bresuscitat|\bdefibrillat|\bcardiac arrest\b/i,
 hemorrhage:/\bhemorrhag|\bhaemorrhag|\bbleeding\b|\bshock\b/i,
 medications:/\bmedication\b|\bdosage\b|\bdrug\b|\bepinephrine\b/i,
 pediatric:/\bpediatric\b|\bpaediatric\b|\bchild\b|\binfant\b/i,
 maternal:/\bpregnan|\bpostpartum\b|\bchildbirth\b/i,
 triage:/\btriage\b|\bmass casualty\b|\bdisaster\b/i,
 ecg:/\becg\b|\bekg\b|\belectrocardio|\barrhythmi/i
});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const readJSON=async path=>JSON.parse(await readFile(path,'utf8'));
function task(item,p,topic){
 return {source_id:item.source_id,passage_id:p.id,section:p.section||null,topic,
 review_status:'human-clinical-review-pending',reviewer:null,decision:null,
 source_url:item.origin,corpus_sha256:item.sha256};
}
export async function auditReviewCorpus({directory=DIR,root=ROOT}={}){
 const manifest=validateReviewManifest(await readJSON(join(directory,'manifest.json')));
 const catalog=await readJSON(join(root,'mentor/library/source-index.json'));
 assertNoClinicalApproval(manifest,catalog.sources);
 const books=[],queue=[],errors=[];
 for(const item of manifest.books){
  const raw=await readFile(join(directory,item.source_id+'.json'));
  const digest=hash(raw);
  if(digest!==item.sha256){errors.push(item.source_id+': SHA-256 mismatch');continue;}
  const book=assertReviewBook(JSON.parse(raw),item.source_id,manifest);
  const passages=book.passages;
  const ids=new Set(passages.map(p=>p.id));
  const wholeBook=passages.filter(p=>p.section==='whole-book').length;
  const pages=passages.filter(p=>/^PDF page \d+$/.test(p.section||'')).length;
  const missing=passages.filter(p=>!p.section).length;
  const duplicate=passages.length-ids.size;
  if(duplicate)errors.push(item.source_id+': duplicate passage IDs');
  if(passages.length!==item.passage_count)errors.push(item.source_id+': passage count mismatch');
  if(passages.some(p=>p.review_status!=='draft'))errors.push(item.source_id+': invalid approval state');
  const samples={};
  for(const [topic,rx]of Object.entries(TOPICS)){
   const match=passages.filter(p=>rx.test(p.text));
   samples[topic]=match.length;
   for(const p of match.slice(0,2))queue.push(task(item,p,topic));
  }
  const policy=SOURCE_POLICY[item.source_id];
  books.push({
   source_id:item.source_id,title:item.title,declared_words:item.word_count,
   passages:passages.length,sha256:digest,
   rights:policy.rights_signoff==='user-attested-unverified'?
     'owner-attested-review-preview-without-publisher-paperwork':
     (policy.preview_allowed?'CC-BY-editorial-preview-only':'rights-restricted'),
   rights_signoff:policy.rights_signoff,
   permission_basis:policy.permission_attestation||null,
   permission_documentary_verified:false,
   ai_retrieval_enabled:false,clinical_approval:false,
   whole_book_unanchored:wholeBook,pdf_page_locators:pages,
   no_section:missing,distinct_source_links:new Set(passages.map(p=>p.source_url)).size,
   citation_quality:wholeBook===passages.length?'whole-book-no-chapter':
     pages===passages.length?'PDF-extraction-page-not-manually-verified':'mixed-needs-review',
   high_risk_topic_passages:samples,
   flags:[
    'owner-attests-permission-documentary-scope-not-verified','clinical-review-pending',
    ...(wholeBook>0?['chapter-locator-missing']:[]),
    ...(item.source_id==='who-bec'?['WHO-2018-needs-current-2025-crosscheck']:[]),
    ...(item.source_id==='medical-surgical-nursing'?['OpenStax-prior-written-AI-permission-requires-documentary-check']:[])
   ]
  });
 }
 if(errors.length)throw Error(errors.join('; '));
 const report={
  schema_version:1,kind:'automated-technical-source-check-not-medical-approval',
  ready_for_ai:false,approved_sources:0,rights_approved_sources:0,
  books_total:books.length,passages_total:books.reduce((n,b)=>n+b.passages,0),
  review_previews:Object.values(SOURCE_POLICY).filter(s=>s.preview_allowed).length,
  restricted:Object.values(SOURCE_POLICY).filter(s=>!s.preview_allowed).length,
  publisher_permissions_attested_not_verified:Object.values(SOURCE_POLICY).filter(s=>s.rights_signoff==='user-attested-unverified').length,
  no_chapter_book_count:books.filter(b=>b.citation_quality==='whole-book-no-chapter').length,
  human_review_queue_count:queue.length,books,review_queue:queue
 };
 if(report.books_total!==7||report.review_previews+report.restricted!==7||
   report.publisher_permissions_attested_not_verified!==2||report.no_chapter_book_count!==5)
   throw Error('Expected seven-book rights/clinical inventory changed');
 return report;
}
export function auditMarkdown(r){
 const lines=[
  '# MENTOR OS — Τεχνικός έλεγχος επτά συγγραμμάτων',
  '',
  '**ΜΟΝΟ ΑΥΤΟΜΑΤΟΣ ΕΛΕΓΧΟΣ. Δεν αποτελεί κλινική ή νομική πιστοποίηση.**',
  '',
  '| Βιβλίο | Αποσπάσματα | Δικαιώματα | Εντοπισμός αποσπάσματος |',
  '|---|---:|---|---|'
 ];
 for(const b of r.books)lines.push('| '+b.title+' | '+b.passages+' | '+b.rights+' | '+b.citation_quality+' |');
 lines.push('','Σύνολο: '+r.books_total+' βιβλία, '+r.passages_total+' αποσπάσματα, '+
  r.no_chapter_book_count+' βιβλία χωρίς ακριβή σύνδεση κεφαλαίου, '+
  r.human_review_queue_count+' δειγματοληπτικές εργασίες για κλινικό αξιολογητή.',
  '',
  '## Εκκρεμεί υποχρεωτικά',
  '1. Κλινικός έλεγχος ανά κείμενο με ισχύοντα ελληνικά προνοσοκομειακά πρωτόκολλα.',
  '2. Νέοι δείκτες κεφαλαίων για τα πέντε Pressbooks, και έλεγχος σελίδων των δύο PDF.',
  '3. Ο κάτοχος του έργου δήλωσε ότι διαθέτει άδεια για όλες τις πηγές, συμπεριλαμβανομένων OpenStax και WHO. Η δήλωση δεν είναι ανεξάρτητα ελεγμένο αποδεικτικό και απαιτείται τεκμηρίωση εύρους/όρων πριν από παραγωγή.',
  '4. Έλεγχος της έκδοσης WHO 2018 σε σχέση με τις ενημερώσεις WHO 2025.',
  '5. Καμία πραγματική ενεργοποίηση RAG ή παραγωγή ιατρικών απαντήσεων πριν από τα παραπάνω.',
  '',
  'Τα αναγνωριστικά δείγματος, χωρίς αντιγραφή κειμένων, περιλαμβάνονται στο αρχείο audit JSON.',
  '');
 return lines.join('\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const report=await auditReviewCorpus();
  const out=process.argv.find(s=>s.startsWith('--out='))?.slice(6);
  if(out){
   await mkdir(out,{recursive:true});
   await writeFile(join(out,'mentor-clinical-review-audit.json'),JSON.stringify(report,null,2)+'\n');
   await writeFile(join(out,'mentor-clinical-review-audit.md'),auditMarkdown(report));
  }
  console.log(JSON.stringify({books:report.books_total,passages:report.passages_total,
   preview:report.review_previews,restricted:report.restricted,
   ownerAttestedButUnverified:report.publisher_permissions_attested_not_verified,
   noChapterLocator:report.no_chapter_book_count,reviewTasks:report.human_review_queue_count,
   clinicalApproved:report.approved_sources}));
 }catch(e){console.error('AUDIT FAILED:',e.message);process.exitCode=1;}
}
