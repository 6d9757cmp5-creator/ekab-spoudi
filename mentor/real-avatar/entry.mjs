/**
 * MENTOR OS real rigged avatar runtime.
 * Bundled locally with three.js (MIT); generated CC0 MakeHuman mesh/skin by Ara 3D Gen.
 * Accurate visemes require user-supplied audio-aligned cues. Browser SpeechSynthesis
 * exposes approximate word boundaries ONLY: never label them phoneme accurate.
 * No AI, backend, analytics, storage, or grades are accessed here.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const RIGGED_AVATAR_EXPECTATIONS=Object.freeze({
  requiresRig:true,requiresFaceTargets:true,requiresTexture:true,
  approximateSpeechWhenDeviceVoice:true,offline:true,source:"CC0 MakeHuman"
});
const esc=id=>document.getElementById(id);
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const asset="./assets/mentor-real-3d.glb";
function nameMatches(n,matcher){return matcher.test(String(n||"").toLowerCase().replace(/[\s.:_-]/g,""));}
export function resolveFacialTargets(dict={}){
  const keys=Object.keys(dict);
  const one=(...names)=>{for(const name of names){const value=keys.find(k=>k.toLowerCase()===name.toLowerCase());if(value)return value;}return "";};
  return Object.freeze({
    blinkLeft:one("eyeBlinkLeft","blinkLeft","eyesClosedLeft"),
    blinkRight:one("eyeBlinkRight","blinkRight","eyesClosedRight"),
    jaw:one("jawOpen","mouthOpen"),
    smile:one("mouthSmile","mouthSmileLeft"),
    brow:one("browInnerUp","browOuterUpLeft"),
    pp:one("viseme_PP","viseme_pp"),ff:one("viseme_FF"),
    th:one("viseme_TH"),dd:one("viseme_DD"),kk:one("viseme_kk"),
    ch:one("viseme_CH"),ss:one("viseme_SS"),nn:one("viseme_nn"),rr:one("viseme_RR"),
    aa:one("viseme_aa"),e:one("viseme_E"),i:one("viseme_I"),o:one("viseme_O"),u:one("viseme_U")
  });
}
export function shapeForGreekApproximate(input="rest"){
  return {rest:"",wide:"e",round:"o",open:"aa",closed:"pp"}[input]||"";
}
export function validAudioAlignedCues(cues){
  return Array.isArray(cues)&&cues.length>0&&cues.every((c,i)=>
    Number.isFinite(c?.start)&&Number.isFinite(c?.end)&&c.start>=0&&c.end>c.start
    &&typeof c.viseme==="string"&&c.viseme.length<24
    &&(i===0||c.start>=cues[i-1].start));
}
function makeStatus(button,status,text){
  if(button){button.disabled=true;button.title=text;}
  if(status)status.textContent=text;
}
export async function mountRealMentor(doc=document,{loadModel=null,onReady=()=>{}}={}){
  const host=doc.getElementById("mentor-cinematic-stage");
  const canvas=doc.getElementById("mentor-real3d-canvas");
  const photo=host?.querySelector(".cinematic-character");
  const status=doc.getElementById("mentor-real3d-status");
  const toggle=doc.getElementById("mentor-real3d-toggle");
  const restore=doc.getElementById("mentor-real3d-photo");
  const avatar=doc.getElementById("mentor-avatar");
  const slider=doc.getElementById("mentor-real3d-rotation");
  const motion=doc.getElementById("mentor-real3d-motion");
  if(!host||!canvas||!photo||!avatar||!toggle||!restore)return {ready:false,reason:"missing-ui"};
  const reduced=!!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  let renderer,scene,camera,mixer,character,animationId=0,last=0,turn=0;
  let face=[],boneHead=null,boneArm=null,boneSpine=null,boneHeadBase=null,boneArmBase=null;
  let disposed=false,active=false,inView=true,speaking=false,viseme="rest",gesture=0;
  let presence={id:"welcoming",gesture:"greet",expression:"warm",posture:"open"};
  const expressions={
    welcoming:{smile:.26,brow:.06,head:0,arm:.05},
    supportive:{smile:.32,brow:.10,head:.055,arm:.09},
    caring:{smile:.22,brow:.17,head:.085,arm:.045},
    patient:{smile:.13,brow:.13,head:.09,arm:.05},
    explanatory:{smile:.15,brow:.19,head:.04,arm:.18},
    examiner:{smile:.025,brow:.14,head:0,arm:.04},
    demanding:{smile:.02,brow:.21,head:0,arm:.09},
    strict:{smile:0,brow:.28,head:-.02,arm:.03}
  };
  let alignedCues=null,alignedAudio=null;
  const clock=new THREE.Clock();
  const eye=new THREE.Vector3(0,1.85,7.2);
  const stageLabel=doc.querySelector(".cinematic-stage-label");
  try{
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.6));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.19;
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(33,1,.1,120);
    camera.position.copy(eye);camera.lookAt(0,1.75,0);
    scene.add(new THREE.HemisphereLight(0xc7e8ff,0x122a45,2));
    const key=new THREE.DirectionalLight(0xe6efff,3.8);
    key.position.set(-3,6,4);scene.add(key);
    const rim=new THREE.PointLight(0x19baff,125,14,1.6);
    rim.position.set(2.6,3.3,-2);scene.add(rim);
    const fill=new THREE.PointLight(0x547ecb,24,10);
    fill.position.set(-3,1.4,2.4);scene.add(fill);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.5,.035,8,104),new THREE.MeshBasicMaterial({color:0x25e3ff,transparent:true,opacity:.73}));
    ring.rotation.x=Math.PI/2;ring.position.y=.025;scene.add(ring);
    const inner=new THREE.Mesh(new THREE.RingGeometry(1.16,1.18,96),new THREE.MeshBasicMaterial({color:0x3ce9ff,side:THREE.DoubleSide,transparent:true,opacity:.42}));
    inner.rotation.x=-Math.PI/2;inner.position.y=.018;scene.add(inner);
    if(reduced)motion.checked=false;
    const loader=loadModel||((url)=>new GLTFLoader().loadAsync(url));
    const data=await loader(asset);
    if(disposed)throw Error("view closed");
    character=data.scene;
    if(!character||!character.isObject3D)throw Error("invalid character");
    const figures=[];
    character.traverse(obj=>{
      if(obj.isSkinnedMesh)figures.push(obj);
      if(obj.isMesh&&obj.morphTargetDictionary&&obj.morphTargetInfluences){
        face.push({obj,targets:resolveFacialTargets(obj.morphTargetDictionary)});
      }
      if(obj.isBone){
        if(!boneHead&&nameMatches(obj.name,/head$/))boneHead=obj;
        if(!boneArm&&nameMatches(obj.name,/right(upper)?arm$/))boneArm=obj;
        if(!boneSpine&&nameMatches(obj.name,/spine2$/))boneSpine=obj;
      }
    });
    if(figures.length===0)throw Error("missing real humanoid skeleton");
    if(!face.some(x=>x.targets.blinkLeft&&x.targets.aa&&x.targets.pp))throw Error("missing facial visemes");
    scene.add(character);
    character.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(character);
    const h=Math.max(.01,bounds.max.y-bounds.min.y);
    const s=3.65/h;
    character.scale.multiplyScalar(s);
    character.updateMatrixWorld(true);
    const fit=new THREE.Box3().setFromObject(character);
    character.position.x-=(fit.min.x+fit.max.x)/2;
    character.position.z-=(fit.min.z+fit.max.z)/2;
    character.position.y-=fit.min.y;
    character.updateMatrixWorld(true);
    boneHeadBase=boneHead?.rotation.clone()||null;
    boneArmBase=boneArm?.rotation.clone()||null;
    mixer=new THREE.AnimationMixer(character);
    const clips=data.animations||[];
    const clip=n=>clips.find(c=>c.name.toLowerCase()===n);
    const idle=clip("idle")||clips.find(c=>/idle/i.test(c.name))||clips[0];
    const talking=clip("talk");
    const waving=clip("wave");
    const idleAction=idle?mixer.clipAction(idle):null;
    const talkAction=talking?mixer.clipAction(talking):null;
    const waveAction=waving?mixer.clipAction(waving):null;
    waveAction?.setLoop(THREE.LoopOnce,1);
    if(waveAction)waveAction.clampWhenFinished=true;
    let activeAction=idleAction;
    idleAction?.setEffectiveWeight(1).play();
    function transition(next){
      if(!next||next===activeAction)return;
      next.reset().setEffectiveWeight(1).play();
      if(activeAction)activeAction.crossFadeTo(next,.33,false);
      activeAction=next;
    }
    function updateView(){
      const box=host.getBoundingClientRect();
      const w=Math.max(1,box.width),h=Math.max(1,box.height);
      renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    }
    const ro=typeof ResizeObserver==="function"?new ResizeObserver(updateView):null;
    ro?.observe(host);updateView();
    host.dataset.real3d="ready";
    photo.setAttribute("aria-hidden","true");
    canvas.hidden=false;
    active=true;
    if(stageLabel)stageLabel.textContent="MENTOR · ΖΩΝΤΑΝΟ 3D";
    status.textContent="Πλήρες τρισδιάστατο rig και μορφές προσώπου ενεργά. Η φωνή συσκευής δεν δίνει ακριβή χρονοσήματα φωνημάτων.";
    toggle.setAttribute("aria-pressed","true");
    restore.setAttribute("aria-pressed","false");
    toggle.disabled=false;restore.disabled=false;
    slider.disabled=false;
    onReady();
    let pointer=null;
    const rotate=angle=>{turn=clamp(Number(angle)||0,-110,110)*Math.PI/180;slider.value=String(Math.round(turn*180/Math.PI));};
    slider.addEventListener("input",()=>rotate(slider.value));
    canvas.addEventListener("pointerdown",e=>{pointer=e.clientX;canvas.setPointerCapture?.(e.pointerId);});
    canvas.addEventListener("pointermove",e=>{if(pointer===null)return;const angle=Number(slider.value)+(e.clientX-pointer)*.8;pointer=e.clientX;rotate(angle);});
    for(const event of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(event,()=>{pointer=null;});
    const setVisible=show=>{
      active=show;
      host.dataset.real3d=show?"ready":"photo";
      toggle.setAttribute("aria-pressed",String(show));
      restore.setAttribute("aria-pressed",String(!show));
      slider.disabled=!show;
    };
    toggle.addEventListener("click",()=>setVisible(true));
    restore.addEventListener("click",()=>setVisible(false));
    const io=typeof IntersectionObserver==="function"?new IntersectionObserver(a=>{inView=a[0]?.isIntersecting!==false;}):null;
    io?.observe(canvas);
    function stageSpeech(){
      speaking=avatar.classList.contains("is-speaking");
      viseme=avatar.dataset.viseme||"rest";
    }
    const watch=new MutationObserver(stageSpeech);
    watch.observe(avatar,{attributes:true,attributeFilter:["class","data-viseme"]});
    stageSpeech();
    // Synchronize vocal delivery with rigged face, posture and gesture.
    const onPresence=e=>{
      const cue=e.detail||{};
      if(!Object.hasOwn(expressions,cue.id))return;
      const validGesture=/^(greet|encourage|reassure|explain|question|challenge|caution)$/.test(cue.gesture||"");
      presence={id:cue.id,gesture:validGesture?cue.gesture:"explain",expression:String(cue.expression||""),posture:String(cue.posture||"")};
      gesture=1;
      host.dataset.mentorMood=presence.id;
    };
    doc.addEventListener("mentor:presence",onPresence);
    doc.addEventListener("click",e=>{if(e.target?.closest?.(".cinematic-prompts button,.choice,.case-option,[data-mode],#mentor-hero-form button"))gesture=1;});
    doc.addEventListener("mentor:aligned-speech",e=>{
      if(validAudioAlignedCues(e.detail?.cues)&&e.detail?.audio instanceof HTMLAudioElement){
        alignedCues=e.detail.cues;alignedAudio=e.detail.audio;
      }else{alignedCues=null;alignedAudio=null;}
    });
    const morph=(obj,key,value,amount=.20)=>{
      if(!key)return;
      const index=obj.morphTargetDictionary[key];
      if(index===undefined)return;
      const a=obj.morphTargetInfluences;const target=clamp(value);
      a[index]+=(target-a[index])*amount;
    };
    function animate(){
      if(disposed)return;
      animationId=requestAnimationFrame(animate);
      const elapsed=Math.min(.06,clock.getDelta());
      if(doc.hidden||!inView||!active)return;
      const open=alignedCues&&alignedAudio&&!alignedAudio.paused;
      const isVoiceOn=open||speaking;
      if(!reduced&&motion.checked){
        const positive=presence.gesture==="greet"||presence.gesture==="encourage";
        transition(gesture>.45&&positive&&!isVoiceOn?(waveAction||idleAction):isVoiceOn?(talkAction||idleAction):idleAction);
        mixer.update(elapsed);
      }
      const now=performance.now()/1000;
      let shape=shapeForGreekApproximate(viseme);
      if(open){
        const t=alignedAudio.currentTime;
        const c=alignedCues.find(c=>t>=c.start&&t<c.end);
        shape=c?.viseme||"";
      }
      const speakingNow=open||speaking;
      const mood=expressions[presence.id]||expressions.welcoming;
      const blink=!reduced&&motion.checked&&Math.sin(now*1.34)>.996?1:0;
      for(const {obj,targets} of face){
        morph(obj,targets.blinkLeft,blink,.4);
        morph(obj,targets.blinkRight,blink,.4);
        for(const [k,key] of Object.entries(targets)){
          if(!["aa","e","i","o","u","pp","ff","th","dd","kk","ch","ss","nn","rr"].includes(k))continue;
          morph(obj,key,speakingNow&&shape===k?.8:0,.25);
        }
        morph(obj,targets.jaw,speakingNow&&shape==="aa"?.19:0,.20);
        morph(obj,targets.smile,mood.smile+(gesture>.2&&presence.gesture==="encourage"?.12:0),.11);
        morph(obj,targets.brow,mood.brow+(gesture>.25&&presence.gesture==="question"?.13:0),.12);
      }
      if(boneHead&&boneHeadBase&&motion.checked&&!reduced){
        boneHead.rotation.y+=Math.sin(now*.55)*.028;
        boneHead.rotation.x+=mood.head*gesture;
        boneHead.rotation.z+=gesture*(presence.gesture==="caution"?-.013:.036);
      }
      if(boneArm&&boneArmBase&&motion.checked&&!reduced){
        boneArm.rotation.z-=gesture*mood.arm;
      }
      if(boneSpine&&motion.checked&&!reduced){
        const lean=presence.posture==="lean"?-.027:presence.posture==="upright"?.008:0;
        boneSpine.rotation.x+=lean;
      }
      gesture=Math.max(0,gesture-elapsed*.32);
      character.rotation.y+=(turn-character.rotation.y)*.09;
      ring.rotation.z+=elapsed*.08;
      renderer.render(scene,camera);
    }
    animate();
    const lose=e=>{e.preventDefault();setVisible(false);status.textContent="Η συσκευή διέκοψε το 3D. Παραμένει η φωτορεαλιστική εικόνα.";};
    canvas.addEventListener("webglcontextlost",lose);
    addEventListener("pagehide",()=>{disposed=true;cancelAnimationFrame(animationId);watch.disconnect();doc.removeEventListener("mentor:presence",onPresence);ro?.disconnect();io?.disconnect();renderer.dispose();},{once:true});
    return {ready:true,rigged:figures.length,faces:face.length,clips:clips.length,dispose:()=>{disposed=true;cancelAnimationFrame(animationId);watch.disconnect();ro?.disconnect();io?.disconnect();renderer.dispose();}};
  }catch(error){
    if(renderer)renderer.dispose();
    host.dataset.real3d="photo";canvas.hidden=true;
    makeStatus(toggle,status,"Το φωτορεαλιστικό 3D δεν είναι διαθέσιμο ή δεν επαληθεύτηκε. Διατηρείται η εγκεκριμένη προβολή, χωρίς καρτούν.");
    return {ready:false,reason:String(error?.message||error)};
  }
}
if(typeof document!=="undefined")void mountRealMentor(document);
