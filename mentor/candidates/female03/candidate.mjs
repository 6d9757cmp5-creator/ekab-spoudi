// Prototype runtime for the candidate doctor avatar (not used by the app yet).
import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

const canvas=document.getElementById("stage");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff,0x335566,1.35));
const key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(1.5,2.5,3);scene.add(key);
const rim=new THREE.DirectionalLight(0x88ccff,.8);rim.position.set(-2,2,-2);scene.add(rim);
const camera=new THREE.PerspectiveCamera(26,1,.05,50);
const meshes=[];let model=null,bones={};window.__armSide??=1;
const VIEWS={bust:[[0,1.42,2.35],[0,1.34,0]],full:[[0,1.0,4.2],[0,.9,0]]};
function setView(name){const [p,l]=VIEWS[name]||VIEWS.bust;camera.position.set(...p);camera.lookAt(...l);window.__view=name;}
window.__setView=setView;
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
addEventListener("resize",resize);resize();

const morph=(name,value)=>{for(const m of meshes){const i=m.morphTargetDictionary[name];if(i!==undefined)m.morphTargetInfluences[i]=value;}};
const approach=(name,target,rate=.25)=>{for(const m of meshes){const i=m.morphTargetDictionary[name];if(i!==undefined)m.morphTargetInfluences[i]+=(target-m.morphTargetInfluences[i])*rate;}};

// Moods: the same ids the production avatar understands.
const MOODS={
 welcoming:{mouthSmileLeft:.35,mouthSmileRight:.35,browInnerUp:.1},
 supportive:{mouthSmileLeft:.4,mouthSmileRight:.4,browInnerUp:.18},
 caring:{mouthSmileLeft:.18,mouthSmileRight:.18,browInnerUp:.38,eyeSquintLeft:.1,eyeSquintRight:.1},
 patient:{mouthSmileLeft:.15,mouthSmileRight:.15,browInnerUp:.2},
 explanatory:{mouthSmileLeft:.2,mouthSmileRight:.2,browOuterUpLeft:.28,browOuterUpRight:.28},
 examiner:{browDownLeft:.15,browDownRight:.15,mouthPressLeft:.12,mouthPressRight:.12},
 strict:{browDownLeft:.45,browDownRight:.45,mouthPressLeft:.25,mouthPressRight:.25}
};
let mood="welcoming",speakingShapes=[],speakStart=0,viseme="";
const SHAPE_TO_VISEME={open:"viseme_aa",wide:"viseme_E",round:"viseme_O",closed:"viseme_PP",rest:""};
const GREEK_TO_VISEME={"α":"viseme_aa","ά":"viseme_aa","ε":"viseme_E","έ":"viseme_E","η":"viseme_I","ή":"viseme_I","ι":"viseme_I","ί":"viseme_I","υ":"viseme_I","ύ":"viseme_I","ο":"viseme_O","ό":"viseme_O","ω":"viseme_O","ώ":"viseme_O",
 "π":"viseme_PP","μ":"viseme_PP","β":"viseme_PP","φ":"viseme_FF","θ":"viseme_TH","δ":"viseme_TH","τ":"viseme_DD","ντ":"viseme_DD","κ":"viseme_kk","γ":"viseme_kk","χ":"viseme_kk","σ":"viseme_SS","ς":"viseme_SS","ζ":"viseme_SS","ν":"viseme_nn","λ":"viseme_nn","ρ":"viseme_RR","ξ":"viseme_kk","ψ":"viseme_PP"};
