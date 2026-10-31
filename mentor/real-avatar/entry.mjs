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
  approximateSpeechWhenDeviceVoice:true,offline:true,source:"Microsoft Rocketbox Medical_Female_03 (MIT)"
});
const esc=id=>document.getElementById(id);
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const asset="./mentor/assets/mentor-real-3d.glb";
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
    aa:one("viseme_aa"),e:one("viseme_E"),i:one("viseme_I"),o:one("viseme_O"),u:one("viseme_U"),
    smileR:one("mouthSmileRight"),browOuterL:one("browOuterUpLeft"),browOuterR:one("browOuterUpRight"),
    browDownL:one("browDownLeft"),browDownR:one("browDownRight"),pressL:one("mouthPressLeft"),pressR:one("mouthPressRight"),
    squintL:one("eyeSquintLeft"),squintR:one("eyeSquintRight"),frownL:one("mouthFrownLeft"),frownR:one("mouthFrownRight")
  });
}
// The widget may send one of the 14 face visemes directly (letter-driven), or one of the five legacy shapes.
const VISEME_KEYS=["aa","e","i","o","u","pp","ff","th","dd","kk","ch","ss","nn","rr"];
const JAW={aa:.28,e:.14,i:.10,o:.17,u:.10,pp:0,ff:.04,th:.08,dd:.10,kk:.12,ch:.10,ss:.06,nn:.08,rr:.10};
export function shapeForGreekApproximate(input="rest"){
  if(VISEME_KEYS.includes(input))return input;
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
// Rocketbox characters ship in a T/A pose without animation clips: hang the arms naturally and precompute the hand gestures
// by aiming the arm bones in world space. Quaternions are blended every frame from these rest poses (no accumulation).
function aimBone(THREE,root,bone,child,dir){
  if(!bone||!child||!bone.parent)return;
  const p=new THREE.Vector3(),c=new THREE.Vector3();
  bone.getWorldPosition(p);child.getWorldPosition(c);
  const delta=new THREE.Quaternion().setFromUnitVectors(c.sub(p).normalize(),dir.clone().normalize());
  const pq=new THREE.Quaternion(),wq=new THREE.Quaternion();
  bone.parent.getWorldQuaternion(pq);bone.getWorldQuaternion(wq);
  bone.quaternion.copy(pq.invert().multiply(delta).multiply(wq));
  root.updateMatrixWorld(true);
}
export function buildArmPoses(THREE,root,rig){
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const arm=side=>({upper:rig["bip01"+side+"upperarm"],fore:rig["bip01"+side+"forearm"],hand:rig["bip01"+side+"hand"]});
  const R=arm("r"),L=arm("l");
  if(!R.upper||!R.fore||!R.hand||!L.upper||!L.fore||!L.hand)return null;
  const relax=(a,sign)=>{aimBone(THREE,root,a.upper,a.fore,V(sign*.37,-.93,.04));aimBone(THREE,root,a.fore,a.hand,V(sign*.26,-.96,.12));};
  relax(L,1);relax(R,-1);
  const rest={upper:R.upper.quaternion.clone(),fore:R.fore.quaternion.clone()};
  const pose=(u,f)=>{R.upper.quaternion.copy(rest.upper);R.fore.quaternion.copy(rest.fore);root.updateMatrixWorld(true);
    aimBone(THREE,root,R.upper,R.fore,u);aimBone(THREE,root,R.fore,R.hand,f);
    return {upper:R.upper.quaternion.clone(),fore:R.fore.quaternion.clone()};};
  const poses={
    explain:pose(V(-.42,-.66,.5),V(-.12,-.15,.98)),
    explain2:pose(V(-.5,-.6,.48),V(-.28,-.05,.96)),
    waveA:pose(V(-.8,-.12,.2),V(-.4,.88,.2)),
    waveB:pose(V(-.8,-.12,.2),V(.0,.92,.35)),
    caution:pose(V(-.4,-.25,.62),V(-.05,.92,.38))
  };
  R.upper.quaternion.copy(rest.upper);R.fore.quaternion.copy(rest.fore);root.updateMatrixWorld(true);
  const tmp=new THREE.Quaternion();
  return {
    // kind: "explain" | "wave" | "caution"; weight 0..1 (0 = relaxed arm)
    apply(kind,weight,t){
      const w=weight*weight*(3-2*weight);
      let up,fo;
      if(kind==="wave"){up=poses.waveA.upper;fo=tmp.slerpQuaternions(poses.waveA.fore,poses.waveB.fore,.5+.5*Math.sin(t*9));}
      else if(kind==="caution"){up=poses.caution.upper;fo=poses.caution.fore;}
      else{up=poses.explain.upper;fo=tmp.slerpQuaternions(poses.explain.fore,poses.explain2.fore,.5+.5*Math.sin(t*2.3));}
      R.upper.quaternion.slerpQuaternions(rest.upper,up,w);
      R.fore.quaternion.slerpQuaternions(rest.fore,fo,w);
    }
  };
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
  let face=[],boneHead=null,boneArm=null,boneSpine=null,boneHeadBase=null,boneArmBase=null,boneSpineBase=null,armPoses=null;
  const rig={};
  let disposed=false,active=false,inView=true,speaking=false,viseme="rest",gesture=0;
  let presence={id:"welcoming",gesture:"greet",expression:"warm",posture:"open"};
  const expressions={
    welcoming:{smile:.34,brow:.10,head:0,arm:.05,outer:.04,down:0,press:0,squint:.04},
    supportive:{smile:.40,brow:.16,head:.055,arm:.09,outer:.08,down:0,press:0,squint:.08},
    caring:{smile:.18,brow:.38,head:.085,arm:.045,outer:0,down:0,press:0,squint:.10},
    patient:{smile:.15,brow:.20,head:.09,arm:.05,outer:.02,down:0,press:0,squint:.03},
    explanatory:{smile:.20,brow:.10,head:.04,arm:.18,outer:.28,down:0,press:0,squint:0},
    examiner:{smile:.0,brow:.04,head:0,arm:.04,outer:0,down:.15,press:.12,squint:.04},
    demanding:{smile:.0,brow:.10,head:0,arm:.09,outer:.1,down:.22,press:.16,squint:.06},
    strict:{smile:0,brow:0,head:-.02,arm:.03,outer:0,down:.45,press:.25,squint:.08}
  };
  let alignedCues=null,alignedAudio=null;
  const clock=new THREE.Clock();
  // "?view=bust" (floating widget): head and shoulders so the face stays readable in a small frame.
  const bust=/[?&]view=bust\b/.test(globalThis.location?.search||"");
  const eye=bust?new THREE.Vector3(0,3.0,3.9):new THREE.Vector3(0,1.85,7.2);
  const look=bust?new THREE.Vector3(0,2.78,0):new THREE.Vector3(0,1.75,0);
  const stageLabel=doc.querySelector(".cinematic-stage-label");
  try{
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.6));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.19;
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(33,1,.1,120);
    camera.position.copy(eye);camera.lookAt(look);
    scene.add(new THREE.HemisphereLight(0xdcefff,0x26405e,1.5));
    const key=new THREE.DirectionalLight(0xfff4e8,2.6);
    key.position.set(-3,6,4);scene.add(key);
    const rim=new THREE.PointLight(0x19baff,7,14,1.6);
    rim.position.set(2.6,2.2,-3);scene.add(rim);
    const fill=new THREE.PointLight(0x547ecb,6,10);
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
        rig[String(obj.name||"").toLowerCase().replace(/[\s.:_-]/g,"")]=obj;
        if(!boneHead&&nameMatches(obj.name,/head$/))boneHead=obj;
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
    armPoses=buildArmPoses(THREE,character,rig);
    boneHeadBase=boneHead?.rotation.clone()||null;
    boneSpineBase=boneSpine?.rotation.clone()||null;
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
      const moving=motion.checked&&!reduced;
      const blink=moving&&Math.sin(now*1.34)>.996?1:0;
      const encourage=gesture>.2&&presence.gesture==="encourage";
      for(const {obj,targets} of face){
        morph(obj,targets.blinkLeft,blink,.4);
        morph(obj,targets.blinkRight,blink,.4);
        for(const [k,key] of Object.entries(targets)){
          if(!VISEME_KEYS.includes(k))continue;
          morph(obj,key,speakingNow&&shape===k?.8:0,.3);
        }
        morph(obj,targets.jaw,speakingNow?(JAW[shape]??.08):0,.25);
        morph(obj,targets.smile,mood.smile+(encourage?.12:0),.11);
        morph(obj,targets.smileR,mood.smile+(encourage?.12:0),.11);
        morph(obj,targets.brow,mood.brow+(gesture>.25&&presence.gesture==="question"?.13:0),.12);
        morph(obj,targets.browOuterL,mood.outer,.12);morph(obj,targets.browOuterR,mood.outer,.12);
        morph(obj,targets.browDownL,mood.down,.12);morph(obj,targets.browDownR,mood.down,.12);
        morph(obj,targets.pressL,speakingNow?0:mood.press,.12);morph(obj,targets.pressR,speakingNow?0:mood.press,.12);
        morph(obj,targets.squintL,mood.squint,.12);morph(obj,targets.squintR,mood.squint,.12);
      }
      // Bones are set from their rest values every frame (the model has no animation clips to reset them).
      if(boneHead&&boneHeadBase&&moving){
        boneHead.rotation.set(
          boneHeadBase.x+mood.head*gesture+Math.sin(now*.8)*.008,
          boneHeadBase.y+Math.sin(now*.55)*.05,
          boneHeadBase.z+gesture*(presence.gesture==="caution"?-.013:.036));
      }
      if(boneSpine&&boneSpineBase&&moving){
        const lean=presence.posture==="lean"?-.027:presence.posture==="upright"?.008:0;
        boneSpine.rotation.x=boneSpineBase.x+lean+Math.sin(now*1.5)*.012;
      }
      if(armPoses&&moving){
        const kind=gesture>.3?(presence.gesture==="greet"?"wave":(presence.gesture==="caution"||presence.gesture==="challenge")?"caution":"explain"):"explain";
        armPoses.apply(kind,Math.max(Math.min(1,gesture*1.3),speakingNow?.4:0),now);
      }      gesture=Math.max(0,gesture-elapsed*.32);
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
