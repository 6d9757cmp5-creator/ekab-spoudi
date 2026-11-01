/**
 * Original MENTOR WebGL human mesh renderer.
 * Geometry source: UMRAM-Bilkent/supine-human-model, assets/human_posed.glb, CC0 1.0;
 * originating from Quaternius CC0. Not a medically validated anatomical model.
 * No runtime dependency, no remote fetch, no proprietary Body Interact assets.
 */
const VERT=String.raw`
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform vec3 uOffset;
uniform float uScale;
uniform float uPose;
uniform float uOrbit;
uniform float uCenter;
uniform float uZoom;
uniform float uVertical;
uniform float uAspect;
varying vec3 vNormal;
varying vec3 vBody;
void main(){
  vBody=aPosition;
  float cp=cos(uPose), sp=sin(uPose);
  vec3 pos=aPosition*uScale;
  pos=vec3(pos.x,pos.y*cp-pos.z*sp,pos.y*sp+pos.z*cp);
  pos+=uOffset;
  if(uPose>1.0)pos.y-=0.93;
  else if(uPose>0.20)pos.y-=0.30;
  pos.x-=uCenter;
  pos.y-=uVertical;
  float c=cos(uOrbit),s=sin(uOrbit);
  pos.xz=vec2(c*pos.x+s*pos.z,-s*pos.x+c*pos.z);
  float depth=max(0.5,4.7-pos.z);
  gl_Position=vec4(pos.x*2.1/depth*uZoom/uAspect,pos.y*2.5/depth*uZoom,clamp(0.5+pos.z/12.0,0.01,0.99),1.0);
  vNormal=normalize(vec3(aNormal.x,aNormal.y*cp-aNormal.z*sp,aNormal.y*sp+aNormal.z*cp));
}`;
const FRAG=String.raw`
precision mediump float;
uniform vec3 uSkin;
uniform vec3 uTop;
uniform vec3 uPants;
uniform vec3 uHair;
varying vec3 vNormal;
varying vec3 vBody;
void main(){
 vec3 shade=uPants;
 if(vBody.y>0.0)shade=uTop;
 if(vBody.y>1.43)shade=uSkin;
 if(vBody.y>2.41)shade=uHair;
 if(vBody.y < -2.12)shade=vec3(0.105,0.16,0.205);
 if(abs(vBody.x)>0.34 && vBody.y>0.18 && vBody.y<1.26)shade=uSkin;
 vec3 normal=normalize(vNormal);
 float brightness=0.49 + 0.48*max(0.0,dot(normal,normalize(vec3(-0.38,0.74,0.61))));
 float rim=pow(1.0-max(0.0,normal.z),3.0)*0.095;
 vec3 tone=shade*brightness + vec3(0.30,0.70,0.78)*rim;
 gl_FragColor=vec4(tone,1.0);
}`;
function compile(gl,type,source){
 const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));
 return sh;
}
export function parseGLB(buffer){
 const d=new DataView(buffer);
 if(d.byteLength<28||d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(8,true)!==buffer.byteLength)
  throw Error('Invalid human GLB');
 let offset=12,doc=null,binBase=-1;
 while(offset+8<=buffer.byteLength){
  const len=d.getUint32(offset,true),type=d.getUint32(offset+4,true);offset+=8;
  if(offset+len>buffer.byteLength)throw Error('Invalid GLB chunk');
  if(type===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset,len)));
  if(type===0x004e4942)binBase=offset;
  offset+=len;
 }
 if(!doc||binBase<0)throw Error('Missing GLB chunks');
 const primitive=doc.meshes?.[0]?.primitives?.[0];
 if(!primitive||primitive.mode!==undefined&&primitive.mode!==4)throw Error('Unsupported GLB primitive');
 function read(index,expectedType,componentType){
  const a=doc.accessors?.[index],v=doc.bufferViews?.[a?.bufferView];
  if(!a||!v||a.type!==expectedType||a.componentType!==componentType)throw Error('Unsupported GLB accessor');
  const components=expectedType==='VEC3'?3:1,bytes=componentType===5126?4:2,required=a.count*components*bytes;
  if(v.byteStride&&v.byteStride!==components*bytes)throw Error('Interleaved GLB unsupported');
  const at=binBase+(v.byteOffset||0)+(a.byteOffset||0);
  if(at<binBase||at+required>buffer.byteLength)throw Error('GLB accessor out of range');
  const copy=buffer.slice(at,at+required);
  return componentType===5126?new Float32Array(copy):new Uint16Array(copy);
 }
 const positions=read(primitive.attributes?.POSITION,'VEC3',5126);
 const normals=read(primitive.attributes?.NORMAL,'VEC3',5126);
 const indices=read(primitive.indices,'SCALAR',5123);
 if(positions.length!==normals.length||positions.length<300||indices.length<300)throw Error('Incomplete human GLB');
 return {positions,normals,indices};
}
export function attachHumanMesh(gl,canvas,requestDraw){
 let disposed=false,ready=false,failed=false,program=null,positionBuffer=null,normalBuffer=null,indexBuffer=null,count=0;
 let loc={};
 canvas.dataset.humanModel='loading';
 function makeModel({positions,normals,indices}){
  const vs=compile(gl,gl.VERTEX_SHADER,VERT),fs=compile(gl,gl.FRAGMENT_SHADER,FRAG);
  program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Human shader link failed');
  for(const name of ['uOffset','uScale','uPose','uOrbit','uCenter','uZoom','uVertical','uAspect','uSkin','uTop','uPants','uHair'])
   loc[name]=gl.getUniformLocation(program,name);
  loc.position=gl.getAttribLocation(program,'aPosition');loc.normal=gl.getAttribLocation(program,'aNormal');
  positionBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);gl.bufferData(gl.ARRAY_BUFFER,positions,gl.STATIC_DRAW);
  normalBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);gl.bufferData(gl.ARRAY_BUFFER,normals,gl.STATIC_DRAW);
  indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
  count=indices.length;ready=true;canvas.dataset.humanModel='ready';
  requestDraw?.();
 }
 fetch(new URL('../assets/cc0-human-body.glb',import.meta.url),{cache:'force-cache'})
  .then(r=>{if(!r.ok)throw Error('Human model HTTP '+r.status);return r.arrayBuffer();})
  .then(parseGLB).then(data=>{if(!disposed)makeModel(data);})
  .catch(e=>{failed=true;canvas.dataset.humanModel='fallback';canvas.dataset.humanError=String(e).slice(0,120);requestDraw?.();});
 function draw({focus,view,angle,poses,width,height}){
  if(!ready||disposed)return false;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);gl.enableVertexAttribArray(loc.position);gl.vertexAttribPointer(loc.position,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);gl.enableVertexAttribArray(loc.normal);gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
  gl.uniform1f(loc.uOrbit,angle);
  gl.uniform1f(loc.uCenter,focus==='a'?-1.1:focus==='b'?1.05:0);
  gl.uniform1f(loc.uZoom,focus==='scene'?.94:view==='head'?2.35:view==='torso'?1.85:view==='legs'?1.8:1.15);
  gl.uniform1f(loc.uVertical,view==='head'?.95:view==='torso'?.22:view==='legs'?-.70:0);
  gl.uniform1f(loc.uAspect,Math.max(.85,width/height));
  const groups=[
   {id:'a',x:-1.1,skin:[.78,.57,.42],shirt:[.14,.53,.64],pants:[.13,.22,.32],hair:[.19,.17,.15]},
   {id:'b',x:1.05,skin:[.59,.40,.31],shirt:[.52,.60,.36],pants:[.19,.23,.30],hair:[.13,.11,.13]}
  ];
  for(const p of groups){
   const pose=poses[p.id]||'standing';
   gl.uniform3f(loc.uOffset,p.x,0,.29);gl.uniform1f(loc.uScale,.45);
   gl.uniform1f(loc.uPose,pose==='reclined'?1.48:pose==='seated'?.58:0);
   gl.uniform3fv(loc.uSkin,p.skin);gl.uniform3fv(loc.uTop,p.shirt);gl.uniform3fv(loc.uPants,p.pants);gl.uniform3fv(loc.uHair,p.hair);
   gl.drawElements(gl.TRIANGLES,count,gl.UNSIGNED_SHORT,0);
  }
  return true;
 }
 function dispose(){
  disposed=true;ready=false;
  for(const b of [positionBuffer,normalBuffer,indexBuffer])if(b)gl.deleteBuffer(b);
  if(program)gl.deleteProgram(program);
 }
 return {get ready(){return ready},get failed(){return failed},draw,dispose};
}
