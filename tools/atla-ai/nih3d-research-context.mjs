/**
 * NIH 3D source-reference policy for SAEK lessons, practice exams and the Clinical Cockpit.
 * Original NIH external pages are research references. They are NOT scientifically approved
 * clinical 3D objects and may not be rendered directly by the browser (NIH CORS).
 */
export const RESEARCH_ENTRY = Object.freeze({
  id:170,accession:'3DPX-000170',title:'Human patella',
  greekTitle:'Ανθρώπινη επιγονατίδα',
  category:'Anatomy',originalLicense:'Public Domain',
  officialPage:'https://3d.nih.gov/entries/3DPX-000170',
  verifiedSourceFileFormat:'STL',
  verifiedFileBytes:171884,
  verifiedFileSha256:'eb0587d5fef552120b1e15a200c336d80d2631513703b5461d66c717a0d32d69',
  scientificApproval:'NOT_ESTABLISHED',usage:'RESEARCH_SOURCE_ONLY'
});
const PATELLA=/(?:επιγονατίδ\p{L}*|\bpatella\b)/iu;
const SAFE_SURFACES=new Set(['lesson','anatomy','exam','cockpit']);
export function selectNihResearchSource({surface,text='',courseId='',chapterId='',revealed=false,confirmedAnatomy=false}={}){
  if(!SAFE_SURFACES.has(surface))return null;
  // No diagnosis is inferred from a traumatic scenario or a generic body-system name.
  if(surface==='cockpit'&&!confirmedAnatomy)return null;
  // Exam answers are never disclosed or hinted before a learner reveals the reference.
  if(surface==='exam'&&!revealed)return null;
  // Source-linked chapter is explicitly reviewed for mentioning the patella.
  if(surface==='lesson'&&!(String(courseId)==='01'&&String(chapterId)==='2'))return null;
  if(!PATELLA.test(String(text)))return null;
  return RESEARCH_ENTRY;
}
export function officialResearchLink(record){
  if(record!==RESEARCH_ENTRY||record.scientificApproval!=='NOT_ESTABLISHED')return null;
  return {
    href:record.officialPage,label:'NIH 3D · '+record.greekTitle+' (πρωτότυπη πηγή)',
    description:'Ερευνητική ανατομική αναφορά. Δεν αποτελεί επικυρωμένο κλινικό μοντέλο του ATLA.',
    rel:'noopener noreferrer',target:'_blank',
    originalFormatVerified:true,independentScientificApproval:false
  };
}
