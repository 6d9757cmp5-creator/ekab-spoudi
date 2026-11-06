/** Fetch the official XHTML export of the WisTech Open EMR book.
 * This is an acquisition step, not a clinical approval or a model-training step.
 * Files are written to a GitHub Actions artifact, not committed to public Pages.
 */
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const url='https://wtcs.pressbooks.pub/emergencymedtech/open/download?type=xhtml';
const output=process.argv[2]||'mentor-book-artifact';
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),90000);
let response;
try{response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'EKAB-Spoudi-Mentor-Educational-Archive/1.0','Accept':'application/xhtml+xml,application/zip,application/octet-stream,*/*'}});}
finally{clearTimeout(timer);}
if(!response.ok)throw new Error('Book export unavailable: HTTP '+response.status);
const bytes=Buffer.from(await response.arrayBuffer());
if(bytes.length<10000)throw new Error('Unexpectedly small book export: '+bytes.length);
if(bytes.length>100*1024*1024)throw new Error('Book export exceeds 100 MiB');
const type=response.headers.get('content-type')||'';
const isZip=bytes[0]===0x50&&bytes[1]===0x4b;
const isHtml=bytes.subarray(0,2048).toString('utf8').toLowerCase().includes('<html');
if(!isZip&&!isHtml)throw new Error('Unexpected export format '+type);
await mkdir(output,{recursive:true});
const filename=isZip?'emergency-medical-responder.xhtml.zip':'emergency-medical-responder.xhtml';
await writeFile(output+'/'+filename,bytes);
await writeFile(output+'/manifest.json',JSON.stringify({source_id:'wistech-emr-2025',title:'Emergency Medical Responder',source_url:'https://wtcs.pressbooks.pub/emergencymedtech/',export_url:url,license:'CC BY 4.0 except third-party material',byte_size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),retrieval_status:'downloaded-unreviewed',clinical_approval:false,ai_ingestion_approved:false,filename},null,2)+'\n');
console.log('Downloaded official XHTML export:',filename,bytes.length,'bytes');
