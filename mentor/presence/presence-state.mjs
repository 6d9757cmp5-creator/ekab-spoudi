/**
 * MENTOR Live Companion: pure state and geometry helpers.
 * No DOM access, so every rule here is covered by node --test.
 * Only presentation preferences are stored; no grades, notes or progress.
 */
export const STORAGE_KEY="ekab.mentor.presence.v1";
export const CORNERS=["tl","tr","bl","br"];
export const VISIBILITY=["shown","minimized","hidden"];
export const MODES=["floating","pinned","docked"];
export const MOBILE_MAX_WIDTH=720;
export const MARGIN=8;
export const SNAP_DISTANCE=16;
export const PIN_INSET=12;
export const LIMITS={
 desktop:{minW:160,minH:240,maxW:460,maxH:680,w:230,h:345},
 mobile:{minW:120,minH:180,maxW:260,maxH:390,w:150,h:225}
};

const finite=n=>typeof n==="number"&&Number.isFinite(n);
const clamp=(n,lo,hi)=>Math.min(Math.max(n,lo),Math.max(lo,hi));

export function layoutOf(viewportWidth){
 return viewportWidth<=MOBILE_MAX_WIDTH?"mobile":"desktop";
}

/** Size is limited by its layout limits and by the room on screen. */
export function clampSize(size,viewport,layout){
 const lim=LIMITS[layout]||LIMITS.desktop;
 const roomW=Math.max(lim.minW,viewport.w-2*MARGIN);
 const roomH=Math.max(lim.minH,viewport.h-2*MARGIN);
 return {
  w:Math.round(clamp(finite(size?.w)?size.w:lim.w,lim.minW,Math.min(lim.maxW,roomW))),
  h:Math.round(clamp(finite(size?.h)?size.h:lim.h,lim.minH,Math.min(lim.maxH,roomH)))
 };
}

/** Keeps the whole widget inside the visible area, outside notches and system bars. */
export function clampPosition(pos,size,viewport,safe={top:0,right:0,bottom:0,left:0}){
 const minX=MARGIN+(safe.left||0),minY=MARGIN+(safe.top||0);
 const maxX=viewport.w-size.w-MARGIN-(safe.right||0);
 const maxY=viewport.h-size.h-MARGIN-(safe.bottom||0);
 return {
  x:Math.round(clamp(finite(pos?.x)?pos.x:maxX,minX,maxX)),
  y:Math.round(clamp(finite(pos?.y)?pos.y:maxY,minY,maxY))
 };
}

/** Optional magnetic snap to the nearest edges. */
export function snapToEdges(pos,size,viewport,safe,distance=SNAP_DISTANCE){
 const p=clampPosition(pos,size,viewport,safe);
 const minX=MARGIN+(safe?.left||0),minY=MARGIN+(safe?.top||0);
 const maxX=viewport.w-size.w-MARGIN-(safe?.right||0);
 const maxY=viewport.h-size.h-MARGIN-(safe?.bottom||0);
 return {
  x:Math.abs(p.x-minX)<=distance?minX:Math.abs(p.x-maxX)<=distance?maxX:p.x,
  y:Math.abs(p.y-minY)<=distance?minY:Math.abs(p.y-maxY)<=distance?maxY:p.y
 };
}

export function cornerPosition(corner,size,viewport,safe={}){
 const left=PIN_INSET+(safe.left||0),top=PIN_INSET+(safe.top||0);
 const right=viewport.w-size.w-PIN_INSET-(safe.right||0);
 const bottom=viewport.h-size.h-PIN_INSET-(safe.bottom||0);
 const x=corner==="tl"||corner==="bl"?left:right;
 const y=corner==="tl"||corner==="tr"?top:bottom;
 return clampPosition({x,y},size,viewport,safe);
}

/** Nearest corner for the "pin where it is now" action. */
export function nearestCorner(pos,size,viewport){
 const cx=pos.x+size.w/2,cy=pos.y+size.h/2;
 return (cy<viewport.h/2?"t":"b")+(cx<viewport.w/2?"l":"r");
}

export function dockedBox(viewport,layout){
 if(layout==="mobile"){
  const h=Math.round(Math.min(viewport.h*0.42,380));
  return {x:0,y:viewport.h-h,w:viewport.w,h,edge:"bottom"};
 }
 const w=Math.round(Math.min(Math.max(viewport.w*0.26,300),420));
 return {x:viewport.w-w,y:0,w,h:viewport.h,edge:"right"};
}

const layoutDefault=layout=>({w:LIMITS[layout].w,h:LIMITS[layout].h,x:null,y:null});

export function defaultPrefs(){
 return {
  version:1,
  // The 3D scene (and its WebGL context) loads only when the learner opens it.
  visibility:"minimized",
  mode:"floating",
  corner:"br",
  snap:true,
  desktop:layoutDefault("desktop"),
  mobile:layoutDefault("mobile")
 };
}

/** Accepts anything read from storage and returns a safe, complete preference object. */
export function normalizePrefs(raw){
 const base=defaultPrefs();
 if(!raw||typeof raw!=="object")return base;
 const out={
  version:1,
  visibility:VISIBILITY.includes(raw.visibility)?raw.visibility:base.visibility,
  mode:MODES.includes(raw.mode)?raw.mode:base.mode,
  corner:CORNERS.includes(raw.corner)?raw.corner:base.corner,
  snap:raw.snap!==false
 };
 for(const layout of ["desktop","mobile"]){
  const src=raw[layout]&&typeof raw[layout]==="object"?raw[layout]:{};
  out[layout]={
   w:finite(src.w)?src.w:base[layout].w,
   h:finite(src.h)?src.h:base[layout].h,
   x:finite(src.x)?src.x:null,
   y:finite(src.y)?src.y:null
  };
 }
 return out;
}

export function parsePrefs(text){
 try{return normalizePrefs(JSON.parse(text));}catch{return defaultPrefs();}
}

export function serializePrefs(prefs){
 return JSON.stringify(normalizePrefs(prefs));
}
