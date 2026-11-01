/**
 * ATLA teaching constitution. Runtime rules shared by the browser and the single AI Worker.
 * Pure functions; no grades, notes, learner identity, psychological inference or storage writes.
 * This is a minimum deterministic safety gate, NOT clinical validation of model output.
 */
export const ATLA_PRINCIPLE='Δεν προσαρμόζεται ο μαθητής στον ATLA. Ο ATLA προσαρμόζεται στον μαθητή, χωρίς να θυσιάζει την επιστημονική ακρίβεια ή τους εκπαιδευτικούς στόχους.';
const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el').replace(/ς/g,'σ');
const CRITICAL=/(ανακοπ|καρπα|cpr|απνοια|αεραγωγ|απειλ.*ζω|μαζικ.*αιμορραγ|καταρρευσ|ασφυξ|αναφυλαξ|κρισιμ.*περιστατικ)/;
const SERIOUS=/(επείγον|επειγον|ασθεν|τραυμα|αιμορραγ|ατυχημ|πρωτοκολλ|σενάρι|σεναρι|διαλογ|ασφαλει|αντιμετωπισ|επιπλοκ|φαρμακολογ)/;
const SIMPLIFY=/(δεν\s+(το\s+)?καταλαβ|δυσκολευ|πιο\s+απλ|απλοποι|ξαναεξηγ|αλλο\s+παραδειγμ|μπερδευ)/;
export function teachingApproach({question='',level='student',approvedScenarioSeverity=''}={}){
 const q=norm(question).slice(0,300);
 // Never infer emotion or a real patient's condition; approved scenario metadata can escalate tone.
 const severity=approvedScenarioSeverity==='critical'||CRITICAL.test(q)?'critical':approvedScenarioSeverity==='serious'||SERIOUS.test(q)?'serious':'ordinary';
 const simplify=SIMPLIFY.test(q);
 const style=severity==='critical'?'Απαιτητικός σε κλινική ασφάλεια, βήματα, αιτιολόγηση και όρια· ποτέ τιμωρητικός.':severity==='serious'?'Σοβαρός, σαφής και ακριβής· επισήμανε κρίσιμες προϋποθέσεις.':'Άμεσος, κατανοητός και φιλικός.';
 const depth=simplify?'Εξήγησε ξανά πιο απλά, με άλλο παράδειγμα, χωρίς καμία ποινή ή διαγραφή προόδου.':level==='beginner'?'Ξεκίνα από τα βασικά.':'Δίδαξε στο επίπεδο του συγκεκριμένου εκπαιδευτικού στόχου.';
 return {severity,simplify,style,depth};
}
export const ATLA_RUNTIME_RULES=[
 ATLA_PRINCIPLE,
 'Είσαι ο ATLA: μία ενιαία εκπαιδευτική ταυτότητα, όχι πολλοί χαρακτήρες.',
 'Πριν απαντήσεις έλεγξε επάρκεια στοιχείων, σαφήνεια, συνέπεια και πηγές. Αν δεν επαρκούν, πες τι λείπει· μην εικάζεις.',
 'Σε ιατρικό ζήτημα χρησιμοποίησε αποκλειστικά σχετικές αριθμημένες πηγές και παράθεσε ακριβείς ενδείξεις [Τ1]· χωρίς πηγή μη δίνεις βέβαιη ιατρική πληροφορία.',
 'Αν η προηγούμενη εξήγηση μπέρδεψε τον μαθητή, επανεξέτασέ την και απλοποίησε. Μην αφαιρείς πρόοδο ή βαθμό.',
 'Μία σωστή απάντηση ή μία ανάγνωση δεν αποδεικνύει κατάκτηση δεξιότητας. Μην ισχυρίζεσαι ότι αξιολόγησες επίδοση χωρίς αποδείξεις.',
 'Μην ισχυρίζεσαι ότι ανιχνεύεις συναισθήματα. Μην προτείνεις αυτόματα διάλειμμα ή αλλαγή δραστηριότητας.',
 'Σε ενεργή εξέταση μην αποκαλύπτεις απαντήσεις. Μη δίνεις οδηγίες για πραγματικό περιστατικό, διάγνωση ή δοσολογίες.'
].join(' ');
const CITATION=/\[([ΤT])([1-9][0-9]?)\]/g;
const DOSE=/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ml|μg)\b/iu;
/**
 * Fail-closed surface gate for grounded AI output. Cannot prove clinical correctness
 * or semantic consistency; these still require independent scientific QA.
 */
export function auditAssistantReply(reply,passages=[]){
 const text=String(reply??'').trim();
 if(!text||text.length>6000)return {ok:false,reason:'empty-or-oversized'};
 const allowed=new Set((Array.isArray(passages)?passages:[]).map(p=>String(p.id??'').toUpperCase()));
 const citations=[...text.matchAll(CITATION)].map(m=>'T'+m[2]);
 if(!citations.length||citations.some(id=>!allowed.has(id)))return {ok:false,reason:'missing-or-unknown-citation'};
 if(DOSE.test(text))return {ok:false,reason:'unsafe-dose-output'};
 if(/(?:ξερω|γνωριζω)\s+(?:οτι\s+)?(?:νιωθεισ|αισθανεσαι)/.test(norm(text)))return {ok:false,reason:'emotional-inference'};
 return {ok:true,reason:'surface-check-only'};
}
/** Only approved, published, chapter-mapped media may ever be offered; empty means no video. */
export function approvedTeachingVideo(chapterId,registry=[]){
 const id=String(chapterId??'');
 if(!/^lesson-(?:[1-9]|[1-9][0-9]|100)$/.test(id))return null;
 if(!Array.isArray(registry))return null;
 return registry.find(x=>x&&x.approved===true&&x.reviewed===true&&x.published===true&&Array.isArray(x.chapterIds)&&x.chapterIds.includes(id)&&typeof x.url==='string'&&/^https:\/\//.test(x.url))||null;
}
