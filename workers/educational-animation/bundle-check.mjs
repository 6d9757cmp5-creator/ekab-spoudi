import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {prepare,validateInput,verify} from './worker.mjs';
// Non-educational installation metadata only, no media or rendering.
const temp=await mkdtemp(path.join(os.tmpdir(),'ekab-bundle-check-'));
try {
  const input=path.join(temp,'input'); await mkdir(input);
  const data={
    'source.json':{sourceId:'installation-check-only',version:'1',sourceHash:createHash('sha256').update('installation metadata').digest('hex')},
    'script.json':{purpose:'installation metadata only; no educational narration'},
    'storyboard.json':{purpose:'installation metadata only'},
    'scenes.json':{scenes:[{id:'metadata-check',conceptIds:['installation-check']}]},
    'assets.json':{assets:[]},
    'workload.json':{width:1280,height:720,durationSeconds:1,sceneCount:1,memoryGiB:1,has3d:false,requiresGpu:false}
  };
  for(const [file,value] of Object.entries(data)) await writeFile(path.join(input,file),JSON.stringify(value));
  await validateInput(input);
  const bundle=await prepare(input,path.join(temp,'output'));
  console.log('PASS metadata-only bundle preparation',bundle.id);
  console.log('PASS bundle verification',await verify(bundle.destination));
  await writeFile(path.join(bundle.destination,'script.json'),'{}');
  try {await verify(bundle.destination);throw Error('Corruption was accepted');} catch(e) {if(!/checksum/.test(e.message))throw e;}
  console.log('PASS tampered bundle rejected');
} finally {
  const target=path.resolve(temp);
  if(!target.startsWith(path.resolve(os.tmpdir())+path.sep) || !path.basename(target).startsWith('ekab-bundle-check-')) throw Error('Unsafe test cleanup');
  await rm(target,{recursive:true,force:true});
}
