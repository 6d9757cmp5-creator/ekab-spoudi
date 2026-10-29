/**
 * REVIEW-ONLY book search panel embedded in the Mentor OS learning lab.
 * Verbatim short extracts, precise source links, NO generated medical advice.
 */
import {createReviewBookLoader} from './book-loader.mjs';
import {findForEditorialPreview} from './review-search.mjs';
import {canPreviewSource,assertNoClinicalApproval} from './rights-policy.mjs';

const $=id=>document.getElementById(id);
function node(tag,cls,value){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(value!==undefined)el.textContent=String(value);
 return el;
}
export async function mountReviewSearch(){
 const loader=createReviewBookLoader();
 const form=$('mentor-book-form'),select=$('mentor-book-select'),input=$('mentor-book-query');
 const results=$('mentor-book-results'),status=$('mentor-book-status');
 const run=$('mentor-book-submit'),count=$('mentor-book-count');
 let busy=false,sourceIds=[];
 const writeStatus=(message,error=false)=>{
  status.textContent=message;status.dataset.error=error?'true':'false';
 };
 try{
  const [sources,manifest]=await Promise.all([loader.sources(),loader.manifest()]);
  assertNoClinicalApproval(manifest,sources);
  const approved=0; // Rights/clinical approval gates never permit clinical retrieval.
  const candidates=sources.filter(s=>s.extracted_for_review && canPreviewSource(s.id) &&
    manifest.books.some(b=>b.source_id===s.id));
  sourceIds=candidates.map(s=>s.id);
  select.replaceChildren();
  for(const item of candidates){
   const option=node('option',null,item.title);option.value=item.id;select.append(option);
  }
  if(sourceIds.includes('wistech-emr-2025'))select.value='wistech-emr-2025';
  count.textContent=manifest.books.length+' εισαγμένα βιβλία · '+candidates.length+
    ' διαθέσιμα για δοκιμαστική βιβλιογραφική προεπισκόπηση · '+approved+' εγκεκριμένα για κλινική ανάκτηση';
  writeStatus('Επίλεξε βιβλίο και αναζήτησε όρο. Θα φορτωθεί μόνο το συγκεκριμένο βιβλίο.');
 }catch(e){
  select.disabled=true;run.disabled=true;
  writeStatus('Η βιβλιοθήκη δεν είναι διαθέσιμη: '+String(e.message||e),true);
 }
 function show(items,book,source){
  results.replaceChildren();
  for(const item of items){
   const article=node('article','review-result');
   article.dataset.passageId=item.passage_id;
   article.append(node('p','review-watermark','ΑΝΕΛΕΓΚΤΟ ΑΠΟΣΠΑΣΜΑ · ΜΟΝΟ ΓΙΑ ΕΠΙΣΤΗΜΟΝΙΚΗ ΠΡΟΕΠΙΣΚΟΠΗΣΗ'));
   article.append(node('h3',null,source.title));
   const metadata=node('p','muted small','Κωδικός τεκμηρίου: '+item.passage_id+
    (item.section?' · Θέση στο εξαγμένο αρχείο: '+item.section:''));
   article.append(metadata);
   article.append(node('blockquote','review-excerpt',item.excerpt));
   const link=node('a',null,'Άνοιγμα πρωτότυπης πηγής στον εκδότη');
   link.href=item.source_url;link.target='_blank';link.rel='noopener noreferrer';
   article.append(link);
   const details=node('p','muted small','Εξαγωγή από: '+book.title+
    ' · Δεν έχει επιβεβαιωθεί η κλινική ακρίβεια, η πληρότητα ή η άδεια επαναχρησιμοποίησης.');
   article.append(details);
   results.append(article);
  }
  if(!items.length)results.append(node('p','muted','Δεν βρέθηκαν αντιστοιχίες στο επιλεγμένο βιβλίο. Δοκίμασε έναν αγγλικό όρο, όπως airway ή trauma.'));
 }
 async function search(query=input.value){
  if(busy||!sourceIds.length)return;
  const q=String(query??'').trim().slice(0,100);
  if(q.length<3){writeStatus('Γράψε τουλάχιστον 3 χαρακτήρες.',true);return;}
  const id=select.value;
  if(!sourceIds.includes(id)){writeStatus('Μη διαθέσιμο βιβλίο.',true);return;}
  busy=true;run.disabled=true;select.disabled=true;results.replaceChildren();
  input.value=q;
  writeStatus('Ελέγχεται το ψηφιακό αποτύπωμα και αναζητούνται πραγματικά αποσπάσματα…');
  try{
   const {book,source,manifest}=await loader.load(id);
   const passages=findForEditorialPreview({query:q,book,sourceId:id,manifest:{books:[manifest]},limit:6});
   show(passages,book,source);
   writeStatus('Βρέθηκαν '+passages.length+' αποσπάσματα από '+manifest.passage_count+
    ' τεκμήρια του βιβλίου «'+source.title+'». Όλα παραμένουν μη εγκεκριμένα.');
  }catch(e){
   writeStatus('Η αναζήτηση απέτυχε: '+String(e.message||e),true);
  }finally{busy=false;run.disabled=false;select.disabled=false;}
 }
 form.addEventListener('submit',event=>{event.preventDefault();void search();});
 return Object.freeze({search,ready:sourceIds.length===7});
}
