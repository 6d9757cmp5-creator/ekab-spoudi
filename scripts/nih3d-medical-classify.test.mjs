import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'atla-nih3d-'));
try {
 const file=join(dir,'entries.json');
 writeFileSync(file,JSON.stringify({entries:[
  {id:1,title:'Human heart anatomy',license:'CC BY'},
  {id:2,title:'Viral spike protein',license:'CC BY'},
  {id:3,title:'Gearbox mount',license:'unknown'}
 ]}));
 const r=spawnSync(process.execPath,['scripts/nih3d-medical-classify.mjs',file],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const rows=r.stdout.trim().split('\n').map(JSON.parse);
 assert.equal(rows.length,3);
 assert.equal(rows[0].decision,'medical_candidate');
 assert(rows[0].specialties.includes('cardiovascular'));
 assert.equal(rows[1].decision,'medical_candidate');
 assert(rows[1].specialties.includes('microbiology'));
 assert.equal(rows[2].decision,'manual_review');
 assert(rows.every(x=>x.reviewRequired===true));
 console.log('Medical triage smoke tests passed (3 fixtures).');
} finally {rmSync(dir,{recursive:true,force:true});}
