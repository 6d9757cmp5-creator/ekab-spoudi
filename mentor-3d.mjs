/**
 * MENTOR WebGL hologram prototype, authored for EKAB Spoudi.
 * Real perspective-rendered, articulated 3D geometry (not a photographic or scanned human).
 * Independent of grades, storage, APIs, audio recording and network dependencies.
 * Web Speech boundary events are word-level/best-effort, NOT phoneme-accurate lip sync.
 */
export const HOLOGRAM_CAPABILITIES=Object.freeze({
  geometry:"procedural-webgl-3d",lighting:"per-pixel-phong-and-rim",
  rotation:"pointer-and-slider",motion:"procedural-idle-and-gesture",
  mouth:"approximate-greek-word-boundaries",ai:false,externalAssets:false
});
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const identity=()=>new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
function multiply(a,b){
  const m=new Float32Array(16);
  for(let col=0;col<4;col++)for(let row=0;row<4;row++)
    m[col*4+row]=a[row]*b[col*4]+a[4+row]*b[col*4+1]+a[8+row]*b[col*4+2]+a[12+row]*b[col*4+3];
  return m;
}
function translate(x,y,z){const m=identity();m[12]=x;m[13]=y;m[14]=z;return m;}
function scale(x,y,z){const m=identity();m[0]=x;m[5]=y;m[10]=z;return m;}
function rotationX(t){const m=identity(),c=Math.cos(t),s=Math.sin(t);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;}
function rotationY(t){const m=identity(),c=Math.cos(t),s=Math.sin(t);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;}
function rotationZ(t){const m=identity(),c=Math.cos(t),s=Math.sin(t);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;}
function perspective(aspect){
  const f=1/Math.tan(38*Math.PI/360),near=.1,far=24,m=new Float32Array(16);
  m[0]=f/aspect;m[5]=f;m[10]=(far+near)/(near-far);m[11]=-1;m[14]=2*far*near/(near-far);
  return m;
}
function makeSphere(){
  const p=[],n=[],idx=[],rings=18,segs=28;
  for(let y=0;y<=rings;y++){
    const t=y*Math.PI/rings;
    for(let x=0;x<=segs;x++){
      const a=x*TAU/segs,v=[Math.sin(t)*Math.cos(a),Math.cos(t),Math.sin(t)*Math.sin(a)];
      p.push(...v);n.push(...v);
    }
  }
  for(let y=0;y<rings;y++)for(let x=0;x<segs;x++){
    const a=y*(segs+1)+x,b=a+1,c=a+segs+1,d=c+1;idx.push(a,c,b,b,c,d);
  }
  return {p,n,idx};
}
function makeTorus(){
  const p=[],n=[],idx=[],around=64,tube=8;
  for(let i=0;i<=around;i++)for(let j=0;j<=tube;j++){
    const a=i*TAU/around,b=j*TAU/tube,c=Math.cos(a),s=Math.sin(a),q=Math.cos(b),h=Math.sin(b);
    p.push((1+.045*q)*c,.045*h,(1+.045*q)*s);n.push(q*c,h,q*s);
  }
  for(let i=0;i<around;i++)for(let j=0;j<tube;j++){
    const a=i*(tube+1)+j,b=a+1,c=a+tube+1,d=c+1;idx.push(a,b,c,b,d,c);
  }
  return {p,n,idx};
}
function makeCube(){
  const p=[],n=[],idx=[];
  const faces=[
    [[0,0,1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
    [[0,0,-1],[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]],
    [[1,0,0],[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]],
    [[-1,0,0],[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]],
    [[0,1,0],[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]],
    [[0,-1,0],[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]
  ];
  for(const f of faces){const start=p.length/3;for(const v of f.slice(1)){p.push(...v);n.push(...f[0]);}idx.push(start,start+1,start+2,start,start+2,start+3);}
  return {p,n,idx};
}
const VERTEX=String.raw`
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uMvp;
uniform mat4 uModel;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec4 world=uModel*vec4(aPosition,1.0);
  vWorld=world.xyz;
  vNormal=normalize(mat3(uModel)*aNormal);
  gl_Position=uMvp*vec4(aPosition,1.0);
}
`;
const FRAGMENT=String.raw`
precision mediump float;
uniform vec3 uColor;
uniform float uEmission;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec3 n=normalize(vNormal);
  vec3 l=normalize(vec3(-0.35,0.78,0.8));
  vec3 view=normalize(vec3(0.0,1.65,6.2)-vWorld);
  float diffuse=max(dot(n,l),0.0);
  float rim=pow(1.0-max(dot(n,view),0.0),2.8);
  vec3 halfV=normalize(l+view);
  float shine=pow(max(dot(n,halfV),0.0),26.0)*0.17;
  vec3 light=uColor*(0.31+0.78*diffuse)+vec3(shine);
  light+=vec3(0.12,0.72,0.94)*(rim*0.19+uEmission*0.8);
  gl_FragColor=vec4(light,1.0);
}
`;
function compile(gl,type,source){
  const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
    const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(error||"Shader compile failure");
  }
  return shader;
}
function setup(gl){
  const program=gl.createProgram();
  const vert=compile(gl,gl.VERTEX_SHADER,VERTEX),frag=compile(gl,gl.FRAGMENT_SHADER,FRAGMENT);
  gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);
  gl.deleteShader(vert);gl.deleteShader(frag);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||"Shader link failure");
  gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  const loc={program,
    position:gl.getAttribLocation(program,"aPosition"),normal:gl.getAttribLocation(program,"aNormal"),
    mvp:gl.getUniformLocation(program,"uMvp"),model:gl.getUniformLocation(program,"uModel"),
    color:gl.getUniformLocation(program,"uColor"),emission:gl.getUniformLocation(program,"uEmission")};
  const upload=(mesh)=>{
    const p=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.p),gl.STATIC_DRAW);
    const n=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.n),gl.STATIC_DRAW);
    const i=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(mesh.idx),gl.STATIC_DRAW);
    return {p,n,i,count:mesh.idx.length};
  };
  return {loc,meshes:{sphere:upload(makeSphere()),cube:upload(makeCube()),torus:upload(makeTorus())}};
}
function renderer(gl,resources,canvas){
  const {loc,meshes}=resources;
  const PALETTE={
    skin:[.73,.46,.34],skinLight:[.89,.62,.49],skinShade:[.50,.29,.22],
    hair:[.16,.13,.14],white:[.87,.95,.98],iris:[.29,.48,.48],pupil:[.05,.09,.12],
    navy:[.055,.17,.27],navyLite:[.09,.27,.40],navyDark:[.04,.10,.17],
    teal:[.12,.67,.79],reflect:[.93,.89,.48],red:[.39,.12,.14],black:[.035,.06,.09]
  };
  let width=0,height=0,vp=null,prevMesh=null;
  function sync(){
    const rect=canvas.getBoundingClientRect();
    const ratio=Math.min(1.6,globalThis.devicePixelRatio||1);
    const w=Math.max(1,Math.floor((rect.width||280)*ratio)),h=Math.max(1,Math.floor((rect.height||430)*ratio));
    if(w===width&&h===height)return;
    width=w;height=h;canvas.width=w;canvas.height=h;
    gl.viewport(0,0,w,h);vp=multiply(perspective(w/h),translate(0,-1.63,-6.15));
  }
  function draw(mesh,parent,position,size,color,emission=0,rot=null){
    let model=multiply(parent,translate(...position));
    if(rot)model=multiply(model,rot);
    model=multiply(model,scale(...size));
    const m=meshes[mesh];
    if(prevMesh!==m){
      gl.bindBuffer(gl.ARRAY_BUFFER,m.p);
      gl.vertexAttribPointer(loc.position,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.position);
      gl.bindBuffer(gl.ARRAY_BUFFER,m.n);
      gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.normal);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.i);prevMesh=m;
    }
    gl.uniformMatrix4fv(loc.mvp,false,multiply(vp,model));
    gl.uniformMatrix4fv(loc.model,false,model);
    gl.uniform3fv(loc.color,color);gl.uniform1f(loc.emission,emission);
    gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);
  }
  function render({yaw=0,now=0,speaking=false,viseme="rest",gesture=0,reduced=false}={}){
    sync();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(loc.program);prevMesh=null;
    const motion=reduced?0:1,breath=Math.sin(now*1.4)*.012*motion;
    const base=multiply(rotationY(yaw),translate(0,breath,0));
    const sway=Math.sin(now*.64)*.045*motion;
    const body=multiply(base,rotationZ(sway*.3));
    const turnHead=Math.sin(now*.48)*.06*motion;
    const blink=reduced?0:Math.pow(Math.max(0,Math.sin(now*.72)+.97),12)*.28;
    const mouth={rest:.012,closed:.006,wide:.03,round:.046,open:.075}[viseme]??.012;
    const mouthY=speaking?mouth:.012;
    const head=multiply(body,multiply(translate(0,2.84,.08),multiply(rotationY(turnHead),rotationX((Math.sin(now*.96)*.025+gesture*.055)*motion))));
    // Three-dimensional projection base; all body parts have genuine depth.
    draw("torus",identity(),[0,-.05,0],[.93,.93,.61],PALETTE.teal,.65);
    draw("torus",identity(),[0,-.06,0],[.72,.72,.45],PALETTE.navyLite,.35);
    draw("sphere",body,[0,1.09,0],[.40,.25,.24],PALETTE.navyDark);
    for(const side of [-1,1]){
      const x=side*.235;
      const leg=multiply(body,translate(x,.93,0));
      draw("sphere",leg,[0,-.19,0],[.19,.43,.20],PALETTE.navy);
      draw("sphere",leg,[0,-.58,.017],[.16,.35,.165],PALETTE.navyLite);
      draw("sphere",leg,[0,-.85,.115],[.18,.14,.27],PALETTE.black);
      draw("cube",leg,[0,-.37,.185],[.145,.027,.022],PALETTE.reflect,.24);
    }
    draw("sphere",body,[0,1.86,0],[.48,.64,.29],PALETTE.navy);
    draw("sphere",body,[0,2.16,.01],[.56,.24,.29],PALETTE.navyLite);
    draw("cube",body,[0,1.73,.281],[.36,.043,.013],PALETTE.reflect,.18);
    draw("cube",body,[0,1.89,.283],[.36,.035,.013],PALETTE.teal,.35);
    draw("sphere",body,[0,2.45,0],[.12,.19,.13],PALETTE.skin);
    // Fabric piping and generic non-official paramedic uniform.
    for(const side of [-1,1]){
      draw("cube",body,[side*.38,1.92,.265],[.045,.35,.025],PALETTE.reflect,.23,rotationZ(side*.22));
      draw("cube",body,[side*.40,1.55,.215],[.045,.11,.03],PALETTE.navyDark);
      const armSwing=Math.sin(now*1.4+side)*.035*motion+gesture*(side===1?.28:-.10)*motion;
      const arm=multiply(body,multiply(translate(side*.60,2.12,0),rotationZ(side*.17+armSwing)));
      draw("sphere",arm,[0,-.28,0],[.20,.36,.205],PALETTE.navyLite);
      draw("sphere",arm,[0,-.58,.015],[.158,.30,.17],PALETTE.navy);
      draw("cube",arm,[0,-.67,.18],[.153,.035,.018],PALETTE.reflect,.12);
      draw("sphere",arm,[0,-.87,.022],[.122,.16,.135],PALETTE.skinLight);
    }
    draw("cube",body,[-.17,2.07,.305],[.094,.105,.023],PALETTE.white,.15);
    draw("cube",body,[-.17,2.07,.333],[.018,.085,.01],PALETTE.red);
    draw("cube",body,[-.17,2.07,.337],[.065,.019,.01],PALETTE.red);
    draw("cube",body,[.20,2.12,.32],[.17,.043,.015],PALETTE.teal,.30);
    // Radio at the shoulder and small equipment pouch.
    draw("cube",body,[.48,2.14,.23],[.105,.165,.095],PALETTE.black);
    draw("cube",body,[.48,2.38,.23],[.019,.095,.019],PALETTE.navyDark);
    draw("cube",body,[-.33,1.29,.27],[.16,.15,.08],PALETTE.navyDark);
    draw("cube",body,[-.33,1.30,.32],[.11,.016,.018],PALETTE.teal,.28);
    // Head, ears, neck, hair with rigged gaze / blinking / jaw.
    draw("sphere",head,[0,0,0],[.326,.419,.313],PALETTE.skinLight);
    draw("sphere",head,[0,-.277,.09],[.235,.154,.24],PALETTE.skin);
    for(const side of [-1,1]){
      draw("sphere",head,[side*.325,-.024,.015],[.072,.137,.087],PALETTE.skin);
      draw("sphere",head,[side*.318,-.016,.078],[.025,.069,.019],PALETTE.skinShade);
      draw("sphere",head,[side*.117,.073,.290],[.068,.044,.035],PALETTE.white);
      const gaze=Math.sin(now*.3)*.008*motion;
      draw("sphere",head,[side*.117+gaze,.073,.324],[.035,.035,.016],PALETTE.iris);
      draw("sphere",head,[side*.117+gaze,.073,.336],[.018,.023,.012],PALETTE.pupil);
      draw("sphere",head,[side*.128,.138,.304],[.081,.018,.029],PALETTE.hair,0,rotationZ(side*-.06));
      if(blink>.008)draw("sphere",head,[side*.117,.079,.347],[.078,blink*.20,.015],PALETTE.skinLight);
      draw("sphere",head,[side*.17,-.126,.256],[.107,.07,.034],PALETTE.skinLight);
    }
    draw("sphere",head,[0,-.035,.328],[.064,.12,.074],PALETTE.skinLight);
    draw("sphere",head,[0,-.132,.363],[.081,.037,.058],PALETTE.skin);
    draw("sphere",head,[0,-.213,.309],[.102,mouthY,.021],PALETTE.red);
    draw("sphere",head,[0,-.213-mouthY*.42,.334],[.084,mouthY*.6,.014],PALETTE.black);
    draw("sphere",head,[0,-.199-mouthY*.20,.343],[.097,.013,.018],PALETTE.skinShade);
    draw("sphere",head,[0,.310,-.035],[.329,.151,.305],PALETTE.hair);
    draw("sphere",head,[0,.255,.208],[.278,.068,.136],PALETTE.hair);
    for(const side of [-1,1])draw("sphere",head,[side*.29,.175,-.006],[.055,.169,.135],PALETTE.hair);
    return true;
  }
  return {render,dispose(){
    for(const mesh of Object.values(meshes)){gl.deleteBuffer(mesh.p);gl.deleteBuffer(mesh.n);gl.deleteBuffer(mesh.i);}
    gl.deleteProgram(loc.program);
  }};
}
/** Initialize an independent, opt-in-capable 3D view with portrait fallback. */
export function mountMentorHologram(doc=globalThis.document){
  const canvas=doc?.getElementById?.("mentor-3d-canvas"),photo=doc?.getElementById?.("mentor-avatar");
  const panel=doc?.getElementById?.("mentor-3d-panel"),visual=doc?.querySelector?.(".mentor-intro-visual");
  if(!canvas||!photo||!panel||!visual)return null;
  const mode3d=doc.getElementById("mentor-view-3d"),modePhoto=doc.getElementById("mentor-view-photo");
  const slider=doc.getElementById("mentor-3d-rotation"),status=doc.getElementById("mentor-3d-status");
  const speed=doc.getElementById("mentor-3d-motion");
  const reduced=!!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  let gl=null,render3d=null;
  try{
    gl=canvas.getContext("webgl",{alpha:true,antialias:true,powerPreference:"low-power",preserveDrawingBuffer:false});
    if(!gl)throw Error("WebGL is not available");
    render3d=renderer(gl,setup(gl),canvas);
  }catch{
    mode3d.disabled=true;mode3d.title="Το WebGL δεν είναι διαθέσιμο στη συσκευή.";
    status.textContent="Προβολή φωτογραφίας: δεν είναι διαθέσιμη η τρισδιάστατη απόδοση.";
    visual.dataset.mentorView="photo";
    return {supported:false};
  }
  let running=false,frame=0,yaw=0,gesture=0,dragX=null,inView=true,disposed=false;
  const motion=()=>!reduced && speed?.checked!==false;
  const active=()=>visual.dataset.mentorView==="3d";
  const snapshot=()=>{
    if(!active()||disposed)return;
    const speaking=photo.classList.contains("is-speaking");
    const viseme=photo.dataset.viseme||"rest";
    const t=motion()?performance.now()/1000:0;
    render3d.render({yaw,now:t,speaking,viseme,gesture,reduced:!motion()});
    if(gesture>0)gesture=Math.max(0,gesture-.018);
  };
  const tick=()=>{
    if(!running||disposed)return;
    if(!doc.hidden&&inView)snapshot();
    frame=globalThis.requestAnimationFrame(tick);
  };
  function setView(view){
    if(disposed)return;
    const is3d=view==="3d";
    visual.dataset.mentorView=is3d?"3d":"photo";
    panel.hidden=!is3d;
    mode3d.setAttribute("aria-pressed",String(is3d));
    modePhoto.setAttribute("aria-pressed",String(!is3d));
    slider.disabled=!is3d;
    if(speed)speed.disabled=!is3d||reduced;
    status.textContent=is3d?
      "Πραγματικό WebGL 3D · συνθετικό μοντέλο · προσεγγιστικό lip-sync ελληνικών.":
      "Φωτορεαλιστική συνθετική εικόνα 2.5D με προσεγγιστικό lip-sync.";
    if(is3d){snapshot();if(!running){running=true;frame=globalThis.requestAnimationFrame(tick);}}
    else{running=false;globalThis.cancelAnimationFrame(frame);}
  }
  function rotate(degrees){
    yaw=clamp(Number(degrees)||0,-165,165)*Math.PI/180;
    slider.value=String(Math.round(yaw*180/Math.PI));
    snapshot();
  }
  mode3d.addEventListener("click",()=>setView("3d"));
  modePhoto.addEventListener("click",()=>setView("photo"));
  slider.addEventListener("input",()=>rotate(slider.value));
  speed?.addEventListener("change",snapshot);
  canvas.addEventListener("pointerdown",e=>{
    if(!active())return;
    dragX=e.clientX;canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener("pointermove",e=>{
    if(dragX===null||!active())return;
    const next=Number(slider.value)+(e.clientX-dragX)*.85;
    dragX=e.clientX;rotate(next);
  });
  for(const event of ["pointerup","pointercancel","lostpointercapture"])
    canvas.addEventListener(event,()=>{dragX=null;});
  const observer=new MutationObserver(()=>snapshot());
  observer.observe(photo,{attributes:true,attributeFilter:["class","data-viseme"]});
  const coach=doc.getElementById("mentor-presence-line");
  if(coach)observer.observe(coach,{childList:true,characterData:true,subtree:true});
  doc.addEventListener("click",e=>{
    if(e.target?.closest?.(".case-option,.choice,[data-mode],[data-mentor-self-review]")){gesture=1;snapshot();}
  });
  doc.getElementById("mentor-hero-form")?.addEventListener("submit",()=>{gesture=1;snapshot();});
  const visibility=typeof IntersectionObserver==="function"?new IntersectionObserver(entries=>{
    inView=entries[0]?.isIntersecting!==false;
    if(inView)snapshot();
  },{threshold:0}):null;
  visibility?.observe(canvas);
  const resize=typeof ResizeObserver==="function"?new ResizeObserver(()=>snapshot()):null;
  resize?.observe(panel);
  canvas.addEventListener("webglcontextlost",event=>{
    event.preventDefault();
    setView("photo");mode3d.disabled=true;
    status.textContent="Η 3D προβολή διακόπηκε από τη συσκευή. Η απεικόνιση εικόνας παραμένει διαθέσιμη.";
  });
  const dispose=()=>{
    disposed=true;running=false;globalThis.cancelAnimationFrame(frame);
    observer.disconnect();resize?.disconnect();visibility?.disconnect();
    render3d.dispose();
  };
  globalThis.addEventListener("pagehide",dispose,{once:true});
  // A real-time 3D prototype remains optional; the approved cinematic visual is the default.
  setView("photo");
  return {supported:true,setView,rotate,dispose};
}
if(typeof document!=="undefined")mountMentorHologram(document);
