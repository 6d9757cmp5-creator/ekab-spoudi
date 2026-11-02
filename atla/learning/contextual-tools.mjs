/**
 * Curated, read-only educational relevance registry.
 * Zero AI keyword guessing, zero new engines, zero grade writes.
 * Cases are forbidden until a case-by-case clinical AND educational approval exists.
 */
const SAEK_LINKS=Object.freeze({
  'saek-course-01.html#lesson-10':Object.freeze({
    kind:'anatomy',title:'Δες την καρδιά στο 3D Anatomy Lab',
    reason:'Το κεφάλαιο περιγράφει κοιλότητες, βαλβίδες και τη ροή του αίματος.',
    href:'ui-tools/anatomy-3d/index.html?mode=organs&system=cardiac&focus=heart&from=01&chapter=10',
    readiness:'optional'
  }),
  'saek-course-02.html#lesson-7':Object.freeze({
    kind:'ecg',title:'Εξασκήσου στο ECG Lab',
    reason:'Το κεφάλαιο περιγράφει τον καρδιακό κύκλο και την ηλεκτρική αγωγή. Η άσκηση αφορά μόνο τη βασική μορφή P–QRS–T.',
    href:'mentor-ecg.html?from=02&chapter=7#ecg-practice',
    readiness:'practice'
  })
});
const EOP_LINKS=Object.freeze({
  'EOP-A-070':Object.freeze({
    kind:'ecg',title:'Βασική εξάσκηση P–QRS–T στο ECG Lab',
    reason:'Η συγκεκριμένη ερώτηση περιλαμβάνει τη βασική ηλεκτρική λειτουργία P–QRS–T. Δεν περιλαμβάνεται κλινική αναγνώριση αρρυθμιών.',
    href:'mentor-ecg.html?from=eoppep&question=EOP-A-070#ecg-practice',
    readiness:'practice'
  })
});
const SAEK=/^saek-course-(?:0[1-9]|1[0-9]|20)\.html$/;
const LESSON=/^lesson-(?:[1-9]|[1-9][0-9]|100)$/;
export function saekTool(file,chapter){
 if(!SAEK.test(String(file))||!LESSON.test(String(chapter)))return null;
 return SAEK_LINKS[file+'#'+chapter]||null;
}
export function eoppepTool(questionId,{activeExam=false,readerVisible=false}={}){
 if(activeExam||!readerVisible)return null;
 return EOP_LINKS[String(questionId)]||null;
}
export const scenarioReviewPolicy=Object.freeze({
 required:['exact_topic_match','educational_review','independent_clinical_review','scope_of_practice_review'],
 approved:Object.freeze([])
});
/** No automatic case recommendation until all review gates are fulfilled. */
export function scenarioForChapter(file,chapter){
 if(!SAEK.test(String(file))||!LESSON.test(String(chapter)))return null;
 return scenarioReviewPolicy.approved.find(row=>row.file===file&&row.chapter===chapter&&row.exact_topic_match===true&&row.educational_review===true&&row.independent_clinical_review===true&&row.scope_of_practice_review===true)||null;
}
/**
 * Explicit learner feedback, never invented AI mind-reading or mastery.
 * Unsupported chapters stay on their lesson (null).
 */
export function nextContextualAction({file,chapter,feedback}={}){
 if(feedback==='need_explanation')return {kind:'explanation',title:'Διάβασε ξανά το SOS ή ζήτησε εξήγηση από τον ATLAS'};
 if(feedback!=='ready_to_practice')return null;
 return saekTool(file,chapter);
}
