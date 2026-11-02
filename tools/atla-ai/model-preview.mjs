import {buildModelList,getResourceCatalogUrls,safeAssetUrl} from './model-preview-catalog.mjs';
const $=id=>document.getElementById(id);
const tool=new URLSearchParams(location.search).get('tool')==='cockpit'?'cockpit':'anatomy';
const root=new URL('../../',import.meta.url);
const select=$('source-model'),dataset=$('source-dataset'),button=$('source-load'),note=$('source-status');
if(tool==='anatomy')dataset.querySelector('[value="makehuman"]')?.remove();
const status=(v,bad=false)=>{note.textContent=v;note.dataset.error=String(bad)};
const back=$('source-back');
back.href=tool==='anatomy'?'../tools/anatomy-3d/index.html':'../mentor-next.html';
$('source-name').textContent=tool==='anatomy'?'Anatomy Lab · HRA 3D':'Clinical Cockpit · 3D Assets';
$('source-warning').textContent=tool==='anatomy'?'Ανατομική προεπισκόπηση χωρίς κλινική έγκριση.':'Ερευνητικά χαρακτήρες/animations, όχι επικυρωμένος ασθενής.';
let assets=[],renderer,scene,camera,controls,mixer,live,raf=0,loader,THREE,clock,loadVersion=0;
function dispose(){
 mixer?.stopAllAction();mixer=null;
 if(live){
  scene.remove(live);
  live.traverse(o=>{o.geometry?.dispose?.();if(o.material)for(const m of (Array.isArray(o.material)?o.material:[o.material])){for(const k of ['map','normalMap','roughnessMap','metalnessMap'])m[k]?.dispose?.();m.dispose?.()}});
  live=null;
 }
}
async function init3D(){
 if(renderer)return;
 THREE=await import('three');
 const [{GLTFLoader},{OrbitControls}]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/controls/OrbitControls.js')]);
 const canvas=$('source-canvas');
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x0a1c2d);
 scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x597087,2.5));
 const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(3,6,4);scene.add(sun);
 camera=new THREE.PerspectiveCamera(42,1,0.01,100);camera.position.set(2.5,2,4);
 controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enablePan=false;
 loader=new GLTFLoader();clock=new THREE.Clock();
 const resize=()=>{if(!renderer)return;const w=canvas.clientWidth||320,h=canvas.clientHeight||380;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
 if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(canvas);
 resize();
 const loop=()=>{if(!renderer)return;raf=requestAnimationFrame(loop);if(document.hidden)return;mixer?.update(Math.min(0.05,clock.getDelta()));controls.update();renderer.render(scene,camera)};
 loop();
}
button.addEventListener('click',async()=>{
 const item=assets[Number(select.value)];if(!item)return;
 const current=++loadVersion;
 if(item.bytes>100*1048576&&!confirm('Μεγάλο 3D αρχείο: να φορτωθεί τώρα;'))return;
 button.disabled=true;status('Φόρτωση '+item.label+'…');
 try{
  await init3D();
  const modelUrl=safeAssetUrl(item,tool,root).href;
  let model;
  if(item.format==='obj'){
   const {OBJLoader}=await import('three/addons/loaders/OBJLoader.js');
   model={scene:await new OBJLoader().loadAsync(modelUrl),animations:[]};
  }else model=await loader.loadAsync(modelUrl);
  if(current!==loadVersion){model.scene.traverse(n=>{n.geometry?.dispose?.();if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose?.())});return;}
  const box=new THREE.Box3().setFromObject(model.scene);
  const extent=box.getSize(new THREE.Vector3()),max=Math.max(extent.x,extent.y,extent.z);
  if(box.isEmpty()||!Number.isFinite(max)||max<=0)throw Error('Μη έγκυρη γεωμετρία');
  dispose();
  const center=box.getCenter(new THREE.Vector3());
  model.scene.position.sub(center);const group=new THREE.Group();group.add(model.scene);group.scale.setScalar(2.6/max);scene.add(group);live=group;
  if(model.animations.length){mixer=new THREE.AnimationMixer(model.scene);mixer.clipAction(model.animations[0]).play()}
  controls.target.set(0,0,0);camera.position.set(2.5,2,4);controls.update();
  $('source-license').textContent=item.license+' · '+item.status;
  status('Φορτώθηκε '+item.label+' · περιστροφή / μεγέθυνση με αφή ή ποντίκι.');
 }catch(e){if(current===loadVersion)status('Αδυναμία φόρτωσης: '+String(e.message||e).slice(0,170),true)}
 finally{if(current===loadVersion)button.disabled=false}
});
async function loadDataset(){
 const request=++loadVersion;
 assets=[];button.disabled=true;select.replaceChildren();$('source-license').textContent='';
 dispose();status('Έλεγχος επιλεγμένης συλλογής…');
 const secondary=dataset.value==='secondary';
 const makehuman=dataset.value==='makehuman'&&tool==='cockpit';
 const sourceType=makehuman?'makehuman':secondary?(tool==='anatomy'?'research':'patients'):'primary';
 const urls=getResourceCatalogUrls(root);
 const selected=makehuman?[urls.cockpitMakehumanCore,urls.cockpitMakehumanSupplemental]:
  [tool==='anatomy'?(secondary?urls.anatomyResearch:urls.anatomy):(secondary?urls.cockpitPatients:urls.cockpit)];
 try{
  const registries=await Promise.all(selected.map(async url=>{
   const resp=await fetch(url,{cache:'no-store'});
   if(!resp.ok)throw Error('Μητρώο HTTP '+resp.status);
   return resp.json();
  }));
  const next=registries.flatMap(raw=>buildModelList(tool,raw,sourceType));
  if(request!==loadVersion)return;
  if(!next.length)throw Error('Δεν υπάρχουν επιτρεπόμενα πηγαία 3D αρχεία');
  assets=next;
  select.replaceChildren(...assets.map((a,i)=>{
   const o=document.createElement('option');o.value=String(i);o.textContent=a.label;return o;
  }));
  $('source-count').textContent=assets.length+' πραγματικά 3D αρχεία · '+(makehuman?'MakeHuman OBJ (χωρίς rig/animations)':secondary?(tool==='anatomy'?'Z-Anatomy (research-only)':'Στατικοί ασθενείς (ήδη στο Cockpit)'):'βασική συλλογή');
  button.disabled=false;
  status('Επίλεξε μοντέλο. Δεν αλλάζει η ενεργή εκπαιδευτική εφαρμογή.');
 }catch(e){if(request===loadVersion)status('Το μητρώο δεν είναι διαθέσιμο: '+String(e.message||e),true)}
}
dataset.addEventListener('change',loadDataset);
loadDataset();
window.addEventListener('pagehide',()=>{dispose();cancelAnimationFrame(raf);controls?.dispose();renderer?.dispose();renderer=null});
