/** Deterministic Greek study coach, read-only on isolated Mentor session stats.
 * No LLM, no clinical diagnosis, no scores, no source text, no storage mutation.
 */
import {COMPETENCIES} from './scenarios.mjs';

const TOPICS=Object.freeze({
  scene:{phrases:['ασφαλ','σκην','κινδυν'],goal:'Πρώτα περιγράφεις τους πιθανούς κινδύνους της σκηνής πριν επιλέξεις ενέργεια.',exercise:'Σε ένα συνθετικό τροχαίο, κατέγραψε τρεις πληροφορίες που θα ζητούσες για την ασφάλεια του χώρου πριν πλησιάσεις.'},
  assessment:{phrases:['εκτιμ','αξιολογ','abcde'],goal:'Οργάνωσε τις παρατηρήσεις σου αντί να υποθέτεις διάγνωση.',exercise:'Δώσε μια σύντομη, δομημένη περιγραφή αρχικής εκτίμησης σε συνθετικό περιστατικό, χωρίς να υποθέσεις διάγνωση.'},
  escalation:{phrases:['επικοινων','συντον','υποστηριξ','ενημερ'],goal:'Εξασκήσου στη σαφή αναφορά προς τον αρμόδιο συντονισμό.',exercise:'Φτιάξε μία σύντομη εκπαιδευτική αναφορά: το συμβάν, οι διαθέσιμες πληροφορίες και τι επιπλέον υποστήριξη χρειάζεσαι.'},
  handover:{phrases:['παραδ','αναφορ','handover'],goal:'Ξεχώρισε αντικειμενικές παρατηρήσεις από προσωπικές υποθέσεις.',exercise:'Σύνταξε μια δοκιμαστική παράδοση: συμβάν, παρατηρήσεις, μεταβολές και ενέργειες που καταγράφηκαν.'}
});
const INTENTS=Object.freeze(['focus','progress','explain','exercise']);
function fold(value){
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ς/g,'σ').toLocaleLowerCase('el').trim();
}
export function chooseFocus(overview,requested){
 if(requested && Object.hasOwn(TOPICS,requested))return requested;
 const rows=Object.entries(COMPETENCIES).map(([id])=>({id,...(overview?.competencies?.[id]||{})}));
 rows.sort((a,b)=>(Number(b.needs_review)||0)-(Number(a.needs_review)||0) ||
   (Number(a.practiced)||0)-(Number(b.practiced)||0) ||
   Object.keys(COMPETENCIES).indexOf(a.id)-Object.keys(COMPETENCIES).indexOf(b.id));
 return rows[0]?.id||'scene';
}
export function interpretQuestion(question){
 const words=fold(question).slice(0,300);
 const topic=Object.entries(TOPICS).find(([,v])=>v.phrases.some(p=>words.includes(p)))?.[0]||null;
 let intent='unknown';
 if(/(?:προοδο|πωσ τα παω|αποτελεσμα|ποσεσ|μετρησ)/.test(words))intent='progress';
 else if(/(?:ασκηση|παραδειγμα|δοκιμασ|σεναριο|εξασκησ)/.test(words))intent='exercise';
 else if(/(?:τι σημαινει|γιατι|εξηγησ|τι ειναι)/.test(words))intent='explain';
 else if(/(?:μελετ|ξεκινησ|προτειν|επομεν|αδυναμ|βοηθ)/.test(words))intent='focus';
 if(topic && intent==='unknown')intent='explain';
 return {intent,topic};
}
export function coachResponse({intent,overview,topic=null}={}){
 if(!INTENTS.includes(intent))return 'Μπορώ να σε βοηθήσω με το τι να μελετήσεις, τις δοκιμαστικές σου καταγραφές, την εξήγηση μιας δεξιότητας ή μια μικρή άσκηση. Δεν αξιολογώ ελεύθερο ιατρικό κείμενο.';
 const focus=chooseFocus(overview,topic),def=TOPICS[focus],label=COMPETENCIES[focus];
 const item=overview?.competencies?.[focus]||{};
 const attempts=Math.max(0,Number(item.attempts)||0);
 const practised=Math.max(0,Number(item.practiced)||0);
 const reviews=Math.max(0,Number(item.needs_review)||0);
 if(intent==='focus'){
  const reason=reviews>0?'Έχεις '+reviews+' επιλογές που χρειάζονται επανάληψη.':
    practised===0?'Δεν υπάρχει ακόμη καταγεγραμμένη επιτυχημένη δοκιμαστική επιλογή σε αυτή τη δεξιότητα.':
    'Μπορείς να συνεχίσεις τη στοχευμένη εξάσκηση.';
  return 'Προτείνω ως επόμενο θέμα: '+label+'. '+reason+' '+def.goal+' Άνοιξε την καρτέλα Αποστολή για πρακτική εξάσκηση.';
 }
 if(intent==='progress'){
  return 'Στις δοκιμαστικές αποστολές Mentor για «'+label+'» υπάρχουν '+attempts+' επιλογές: '+practised+' καταχωρισμένες ως εξάσκηση και '+reviews+' για επανάληψη. Δεν είναι βαθμολογία ή απόδειξη κλινικής επάρκειας.';
 }
 if(intent==='explain')return 'Δεξιότητα: '+label+'. '+def.goal+' Η περιγραφή είναι εκπαιδευτική, όχι εξατομικευμένη ιατρική οδηγία.';
 return 'Μικρή άσκηση — '+label+': '+def.exercise+' Μπορείς να την εξασκήσεις στην καρτέλα Αποστολή· δεν αξιολογώ αυτόματα ελεύθερες απαντήσεις.';
}
