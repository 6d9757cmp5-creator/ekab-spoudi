/**
 * MENTOR OS PREHOSPITAL ATLAS: educational DESIGN INVENTORY only.
 * None of the rows is a medically reviewed case, treatment suggestion or usable triage tool.
 * Sources are broad reference landing pages, NOT case-by-case clinical endorsements.
 */
import {FAMILIES} from './data.mjs';
export const REFERENCE_INDEX=Object.freeze({
  'erc-2025':{title:'ERC Guidelines 2025',url:'https://www.erc.edu/science-research/guidelines/guidelines-2025',scope:'αναζωογόνηση και πρώτες βοήθειες'},
  'aha-2025':{title:'AHA Guidelines 2025',url:'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines',scope:'ΚΑΡΠΑ και επείγουσα καρδιαγγειακή φροντίδα'},
  'who-bec':{title:'WHO Basic Emergency Care',url:'https://qualityhealthservices.who.int/quality-toolkit/qt-catalog-item/basic-emergency-care-approach-to-the-acutely-ill-and-injured-participant-workbook',scope:'ABCDE/SAMPLE, τραύμα, αναπνοή, shock, μεταβολή συνείδησης'},
  'who-triage':{title:'WHO Interagency Integrated Triage Tool',url:'https://www.who.int/tools/triage',scope:'κυρίως διαλογή σε δομές· δεν είναι ελληνικό πρωτόκολλο ΕΚΑΒ'},
  ekab:{title:'ΕΚΑΒ — επίσημη ιστοσελίδα',url:'https://www.ekab.gr/',scope:'ελληνικός φορέας· οι επαγγελματικές αρμοδιότητες απαιτούν νομική επαλήθευση'}
});
export const ROLE_TRACKS=Object.freeze({
  ekab:{label:'Σπουδαστής / Διασώστης ΕΚΑΒ',scope_status:'requires_greek_legal_verification'},
  paramedic:{label:'Paramedic (άλλο σύστημα υγείας)',scope_status:'varies_by_country_and_credential'},
  physician:{label:'Ιατρός προνοσοκομειακής',scope_status:'requires_professional_and_clinical_review'}
});
export const SKILLS=Object.freeze({
 scene:'Ασφάλεια σκηνής',assessment:'Συστηματική παρατήρηση / ABCDE (θεωρία)',
 communications:'Επικοινωνία και συντονισμός',documentation:'Αντικειμενική καταγραφή',
 teamwork:'Συνεργασία ομάδας',handover:'Δομημένη παράδοση',equipment:'Αναγνώριση εξοπλισμού',
 infection:'ΜΑΠ και προστασία από έκθεση',ethics:'Συναίνεση και απόρρητο',
 population:'Ειδικές ανάγκες πληθυσμού',logistics:'Πόροι και πρόσβαση',
 reassessment:'Επανεκτίμηση αναφορών',triage_awareness:'Διαλογή — μόνο αναγνώριση ορίων'
});
const POPULATIONS=Object.freeze(['adult','child','infant','neonate','pregnant','older','multi','all']);
const ENVIRONMENTS=Object.freeze(['urban','home','road','public','ambulance','transport','remote','marine','mountain','agricultural','industrial','disaster','care']);
const LEVELS=Object.freeze(['foundation','intermediate','advanced']);
const level=index=>index<3?'foundation':index<7?'intermediate':'advanced';
const make=(f,title,index)=>Object.freeze({
 id:f.id+'-'+String(index+1).padStart(3,'0'),
 category_id:f.id,category_title:f.title,title,
 difficulty:level(index),population:f.population,environment:f.environment,
 skills:Object.freeze([...f.skills]),reference_ids:Object.freeze([...f.refs]),
 educational_role_tracks:Object.freeze(Object.keys(ROLE_TRACKS)),
 role_scope_status:'requires_local_scope_verification',
 source_match_status:'general_reading_only_not_scenario_checked',
 clinical_review_status:'requires_clinical_review',
 implementation_stage:'topic_outline_not_individual_interactive_simulation',
 educational_objectives:Object.freeze([
  'Διαχωρισμός γνωστών στοιχείων και υποθέσεων',
  'Αναγνώριση ορίων ασφάλειας και αρμοδιότητας',
  'Σαφής οργανωτική επικοινωνία και καταγραφή',
  'Ανασκόπηση ελλείψεων χωρίς αυτόματη διάγνωση'
 ]),
 reflection_prompts:Object.freeze([
  'Ποιες αρχικές πληροφορίες θα επαλήθευες;',
  'Ποιοι κίνδυνοι σκηνής ή όρια ρόλου πρέπει να διευκρινιστούν;',
  'Τι θα ανέφερες στον αρμόδιο συντονισμό χωρίς να προσθέσεις υποθέσεις;',
  'Πώς θα κατέγραφες την παράδοση πληροφοριών;'
 ]),
 treatment_enabled:false,dosing_enabled:false,triage_algorithm_enabled:false,
 physiological_simulation_enabled:false,ai_enabled:false,official_grading_enabled:false
});
export const CATEGORIES=Object.freeze(FAMILIES.map(f=>Object.freeze({
 id:f.id,title:f.title,environment:f.environment,population:f.population,
 skills:Object.freeze([...f.skills]),reference_ids:Object.freeze([...f.refs]),
 topic_count:f.items.length
})));
export const SCENARIOS=Object.freeze(FAMILIES.flatMap(f=>f.items.map((name,i)=>make(f,name,i))));
export function normalizeSearch(value){
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ς/g,'σ')
  .toLocaleLowerCase('el').replace(/\s+/g,' ').trim();
}
export function queryScenarios({search='',category='all',difficulty='all',population='all',limit=80,offset=0}={}){
 if(!Number.isInteger(limit)||limit<1||limit>300||!Number.isInteger(offset)||offset<0)throw Error('invalid-pagination');
 const tokens=normalizeSearch(search).slice(0,120).split(' ').filter(Boolean).slice(0,10);
 const list=SCENARIOS.filter(s=>(category==='all'||s.category_id===category)&&
  (difficulty==='all'||s.difficulty===difficulty)&&
  (population==='all'||s.population===population)&&
  tokens.every(x=>normalizeSearch([s.title,s.category_title,s.id,...s.skills.map(k=>SKILLS[k])].join(' ')).includes(x)));
 return {total:list.length,items:list.slice(offset,offset+limit)};
}
export const getScenario=id=>SCENARIOS.find(s=>s.id===id)||null;
export function verifyAtlas(){
 const ids=new Set(),famIds=new Set();
 for(const c of CATEGORIES){
  if(famIds.has(c.id)||!c.topic_count)throw Error('duplicate-or-empty-family');
  famIds.add(c.id);
 }
 for(const s of SCENARIOS){
  if(ids.has(s.id)||!/^[A-Z]+-\d{3}$/.test(s.id)||!s.title||s.title.length>160||
    !famIds.has(s.category_id)||!POPULATIONS.includes(s.population)||
    !ENVIRONMENTS.includes(s.environment)||!LEVELS.includes(s.difficulty)||
    !s.skills.length||!s.skills.every(k=>Object.hasOwn(SKILLS,k))||
    !s.reference_ids.every(k=>Object.hasOwn(REFERENCE_INDEX,k))||
    s.clinical_review_status!=='requires_clinical_review'||
    s.role_scope_status!=='requires_local_scope_verification'||
    s.source_match_status!=='general_reading_only_not_scenario_checked'||
    s.implementation_stage!=='topic_outline_not_individual_interactive_simulation'||
    ['treatment_enabled','dosing_enabled','triage_algorithm_enabled','physiological_simulation_enabled','ai_enabled','official_grading_enabled'].some(k=>s[k]!==false)
  )throw Error('invalid-or-unsafe-scenario:'+s.id);
  ids.add(s.id);
 }
 if(SCENARIOS.length!==CATEGORIES.reduce((n,c)=>n+c.topic_count,0))throw Error('count-mismatch');
 return {categories:CATEGORIES.length,scenarios:SCENARIOS.length,independently_clinically_approved:0,ai_connected:false};
}
verifyAtlas();