// Text-driven viseme track: one of the 15 face visemes per letter, spread over the word. NOT audio-aligned.
function visemesForWord(word){
 const w=word.toLowerCase().normalize("NFC").replace(/[^α-ωάέήίόύώς]/g,"");const out=[];
 for(let i=0;i<w.length;i++){
  const two=w.slice(i,i+2);
  if(two==="ου"){out.push("viseme_U");i++;continue;}
  if(two==="μπ"){out.push("viseme_PP");i++;continue;}
  out.push(GREEK_TO_VISEME[w[i]]||"viseme_nn");
 }
 return out;
}
window.__avatar={
 setMood(id){if(MOODS[id])mood=id;},
 speakText(text,msPerLetter=75){
  const track=[];let t=0;
  for(const word of String(text).split(/\s+/)){
   for(const v of visemesForWord(word)){track.push({at:t,v});t+=msPerLetter;}
   t+=90;track.push({at:t,v:""});t+=60;
  }
  speakingShapes=track;speakStart=performance.now();return t;
 },
 stop(){speakingShapes=[];},
 get state(){return {mood,speaking:speakingShapes.length>0};},
 morphNames:()=>Object.keys(meshes[0]?.morphTargetDictionary||{}),
 stats:()=>({meshes:meshes.length,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries}),
 forceFrame:()=>frame(performance.now())
};
const bar=document.getElementById("status");
let blinkAt=1500,blinkUntil=0,t0=performance.now();
function frame(now){
 const t=(now-t0)/1000;
 // breathing + slow head motion
 if(bones.spine)bones.spine.rotation.x=bones.spine0+Math.sin(t*1.5)*.012;
 if(bones.head)bones.head.rotation.y=bones.head0y+Math.sin(t*.5)*.05;
 // blink
 if(now>blinkAt){blinkUntil=now+130;blinkAt=now+2200+Math.random()*3200;}
 const blink=now<blinkUntil?1:0;
 approach("eyeBlinkLeft",blink,.6);approach("eyeBlinkRight",blink,.6);
 // mood layer
 const mo=MOODS[mood];
 for(const n of ["mouthSmileLeft","mouthSmileRight","browInnerUp","browOuterUpLeft","browOuterUpRight","browDownLeft","browDownRight","mouthPressLeft","mouthPressRight","eyeSquintLeft","eyeSquintRight"])approach(n,mo[n]||0,.08);
 // speech layer
 let current="";
 if(speakingShapes.length){
  const e=now-speakStart;let idx=-1;for(let i=0;i<speakingShapes.length;i++){if(speakingShapes[i].at<=e)idx=i;else break;}
  if(e>speakingShapes.at(-1).at+80){speakingShapes=[];}else if(idx>=0)current=speakingShapes[idx].v;
 }
 for(const v of ["viseme_aa","viseme_E","viseme_I","viseme_O","viseme_U","viseme_PP","viseme_FF","viseme_TH","viseme_DD","viseme_kk","viseme_SS","viseme_nn","viseme_RR","viseme_CH"])approach(v,v===current?.9:0,.5);
 approach("jawOpen",current==="viseme_aa"?.28:current?.12:0,.35);
 renderer.render(scene,camera);
}
let last=0;
function loop(now){requestAnimationFrame(loop);if(now-last<14)return;last=now;frame(now);}
new GLTFLoader().loadAsync("mentor-female03.glb").then(g=>{
 model=g.scene;scene.add(model);
 model.traverse(n=>{if(n.isSkinnedMesh&&n.morphTargetDictionary)meshes.push(n);if(n.isBone)bones[n.name]=n;});
 const find=name=>{let b=null;model.traverse(n=>{if(n.isBone&&n.name===name)b=n;});return b;};
 bones.spine=find("Bip01_Spine1");bones.spine0=bones.spine?.rotation.x||0;
 bones.head=find("Bip01_Head");bones.head0y=bones.head?.rotation.y||0;
 // Relaxed arms: aim each arm bone (in world space) towards a natural hanging direction, then fix the local rotation.
 model.updateMatrixWorld(true);
 const aim=(bone,child,dir)=>{
  if(!bone||!child)return;
  const p=new THREE.Vector3(),c=new THREE.Vector3();
  bone.getWorldPosition(p);child.getWorldPosition(c);
  const from=c.sub(p).normalize(),delta=new THREE.Quaternion().setFromUnitVectors(from,dir.clone().normalize());
  const parentQ=new THREE.Quaternion();bone.parent.getWorldQuaternion(parentQ);
  const worldQ=new THREE.Quaternion();bone.getWorldQuaternion(worldQ);
  bone.quaternion.copy(parentQ.invert().multiply(delta).multiply(worldQ));
  model.updateMatrixWorld(true);
 };
 const drop=window.__armDrop??22; // degrees away from the body
 for(const [side,sign] of [["L",1],["R",-1]]){
  const out=Math.sin(drop*Math.PI/180),down=-Math.cos(drop*Math.PI/180);
  const upper=find("Bip01_"+side+"_UpperArm"),fore=find("Bip01_"+side+"_Forearm"),hand=find("Bip01_"+side+"_Hand");
  aim(upper,fore,new THREE.Vector3(sign*out*window.__armSide,down,.04));
  aim(fore,hand,new THREE.Vector3(sign*out*.7*window.__armSide,down,.12));
 } setView("bust");
 if(bar)bar.textContent="Έτοιμο · υποψήφιο μοντέλο Medical_Female_03 (Microsoft Rocketbox, MIT)";
 canvas.dataset.ready="1";
 requestAnimationFrame(loop);
}).catch(e=>{if(bar)bar.textContent="Σφάλμα φόρτωσης: "+e;});
