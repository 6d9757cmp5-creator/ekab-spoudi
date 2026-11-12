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
 const wantsReasoning=/(αιτιολογ|ρωτησε με|εξετασε με|καλεσε με να εξηγησ)/.test(q);
 const depth=wantsReasoning?'Ζήτησε από τον μαθητή μία αιτιολόγηση με τη μορφή ερώτησης. Μην απαντήσεις την ερώτηση εκ μέρους του. Ρώτησε μόνο για όσα περιγράφονται ρητά στα δοσμένα αποσπάσματα· μην εισάγεις επιπλέον μηχανισμούς ή τεχνικούς όρους, ούτε μέσα στην ερώτηση.':simplify?'Εξήγησε ξανά πιο απλά, με άλλο παράδειγμα, χωρίς καμία ποινή ή διαγραφή προόδου.':level==='beginner'?'Ξεκίνα από τα βασικά.':'Δίδαξε στο επίπεδο του συγκεκριμένου εκπαιδευτικού στόχου.';
 return {severity,simplify,style,depth};
}
export const ATLA_RUNTIME_RULES=[
 ATLA_PRINCIPLE,
 'Είσαι ο ATLA: μία ενιαία εκπαιδευτική ταυτότητα, όχι πολλοί χαρακτήρες.',
 'Απάντησε σε φυσικά ελληνικά, επιτρέποντας τις συνήθεις λατινικές συντομογραφίες. Απαγορεύονται ακούσιες παρεμβολές κυριλλικών ή κορεατικών χαρακτήρων στην ελληνική απάντηση.',
 'Πριν απαντήσεις έλεγξε επάρκεια στοιχείων, σαφήνεια, συνέπεια και πηγές. Αν δεν επαρκούν, πες τι λείπει· μην εικάζεις.',
 'Σε ιατρικό ζήτημα χρησιμοποίησε αποκλειστικά σχετικές αριθμημένες πηγές και παράθεσε ακριβείς ενδείξεις [Τ1]· χωρίς πηγή μη δίνεις βέβαιη ιατρική πληροφορία.',
 'Κάθε συγκεκριμένος επιστημονικός ισχυρισμός πρέπει να στηρίζεται ρητά στο αντίστοιχο απόσπασμα. Αν η πηγή δίνει μόνο ορισμό, περιορίσου στον ορισμό· μην προσθέτεις μη τεκμηριωμένους μηχανισμούς. Η αναφορά [Τ1] δεν κάνει αληθή έναν άσχετο ισχυρισμό.',
 'Αν η προηγούμενη εξήγηση μπέρδεψε τον μαθητή, επανεξέτασέ την και απλοποίησε. Μην αφαιρείς πρόοδο ή βαθμό.',
 'Μία σωστή απάντηση ή μία ανάγνωση δεν αποδεικνύει κατάκτηση δεξιότητας. Μην ισχυρίζεσαι ότι αξιολόγησες επίδοση χωρίς αποδείξεις.',
 'Μην ισχυρίζεσαι ότι ανιχνεύεις συναισθήματα. Μην προτείνεις αυτόματα διάλειμμα ή αλλαγή δραστηριότητας.',
 'Σε ερωτήσεις για τρόπο μελέτης: πρότεινε αυτοεξέταση και κατανεμημένη επανάληψη (Dunlosky κ.ά., 2013), με διάστημα περίπου 10–20% του χρόνου έως την εξέταση (Cepeda κ.ά., 2008), μόνο πάνω στην επίσημη ύλη, και παράπεμψε στο Ημερολόγιο εξετάσεων. Μην επινοείς άλλους κανόνες μελέτης.',
 'Σε ενεργή εξέταση μην αποκαλύπτεις απαντήσεις. Μη δίνεις οδηγίες για πραγματικό περιστατικό, διάγνωση ή δοσολογίες.'
].join(' ');
const CITATION=/\[([ΤT])([1-9][0-9]?)\]/g;
const DOSE=/(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?\s*(?:mg|mcg|ml|μg|µg|g|iu|ui|μονάδες)(?![\p{L}])/iu;
const DOSE_ALL=new RegExp(DOSE.source,'giu');
const squashLower=s=>String(s??'').toLowerCase().replace(/\s+/g,'');
// A measured value copied from a lesson passage ("70 mg/dl" glucose, "70 ml" stroke volume) is
// physiology, not dosing. Values from the drug catalog, or from a passage with no known source, stay blocked.
function doseOutsideLessons(text,passages){
 const lessons=(Array.isArray(passages)?passages:[])
  .filter(p=>/^[\w.-]+#/.test(String(p?.ref??''))&&!String(p.ref).startsWith('farmaka'))
  .map(p=>squashLower(p.definition));
 return [...text.matchAll(DOSE_ALL)].some(m=>!lessons.some(d=>d.includes(squashLower(m[0]))));
}
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
 if(/[\u0400-\u052F\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/u.test(text))
   return {ok:false,reason:'unexpected-non-greek-script'};
 if(doseOutsideLessons(text,passages))return {ok:false,reason:'unsafe-dose-output'};
 if(/[a-z][α-ωάέήίόύώϊϋΐΰ]|[α-ωάέήίόύώϊϋΐΰ][a-z]/i.test(text))return {ok:false,reason:'mixed-script-word'};
 // A source ID alone never validates a new numerical claim. Emergency contact
 // numbers are platform safety guidance, not lesson evidence.
 const withoutCitations=text.replace(/\[(?:[ΤT][1-9][0-9]?)(?:\s*,\s*[ΤT][1-9][0-9]?)*\]/g,'');
 const claimNumbers=[...withoutCitations.matchAll(/\d+(?:[.,]\d+)?/g)].map(m=>m[0].replace(',','.'));
 const evidenceText=(Array.isArray(passages)?passages:[]).map(p=>String(p?.term??'')+' '+String(p?.definition??'')).join(' ');
 const sourcedNumbers=new Set([...evidenceText.matchAll(/\d+(?:[.,]\d+)?/g)].map(m=>m[0].replace(',','.')));
 if(claimNumbers.some(n=>n!=='166'&&n!=='112'&&!sourcedNumbers.has(n)))
   return {ok:false,reason:'unsupported-numeric-claim'};
 // ERC 2025: cardiac arrest may present with abnormal or agonal breathing.
 // Do not define CPR as requiring simultaneous cessation of heart and breathing.
 const statement=norm(withoutCitations);
 if(/καρδια\s+και\s+(?:η\s+)?αναπνοη.{0,75}σταματ/.test(statement)&&
    /καρδιοπνευμον|καρπα|ανακοπ/.test(norm(evidenceText)+' '+statement))
   return {ok:false,reason:'arrest-breathing-oversimplification'};
 // Conservative, source-specific red flags: a citation must not authorize an extra mechanism.
 const sourceText=norm((Array.isArray(passages)?passages:[]).map(p=>p?.definition||'').join(' '));
 const unverifiedMechanisms=['ενδοθωρακικ','ενδοκαρδιακ','αορτ','στεφανιαι','αιμοδυναμ','θωρακικ πιεσ','αντλητικ πιεσ'];
 if(unverifiedMechanisms.some(term=>norm(text).includes(term)&&!sourceText.includes(term)))
   return {ok:false,reason:'unsupported-advanced-mechanism'};
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
