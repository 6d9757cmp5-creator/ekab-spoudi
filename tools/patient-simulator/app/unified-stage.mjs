/**
 * EKAB Spoudi — original unified 3D patient stage.
 * Two real CC0 patient GLBs, environment and equipment in one Three.js WebGL scene.
 * Visual learning sandbox only: NO clinical physiology, procedural anatomy or medication.
 * Dependencies: three@0.187.0 + official GLTFLoader/OrbitControls, bundled locally.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const SCENE_PATIENTS=Object.freeze({
 road:Object.freeze({a:'alex',b:'daniel'}),
 home:Object.freeze({a:'amara',b:'alex'}),
 square:Object.freeze({a:'alex',b:'amara'})
});
const CLINICAL_DISCLAIMER='Μοντέλα CC0 · ο προαιρετικός rigged avatar κινείται μόνο εκπαιδευτικά, χωρίς κλινικά έγκυρη αναπνοή, τραύμα ή επίδραση θεραπείας.';
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
function material(color,roughness=.77,metalness=.04){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
/** Subtle, deterministic surface grain. Original texture generated locally: no external imagery. */
function texturedGround(color){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)return material(color,.97);
 ctx.fillStyle='#e3e5e4';ctx.fillRect(0,0,128,128);
 let seed=0x19a7c483;
 for(let i=0;i<1550;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const x=seed&127,y=(seed>>>11)&127;
  const shade=215+(seed>>>22)%18;
  ctx.fillStyle='rgb('+shade+','+shade+','+shade+')';
  ctx.fillRect(x,y,1,1);
 }
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(12,12);
 texture.anisotropy=2;
 return new THREE.MeshStandardMaterial({color,roughness:.96,metalness:0,map:texture});
}

const ROAD_MATERIAL_FILES=Object.freeze([
 '../assets/materials/asphalt_03_diff_1k.jpg',
 '../assets/materials/asphalt_03_normal_1k.jpg',
 '../assets/materials/asphalt_03_rough_1k.jpg'
]);
/** Real photograph-derived local CC0 PBR maps. Procedural fallback remains functional offline. */
function photographicRoad(onStatus=()=>{}){
 const fallback=texturedGround('#4c545b');
 const loader=new THREE.TextureLoader();
 onStatus('loading');
 Promise.allSettled(ROAD_MATERIAL_FILES.map(file=>loader.loadAsync(new URL(file,import.meta.url).href)))
  .then(results=>{
   const loaded=results.filter(x=>x.status==='fulfilled').map(x=>x.value);
   if(fallback.userData.atlaDisposed){loaded.forEach(t=>t.dispose());return;}
   if(results.some(x=>x.status!=='fulfilled')){
    loaded.forEach(t=>t.dispose());
    onStatus('fallback');
    return;
   }
   const [diffuse,normal,rough]=loaded;
   for(const texture of loaded){
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.repeat.set(11,2);
    texture.anisotropy=4;
   }
   diffuse.colorSpace=THREE.SRGBColorSpace;
   const prior=fallback.map;
   fallback.map=diffuse;
   fallback.normalMap=normal;
   fallback.roughnessMap=rough;
   fallback.color.set('#ffffff');
   fallback.roughness=1;
   fallback.metalness=0;
   fallback.normalScale.set(.42,.42);
   fallback.needsUpdate=true;
   prior?.dispose();
   onStatus('pbr-cc0');
  }).catch(()=>onStatus('fallback'));
 return fallback;
}
function disposeStageMaterial(mat){
 if(!mat)return;
 mat.userData.atlaDisposed=true;
 for(const key of ['map','normalMap','roughnessMap'])mat[key]?.dispose?.();
 mat.dispose?.();
}

