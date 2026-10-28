/**
 * Voluntary read-only view of existing SAEK/EOPPEP study counters.
 * It never calls storage.setItem/removeItem, grading or cloud sync.
 * These counters are NOT evidence of clinical competency.
 */
function parse(storage,key){
  try{
    const text=storage.getItem(key);
    if(!text||text.length>3_000_000)return {};
    const data=JSON.parse(text);
    return data&&typeof data==='object'&&!Array.isArray(data)?data:{};
  }catch{return {};}
}
export function readLegacySnapshot(storage){
  if(!storage||typeof storage.getItem!=='function')throw new Error('storage-unavailable');
  const eoppep=parse(storage,'ekab-eoppep-official-v15');
  const exams=parse(storage,'ekab.saek.exams.v1');
  const history=exams.history&&typeof exams.history==='object'?exams.history:{};
  let saekRead=0;
  try{
    for(let i=0;i<storage.length;i++){
      const key=storage.key(i);
      if(/^ekab\.saek\.read\.v1\.(?:0[1-9]|1\d|20)\.\d{1,2}$/.test(key)&&storage.getItem(key)==='1')saekRead++;
    }
  }catch{}
  const questions=Object.entries(eoppep).filter(([id,v])=>/^EOP-[AB]-\d{3}$/.test(id)&&v&&typeof v==='object');
  const eoppepAttempted=questions.filter(([,v])=>(Number(v.selfAttempts)||0)>0).length;
  const examAttempted=Object.entries(history).filter(([id,v])=>/^saek-(?:0[1-9]|1\d|20)-\d{1,2}$/.test(id)&&v&&
    (Number(v.correct)||0)+(Number(v.partial)||0)+(Number(v.incorrect)||0)>0).length;
  return Object.freeze({
    saek_read_records:Math.min(247,saekRead),
    saek_exam_question_records:Math.min(247,examAttempted),
    eoppep_attempt_records:Math.min(314,eoppepAttempted),
    limitations:'Οι καταχωρίσεις ανάγνωσης και προσπάθειας δεν αποδεικνύουν κλινική επάρκεια ή γνώση.'
  });
}
