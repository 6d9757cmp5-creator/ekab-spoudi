/** ATLA contextual 3D selection: return no model unless educationally justified and reviewed. */
const ALLOWED_SURFACES=new Set(['lesson','exam','cockpit']);
const SYNONYMS={
 anatomy:/ανατομ|οστ|μυ|αγγεί|σπονδυλ|κεφάλ|anatom|bone|skelet/i,
 cardiovascular:/καρδ|έμφραγ|αρρυθμ|κυκλοφορ|στεφαν|cardi|heart|coronar|ecg/i,
 respiratory:/πνευμ|αναπνευσ|αεραγωγ|πνιγ|οξυγόν|lung|airway|respirat/i,
 neurology:/εγκεφαλ|νευρολ|επιληψ|εγκεφαλικό|stroke|brain|neuro/i,
 pathology:/σοκ|σήψ|τραύμ|κάταγμ|κατάγμα|λοίμωξ|διαβήτ|shock|fracture|sepsis|trauma|patholog/i,
 microbiology:/μικροβ|βακτήρ|ιό|ιός|ιούς|λοίμωξ|virus|bacter|pathogen/i,
 'molecular-medicine':/μοριακ|κύτταρ|πρωτεΐν|dna|rna|protein|molecul|cell/i,
 'obstetrics-pediatrics':/μαιευτ|τοκετ|έμβρυ|νεογν|παιδιατρ|pregnan|neonat|pediatr/i,
 pharmacology:/φάρμακ|φαρμακολ|τοξικ|drug|pharmac|insulin|medicat/i,
 'clinical-tools':/ιατρικ.*συσκευ|διασωλήν|καθετήρ|implant|catheter|ventilat/i
};
const tokens=s=>new Set(String(s??'').toLocaleLowerCase('el').split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>=4));
export function selectContextualModels(entries,context={}){
 const {surface,learningObjective,reviewedModels=[],require3D=false,questionRequires3D=false,limit=3}=context;
 if(!ALLOWED_SURFACES.has(surface)||!String(learningObjective??'').trim()||!require3D)return [];
 if(surface==='exam'&&!questionRequires3D)return [];
 const approved=new Set(reviewedModels.map(x=>String(x)));
 const tags=new Set(Object.entries(SYNONYMS).filter(([,r])=>r.test(learningObjective)).map(([t])=>t));
 const objectiveWords=tokens(learningObjective);
 if(!tags.size||!approved.size)return [];
 return entries.filter(e=>e.decision==='medical_candidate'&&approved.has(String(e.id)))
  .map(e=>{
   const hits=(e.topics??[]).filter(t=>tags.has(t));
   if(!hits.length)return null;
   const words=tokens(e.title),lexical=[...objectiveWords].filter(t=>words.has(t)).length;
   return {id:e.id,accession:e.accession,title:e.title,sourceUrl:e.sourceUrl,
    version:e.sourceVersion,topics:hits,score:hits.length*10+lexical};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||Number(a.id)-Number(b.id))
  .slice(0,Math.max(0,Math.min(10,limit)));
}
