import assert from 'node:assert/strict';
import {
 sourceFingerprint,validateApprovalRegistry,readApprovalRegistry,
 checkSourceCredibility,requireSourceCredibility,requireRangeSourceCredibility
} from '../tools/atla-ai/nih3d-credibility-gate.mjs';

const entry=(id=168)=>({
 entryId:id,accession:'3DPX-'+String(id).padStart(6,'0'),title:'Human femur',
 category:'Anatomy',creator:'',licenseRaw:'Public Domain',version:1,
 url:'https://3d.nih.gov/entries/3DPX-'+String(id).padStart(6,'0'),
 files:[{format:'GLB',size:1234,url:'https://3d.nih.gov/api/submissions/'+id+'/runs/111-222/output-files/123'}]
});
const empty={schemaVersion:1,policy:'DENY_UNREVIEWED',minimumCredibilityScore:80,approvals:[]};
const reviewed=(row)=>({
 entryId:row.entryId,decision:'APPROVED_FOR_ARCHIVE',fingerprint:sourceFingerprint(row),
 reliabilityScore:88,originVerification:'EXTERNALLY_REVIEWED',
 reviewedBy:'unit-test-reviewer',reviewedAt:'2026-11-06',
 independentEvidence:['https://doi.org/10.0000/only-a-test-fixture']
});
const a=entry(),b=entry(169);
assert.deepEqual(readApprovalRegistry(),empty,'Production ledger must start with zero invented approvals');
assert.equal(checkSourceCredibility(a,empty).approved,false,'NIH hosting is not scientific approval');
assert.throws(()=>requireSourceCredibility(a,empty),/NIH_SOURCE_REVIEW_REQUIRED/);
assert.throws(()=>requireRangeSourceCredibility([a,b],empty),/NIH3D_CREDIBILITY_BLOCKED_RANGE/);
assert.deepEqual(requireRangeSourceCredibility([{...a,files:[]}],empty),{approvedRows:0});

const allowed={...empty,approvals:[reviewed(a)]};
assert.equal(checkSourceCredibility(a,allowed).approved,true);
assert.equal(requireSourceCredibility(a,allowed).score,88);
assert.equal(checkSourceCredibility(b,allowed).approved,false);
assert.throws(()=>requireRangeSourceCredibility([a,b],allowed),/169/,'Mixed range must fail atomically');
assert.equal(requireRangeSourceCredibility([a],allowed).approvedRows,1);
for(const altered of [
 {...a,title:'Changed by uploader'},
 {...a,creator:'Unknown third party'},
 {...a,version:2},
 {...a,licenseRaw:'CC-BY-NC'},
 {...a,url:'https://3d.nih.gov/entries/3DPX-999999'}
])assert.equal(checkSourceCredibility(altered,allowed).approved,false,'An approval cannot survive a changed source');

for(const record of [
 {...reviewed(a),reliabilityScore:79},
 {...reviewed(a),reliabilityScore:undefined},
 {...reviewed(a),originVerification:'NIH_AUTOMATIC'},
 {...reviewed(a),independentEvidence:[]},
 {...reviewed(a),independentEvidence:['https://3d.nih.gov/entries/3DPX-000168']},
 {...reviewed(a),independentEvidence:['http://unknown.example']},
 {...reviewed(a),fingerprint:'abc'},
 {...reviewed(a),reviewedBy:''}
])assert.throws(()=>validateApprovalRegistry({...empty,approvals:[record]}),/Invalid/);
assert.throws(()=>validateApprovalRegistry({...empty,approvals:[reviewed(a),reviewed(a)]}),/duplicate/);
assert.throws(()=>validateApprovalRegistry({...empty,policy:'ALLOW_ALL'}),/Invalid/);
console.log('PASS: NIH credibility default-deny, version-bound approvals, evidence and atomic range gate');
