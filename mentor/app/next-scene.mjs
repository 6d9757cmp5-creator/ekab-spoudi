/** Original low-poly WebGL patient scene; no imported models or Body Interact assets. */
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
 const colors={skin:[0.78,0.59,0.44],skin2:[0.68,0.46,0.34],pants:[0.19,0.27,0.36],topA:[0.20,0.56,0.70],topB:[0.47,0.63,0.46],hair:[0.19,0.16,0.16],shoe:[0.14,0.17,0.20],car:[0.30,0.40,0.48],wheel:[0.11,0.13,0.16],road:[0.22,0.33,0.37]};
 let focus='scene',view='scene',angle=0.18,paused=false,running=true,last=0,raf=0,clock=0,drag=null,acc=0;
 function sphere(x,y,z,sx,sy,sz,color){
  gl.uniform3f(loc.off,x,y,z);gl.uniform3f(loc.scale,sx,sy,sz);gl.uniform3fv(loc.color,colors[color]||color);
  gl.drawElements(gl.TRIANGLES,idx.length,gl.UNSIGNED_SHORT,0);
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
  // a stylized road, low-poly vehicle, and two procedurally modeled adults
  sphere(0,-1.34,-1.1,4.5,.085,1.75,'road');
  sphere(0,-.42,-.95,.62,.52,.36,'car');sphere(0,-.17,-.95,.40,.28,.29,'car');
  sphere(-.40,-.78,-.65,.20,.22,.15,'wheel');sphere(.40,-.78,-.65,.20,.22,.15,'wheel');
  function person(x,top,skin,phase){
   let breath=paused?0:Math.sin(clock*1.7+phase)*.018;
   sphere(x,1.04,.28,.22,.26,.23,skin); // head
   sphere(x,1.29,.18,.25,.09,.21,'hair');
   sphere(x-.083,1.08,.49,.022,.022,.018,'shoe');sphere(x+.083,1.08,.49,.022,.022,.018,'shoe');
   sphere(x,.39,.25,.32+breath,.43+breath,.19+breath,top);
   sphere(x,-.10,.26,.27,.25,.20,'pants');
   sphere(x-.39,.42,.25,.13,.40,.12,skin);sphere(x+.39,.42,.25,.13,.40,.12,skin);
   sphere(x-.41,-.07,.27,.13,.15,.13,skin);sphere(x+.41,-.07,.27,.13,.15,.13,skin);
   sphere(x-.16,-.69,.25,.14,.49,.17,'pants');sphere(x+.16,-.69,.25,.14,.49,.17,'pants');
   sphere(x-.16,-1.18,.39,.16,.12,.30,'shoe');sphere(x+.16,-1.18,.39,.16,.12,.30,'shoe');
  }
  person(-1.1,'topA','skin',0);person(1.05,'topB','skin2',1);
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
  rotate(d){angle+=d;draw();},
  dispose(){running=false;cancelAnimationFrame(raf);gl.deleteBuffer(pb);gl.deleteBuffer(nb);gl.deleteBuffer(ib);gl.deleteProgram(program);}
 };
}
