#!/usr/bin/env bash
set -euo pipefail
: "${GH_TOKEN:?GitHub token required}"
: "${GITHUB_ACTOR:?GitHub actor required}"
image="ghcr.io/6d9757cmp5-creator/atla-nih3d-archive"
tag="originals-00012-00170-v1"
root="${RUNNER_TEMP:-/tmp}/nih3d-verified-oci"
mkdir -p "$root/build/originals" "$root/recovered"
node --input-type=module <<'NODE'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const catalog=JSON.parse(fs.readFileSync('tools/atla-ai/resources/nih3d-master-plan-2026/segments/entries-1-500.json','utf8'));
const evidence=JSON.parse(fs.readFileSync('docs/ATLA_NIH3D_LIVE_ORIGINAL_PROBE_2026.json','utf8'));
const expected=[{id:12,format:'GLB',ext:'glb'},{id:170,format:'STL',ext:'stl'}],items=[],lines=[];
for(const x of expected) {
 const row=catalog.items.find(e=>e.entryId===x.id);
 assert(row&&row.license==='Public Domain','Source license cannot be assumed');
 const test=evidence.tests.find(e=>e.accession===row.accession&&e.format===x.format);
 assert(test?.formatValidated&&test.httpStatus===200&&/^[a-f0-9]{64}$/.test(test.sha256),'Missing independent NIH source SHA evidence');
 const file=row.files.find(f=>f.url===test.sourceUrl&&f.format===x.format&&f.size===test.actualBytes);
 assert(file,'Source metadata conflict');
 const name=`3DPX-${String(x.id).padStart(6,'0')}.${x.ext}`;
 items.push({entryId:x.id,accession:row.accession,title:row.title,format:x.format,license:row.license,
  originalPage:row.url,sourceUrl:file.url,fileName:name,bytes:file.size,sha256:test.sha256,independentMedicalReview:false});
 lines.push(file.url+'\t'+name);
}
fs.writeFileSync(process.env.RUNNER_TEMP+'/nih3d-verified-oci/build/manifest.json',JSON.stringify({schemaVersion:1,source:'NIH 3D',scope:'TWO_PROVEN_ORIGINAL_FILES_ONLY',files:items},null,2)+'\n');
fs.writeFileSync(process.env.RUNNER_TEMP+'/nih3d-verified-oci/source-urls.tsv',lines.join('\n')+'\n');
NODE
while IFS=$'\t' read -r url file; do
  test -n "$url"
  curl --fail --location --silent --show-error --retry 2 --retry-delay 2 --max-time 75 "$url" --output "$root/build/originals/$file"
done < "$root/source-urls.tsv"
node --input-type=module <<'NODE'
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const m=JSON.parse(fs.readFileSync(process.env.RUNNER_TEMP+'/nih3d-verified-oci/build/manifest.json'));
for(const e of m.files){
 const b=fs.readFileSync(process.env.RUNNER_TEMP+'/nih3d-verified-oci/build/originals/'+e.fileName);
 assert.equal(b.byteLength,e.bytes,'Original NIH byte count mismatch');
 assert.equal(createHash('sha256').update(b).digest('hex'),e.sha256,'NIH original SHA mismatch');
 if(e.format==='GLB')assert.equal(b.subarray(0,4).toString('ascii'),'glTF');
 if(e.format==='STL')assert.equal(b.readUInt32LE(80)*50+84,b.length);
}
console.log('VERIFIED NIH original bytes, formats and SHA256 before OCI upload:',m.files.length);
NODE
cat > "$root/build/Dockerfile" <<'DOCKER'
FROM scratch
LABEL org.opencontainers.image.source="https://github.com/6d9757cmp5-creator/ekab-spoudi"
LABEL org.opencontainers.image.description="ATLA NIH3D verified original source bytes; two-file pilot"
COPY originals/ /originals/
COPY manifest.json /manifest.json
CMD ["/manifest.json"]
DOCKER
echo "$GH_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
docker build -t "$image:$tag" "$root/build"
docker push "$image:$tag"
docker logout ghcr.io
docker image rm "$image:$tag"
docker pull "$image:$tag"
digest="$(docker image inspect "$image:$tag" --format '{{index .RepoDigests 0}}')"
test "${digest#*@}" != "$digest"
docker create --name atla-nih3d-restore-proof "$image:$tag" /manifest.json
docker cp "atla-nih3d-restore-proof:/originals/." "$root/recovered/"
docker cp "atla-nih3d-restore-proof:/manifest.json" "$root/recovered/manifest.json"
docker rm atla-nih3d-restore-proof >/dev/null
node --input-type=module <<'NODE'
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=process.env.RUNNER_TEMP+'/nih3d-verified-oci';
const before=JSON.parse(fs.readFileSync(root+'/build/manifest.json','utf8'));
const after=JSON.parse(fs.readFileSync(root+'/recovered/manifest.json','utf8'));
assert.deepEqual(after,before,'Restore manifest mismatch');
for(const f of after.files){
 const bytes=fs.readFileSync(root+'/recovered/'+f.fileName);
 assert.equal(bytes.length,f.bytes,'OCI restore size mismatch');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,'OCI restore SHA256 mismatch');
}
console.log('VERIFIED: anonymous GHCR pull restored both original NIH files byte-for-byte');
NODE
export NIH_GHCR_DIGEST="$digest"
node --input-type=module <<'NODE'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const digest=process.env.NIH_GHCR_DIGEST;
assert(/^ghcr\.io\/6d9757cmp5-creator\/atla-nih3d-archive@sha256:[a-f0-9]{64}$/.test(digest),'Invalid OCI digest');
const files=JSON.parse(fs.readFileSync(process.env.RUNNER_TEMP+'/nih3d-verified-oci/build/manifest.json')).files;
const report={schemaVersion:1,status:'TWO_ORIGINALS_PERSISTED_AND_INDEPENDENTLY_RESTORED',
 storage:'GitHub Container Registry (publicly readable without authentication)',
 package:'ghcr.io/6d9757cmp5-creator/atla-nih3d-archive:originals-00012-00170-v1',
 immutableDigest:digest,
 originalFilesStored:files.length,modelsCovered:new Set(files.map(x=>x.entryId)).size,
 totalOriginalBytes:files.reduce((a,b)=>a+b.bytes,0),
 originalSha256VerifiedAfterAnonymousRestore:true,sha256Audit:files,
 totalNIHModelCoverageEstablished:false,allFormatsMirrored:false,
 noAdditionalPaidCloudStorage:true,registryPolicyMayChange:true};
fs.writeFileSync('docs/ATLA_NIH3D_GHCR_ARCHIVE_PROOF_2026.json',JSON.stringify(report,null,2)+'\n');
console.log('GHCR PERSISTENT ORIGINAL-BINARY VERIFICATION '+JSON.stringify({models:report.modelsCovered,bytes:report.totalOriginalBytes,digest}));
NODE
