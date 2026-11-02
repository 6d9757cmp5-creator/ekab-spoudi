#!/usr/bin/env node
/** Reconcile ATLA Master Plan 2026 Anatomy Lab and Clinical Cockpit resources.
  Never sum source metadata records, physical files, meshes and source code as one unit.
  No automatic activation of unreviewed NIH models in live educational apps. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const hra=await json('tools/anatomy-3d/resources/imported-manifest.json');
const z=await json('tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json');
const m=await json('tools/patient-simulator/resources/makehuman/imported-manifest.json');
const ms=await json('tools/patient-simulator/resources/makehuman/supplemental-imported-manifest.json');
const q=await json('tools/patient-simulator/resources/quaternius/imported-manifest.json');
const nih=await json('tools/atla-ai/resources/nih3d-master-plan-2026/catalog-index.json');
let archive=null;
try{archive=await json('docs/ATLA_NIH3D_MODEL_ARCHIVE_STATUS_2026.json')}catch{}
const datasets=[
 {name:'HRA / HuBMAP 3D',tool:'anatomy-lab',unit:'model files',count:hra.assets.length,status:'stored in repository',manifest:'tools/anatomy-3d/resources/imported-manifest.json'},
 {name:'Z-Anatomy',tool:'anatomy-lab',unit:'research model files',count:z.assets.length,status:'stored - research isolation',manifest:'tools/anatomy-3d/resources/z-anatomy-research/imported-manifest.json'},
 {name:'MakeHuman',tool:'clinical-cockpit',unit:'geometry, rig and animation files',count:m.assets.length+ms.files.length,status:'stored - not patient validation',manifest:'tools/patient-simulator/resources/makehuman/'},
 {name:'Quaternius',tool:'clinical-cockpit',unit:'model and animation files',count:q.assets.length,status:'stored - research',manifest:'tools/patient-simulator/resources/quaternius/imported-manifest.json'},
 {name:'BodyParts3D 4.0',tool:'anatomy-lab',unit:'anatomical meshes',count:1259,status:'compiled atlas in repository',manifest:'tools/anatomy-3d/resources/bp3d40/'},
 {name:'BodyParts3D 4.3',tool:'anatomy-lab',unit:'anatomical meshes',count:3210,status:'compiled atlas in repository',manifest:'tools/anatomy-3d/resources/bp3d43/'},
 {name:'NIH 3D anatomical',tool:'anatomy-lab',unit:'source metadata entries',count:nih.sections['anatomy-lab'],status:'catalogued; not automatically downloaded or enabled',manifest:'tools/atla-ai/resources/nih3d-master-plan-2026/'},
 {name:'NIH 3D clinical devices',tool:'clinical-cockpit',unit:'source metadata entries',count:nih.sections['clinical-cockpit-research'],status:'catalogued; candidates only',manifest:'tools/atla-ai/resources/nih3d-master-plan-2026/'},
 {name:'NIH 3D other scientific',tool:'atla-ai',unit:'source metadata entries',count:nih.sections['atla-ai-knowledge-resources'],status:'catalogued; candidates only',manifest:'tools/atla-ai/resources/nih3d-master-plan-2026/'}
];
const paths=[...hra.assets.map(x=>x.output),...z.assets.map(x=>x.path??x.output),...m.assets.map(x=>x.path),...ms.files.map(x=>x.path),...q.assets.map(x=>x.path)];
if(paths.some(x=>typeof x!=='string'||!x.length)||new Set(paths).size!==paths.length)throw Error('Missing or duplicate stored resource paths');
const storedFiles=hra.assets.length+z.assets.length+m.assets.length+ms.files.length+q.assets.length;
const nihil=datasets.filter(x=>x.unit==='source metadata entries').reduce((n,x)=>n+x.count,0);
if(paths.length!==storedFiles||nihil!==nih.publishedEntriesFound||nih.apiErrors!==0)throw Error('Cross-source inventory mismatch');
const registry={scope:'ATLA Master Plan 2026',
 toolSeparation:'Anatomy Lab and Clinical Cockpit are independent tools with a shared source registry',
 nonAdditiveUnits:true,storedSourceFilesOutsideNIH:storedFiles,
 scientificApprovalNotImplied:true,
 nih3d:{publishedEntries:nih.publishedEntriesFound,sourceIdsScanned:nih.verifiedScannedIds,categoryRouting:nih.sections,
  archiveAudit:archive?{status:archive.status,canonicalGroups:archive.binary.canonicalShards,files:archive.binary.originalFiles,distinctNIHModels:archive.binary.sourceModelIds,missing3DEntries:archive.binary.publishedSourceModelsNotArchived}:null},
 datasets};
await mkdir('tools/atla-ai/resources',{recursive:true});
await writeFile('tools/atla-ai/resources/master-resource-index.json',JSON.stringify(registry,null,2)+'\n');
const lines=[
 '# ATLA Master Plan 2026 - Resource Inventory','',
 'Anatomy Lab and Clinical Cockpit share resource discovery, not their engines or patient data.',
 'The figures below are DIFFERENT UNITS and must not be summed as one model total.','',
 '| Source | Destination | Count | Unit | State |','|---|---|---:|---|---|',
 ...datasets.map(x=>'| '+x.name+' | '+x.tool+' | '+x.count+' | '+x.unit+' | '+x.status+' |'),
 '',
 '- Verified newly stored non-NIH source files: **'+storedFiles+'**.',
 '- BodyParts3D counts are meshes reported by the verified intake document, not separate downloads.',
 '- 36 MIT Open Anatomy Atlas code files are tools/software, not 3D meshes (see docs/ATLA_3D_ASSET_INTAKE_VERIFIED.md).',
 '- NIH catalog: **'+nih.publishedEntriesFound+'** published metadata entries across three possible destination modules.',
 archive?'- NIH binary release audit: **'+archive.binary.canonicalShards+'/250** canonical groups, **'+archive.binary.originalFiles+'** original files across **'+archive.binary.sourceModelIds+'** NIH entries. Status: **'+archive.status+'**.':
 '- NIH archive audit: no verified JSON report available yet.',
 '',
 'Source manifests: tools/atla-ai/resources/master-resource-index.json and each dataset manifest above.',
 'New resources require per-file provenance, format/scale/coordinate checks and educational relevance before activation.',''
];
await writeFile('docs/ATLA_MASTER_RESOURCE_INVENTORY_2026.md',lines.join('\n'));
console.log('ATLA_MASTER_RESOURCE_COUNTS '+JSON.stringify({verifiedFiles:storedFiles,nihMetadata:nih.publishedEntriesFound,archiveAudited:!!archive}));
