/**
 * NIH 3D biomedical research scope: transparent triage, not scientific accuracy
 * certification. Every source entry remains discoverable, including excluded
 * hardware and unresolved molecules. No source-file redistribution is authorized
 * by this metadata classifier.
 *
 * Official categories: https://3d.nih.gov/about
 * Conditions: https://3d.nih.gov/terms
 */
const TIER={IN:'IN_SCOPE_RESEARCH_CANDIDATE',REVIEW:'SCIENTIFIC_REVIEW_REQUIRED',OUT:'LIKELY_OUT_OF_MEDICAL_SCOPE'};
const categoryScope=Object.freeze({
  'Anatomy':'human_or_comparative_anatomy',
  'Biomacromolecules':'biomedical_molecular_structure',
  'Cells and Organelles':'cell_biology_and_microbiology',
  'Viruses':'virology_and_infectious_agents',
  'Prosthetics':'prosthetics_and_rehabilitation',
  'Small Molecules':'chemistry_or_pharmacology',
  'Devices and Hardware':'hardware_and_lab_tools'
});
const domainPatterns=[
 ['human_anatomy',/\b(anatom\w*|human (?:head|skull|spine|organ|heart|leg|femur|tibia)|brain|lung|kidney|skeleton|bone|pelvis|arter\w*|vascular)\b/i],
 ['medical_devices',/\b(prosthe\w*|orthos\w*|stethoscope|defibrillat\w*|catheter|respirator|ventilator|syringe|medical device|patient|treatment|surgical|biopsy|diagnos\w*|wound care)\b/i],
 ['pathogens',/\b(viral|virus|bacter\w*|pathogen|sars.cov|covid|hiv|hepatitis|ebola|influenza|mycobacterium|plasmodium|fung\w*|microb\w*)\b/i],
 ['drug_and_therapy',/\b(pharmacol\w*|therapeut\w*|medicin\w*|pharmaceut\w*|antibio\w*|antiviral|antifungal|drug|vaccine|inhibitor|antibody)\b/i],
 ['biomedical_cell',/\b(cell|cells|tissue|mitochondr\w*|golgi|ribosom\w*|neuron\w*|receptor\w*|enzyme|protein\w*|dna|rna|hemoglobin|haemoglobin)\b/i]
];
const specificHardware=/\b(breadboard|led|wire|cable|adapter|mount|holder|bracket|screw|nut|bolt|stand|case|housing|filter)\b/i;
const formatWhitelist=new Set(['GLB','GLTF','STL','OBJ','WRL','X3D','PLY','3MF']);
const allowedSource=/^https:\/\/3d\.nih\.gov\/api\/submissions\/\d+\/runs\/[a-z0-9-]+\/output-files\/\d+$/i;
const approvedLabels=new Set(['public domain','cc by 4.0','cc0 1.0']);
export function biomedicalScope(entry){
  if(!entry||!Number.isSafeInteger(Number(entry.entryId??entry.id)))throw Error('Invalid NIH source identity');
  const id=Number(entry.entryId??entry.id),category=String(entry.category??'');
  const text=String(entry.title??'')+' '+String(entry.description??'').replace(/<[^>]*>/g,' ');
  const signals=domainPatterns.filter(([,p])=>p.test(text)).map(([name])=>name);
  const licenseLabel=String(entry.license??entry.licenseRaw??'').trim();
  const files=Array.isArray(entry.files)?entry.files:[];
  const validSources=files.filter(f=>formatWhitelist.has(String(f.format??'').toUpperCase())&&
    allowedSource.test(String(f.url??''))&&Number.isSafeInteger(Number(f.size))&&Number(f.size)>0);
  let status=TIER.REVIEW,reason='Insufficient evidence of biomedical education relevance';
  if(['Anatomy','Biomacromolecules','Cells and Organelles','Viruses'].includes(category)){
    status=TIER.IN;reason='NIH explicitly classifies this entry in a biomedical research domain';
  }else if(category==='Prosthetics'){
    status=TIER.IN;reason='NIH labels source as a prosthetic/rehabilitation model';
  }else if(category==='Small Molecules'){
    status=TIER.REVIEW;reason='Chemical structure requires therapeutic/biological relevance review';
  }else if(category==='Devices and Hardware'){
    if(signals.includes('medical_devices')||signals.includes('pathogens')||signals.includes('drug_and_therapy')){
      status=TIER.REVIEW;reason='Possible clinical/laboratory tool requires domain review';
    }else if(signals.length===0||specificHardware.test(String(entry.title??''))){
      status=TIER.OUT;reason='Generic hardware has no verified medical or biomedical purpose';
    }else{
      status=TIER.REVIEW;reason='Scientific relevance of hardware requires subject-matter review';
    }
  }
  const licenseStatus=approvedLabels.has(licenseLabel.toLowerCase())?
    'SOURCE_LABEL_PERMITS_POSSIBLE_REUSE_WITH_LICENSE_CONDITIONS':'LICENSE_REQUIRES_INDIVIDUAL_REVIEW';
  return {
    entryId:id,accession:entry.accession??null,
    title:String(entry.title??''),category,
    domain:categoryScope[category]??'unknown_category',
    status,reason,biomedicalSignals:signals,
    scientificAccuracy:'NOT_INDEPENDENTLY_VERIFIED',
    clinicalUseApproved:false,
    sourceLicense:entry.license??null,sourceRawLicense:entry.licenseRaw??null,licenseStatus,
    originalSourceUrl:entry.url??null,sourceVersion:entry.version??null,
    originalFileReferences:files.length,sourceFormats:[...new Set(validSources.map(x=>String(x.format).toUpperCase()))],
    unsupportedOrMalformedFileReferences:files.length-validSources.length,
    requiresHumanDomainReview:true,originalBinariesStoredByThisScreen:0
  };
}
export const NIH_BIOMEDICAL_SCOPE_STATUS=TIER;