function box(w,h,d,mat,x=0,y=0,z=0,group=null){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group?.add(mesh);return mesh;
}
function cylinder(r1,r2,h,mat,x,y,z,group){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,16),mat);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function buildEnvironment(scene,onMaterialStatus=()=>{}){
 const root=new THREE.Group();root.name='Συνθετικό περιβάλλον';
 const road=scene==='road'?photographicRoad(onMaterialStatus):texturedGround('#4c545b'),white=material('#e8eceb',.5),teal=material('#286677',.54),red=material('#a33c40',.65);
 const sand=material('#b4b5af'),warm=material('#7b695c'),glass=new THREE.MeshPhysicalMaterial({color:'#7895a3',metalness:.06,roughness:.18,transparent:true,opacity:.74,clearcoat:.5});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(55,55),texturedGround(scene==='road'?'#69777d':scene==='home'?'#a19b91':'#9ba9ad'));
 ground.rotation.x=-Math.PI/2;ground.position.y=-0.055;ground.receiveShadow=true;root.add(ground);
 const add=(w,h,d,mat,x,y,z)=>box(w,h,d,mat,x,y,z,root);
 if(scene==='road'){
  add(23,.018,4.4,road,0,-.038,-1.65);
  for(let i=-5;i<=5;i++)add(.73,.019,.09,white,i*1.72,-.015,-1.63);
  add(2.6,.08,4.1,sand,-3.85,-.035,0);
  // Original non-branded training vehicle, explicitly schematic and non-functional.
  // Rounded panel contours, darker glazing, side doors and wheel hubs reduce blockiness.
  const van=new THREE.Group();van.position.set(-4.35,0,-2.65);van.rotation.y=.13;van.scale.setScalar(.92);root.add(van);
  const body=new THREE.Mesh(new RoundedBoxGeometry(2.18,1.55,3.60,3,.14),white);
  body.position.set(0,.99,0);body.castShadow=true;body.receiveShadow=true;van.add(body);
  box(2.06,.04,3.32,red,0,1.27,0,van);
  for(const x of [-1.103,1.103]){
   box(.025,.20,2.65,red,x,1.18,-.12,van);
   box(.027,.46,.82,glass,x,1.48,.58,van);
   box(.031,.025,1.21,material('#283d48',.8),x,1.00,-.54,van);
   box(.035,.12,.20,material('#293b46'),x,1.10,.18,van);
  }
  box(1.82,.52,.025,glass,0,1.53,1.82,van);
  box(1.83,.43,.024,glass,0,1.50,-1.82,van);
  box(1.72,.10,.08,material('#515d65'),0,.39,1.86,van);
  box(1.75,.11,.08,material('#515d65'),0,.40,-1.86,van);
  for(const x of [-.65,.65])box(.33,.16,.035,material('#f1e4bf',.4),x,.60,1.86,van);
  for(const x of [-1.06,1.06])for(const z of [-1.18,1.2]){
   const tyre=new THREE.Mesh(new THREE.CylinderGeometry(.37,.37,.19,28),material('#222a2d',.98));
   tyre.rotation.z=Math.PI/2;tyre.position.set(x,.34,z);tyre.castShadow=true;van.add(tyre);
   const hub=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.205,24),material('#89989d',.42,.55));
   hub.rotation.z=Math.PI/2;hub.position.set(x,.34,z);van.add(hub);
  }
  box(.75,.07,.35,material('#36454b',.42),0,1.81,.15,van);
  for(const x of [-.27,.27])box(.2,.07,.29,material('#2c879c',.25),x,1.87,.15,van);
  const coneMat=material('#d87534');for(const [x,z] of [[-2.28,.58],[2.8,-.38],[3.3,1.8]]){
   const c=new THREE.Mesh(new THREE.ConeGeometry(.16,.53,18),coneMat);
   c.position.set(x,.31,z);c.castShadow=true;root.add(c);
   add(.35,.035,.35,material('#373b3e'),x,.018,z);
  }
 }else if(scene==='home'){
  add(12,.15,10,material('#ab977f'),0,-.075,0);
  for(let x=-5.7;x<=5.7;x+=.56)add(.022,.008,9.9,material('#8b7862'),x,.008,0);
  add(11,3.4,.18,material('#dfd4c5'),0,1.7,-4.8);
  add(.18,3.4,9.4,material('#d8c8b7'),-5.8,1.7,0);
  add(2.2,.85,.82,teal,-3.1,.45,-2.0);
  add(1.0,.42,1.5,sand,-.1,.24,-2.0);
  add(1.38,2.2,.10,glass,2.3,1.6,-4.65);
  add(.8,.12,.8,warm,3,.84,2.1);
  for(const x of [2.65,3.35])for(const z of [1.75,2.4])add(.07,.73,.07,warm,x,.39,z);
 }else{
  // Original public square: paving, planter, bench and low street lights.
  const pavement=material('#9ca9aa');
  for(let x=-5;x<=5;x+=1.1)for(let z=-3.6;z<=3.6;z+=.9)add(1.06,.016,.86,pavement,x,-.036,z);
  add(3.5,.18,.7,warm,-2.95,.66,-2.3);
  add(3.4,.75,.18,warm,-2.95,1.2,-2.56);
  for(const x of [-4.25,-1.65])add(.16,.7,.16,road,x,.34,-2.3);
  const trunk=material('#705744'),leaf=material('#467469');
  cylinder(.19,.25,1.9,trunk,4.45,.95,-2.0,root);
  const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.12,2),leaf);
  crown.position.set(4.45,2.3,-2);crown.castShadow=true;root.add(crown);
  add(.14,3.1,.14,road,-5.0,1.55,1.7);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.29,14,10),material('#daece5',.42));
  lamp.position.set(-5,3.25,1.7);root.add(lamp);
 }
 return root;
}
function buildEquipment(){
 const group=new THREE.Group();group.name='Εκπαιδευτικός εξοπλισμός (μη λειτουργικός)';
 const silver=material('#a5afb5',.48,.6),blue=material('#3f6a73',.78),black=material('#27333a');
 // Wheeled transport stretcher: static illustrative geometry, not a clinical action.
 const trolley=new THREE.Group();trolley.name='Εικονικό φορείο';trolley.position.set(3.5,0,-2.1);trolley.rotation.y=-.17;group.add(trolley);
 box(1.02,.13,2.0,blue,0,.88,0,trolley);
 box(.99,.10,1.99,material('#c5d0d1',.9),0,.99,0,trolley);
 for(const x of [-.44,.44])for(const z of [-.78,.78]){
  box(.055,.75,.055,silver,x,.43,z,trolley);
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.08,14),black);
  wheel.rotation.z=Math.PI/2;wheel.position.set(x,.105,z);trolley.add(wheel);
 }
 for(const x of [-.55,.55])box(.035,.23,1.84,silver,x,1.07,0,trolley);
 for(const z of [-.73,.73])box(.84,.035,.045,silver,0,.51,z,trolley);
 box(.96,.025,.06,material('#425b68'),0,1.09,-.92,trolley);
 // Monitor prop, deliberately without clinical graphics or invented measurements.
 const cart=new THREE.Group();cart.name='Μη λειτουργικό monitor';cart.position.set(3.32,0,-3.70);cart.rotation.y=-.15;group.add(cart);
 box(.38,.68,.36,black,0,.47,0,cart);
 box(.6,.4,.14,black,0,1.08,0,cart);
 box(.52,.29,.014,material('#286c7b',.5),0,1.09,.082,cart);
 box(.32,.06,.27,black,0,.09,0,cart);
 return group;
}
function selectionMark(color){
 const group=new THREE.Group();
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.59,.015,8,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.57,depthWrite:false}));
 ring.rotation.x=Math.PI/2;ring.position.y=.015;group.add(ring);
 const glow=new THREE.Mesh(new THREE.CircleGeometry(.59,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.065,depthWrite:false}));
 glow.rotation.x=-Math.PI/2;glow.position.y=.005;group.add(glow);
 return group;
}
function normalizeModel(object,key){
 const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3());
 if(!Number.isFinite(size.length())||size.length()<.001)throw Error('Invalid GLB bounds: '+key);
 const scale=(key==='alex'?1.76:key==='daniel'?1.82:key==='makehuman'?1.75:1.34)/Math.max(size.x,size.y,size.z);
 object.scale.multiplyScalar(scale);object.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(object),center=b.getCenter(new THREE.Vector3());
 object.position.x-=center.x;object.position.z-=center.z;object.position.y-=b.min.y;
 object.updateMatrixWorld(true);
 object.traverse(node=>{
  if(node.isMesh){
   node.castShadow=true;node.receiveShadow=true;node.frustumCulled=true;
   if(node.material&&'side' in node.material){ /* preserve licensed model PBR materials */ }
  }
 });
 return object;
}
export function mountUnifiedStage(host,{assets,onStatus=()=>{},onSelect=()=>{}}={}){
 if(!host||!assets)throw Error('Unified stage host/assets missing');
 const gl=new THREE.WebGLRenderer({alpha:false,antialias:true,powerPreference:'high-performance'});
 gl.outputColorSpace=THREE.SRGBColorSpace;
 gl.toneMapping=THREE.ACESFilmicToneMapping;
 gl.toneMappingExposure=1.02;
 gl.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
 gl.shadowMap.enabled=true;gl.shadowMap.type=THREE.PCFShadowMap;
 gl.domElement.className='next-unified-canvas';
 gl.domElement.setAttribute('aria-label','Κοινή τρισδιάστατη εκπαιδευτική σκηνή με δύο εικονικούς ασθενείς και εξοπλισμό.');
 host.append(gl.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#9daeb4');scene.fog=new THREE.FogExp2('#9daeb4',.019);
 scene.add(new THREE.HemisphereLight('#f3f6f7','#546167',1.23));
 const sun=new THREE.DirectionalLight('#fff4e7',2.05);
 sun.position.set(-4,8,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
 sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;
 sun.shadow.bias=-.00035;scene.add(sun);
 const rim=new THREE.DirectionalLight('#b0c4cd',.68);rim.position.set(5,4,-3);scene.add(rim);
 const camera=new THREE.PerspectiveCamera(44,1,.08,160);camera.position.set(0,2.50,5.45);
 const controls=new OrbitControls(camera,gl.domElement);
 controls.enableDamping=true;controls.dampingFactor=.075;
 controls.minDistance=2.0;controls.maxDistance=16;
 controls.maxPolarAngle=Math.PI*.49;controls.minPolarAngle=Math.PI*.13;
 controls.enablePan=false;controls.target.set(0,.9,0);controls.update();
 const loader=new GLTFLoader();
 const cache=new Map();let background=null,equipment=null;
 const active=new THREE.Group();active.name='Εικονικοί ασθενείς';scene.add(active);
 const mobile=matchMedia('(max-width: 760px)').matches;
 const people={a:null,b:null},mixers={a:null,b:null},marks={};
 for(const id of ['a','b']){
  marks[id]=selectionMark(id==='a'?'#6fe7d4':'#88bafa');
  scene.add(marks[id]);
 }
 const positions={a:new THREE.Vector3(mobile?-1.02:-1.18,0,.22),b:new THREE.Vector3(mobile?1.04:1.22,0,-.18)};
 let current={scene:'road',person:'a',view:'scene',rigged:false},environmentKind=null,disposed=false,revision=0,raf=0,lastRender=0,lastAnimTime=0;
 const pointer={x:0,y:0},cast=new THREE.Raycaster(),mouse=new THREE.Vector2();
 const report=(status)=>{gl.domElement.dataset.stageStatus=status;onStatus(status,CLINICAL_DISCLAIMER);};
 function fetchModel(key){
  if(!assets[key])return Promise.reject(Error('Missing GLB '+key));
  if(!cache.has(key))cache.set(key,new Promise((resolve,reject)=>{
   loader.load(assets[key],gltf=>resolve({scene:gltf.scene,animations:gltf.animations||[]}),undefined,reject);
  }));
  return cache.get(key);
 }
 function applyFocus(){
  const person=current.person;
  const world=positions[person]||positions.a;
  const object=people[person];
  let y=object?.userData?.height ? clamp(object.userData.height*.57,.5,1.3):.85;
  let distance=6.75;
  if(current.view==='scene'){controls.target.set(0,.82,0);camera.position.set(0,mobile?2.42:2.56,mobile?5.55:5.38);controls.update();return;}
  if(current.view==='full'){distance=3.85;}
  else if(current.view==='head'){distance=2.18;y=object?.userData?.standing?object.userData.height*.78:y;}
  else if(current.view==='torso'){distance=2.45;y=object?.userData?.standing?object.userData.height*.54:y;}
  else if(current.view==='legs'){distance=2.62;y=object?.userData?.standing?object.userData.height*.22:.42;}
  controls.target.set(world.x,y,world.z);
  camera.position.set(world.x+distance*.30,y+distance*.42,world.z+distance);
  controls.update();
 }
 function refreshMarks(){
  for(const id of ['a','b']){
   marks[id].position.copy(positions[id]);
   marks[id].visible=!!people[id];
   const activeMark=id===current.person;
   marks[id].scale.setScalar(activeMark?1.1:.86);
   for(const child of marks[id].children){
    const fill=child.geometry?.type==='CircleGeometry';
    child.material.opacity=activeMark?(fill?.07:.55):(fill?.02:.16);
   }
  }
 }
 function setEnvironment(kind){
  const desired=SCENE_PATIENTS[kind]?kind:'road';
  if(environmentKind===desired&&background)return;
  environmentKind=desired;
  if(background){
   scene.remove(background);
   background.traverse(node=>{
    if(node.isMesh){
     const mats=Array.isArray(node.material)?node.material:[node.material];
     for(const mat of mats)disposeStageMaterial(mat);
     node.geometry?.dispose?.();
    }
   });
  }
  gl.domElement.dataset.roadMaterial=desired==='road'?'loading':'not-used';
  background=buildEnvironment(desired,status=>{
   if(!disposed&&environmentKind===desired)gl.domElement.dataset.roadMaterial=status;
  });
  scene.add(background);
  if(equipment)scene.remove(equipment);
  equipment=buildEquipment();scene.add(equipment);
  scene.background=new THREE.Color(desired==='home'?'#b0b4b1':desired==='square'?'#b4bec1':'#9daeb4');
  scene.fog.color.copy(scene.background);
 }
 async function setState(next){
  if(disposed)return;
  const kind=SCENE_PATIENTS[next?.scene]?next.scene:'road',nextPerson=next?.person==='b'?'b':'a';
  const nextView=['scene','full','head','torso','legs'].includes(next?.view)?next.view:'scene';
  const needsScene=kind!==current.scene||!background;
  const needsFocus=needsScene||nextPerson!==current.person||nextView!==current.view;
  current={...current,scene:kind,person:nextPerson,view:nextView,rigged:!!next?.rigged};
  setEnvironment(kind);
  const token=++revision,models=current.rigged?{...SCENE_PATIENTS[kind],a:'makehuman'}:SCENE_PATIENTS[kind];
  const pending=['a','b'].filter(id=>people[id]?.userData?.key!==models[id]);
  if(pending.length)report('loading');
  const loads=await Promise.allSettled(pending.map(async id=>{
   const key=models[id],source=await fetchModel(key),sceneRoot=cloneSkinned(source.scene);
   normalizeModel(sceneRoot,key);
   const content=new THREE.Group();content.name='Ασθενής '+id.toUpperCase();content.userData.key=key;
   const bb=new THREE.Box3().setFromObject(sceneRoot),size=bb.getSize(new THREE.Vector3());
   content.userData.height=size.y;
   content.userData.standing=key!=='daniel';
   content.add(sceneRoot);content.position.copy(positions[id]);
   if(key==='makehuman'&&source.animations.length){
    const animator=new THREE.AnimationMixer(sceneRoot);
    animator.clipAction(source.animations[0]).play();
    content.userData.mixer=animator;
    content.userData.clipCount=source.animations.length;
   }
   return{id,content};
  }));
  if(disposed||token!==revision)return;
  let failed=false;
  loads.forEach((r,i)=>{
   if(r.status==='fulfilled'){
    const {id,content}=r.value;
    if(mixers[id]){mixers[id].stopAllAction();mixers[id]=null}
    if(people[id])active.remove(people[id]);
    people[id]=content;mixers[id]=content.userData.mixer||null;active.add(content);
   }else{failed=true;console.warn('[EKAB Simulator] GLB load failed',r.reason);}
  });
  refreshMarks();
  gl.domElement.dataset.riggedModel=people.a?.userData.key==='makehuman'&&!!mixers.a?'ready':'off';
  gl.domElement.dataset.riggedClips=String(people.a?.userData.clipCount||0);
  if(needsFocus)applyFocus();
  report(failed?'partial':people.a&&people.b?'ready':'partial');
 }
 function onPointerDown(e){pointer.x=e.clientX;pointer.y=e.clientY;}
 function onPointerUp(e){
  if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>7)return;
  const rect=gl.domElement.getBoundingClientRect();
  mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
  cast.setFromCamera(mouse,camera);
  for(const hit of cast.intersectObjects(active.children,true)){
   let parent=hit.object;
   while(parent&&parent.parent!==active)parent=parent.parent;
   if(parent&&parent.parent===active){onSelect(parent===people.a?'a':'b');return;}
  }
 }
 gl.domElement.addEventListener('pointerdown',onPointerDown);
 gl.domElement.addEventListener('pointerup',onPointerUp);
 const resize=()=>{
  if(disposed)return;
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  camera.aspect=w/h;camera.updateProjectionMatrix();gl.setSize(w,h,false);
 };
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const minFrame=mobile?1000/30:1000/45;
 function tick(now){
  if(disposed)return;
  raf=requestAnimationFrame(tick);
  if(document.hidden||now-lastRender<minFrame)return;
  const delta=lastAnimTime?Math.min(.07,(now-lastAnimTime)/1000):0;
  lastAnimTime=now;lastRender=now;
  for(const mixer of Object.values(mixers))mixer?.update(delta);
  controls.update();gl.render(scene,camera);
 }
 raf=requestAnimationFrame(tick);
 report('loading');
 return {
  setState,
  getStatus:()=>gl.domElement.dataset.stageStatus,
  dispose(){
   if(disposed)return;disposed=true;revision++;
   cancelAnimationFrame(raf);observer.disconnect();controls.dispose();
   for(const mixer of Object.values(mixers))mixer?.stopAllAction();
   gl.domElement.removeEventListener('pointerdown',onPointerDown);
   gl.domElement.removeEventListener('pointerup',onPointerUp);
   for(const obj of [background,equipment,...Object.values(people),...Object.values(marks)]){
    obj?.traverse?.(node=>{node.geometry?.dispose?.();if(node.material&&(obj===background||obj===equipment||Object.values(marks).includes(obj))){const ms=Array.isArray(node.material)?node.material:[node.material];ms.forEach(disposeStageMaterial);}});
   }
   gl.dispose();gl.domElement.remove();
  }
 };
}
