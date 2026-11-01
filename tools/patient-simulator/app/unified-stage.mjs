/**
 * EKAB Spoudi — original unified 3D patient stage.
 * Two real CC0 patient GLBs, environment and equipment in one Three.js WebGL scene.
 * Visual learning sandbox only: NO clinical physiology, procedural anatomy or medication.
 * Dependencies: three@0.187.0 + official GLTFLoader/OrbitControls, bundled locally.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export const SCENE_PATIENTS=Object.freeze({
 road:Object.freeze({a:'alex',b:'daniel'}),
 home:Object.freeze({a:'amara',b:'alex'}),
 square:Object.freeze({a:'alex',b:'amara'})
});
const CLINICAL_DISCLAIMER='Στατικά μοντέλα CC0 — δεν προσομοιώνουν αναπνοή, τραύμα ή επίδραση θεραπείας.';
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
function material(color,roughness=.77,metalness=.04){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function box(w,h,d,mat,x=0,y=0,z=0,group=null){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group?.add(mesh);return mesh;
}
function cylinder(r1,r2,h,mat,x,y,z,group){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,16),mat);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function buildEnvironment(scene){
 const root=new THREE.Group();root.name='Συνθετικό περιβάλλον';
 const road=material('#374550'),white=material('#e4eef1'),teal=material('#2f8d9b'),red=material('#d2515e');
 const sand=material('#b7b0a0'),warm=material('#897466'),glass=new THREE.MeshStandardMaterial({color:'#8bc7df',metalness:.32,roughness:.28,transparent:true,opacity:.85});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(55,55),material(scene==='road'?'#5a656d':scene==='home'?'#7d756d':'#84939a'));
 ground.rotation.x=-Math.PI/2;ground.position.y=-0.055;ground.receiveShadow=true;root.add(ground);
 const add=(w,h,d,mat,x,y,z)=>box(w,h,d,mat,x,y,z,root);
 if(scene==='road'){
  add(23,.018,4.4,road,0,-.038,-1.65);
  for(let i=-5;i<=5;i++)add(.73,.019,.09,white,i*1.72,-.015,-1.63);
  add(2.6,.08,4.1,sand,-3.85,-.035,0);
  // Ambulance-like training prop, completely original primitives, no brand markings.
  const van=new THREE.Group();van.position.set(-3.75,0,-2.25);van.rotation.y=.17;root.add(van);
  box(2.15,1.58,3.65,white,0,.96,0,van);
  box(2.04,.32,3.5,red,0,1.2,0,van);
  box(2.09,.61,.08,glass,0,1.42,1.87,van);
  box(2.09,.62,.08,glass,0,1.45,-1.86,van);
  box(.09,.52,.94,glass,-1.09,1.43,.58,van);
  box(.09,.52,.94,glass,1.09,1.43,.58,van);
  for(const x of [-1.03,1.03])for(const z of [-1.1,1.17]){
   const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.16,20),material('#1a242e'));
   wheel.rotation.z=Math.PI/2;wheel.position.set(x,.34,z);van.add(wheel);
  }
  box(.54,.1,.25,teal,0,1.88,.1,van);
  const coneMat=material('#d87534');for(const [x,z] of [[-2.28,.58],[2.8,-.38],[3.3,1.8]]){
   const c=new THREE.Mesh(new THREE.ConeGeometry(.18,.62,12),coneMat);
   c.position.set(x,.31,z);c.castShadow=true;root.add(c);
   add(.45,.05,.45,material('#283844'),x,.018,z);
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
 const silver=material('#a5b6c1',.44,.55),blue=material('#237a86'),black=material('#172d3d');
 // Wheeled transport stretcher: static illustrative geometry, not a clinical action.
 const trolley=new THREE.Group();trolley.name='Εικονικό φορείο';trolley.position.set(3.15,0,-1.85);trolley.rotation.y=-.17;group.add(trolley);
 box(1.02,.14,2.0,blue,0,.86,0,trolley);
 box(.99,.07,1.99,material('#dde7e7'),0,.98,0,trolley);
 for(const x of [-.44,.44])for(const z of [-.78,.78]){
  box(.055,.75,.055,silver,x,.43,z,trolley);
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.08,14),black);
  wheel.rotation.z=Math.PI/2;wheel.position.set(x,.105,z);trolley.add(wheel);
 }
 for(const x of [-.55,.55])box(.04,.23,1.84,silver,x,1.06,0,trolley);
 // Monitor prop, deliberately without clinical graphics or invented measurements.
 const cart=new THREE.Group();cart.name='Μη λειτουργικό monitor';cart.position.set(-.1,0,-2.65);group.add(cart);
 box(.38,.68,.36,black,0,.47,0,cart);
 box(.6,.4,.14,black,0,1.08,0,cart);
 box(.52,.29,.014,material('#286c7b',.5),0,1.09,.082,cart);
 box(.32,.06,.27,black,0,.09,0,cart);
 return group;
}
function selectionMark(color){
 const group=new THREE.Group();
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.67,.027,8,42),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.92}));
 ring.rotation.x=Math.PI/2;ring.position.y=.015;group.add(ring);
 const glow=new THREE.Mesh(new THREE.CircleGeometry(.67,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.13,depthWrite:false}));
 glow.rotation.x=-Math.PI/2;glow.position.y=.005;group.add(glow);
 return group;
}
function normalizeModel(object,key){
 const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3());
 if(!Number.isFinite(size.length())||size.length()<.001)throw Error('Invalid GLB bounds: '+key);
 const scale=(key==='alex'?1.76:key==='daniel'?1.82:1.34)/Math.max(size.x,size.y,size.z);
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
 gl.toneMappingExposure=1.23;
 gl.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
 gl.shadowMap.enabled=true;gl.shadowMap.type=THREE.PCFSoftShadowMap;
 gl.domElement.className='next-unified-canvas';
 gl.domElement.setAttribute('aria-label','Κοινή τρισδιάστατη εκπαιδευτική σκηνή με δύο εικονικούς ασθενείς και εξοπλισμό.');
 host.append(gl.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#9cb6c0');scene.fog=new THREE.FogExp2('#9cb6c0',.025);
 scene.add(new THREE.HemisphereLight('#e5f5ff','#4b6168',2.1));
 const sun=new THREE.DirectionalLight('#fff1df',3.1);
 sun.position.set(-4,8,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
 sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;
 sun.shadow.bias=-.00035;scene.add(sun);
 const rim=new THREE.DirectionalLight('#88dfed',1.25);rim.position.set(5,4,-3);scene.add(rim);
 const camera=new THREE.PerspectiveCamera(46,1,.08,160);camera.position.set(0,3.55,9.7);
 const controls=new OrbitControls(camera,gl.domElement);
 controls.enableDamping=true;controls.dampingFactor=.075;
 controls.minDistance=2.0;controls.maxDistance=16;
 controls.maxPolarAngle=Math.PI*.49;controls.minPolarAngle=Math.PI*.13;
 controls.enablePan=false;controls.target.set(0,.9,0);controls.update();
 const loader=new GLTFLoader();
 const cache=new Map();let background=null,equipment=null;
 const active=new THREE.Group();active.name='Εικονικοί ασθενείς';scene.add(active);
 const people={a:null,b:null},marks={};
 for(const id of ['a','b']){
  marks[id]=selectionMark(id==='a'?'#6fe7d4':'#88bafa');
  scene.add(marks[id]);
 }
 const positions={a:new THREE.Vector3(-1.2,0,.2),b:new THREE.Vector3(1.25,0,-.15)};
 let current={scene:'road',person:'a',view:'scene'},environmentKind=null,disposed=false,revision=0,raf=0,lastRender=0;
 const pointer={x:0,y:0},cast=new THREE.Raycaster(),mouse=new THREE.Vector2();
 const report=(status)=>{gl.domElement.dataset.stageStatus=status;onStatus(status,CLINICAL_DISCLAIMER);};
 function fetchModel(key){
  if(!assets[key])return Promise.reject(Error('Missing GLB '+key));
  if(!cache.has(key))cache.set(key,new Promise((resolve,reject)=>{
   loader.load(assets[key],gltf=>resolve(gltf.scene),undefined,reject);
  }));
  return cache.get(key);
 }
 function applyFocus(){
  const person=current.person;
  const world=positions[person]||positions.a;
  const object=people[person];
  let y=object?.userData?.height ? clamp(object.userData.height*.57,.5,1.3):.85;
  let distance=6.75;
  if(current.view==='scene'){controls.target.set(0,.92,0);camera.position.set(0,3.55,9.7);controls.update();return;}
  if(current.view==='full'){distance=4.35;}
  else if(current.view==='head'){distance=2.45;y=object?.userData?.standing?object.userData.height*.78:y;}
  else if(current.view==='torso'){distance=2.8;y=object?.userData?.standing?object.userData.height*.54:y;}
  else if(current.view==='legs'){distance=3.0;y=object?.userData?.standing?object.userData.height*.22:.42;}
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
    child.material.opacity=activeMark?(fill?.2:1):(fill?.05:.25);
   }
  }
 }
 function setEnvironment(kind){
  const desired=SCENE_PATIENTS[kind]?kind:'road';
  if(environmentKind===desired&&background)return;
  environmentKind=desired;
  if(background)scene.remove(background);
  background=buildEnvironment(desired);scene.add(background);
  if(equipment)scene.remove(equipment);
  equipment=buildEquipment();scene.add(equipment);
  scene.background=new THREE.Color(desired==='home'?'#77838a':desired==='square'?'#adc8cf':'#9eb9c9');
  scene.fog.color.copy(scene.background);
 }
 async function setState(next){
  if(disposed)return;
  const kind=SCENE_PATIENTS[next?.scene]?next.scene:'road',nextPerson=next?.person==='b'?'b':'a';
  const nextView=['scene','full','head','torso','legs'].includes(next?.view)?next.view:'scene';
  const needsScene=kind!==current.scene||!background;
  const needsFocus=needsScene||nextPerson!==current.person||nextView!==current.view;
  current={...current,scene:kind,person:nextPerson,view:nextView};
  setEnvironment(kind);
  const token=++revision,models=SCENE_PATIENTS[kind];
  const pending=['a','b'].filter(id=>people[id]?.userData?.key!==models[id]);
  if(pending.length)report('loading');
  const loads=await Promise.allSettled(pending.map(async id=>{
   const key=models[id],sceneRoot=(await fetchModel(key)).clone(true);
   normalizeModel(sceneRoot,key);
   const content=new THREE.Group();content.name='Ασθενής '+id.toUpperCase();content.userData.key=key;
   const bb=new THREE.Box3().setFromObject(sceneRoot),size=bb.getSize(new THREE.Vector3());
   content.userData.height=size.y;
   content.userData.standing=key!=='daniel';
   content.add(sceneRoot);content.position.copy(positions[id]);
   return{id,content};
  }));
  if(disposed||token!==revision)return;
  let failed=false;
  loads.forEach((r,i)=>{
   if(r.status==='fulfilled'){
    const {id,content}=r.value;
    if(people[id])active.remove(people[id]);
    people[id]=content;active.add(content);
   }else{failed=true;console.warn('[EKAB Simulator] GLB load failed',r.reason);}
  });
  refreshMarks();
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
 const mobile=matchMedia('(max-width: 760px)').matches;
 const minFrame=mobile?1000/30:1000/45;
 function tick(now){
  if(disposed)return;
  raf=requestAnimationFrame(tick);
  if(document.hidden||now-lastRender<minFrame)return;
  lastRender=now;controls.update();gl.render(scene,camera);
 }
 raf=requestAnimationFrame(tick);
 report('loading');
 return {
  setState,
  getStatus:()=>gl.domElement.dataset.stageStatus,
  dispose(){
   if(disposed)return;disposed=true;revision++;
   cancelAnimationFrame(raf);observer.disconnect();controls.dispose();
   gl.domElement.removeEventListener('pointerdown',onPointerDown);
   gl.domElement.removeEventListener('pointerup',onPointerUp);
   for(const obj of [background,equipment,...Object.values(people),...Object.values(marks)]){
    obj?.traverse?.(node=>{node.geometry?.dispose?.();if(node.material&&(obj===background||obj===equipment||Object.values(marks).includes(obj))){const ms=Array.isArray(node.material)?node.material:[node.material];ms.forEach(m=>m.dispose?.());}});
   }
   gl.dispose();gl.domElement.remove();
  }
 };
}
