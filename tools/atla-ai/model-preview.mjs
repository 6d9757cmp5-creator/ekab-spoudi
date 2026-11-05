import {buildModelList,getResourceCatalogUrls,safeAssetUrl,nihAssetsFromLibrary} from './model-preview-catalog.mjs';
import {safeReturnHref} from './nih3d-library.mjs';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const tool=params.get('tool')==='cockpit'?'cockpit':'anatomy';
const root=new URL('../../',import.meta.url);
const select=$('source-model'),dataset=$('source-dataset'),button=$('source-load'),note=$('source-status');
if(tool==='anatomy')for(const value of ['makehuman','rigged'])dataset.querySelector('[value="'+value+'"]')?.remove();
const status=(v,bad=false)=>{note.textContent=v;note.dataset.error=String(bad)};
const back=$('source-back');
back.href=safeReturnHref(params.get('from'),location.href,tool==='anatomy'?'../tools/anatomy-3d/index.html':'../mentor-next.html');
if(params.get('dataset')==='nih')dataset.value='nih';
let deepLinkModel=params.get('dataset')==='nih'?params.get('model'):null;
$('source-name').textContent=tool==='anatomy'?'Εργαστήριο Ανατομίας · HRA 3D':'Κλινικός Προσομοιωτής · 3D αρχεία';
$('source-warning').textContent=tool==='anatomy'?'Ανατομική προεπισκόπηση χωρίς κλινική έγκριση.':'Ερευνητικά χαρακτήρες/animations, όχι επικυρωμένος ασθενής.';
let assets=[],renderer,scene,camera,controls,mixer,live,raf=0,loader,draco,THREE,clock,loadVersion=0;
const partSelect=$('source-part'),animationSelect=$('source-clip'),opacity=$('source-opacity');
const meshInfo=$('source-mesh-info'),partControls=['part-isolate','part-show','view-reset','view-front','view-side','source-opacity'];
let meshParts=[],animationClips=[],originalMaterials=new Map(),fullSceneObject=null,animationPaused=false;
function setEnabled(active){
 for(const id of partControls)$(id).disabled=!active;
 partSelect.disabled=!active||!meshParts.length;
 animationSelect.disabled=!active||!animationClips.length;
 $('clip-play').disabled=!active||!animationClips.length;
 $('clip-pause').disabled=!active||!animationClips.length;
}
function resetParts(){
 meshParts=[];animationClips=[];originalMaterials.clear();fullSceneObject=null;
 meshInfo.textContent='';opacity.value='100';$('opacity-value').textContent='100%';
 partSelect.replaceChildren(new Option('Φόρτωσε μοντέλο',''));
 animationSelect.replaceChildren(new Option('Δεν υπάρχει διαθέσιμη κίνηση',''));
 setEnabled(false);
}
function applyOpacity(){
 const fraction=Number(opacity.value)/100;
 $('opacity-value').textContent=opacity.value+'%';
 for(const [m,values] of originalMaterials){
  m.opacity=values.opacity*fraction;
  m.transparent=values.transparent||fraction<1;
  m.depthWrite=fraction===1?values.depthWrite:false;
  m.needsUpdate=true;
 }
}
function showAll(){
 meshParts.forEach(p=>{p.visible=true});
 for(const node of meshParts){let parent=node.parent;while(parent&&parent!==live){parent.visible=true;parent=parent.parent}}
}
function selectedMesh(){return meshParts[Number(partSelect.value)]||null}
function locate(orientation='reset'){
 if(!live||!camera)return;
 const mesh=selectedMesh();
 const box=new THREE.Box3().setFromObject(orientation==='reset'||!mesh?live:mesh);
 if(box.isEmpty())return;
 const center=box.getCenter(new THREE.Vector3());
 const max=box.getSize(new THREE.Vector3()).length();
 const dist=Math.max(1.2,max*1.4);
 controls.target.copy(center);
 const rel=orientation==='front'?new THREE.Vector3(0,.1,1):orientation==='side'?new THREE.Vector3(1,.1,0):new THREE.Vector3(1,.5,1);
 camera.position.copy(center).addScaledVector(rel.normalize(),dist);
 camera.near=Math.max(.005,dist/1000);
 camera.far=Math.max(200,dist*15);
 camera.updateProjectionMatrix();controls.update();
}
function choosePart(index){
 const p=meshParts[index];
 if(!p)return;
 partSelect.value=String(index);
 meshInfo.textContent=(p.name||'Πλέγμα '+(index+1))+' · '+(p.geometry?.attributes?.position?.count||0).toLocaleString('el-GR')+' κορυφές';
}
function applyAnimation(){
 if(!mixer)return;
 mixer.stopAllAction();mixer.uncacheRoot(fullSceneObject);
 const clip=animationClips[Number(animationSelect.value)];
 if(clip){
  mixer.clipAction(clip,fullSceneObject).reset().play();
  mixer.timeScale=animationPaused?0:1;
 }
}
function installModelTools(gltf,modelRoot){
 fullSceneObject=gltf.scene;
 meshParts=[];
 gltf.scene.traverse(node=>{if(node.isMesh||node.isSkinnedMesh)meshParts.push(node)});
 partSelect.replaceChildren(...meshParts.map((p,i)=>new Option((p.name||'Πλέγμα '+(i+1)).slice(0,110),String(i))));
 if(meshParts.length)choosePart(0);
 animationClips=Array.isArray(gltf.animations)?gltf.animations:[];
 animationSelect.replaceChildren(...(animationClips.length?
  animationClips.map((clip,i)=>new Option((clip.name||'Animation '+(i+1)).slice(0,100),String(i))):
  [new Option('Δεν υπάρχει διαθέσιμη κίνηση','')]));
 originalMaterials.clear();
 for(const node of meshParts)for(const material of (Array.isArray(node.material)?node.material:[node.material])){
  if(material&&!originalMaterials.has(material))originalMaterials.set(material,{
   opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite
  });
 }
 setEnabled(true);
 animationPaused=false;
 if(animationClips.length){mixer=new THREE.AnimationMixer(modelRoot);applyAnimation()}
 meshInfo.textContent=meshParts.length+' επιλέξιμα πλέγματα · '+animationClips.length+' κινήσεις · εκπαιδευτική εξερεύνηση';
}
partSelect.addEventListener('change',()=>choosePart(Number(partSelect.value)));
$('part-isolate').addEventListener('click',()=>{
 const mesh=selectedMesh();if(!mesh)return;
 meshParts.forEach(p=>{p.visible=p===mesh});
 locate('part');
});
$('part-show').addEventListener('click',()=>{showAll();locate('reset')});
$('view-reset').addEventListener('click',()=>locate('reset'));
$('view-front').addEventListener('click',()=>locate('front'));
$('view-side').addEventListener('click',()=>locate('side'));
opacity.addEventListener('input',applyOpacity);
animationSelect.addEventListener('change',()=>{animationPaused=false;applyAnimation()});
$('clip-play').addEventListener('click',()=>{animationPaused=false;if(mixer)mixer.timeScale=1});
$('clip-pause').addEventListener('click',()=>{animationPaused=true;if(mixer)mixer.timeScale=0});
const pickPoint={x:0,y:0};let pointerStart=null;
$('source-canvas').addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY}});
$('source-canvas').addEventListener('pointerup',event=>{
 if(!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>5||!camera||!live)return;
 const bounds=$('source-canvas').getBoundingClientRect();
 if(!bounds.width||!bounds.height)return;
 pickPoint.x=((event.clientX-bounds.left)/bounds.width)*2-1;
 pickPoint.y=1-((event.clientY-bounds.top)/bounds.height)*2;
 const ray=new THREE.Raycaster();
 ray.setFromCamera(pickPoint,camera);
 const hits=ray.intersectObjects(meshParts.filter(m=>m.visible),false);
 if(hits.length){
  const index=meshParts.indexOf(hits[0].object);
  if(index>=0)choosePart(index);
 }
 pointerStart=null;
});
/** NIH originals are checked against the ledger hash before their bytes reach the parser. */
async function loadVerifiedGlb(item,url){
 const response=await fetch(url);
 if(!response.ok)throw Error('Το αρχείο δεν είναι διαθέσιμο (HTTP '+response.status+').');
 const bytes=await response.arrayBuffer();
 if(bytes.byteLength!==item.bytes)throw Error('Το μέγεθος του αρχείου δεν ταιριάζει με το μητρώο.');
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const hex=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hex!==item.integrity.value)throw Error('Το αρχείο απέτυχε στον έλεγχο ακεραιότητας SHA-256.');
 return loader.parseAsync(bytes,'');
}
function showDetails(item){
 const box=$('source-details'),d=item.details;
 box.replaceChildren();box.hidden=!d;
 if(!d)return;
 const line=(label,value)=>{
  if(!value)return;
  const row=document.createElement('p');const name=document.createElement('strong');
  name.textContent=label+': ';row.append(name,String(value));box.append(row);
 };
 line('Πρωτότυπη ονομασία',d.originalTitle);
 line('Κατηγορία',d.category);
 line('Ανατομική δομή',d.greekStructures?.join(', '));
 line('Πλευρικότητα','Δεν δηλώνεται στην πηγή');
 line('Κωδικός και έκδοση',d.accession+(d.sourceVersion?' · έκδοση '+d.sourceVersion:''));
 line('Δημιουργός',d.creator);
 line('Κατάσταση έγκρισης','Χωρίς επιστημονική ή κλινική επικύρωση. Μόνο για εκπαιδευτική εξερεύνηση.');
 if(d.kind==='pathology')line('Σημείωση','Παράδειγμα παθολογίας από την πηγή, όχι εύρημα συγκεκριμένου ασθενούς.');
 line('Περιορισμός',d.restriction);
 if(d.rightsBasis==='OWNER_STATED_PERMISSION')line('Δικαιώματα','Χρήση με δηλωμένη άδεια του ιδιοκτήτη της εφαρμογής. Αρχική άδεια: '+d.license+'.');
 if(/^https:\/\/3d\.nih\.gov\//.test(d.originalPage||'')){
  const row=document.createElement('p'),a=document.createElement('a');
  a.href=d.originalPage;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Πρωτότυπη σελίδα NIH 3D ↗';
  row.append(a);box.append(row);
 }
}
function dispose(){
 mixer?.stopAllAction();mixer=null;
 for(const [m,values] of originalMaterials){
  m.opacity=values.opacity;m.transparent=values.transparent;m.depthWrite=values.depthWrite;
 }
 resetParts();
 if(live){
  scene.remove(live);
  live.traverse(o=>{o.geometry?.dispose?.();if(o.material)for(const m of (Array.isArray(o.material)?o.material:[o.material])){for(const k of ['map','normalMap','roughnessMap','metalnessMap'])m[k]?.dispose?.();m.dispose?.()}});
  live=null;
 }
}
async function init3D(){
 if(renderer)return;
 THREE=await import('three');
 const [{GLTFLoader},{OrbitControls},{DRACOLoader}]=await Promise.all([
  import('three/addons/loaders/GLTFLoader.js'),
  import('three/addons/controls/OrbitControls.js'),
  import('three/addons/loaders/DRACOLoader.js')
 ]);
 const canvas=$('source-canvas');
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x0a1c2d);
 scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x597087,2.5));
 const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(3,6,4);scene.add(sun);
 camera=new THREE.PerspectiveCamera(42,1,0.01,100);camera.position.set(2.5,2,4);
 controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enablePan=true;
 loader=new GLTFLoader();
 draco=new DRACOLoader();
 draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/');
 loader.setDRACOLoader(draco);
 clock=new THREE.Clock();
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
  }else model=item.sourceType==='nih'?await loadVerifiedGlb(item,modelUrl):await loader.loadAsync(modelUrl);
  if(current!==loadVersion){model.scene.traverse(n=>{n.geometry?.dispose?.();if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose?.())});return;}
  const box=new THREE.Box3().setFromObject(model.scene);
  const extent=box.getSize(new THREE.Vector3()),max=Math.max(extent.x,extent.y,extent.z);
  if(box.isEmpty()||!Number.isFinite(max)||max<=0)throw Error('Μη έγκυρη γεωμετρία');
  dispose();
  const center=box.getCenter(new THREE.Vector3());
  model.scene.position.sub(center);const group=new THREE.Group();group.add(model.scene);group.scale.setScalar(2.6/max);scene.add(group);live=group;
  installModelTools(model,model.scene);
  controls.target.set(0,0,0);camera.position.set(2.5,2,4);controls.update();
  $('source-license').textContent=item.license+' · '+item.status;
  showDetails(item);
  status('Φορτώθηκε '+item.label+' · περιστροφή / μεγέθυνση με αφή ή ποντίκι.');
 }catch(e){if(current===loadVersion)status('Αδυναμία φόρτωσης: '+String(e.message||e).slice(0,170),true)}
 finally{if(current===loadVersion)button.disabled=false}
});
async function loadDataset(){
 const request=++loadVersion;
 assets=[];button.disabled=true;select.replaceChildren();$('source-license').textContent='';
 $('source-details').replaceChildren();$('source-details').hidden=true;
 dispose();status('Έλεγχος επιλεγμένης συλλογής…');
 const secondary=dataset.value==='secondary';
 const makehuman=dataset.value==='makehuman'&&tool==='cockpit';
 const rigged=dataset.value==='rigged'&&tool==='cockpit';
 const nih=dataset.value==='nih';
 const sourceType=nih?'nih':rigged?'rigged':makehuman?'makehuman':secondary?(tool==='anatomy'?'research':'patients'):'primary';
 const urls=getResourceCatalogUrls(root);
 const selected=nih?[urls.library]:rigged?[urls.cockpitRigged]:makehuman?[urls.cockpitMakehumanCore,urls.cockpitMakehumanSupplemental]:
  [tool==='anatomy'?(secondary?urls.anatomyResearch:urls.anatomy):(secondary?urls.cockpitPatients:urls.cockpit)];
 try{
  const registries=await Promise.all(selected.map(async url=>{
   const resp=await fetch(url,{cache:'no-store'});
   if(!resp.ok)throw Error('Μητρώο HTTP '+resp.status);
   return resp.json();
  }));
  const next=registries.flatMap(raw=>buildModelList(tool,nih?nihAssetsFromLibrary(raw,tool):raw,sourceType));
  if(request!==loadVersion)return;
  if(!next.length)throw Error('Δεν υπάρχουν επιτρεπόμενα πηγαία 3D αρχεία');
  assets=next;
  select.replaceChildren(...assets.map((a,i)=>{
   const o=document.createElement('option');o.value=String(i);o.textContent=a.label;return o;
  }));
  $('source-count').textContent=assets.length+' πραγματικά 3D αρχεία · '+(rigged?'MakeHuman CC0 · 163 οστά · 2 κινήσεις (μη κλινικό)':makehuman?'MakeHuman OBJ (χωρίς rig/animations)':secondary?(tool==='anatomy'?'Z-Anatomy (research-only)':'Στατικοί ασθενείς (ήδη στο Cockpit)'):'βασική συλλογή');
  button.disabled=false;
  status('Επίλεξε μοντέλο. Δεν αλλάζει η ενεργή εκπαιδευτική εφαρμογή.');
  // A learner who followed a contextual link already chose this model, so it opens directly.
  if(deepLinkModel){
   const wanted=assets.findIndex(a=>a.details?.accession===deepLinkModel);
   deepLinkModel=null;
   if(wanted>=0){select.value=String(wanted);button.click()}
   else status('Το ζητούμενο μοντέλο δεν είναι διαθέσιμο σε αυτό το εργαλείο.',true);
  }
 }catch(e){if(request===loadVersion)status('Το μητρώο δεν είναι διαθέσιμο: '+String(e.message||e),true)}
}
dataset.addEventListener('change',loadDataset);
loadDataset();
window.addEventListener('pagehide',()=>{dispose();cancelAnimationFrame(raf);controls?.dispose();draco?.dispose();renderer?.dispose();renderer=null});
