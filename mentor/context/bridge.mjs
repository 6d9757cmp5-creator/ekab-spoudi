/**
 * MENTOR Context Bridge: what MENTOR may know about the page the learner is on.
 * Read-only and minimal by design:
 *  - page title, headline and path only; never the page body, notes, grades or chat;
 *  - selected text only when the learner presses "Explain selection" (read at click time);
 *  - pages may announce a whitelisted study object via the "mentor:context" event;
 *  - the learner can switch the context off, and it is always shown in the UI.
 * During exams MENTOR gives no answers.
 */
export const CONTEXT_KEY="ekab.mentor.context.v1";
export const CONTEXT_KINDS=["course","chapter","anatomy-object","scenario","study-mode","exam"];
export const MAX_LABEL=120;
export const MAX_SELECTION=300;

// Pages where answers would defeat the assessment.
const EXAM_PAGES=/(^|\/)(written_exam|practical_exam|exam_focus|saek-exams)\.html$/i;

const clean=(value,max=MAX_LABEL)=>String(value??"").replace(/\s+/g," ").trim().slice(0,max);

export function examMode(pathname,announced=null){
 return EXAM_PAGES.test(String(pathname||""))||announced?.kind==="exam"&&announced?.active!==false;
}

/** Validates an object announced by a page; unknown kinds and long text are rejected. */
export function sanitizeAnnouncement(detail){
 if(!detail||typeof detail!=="object"||!CONTEXT_KINDS.includes(detail.kind))return null;
 const label=clean(detail.label);
 if(!label&&detail.kind!=="exam")return null;
 const id=clean(detail.id,60);
 return {kind:detail.kind,label,id,active:detail.active!==false};
}

/** Title, first heading and path from the live document: nothing else is read. */
const KIND_BY_PATH=[
 [/(^|\/)saek-course-\d+\.html$/i,"course"],
 [/(^|\/)(anatomia\.html|anatomy-3d\/)/i,"anatomy-object"],
 [/(^|\/)(mentor-scenarios|mentor-live)\.html$/i,"scenario"],
 [/(^|\/)(mentor-readonly|theory|fysiologia|study_map)\.html$/i,"study-mode"]
];

/** The kind of learning page, from its address alone (no page content is read). */
export function kindOfPath(pathname){
 const hit=KIND_BY_PATH.find(([re])=>re.test(String(pathname||"")));
 return hit?hit[1]:"";
}

export function readPageContext(doc,loc){
 // Skip the app header: its headline is the product name, not the lesson.
 const candidates=[...(doc.querySelectorAll?.("main h1, main h2, article h1, article h2, h1, h2")||[])];
 const heading=candidates.find(h=>!h.closest?.("header, nav, .top, .nav")&&!/^ΕΚΑΒ Σπουδή/.test(clean(h.textContent)))||null;
 return {
  path:clean(loc.pathname,120),
  kind:kindOfPath(loc.pathname),
  title:clean(doc.title),
  heading:clean(heading?.textContent)
 };
}

const KIND_LABELS={course:"μάθημα",chapter:"κεφάλαιο","anatomy-object":"ανατομία",scenario:"σενάριο","study-mode":"μελέτη"};

export function describeContext({page,announced,enabled,exam}){
 if(exam)return "Πλαίσιο σελίδας: εξέταση σε εξέλιξη — ο MENTOR δεν δίνει απαντήσεις";
 if(!enabled)return "Πλαίσιο σελίδας: απενεργοποιημένο";
 const subject=announced?.label||page?.heading||page?.title;
 const kindLabel=KIND_LABELS[announced?.kind||page?.kind];
 return subject?"Πλαίσιο σελίδας"+(kindLabel?" ("+kindLabel+")":"")+": "+subject:"Πλαίσιο σελίδας: δεν υπάρχει";
}

const DEICTIC=/(αυτ[οόηήεέ]|εδώ|τούτο|αυτά|εξήγησ[εέ]\s*μου|τι\s+σημαίνει\s+αυτό)/i;

/**
 * Builds the text sent to the local answer engine.
 * Explicit selection wins; a vague question ("εξήγησέ μου αυτό") borrows the page subject.
 */
export function composeQuestion({question,selection,context}){
 const q=clean(question,MAX_SELECTION);
 const sel=clean(selection,MAX_SELECTION);
 if(sel)return {text:sel,used:"selection"};
 if(!q)return {text:"",used:"none"};
 if(context?.enabled&&!context.exam){
  const subject=context.announced?.label||context.page?.heading||"";
  if(subject&&q.length<60&&DEICTIC.test(q))return {text:q+" "+subject,used:"page"};
 }
 return {text:q,used:"question"};
}

export const EXAM_REFUSAL="Βρισκόμαστε σε εξέταση, οπότε δεν μπορώ να δώσω απαντήσεις ή υποδείξεις. Όταν τελειώσεις, θα τα δούμε μαζί στη μελέτη.";
