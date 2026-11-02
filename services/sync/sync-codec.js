// Lossless, self-describing JSON transport. Existing plain manifests remain readable.
export const MAX_STATE_BYTES=20000000;
const FORMAT='ekab-sync-gzip-v1';
const utf8=new TextEncoder();
async function boundedBytes(stream,limit){
  const reader=stream.getReader(),chunks=[];let size=0;
  try{
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new Error('state-too-large');chunks.push(value);}
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
export async function encodeState(data){
  const plain=JSON.stringify(data),bytes=utf8.encode(plain);
  if(bytes.length>MAX_STATE_BYTES)throw new Error('state-too-large');
  if(typeof CompressionStream==='undefined')return plain;
  const zipped=await boundedBytes(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')),MAX_STATE_BYTES);
  const packed=JSON.stringify({format:FORMAT,data:base64(zipped)});
  return utf8.encode(packed).length<bytes.length?packed:plain;
}
export async function decodeState(raw){
  let data=raw;
  if(raw instanceof ArrayBuffer||ArrayBuffer.isView(raw)){
    const bytes=raw instanceof ArrayBuffer?new Uint8Array(raw):new Uint8Array(raw.buffer,raw.byteOffset,raw.byteLength);
    if(bytes.byteLength>MAX_STATE_BYTES)throw new Error('state-too-large');
    data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }else if(typeof raw==='string'){
    if(utf8.encode(raw).length>MAX_STATE_BYTES)throw new Error('state-too-large');data=JSON.parse(raw);
  }
  if(data?.format!==undefined){
    if(data.format!==FORMAT||typeof data.data!=='string'||data.data.length>MAX_STATE_BYTES||data.data.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(data.data))throw new Error('invalid-cloud-data');
    if(typeof DecompressionStream==='undefined')throw new Error('compression-unavailable');
    const zipped=Uint8Array.from(atob(data.data),x=>x.charCodeAt(0));
    const bytes=await boundedBytes(new Blob([zipped]).stream().pipeThrough(new DecompressionStream('gzip')),MAX_STATE_BYTES);
    data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }
  return data; // Ownership, schema and field validation is mandatory at the caller.
}
