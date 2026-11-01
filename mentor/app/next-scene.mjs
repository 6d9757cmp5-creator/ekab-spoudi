/** Original WebGL simulator scene: CC0 human geometry, environment & fallback models. */
import {attachHumanMesh} from './next-patient-mesh.mjs';
export function mountPatientScene(canvas,onSelect){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,preserveDrawingBuffer:false});
 const fallback=canvas.parentElement.querySelector('.next-fallback');
 if(!gl){canvas.hidden=true;fallback.hidden=false;return {setFocus(){},setPaused(){},dispose(){}};}
 const vsrc='attribute vec3 aPosition;attribute vec3 aNormal;uniform vec3 uOffset;uniform vec3 uScale;uniform float uOrbit;uniform float uCenter;uniform float uZoom;uniform float uAspect;uniform float uVertical;varying float vLight;void main(){vec3 q=aPosition*uScale+uOffset;q.x-=uCenter;q.y-=uVertical;float c=cos(uOrbit),s=sin(uOrbit);q.xz=vec2(c*q.x+s*q.z,-s*q.x+c*q.z);float depth=4.7-q.z;gl_Position=vec4(q.x*2.1/depth*uZoom/uAspect,q.y*2.5/depth*uZoom,clamp(0.5+q.z/12.0,0.01,0.99),1.0);vec3 n=normalize(aNormal);vLight=0.55+0.45*max(0.0,dot(n,normalize(vec3(-0.35,0.85,0.45))));}';
 const fsrc='precision mediump float;uniform vec3 uColor;varying float vLight;void main(){gl_FragColor=vec4(uColor*vLight,1.0);}';
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 let program;try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vsrc));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fsrc));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('shader-link');}catch{canvas.hidden=true;fallback.hidden=false;return {setFocus(){},setPaused(){},dispose(){}};}
 gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 const loc={p:gl.getAttribLocation(program,'aPosition'),n:gl.getAttribLocation(program,'aNormal'),off:gl.getUniformLocation(program,'uOffset'),scale:gl.getUniformLocation(program,'uScale'),angle:gl.getUniformLocation(program,'uOrbit'),center:gl.getUniformLocation(program,'uCenter'),zoom:gl.getUniformLocation(program,'uZoom'),aspect:gl.getUniformLocation(program,'uAspect'),vertical:gl.getUniformLocation(program,'uVertical'),color:gl.getUniformLocation(program,'uColor')};
 const pts=[],ns=[],idx=[],lat=13,lon=20;
 for(let y=0;y<=lat;y++)for(let x=0;x<=lon;x++){let phi=Math.PI*y/lat,theta=2*Math.PI*x/lon;let px=Math.sin(phi)*Math.cos(theta),py=Math.cos(phi),pz=Math.sin(phi)*Math.sin(theta);pts.push(px,py,pz);ns.push(px,py,pz);}
 for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){let a=y*(lon+1)+x,b=a+lon+1;idx.push(a,b,a+1,b,b+1,a+1);}
 function buf(target,data){const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);return b;}
 const pb=buf(gl.ARRAY_BUFFER,new Float32Array(pts)),nb=buf(gl.ARRAY_BUFFER,new Float32Array(ns)),ib=buf(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx));
 const cubePoints=[],cubeNormals=[];
 for(const face of [
  {n:[0,0,1],p:[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]},
  {n:[0,0,-1],p:[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]},
  {n:[0,1,0],p:[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]},
  {n:[0,-1,0],p:[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]},
  {n:[1,0,0],p:[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]},
  {n:[-1,0,0],p:[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]}
 ])for(const i of [0,1,2,0,2,3]){cubePoints.push(...face.p[i]);cubeNormals.push(...face.n);}
 const cubePB=buf(gl.ARRAY_BUFFER,new Float32Array(cubePoints)),cubeNB=buf(gl.ARRAY_BUFFER,new Float32Array(cubeNormals));
 const colors={skin:[0.78,0.59,0.44],skin2:[0.68,0.46,0.34],pants:[0.19,0.27,0.36],topA:[0.20,0.56,0.70],topB:[0.47,0.63,0.46],hair:[0.19,0.16,0.16],shoe:[0.14,0.17,0.20],car:[0.30,0.40,0.48],wheel:[0.11,0.13,0.16],road:[0.22,0.33,0.37],wall:[0.28,0.41,0.45],rug:[0.24,0.39,0.50],bench:[0.47,0.36,0.27],green:[0.16,0.43,0.32],lamp:[0.89,0.76,0.48],window:[0.42,0.70,0.78],roadline:[0.67,0.80,0.76],metal:[0.16,0.34,0.43],floor:[0.31,0.51,0.52]};
 let environment='road',focus='scene',view='scene',poseByPatient={a:'standing',b:'standing'},angle=0.18,paused=false,running=true,last=0,raf=0,clock=0,drag=null,acc=0;
 const humans=attachHumanMesh(gl,canvas,()=>{if(running)draw();});
 function bindShape(positions,normals){
  gl.bindBuffer(gl.ARRAY_BUFFER,positions);gl.enableVertexAttribArray(loc.p);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,normals);gl.enableVertexAttribArray(loc.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);
 }
 function sphere(x,y,z,sx,sy,sz,color){
  bindShape(pb,nb);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
  gl.uniform3f(loc.off,x,y,z);gl.uniform3f(loc.scale,sx,sy,sz);gl.uniform3fv(loc.color,colors[color]||color);
  gl.drawElements(gl.TRIANGLES,idx.length,gl.UNSIGNED_SHORT,0);
 }
 function box(x,y,z,sx,sy,sz,color){
  bindShape(cubePB,cubeNB);
  gl.uniform3f(loc.off,x,y,z);gl.uniform3f(loc.scale,sx,sy,sz);gl.uniform3fv(loc.color,colors[color]||color);
  gl.drawArrays(gl.TRIANGLES,0,36);
 }
 function draw(){
  const w=Math.max(1,Math.round(canvas.clientWidth* Math.min(devicePixelRatio||1,1.6))),h=Math.max(1,Math.round(canvas.clientHeight* Math.min(devicePixelRatio||1,1.6)));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.enableVertexAttribArray(loc.p);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.enableVertexAttribArray(loc.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
  gl.uniform1f(loc.angle,angle);gl.uniform1f(loc.center,focus==='a'?-1.1:focus==='b'?1.05:0);gl.uniform1f(loc.zoom,focus==='scene'?0.94:view==='head'?2.35:view==='torso'?1.85:view==='legs'?1.8:1.15);gl.uniform1f(loc.vertical,view==='head'?0.95:view==='torso'?0.22:view==='legs'?-0.70:0);
  gl.uniform1f(loc.aspect,Math.max(0.85,w/h));
  // Distinct first-party 3D environments with actual cuboid props and ground, not spheres everywhere.
  box(0,-1.41,-1.07,4.7,.055,1.85,environment==='square'?'green':environment==='home'?'floor':'road');
  if(environment==='road'){
   box(0,-.74,-1.39,.96,.34,.49,'car');
   box(0,-.29,-1.49,.62,.22,.36,'car');
   box(0,-.27,-1.11,.52,.19,.028,'window');
   box(0,-1.06,-1.10,.79,.055,.015,'metal');
   for(const side of [-1,1]){
    sphere(side*.64,-1.03,-1.04,.19,.19,.14,'wheel');
    sphere(side*.64,-1.03,-.91,.09,.09,.06,'metal');
   }
   box(-2.78,-1.35,-.35,.50,.008,.06,'roadline');
   box(2.78,-1.35,-.35,.50,.008,.06,'roadline');
   box(0,-1.28,-2.74,3.9,.07,.05,'wall');
  }else if(environment==='home'){
   box(0,.15,-2.10,4.4,1.58,.11,'wall');
   box(-1.10,-.14,-1.94,.70,.68,.04,'window');
   box(-.24,-.98,-1.18,.81,.17,.41,'bench');
   box(-.91,-.65,-1.26,.16,.59,.36,'bench');
   box(.47,-.65,-1.26,.16,.59,.36,'bench');
   box(2.2,-.49,-1.58,.11,.90,.11,'metal');
   sphere(2.2,.47,-1.58,.25,.28,.25,'lamp');
   box(0,-1.31,-.55,1.62,.009,.53,'rug');
  }else{
   box(.04,-1.08,-1.45,.85,.10,.33,'bench');
   box(.04,-.60,-1.60,.85,.39,.085,'bench');
   box(-.62,-1.23,-1.45,.09,.14,.10,'metal');
   box(.62,-1.23,-1.45,.09,.14,.10,'metal');
   box(2.60,-.48,-1.80,.14,.93,.14,'bench');
   sphere(2.60,.33,-1.80,.65,.69,.60,'green');
   box(-2.8,-.98,-2.12,.36,.38,.20,'bench');
   box(0,-1.30,-.51,4.3,.022,.20,'roadline');
  }
  function person(x,top,skin,phase,id){
   let breath=paused?0:Math.sin(clock*1.7+phase)*.018;
   const pose=poseByPatient[id]||'standing';
   function part(px,py,pz,sx,sy,sz,color){
    if(pose==='seated'){
     if(py>-.08)py-=.32;
     else {py=-.43+(py+.08)*.30;pz+=.34+(Math.abs(py)*.19);}
    }else if(pose==='reclined'){
     const old=py;py=-.92+old*.13;pz+=.28+(old+1.19)*.62;
     const tmp=sy;sy=sz;sz=tmp;
    }
    sphere(px,py,pz,sx,sy,sz,color);
   }
   part(x,1.04,.28,.22,.26,.23,skin);
   part(x,1.29,.18,.25,.09,.21,'hair');
   part(x-.083,1.08,.49,.022,.022,.018,'shoe');part(x+.083,1.08,.49,.022,.022,.018,'shoe');
   part(x,.39,.25,.32+breath,.43+breath,.19+breath,top);
   part(x,-.10,.26,.27,.25,.20,'pants');
   part(x-.39,.42,.25,.13,.40,.12,skin);part(x+.39,.42,.25,.13,.40,.12,skin);
   part(x-.41,-.07,.27,.13,.15,.13,skin);part(x+.41,-.07,.27,.13,.15,.13,skin);
   part(x-.16,-.69,.25,.14,.49,.17,'pants');part(x+.16,-.69,.25,.14,.49,.17,'pants');
   part(x-.16,-1.18,.39,.16,.12,.30,'shoe');part(x+.16,-1.18,.39,.16,.12,.30,'shoe');
  }
  if(!humans.ready){person(-1.1,'topA','skin',0,'a');person(1.05,'topB','skin2',1,'b');}
  else humans.draw({focus,view,angle,poses:poseByPatient,width:w,height:h});
 }
 function frame(now){if(!running)return;raf=requestAnimationFrame(frame);if(document.hidden||!canvas.isConnected)return;if(now-last<45)return;last=now;if(!paused)clock+=0.045;draw();}
 try{draw();raf=requestAnimationFrame(frame);}catch{canvas.hidden=true;fallback.hidden=false;running=false;}
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,angle};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(drag){angle=drag.angle+(e.clientX-drag.x)*0.009;draw();}});
 canvas.addEventListener('pointerup',()=>{drag=null;});
 canvas.addEventListener('pointercancel',()=>{drag=null;});
 return {
  setFocus(f,v='scene'){focus=f;view=v;draw();},
  setPaused(p){paused=p;},
  setPoses(poses){poseByPatient={...poseByPatient,...poses};draw();},
  setEnvironment(value){if(!['road','home','square'].includes(value))return;environment=value;draw();},
  rotate(d){angle+=d;draw();},
  dispose(){running=false;cancelAnimationFrame(raf);humans.dispose();gl.deleteBuffer(cubePB);gl.deleteBuffer(cubeNB);gl.deleteBuffer(pb);gl.deleteBuffer(nb);gl.deleteBuffer(ib);gl.deleteProgram(program);}
 };
}
