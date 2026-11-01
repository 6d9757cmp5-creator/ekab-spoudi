/**
 * Narrow review guard for UNAMBIGUOUS contradictions to project-supplied rubrics.
 *
 * This module is NOT a medical classifier and NOT a substitute for independent
 * review or the actual student text. It only demotes apparent full credit to
 * "uncertain" when an explicit high-risk claim needs human attention.
 * Never upgrades, never automatically marks incorrect, and never adds scores.
 */
import {normalizedGreek} from './source-completeness.mjs';

const checks=Object.freeze({
 'saek-16-10':Object.freeze([
  {why:'Αντικείμενο στο στόμα κατά τη διάρκεια κρίσης',
   phrase:/(?:βαζω|βαζουμε|τοποθετω|τοποθετουμε|χωνω|χωνουμε)\s+(?:ενα\s+|καποιο\s+|το\s+)?(?:αντικειμενο|κουταλι|δαχτυλο)\s+(?:μεσα\s+)?στο\s+στομα/gu,
   negationWindow:34}
 ]),
 'saek-04-2':Object.freeze([
  {why:'Λανθασμένος ισχυρισμός ότι τα γάντια καταργούν την υγιεινή χεριών',
   phrase:/(?:δεν\s+χρειαζεται|δεν\s+απαιτειται|δεν\s+κανουμε|δεν\s+ειναι\s+αναγκαια)\s+(?:πλεον\s+)?(?:η\s+)?(?:υγιεινη|αντισηψια|πλυσιμο|καθαρισμος)\s+(?:των\s+)?χεριων/gu,
   negationWindow:0}
 ]),
 'saek-05-9':Object.freeze([
  {why:'Εσφαλμένος αποκλεισμός καταπληξίας από φυσιολογική πίεση',
   phrase:/(?:φυσιολογικ\S*\s+(?:αρτηριακ\S*\s+)?πιεσ\S*\s+)(?:αποκλειει|σημαινει\s+οτι\s+δεν\s+υπαρχει)\s+(?:πρωιμο\s+)?(?:σοκ|καταπληξια)/gu,
   negationWindow:18}
 ]),
 'saek-17-8':Object.freeze([
  {why:'Κοιλιακές ωθήσεις σε έγκυο στην εκπαιδευτική αναφορά',
   phrase:/(?:κανω|κανουμε|εφαρμοζω|εφαρμοζουμε|πραγματοποιω|πραγματοποιουμε)\s+(?:τις\s+)?κοιλιακες\s+ωθησεις/gu,
   negationWindow:42,
   requireContext:/(?:εγκυ|κυησ|εγκυμοσυν)/u}
 ]),
 'EOP-A-018':Object.freeze([
  {why:'Λανθασμένη αφετηρία της πνευμονικής αρτηρίας',
   phrase:/(?:πνευμονικ\S*\s+αρτηρι\S*\s+(?:ξεκινα|αρχιζει|βγαινει|φευγει)\s+απο\s+(?:την\s+)?αριστερ\S*\s+κοιλι\S*)/gu,
   negationWindow:26}
 ])
});

/** Check the immediately preceding words for a negation of the risky claim.
 *  This is a conservative abstention heuristic, NOT parsing full Greek syntax.
 *  Avoid flagging explicit statements such as "ΔΕΝ βάζουμε αντικείμενο".
 */
function locallyNegated(answer,index,window){
 if(!window)return false;
 const before=answer.slice(Math.max(0,index-window),index);
 // Only the last, nearby clause. Negations on other preceding sentences
 // must not suppress an unsafe assertion.
 const clause=before.split(/[.!;:\n]/u).at(-1);
 return /(?:^|\s)(?:δεν|μην|ουτε|χωρις|οχι)(?=\s|$)/u.test(clause);
}

export function guardHighRiskFullCredit(question,answer,raw){
 if(raw?.verdict!=='correct'||raw?.criticalError===true)return raw;
 const rules=checks[question?.id];
 if(!rules)return raw;
 const normalized=normalizedGreek(answer);
 for(const rule of rules){
  if(rule.requireContext&&!rule.requireContext.test(normalized))continue;
  rule.phrase.lastIndex=0;
  for(const match of normalized.matchAll(rule.phrase)){
   if(locallyNegated(normalized,match.index,rule.negationWindow))continue;
   return {...raw,verdict:'uncertain',criticalError:false,
    correctPoints:[],missingPoints:[],
    explanation:'Η απάντηση περιέχει διατύπωση που ενδέχεται να αντιφάσκει με την εκπαιδευτική αναφορά. Απαιτείται αξιολόγηση του πλήρους νοήματος από εκπαιδευτή πριν χορηγηθεί βαθμός.',
    safetyNote:'Εκκρεμεί επανέλεγχος: '+rule.why+'. Ο αυτόματος έλεγχος δεν αποτελεί κλινική διάγνωση ή επίσημη αξιολόγηση.'};
  }
 }
 return raw;
}

export const HIGH_RISK_REVIEW_IDS=Object.freeze(Object.keys(checks));
