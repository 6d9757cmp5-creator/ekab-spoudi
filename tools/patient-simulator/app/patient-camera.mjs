/**
 * Original camera presets for the independent Patient Simulator.
 * Visual navigation only: no anatomical picking, clinical examination or intervention.
 * Coordinates from model-viewer are model bounding boxes, not validated anatomy.
 */
export const VIEW_PRESETS=Object.freeze({
 scene:Object.freeze({orbit:'0deg 75deg 145%',fieldOfView:'auto',part:'Σκηνή',offset:0}),
 full:Object.freeze({orbit:'0deg 75deg 110%',fieldOfView:'auto',part:'Σώμα',offset:0}),
 head:Object.freeze({orbit:'12deg 78deg 65%',fieldOfView:'30deg',part:'Κεφάλι',offset:0.35}),
 torso:Object.freeze({orbit:'0deg 75deg 72%',fieldOfView:'33deg',part:'Θώρακας',offset:0.07}),
 legs:Object.freeze({orbit:'-12deg 85deg 72%',fieldOfView:'33deg',part:'Πόδια',offset:-0.32})
});
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const fmt=value=>Number(value.toFixed(3))+'m';
/**
 * @param {'scene'|'full'|'head'|'torso'|'legs'} view
 * @param {'alex'|'daniel'|'amara'} pose
 * @param {{dimensions?:{x:number,y:number,z:number},center?:{x:number,y:number,z:number}}} bounds
 * Full-body glTF bounds are enough for approximate framing on upright models.
 * Reclined patients do not have validated orientation metadata for region target.
 */
export function patientCameraPreset(view,pose='alex',bounds={}){
 const preset=VIEW_PRESETS[view]||VIEW_PRESETS.scene;
 const validBox=bounds.dimensions&&bounds.center&&
  ['x','y','z'].every(k=>finite(bounds.dimensions[k])&&finite(bounds.center[k]));
 const upright=pose==='alex'||pose==='amara';
 let target='auto auto auto';
 let approx=false;
 if(validBox&&upright&&bounds.dimensions.y>0.2){
  const {center,dimensions}=bounds;
  const targetY=center.y+dimensions.y*preset.offset;
  target=[fmt(center.x),fmt(targetY),fmt(center.z)].join(' ');
  approx=view==='head'||view==='torso'||view==='legs';
 }
 const message=approx
  ?'Ενδεικτική κάμερα '+preset.part.toLowerCase()+'. Η στόχευση βασίζεται στο περίγραμμα 3D και δεν αποτελεί εξέταση.'
  :view==='scene'||view==='full'
  ?'Τρισδιάστατη προβολή '+preset.part.toLowerCase()+' με αφή ή ποντίκι.'
  :'Μεγέθυνση '+preset.part.toLowerCase()+': δεν υπάρχει επιβεβαιωμένη ανατομική στόχευση για αυτό το μοντέλο.';
 return Object.freeze({view:preset===VIEW_PRESETS.scene?'scene':view,target,orbit:preset.orbit,fieldOfView:preset.fieldOfView,message,approximate:approx});
}
