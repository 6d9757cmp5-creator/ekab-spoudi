export const TOPICS=Object.freeze({
 anatomy:{label:'Ανατομία',question:'Ποια είναι η λειτουργία της δεξιάς κοιλίας;',answer:'Η δεξιά κοιλία προωθεί το φλεβικό αίμα προς την πνευμονική αρτηρία και τους πνεύμονες.',keywords:['πνευμον','πνεύμον','αρτηρ']},
 circulation:{label:'Κυκλοφορία',question:'Ποια είναι η διαδρομή του αίματος από τη δεξιά κοιλία;',answer:'Δεξιά κοιλία → πνευμονική αρτηρία → πνεύμονες → πνευμονικές φλέβες → αριστερός κόλπος.',keywords:['πνευμον','πνεύμον','αριστερ']},
 assessment:{label:'Εκτίμηση',question:'Τι σημαίνουν τα αρχικά ABCDE στην αρχική εκτίμηση;',answer:'A: αεραγωγός, B: αναπνοή, C: κυκλοφορία, D: νευρολογική κατάσταση, E: έκθεση και έλεγχος περιβάλλοντος.',keywords:['αεραγωγ','αναπνο','κυκλοφορ']}
});
export function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
export function initialTutor(){return {topic:'anatomy',level:'basic',turns:[],reviews:{},count:0};}
export function tutorReply(state,input){
 const text=String(input||'').trim().slice(0,600);
 if(!text)return {state,reply:'Γράψε μια ερώτηση ή διάλεξε θέμα.'};
 const next={...state,turns:[...state.turns].slice(-39),reviews:{...state.reviews},count:state.count+1};
 const n=normalize(text);
 if(/ανατομ|οστ|καρδι/.test(n))next.topic='anatomy';
 else if(/κυκλοφορ|αιμα|πνευμον/.test(n))next.topic='circulation';
 else if(/abcde|εκτιμησ/.test(n))next.topic='assessment';
 if(/απλα|ευκολ|αρχαρι/.test(n))next.level='basic';
 if(/δυσκολ|προχωρημ|εοπεπ/.test(n))next.level='advanced';
 const topic=TOPICS[next.topic];
 let reply;
 if(/εξετασ|ρωτησ|δοκιμασ/.test(n))reply='Δοκίμασε να απαντήσεις με δικά σου λόγια: '+topic.question;
 else if(/δεν ξερω|δεν θυμαμαι|βοηθ/.test(n))reply='Μικρή βοήθεια: '+topic.answer+' Θέλεις να το εξηγήσεις τώρα με δικά σου λόγια;';
 else if(/ανατομ|οστ|καρδι|κυκλοφορ|αιμα|πνευμον|abcde|εκτιμησ|απλα|ευκολ|προχωρημ|εοπεπ/.test(n))reply=(next.level==='basic'?'Ας το δούμε απλά. ':'Σε πιο προχωρημένο επίπεδο: ')+topic.answer+' '+topic.question;
 else {
   const matched=topic.keywords.some(k=>n.includes(normalize(k)));
   next.reviews[next.topic]={attempts:(next.reviews[next.topic]?.attempts||0)+1,needsReview:!matched};
   reply=matched?'Αναφέρεις ένα σχετικό στοιχείο. '+topic.answer+' Μπορείς να εξηγήσεις το γιατί;':'Δεν μπορώ να αξιολογήσω με βεβαιότητα αυτή την απάντηση. Ας επαναλάβουμε: '+topic.answer+' '+topic.question;
 }
 next.turns.push({role:'student',text},{role:'tutor',text:reply});
 return {state:next,reply};
}
