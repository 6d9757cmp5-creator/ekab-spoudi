/**
 * Safe model selection for ATLA's two *independent* 3D study tools.
 * Only allow pinned, in-repository source files. Never accept arbitrary URLs.
 * NIH release archives must pass separately through asset-level QA and activation.
 */
const defs={
 anatomy:{prefix:'tools/anatomy-3d/resources/hra-v1.2/',label:'HRA/HuBMAP',units:'Ανατομία'},
 cockpit:{prefix:'tools/patient-simulator/resources/quaternius/',label:'Quaternius',units:'Ερευνητική προσομοίωση'}
};
const cleanName=name=>String(name||'').replace(/\.glb$/i,'').replace(/_/g,' ').trim();
export function buildModelList(tool,raw){
 const cfg=defs[tool];
 if(!cfg||!raw||!Array.isArray(raw.assets))throw Error('Μη έγκυρο μητρώο μοντέλων');
 const used=new Set();
 const items=[];
 for(const item of raw.assets){
  const path=tool==='anatomy'?item.output:item.path;
  if(typeof path!=='string'||!path.startsWith(cfg.prefix)||!path.endsWith('.glb')||
     !/^[A-Za-z0-9/_.-]+$/.test(path)||path.includes('..')||path.includes('//'))continue;
  if(!/^[a-f0-9]{64}$/i.test(item.sha256||''))continue;
  const bytes=Number(item.bytes??item.size);
  if(!Number.isSafeInteger(bytes)||bytes<1000||bytes>250*1024*1024)continue;
  if(used.has(path))continue;
  used.add(path);
  items.push({
   id:path,label:cleanName(item.name||path.split('/').pop()),path,bytes,
   region:tool==='anatomy'?String(item.region||'').slice(0,40):'simulation',
   status:tool==='anatomy'?'HRA — μη κλινικά επικυρωμένο':'Ερευνητικό μοντέλο — όχι πραγματικός ασθενής',
   license:String(item.license||raw.sourceLicense||'').slice(0,100),
   sha256:item.sha256
  });
 }
 return items.sort((a,b)=>a.label.localeCompare(b.label,'el'));
}
export function getResourceCatalogUrls(rootUrl){
 const root=new URL(rootUrl);
 if(!['https:','http:'].includes(root.protocol))throw Error('Invalid site base');
 return {
  anatomy:new URL('tools/anatomy-3d/resources/imported-manifest.json',root),
  cockpit:new URL('tools/patient-simulator/resources/quaternius/imported-manifest.json',root)
 };
}
export function safeAssetUrl(item,tool,rootUrl){
 const cfg=defs[tool];
 if(!cfg||!item||typeof item.path!=='string'||!item.path.startsWith(cfg.prefix)||
    !/^[A-Za-z0-9/_.-]+$/.test(item.path)||item.path.includes('..')||!item.path.endsWith('.glb'))throw Error('Μη επιτρεπόμενο αρχείο');
 const root=new URL(rootUrl),out=new URL(item.path,root);
 if(out.origin!==root.origin||!out.pathname.startsWith(new URL(cfg.prefix,root).pathname))throw Error('Μη επιτρεπόμενη τοποθεσία');
 return out;
}
export const toolOptions=Object.freeze({anatomy:'Anatomy Lab',cockpit:'Clinical Cockpit'});
