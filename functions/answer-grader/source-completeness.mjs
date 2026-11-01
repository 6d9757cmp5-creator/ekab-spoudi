/**
 * Reviewed example of question-specific completeness, not a general lexical grader.
 * Only a one-way guard: never promotes an answer to correct, and never turns a
 * potentially synonymous answer into incorrect. Other items need expert rubrics.
 */
export const SOURCE_COMPLETENESS = Object.freeze({
 'EOP-A-001':Object.freeze({
  standard:'Educational reference on nasal cavity functions; not an official EOPPEP answer key',
  essential:Object.freeze([
   'Καθαρισμός από σωματίδια κατά τη ρινική αναπνοή',
   'Μηχανισμός καθαρισμού με βλέννη και κροσσούς (ή ισοδύναμη ουσιαστική περιγραφή)',
   'Θέρμανση εισπνεόμενου αέρα',
   'Ύγρανση εισπνεόμενου αέρα',
   'Συμμετοχή στην όσφρηση'
  ])
 })
});
export function normalizedGreek(value){
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el-GR');
}
const mentions={
 clean:/(?:καθαρ|φιλτρα|κρατα.{0,30}(?:σωματιδ|σκον)|απομακρυν.{0,30}(?:σωματιδ|σκον))/,
 warm:/(?:θερμ|ζεστ)/,
 moist:/(?:υγρ|νοτιζ)/,
 smell:/(?:οσφρ|μυρωδ|μυριζ|οσμ)/,
 mechanism:/(?:βλεν|κροσ|τριχιδ|τριχακ)/
};
/**
 * Protects the exact too-short example from a false "complete" grade.
 * A different phrasing not recognized by the conservative lexical hints
 * becomes ungraded instead of being falsely rejected. Never grade spelling.
 */
export function protectCompleteness(question,answer,raw){
 if(question?.id!=='EOP-A-001'||raw?.verdict!=='correct')return raw;
 const normalized=normalizedGreek(answer);
 const found=Object.fromEntries(Object.entries(mentions).map(([key,regex])=>[key,regex.test(normalized)]));
 // Explicit negation may reverse the meaning. Never approve such an answer
 // based on the mere presence of the same medical keywords.
 if(/\\b(?:δεν|μην|ουτε|χωρις)\\b/.test(normalized))return {...raw,verdict:'uncertain',criticalError:false,correctPoints:[],missingPoints:[],explanation:'Η διατύπωση περιέχει άρνηση που μπορεί να αλλάζει την ιατρική έννοια. Απαιτείται έλεγχος προτού καταχωριστεί πλήρης βαθμολογία.'};
 if(Object.values(found).every(Boolean))return raw; // still only the model's judgment
 const core=found.clean&&found.warm&&found.moist;
 if(core&&!found.smell&&!found.mechanism){
  return {...raw,verdict:'partial',criticalError:false,
   explanation:'Αναφέρθηκαν καθαρισμός, θέρμανση και ύγρανση, αλλά η απάντηση δεν καλύπτει όλα τα σημεία της εκπαιδευτικής αναφοράς. Δεν βαθμολογούνται τα ορθογραφικά ή συντακτικά λάθη.',
   correctPoints:['Καθαρισμός του εισπνεόμενου αέρα','Θέρμανση του εισπνεόμενου αέρα','Ύγρανση του εισπνεόμενου αέρα'],
   missingPoints:['Πώς συμμετέχουν η βλέννη και οι κροσσοί στον καθαρισμό','Συμμετοχή της ρινικής περιοχής στην όσφρηση']};
 }
 return {...raw,verdict:'uncertain',criticalError:false,
  explanation:'Η απάντηση χρειάζεται επανέλεγχο ως προς την κάλυψη όλων των στοιχείων της συγκεκριμένης εκπαιδευτικής αναφοράς. Δεν δίνεται αυτόματα πλήρης βαθμολογία.',
  correctPoints:[],missingPoints:[]};
}
