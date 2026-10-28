/* Viewport-safe saved position of the floating notes control and its window.
   Local to each device: moving a button on a phone should not move it on a PC. */
export const NOTES_FAB_POSITION='ekab.notes.fab.position.v1';
export const NOTES_WINDOW_POSITION='ekab.notes.window.position.v1';
const unit=n=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):null;
export function clampFloating(left,top,width,height,viewportWidth,viewportHeight,padding=12){
 const w=Math.max(0,Number(width)||0),h=Math.max(0,Number(height)||0);
 const vw=Math.max(1,Number(viewportWidth)||1),vh=Math.max(1,Number(viewportHeight)||1);
 const mx=Math.min(padding,Math.max(0,(vw-w)/2));
 const my=Math.min(padding,Math.max(0,(vh-h)/2));
 const minX=mx,maxX=Math.max(mx,vw-w-mx),minY=my,maxY=Math.max(my,vh-h-my);
 const x=Number.isFinite(left)?left:maxX,y=Number.isFinite(top)?top:maxY;
 return {left:Math.min(maxX,Math.max(minX,x)),top:Math.min(maxY,Math.max(minY,y))};
}
export function ratiosForFloating(left,top,width,height,vw,vh,padding=12){
 const p=clampFloating(left,top,width,height,vw,vh,padding);
 const mx=Math.min(padding,Math.max(0,(vw-width)/2));
 const my=Math.min(padding,Math.max(0,(vh-height)/2));
 const dx=Math.max(0,vw-width-2*mx),dy=Math.max(0,vh-height-2*my);
 return {x:dx?unit((p.left-mx)/dx):0,y:dy?unit((p.top-my)/dy):0};
}
export function floatingFromRatios(position,width,height,vw,vh,padding=12){
 if(!position||typeof position!=='object'||unit(position.x)===null||unit(position.y)===null||
  position.x<0||position.x>1||position.y<0||position.y>1)return null;
 const mx=Math.min(padding,Math.max(0,(vw-width)/2));
 const my=Math.min(padding,Math.max(0,(vh-height)/2));
 return clampFloating(mx+position.x*Math.max(0,vw-width-2*mx),
   my+position.y*Math.max(0,vh-height-2*my),width,height,vw,vh,padding);
}
export function readFloatingPosition(storage,key){
 try{
  const raw=storage.getItem(key);if(!raw)return null;
  const value=JSON.parse(raw);
  return value&&typeof value==='object'&&typeof value.x==='number'&&typeof value.y==='number'&&
   value.x>=0&&value.x<=1&&value.y>=0&&value.y<=1?{x:value.x,y:value.y}:null;
 }catch{return null}
}
export function saveFloatingPosition(storage,key,point){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.x>1||point.y<0||point.y>1)return false;
 try{storage.setItem(key,JSON.stringify({x:point.x,y:point.y}));return true}catch{return false}
}

/* A presentation preference, intentionally not included in personal-note sync. */
export const NOTES_FAB_HIDDEN_KEY='ekab.notes.fab.hidden.v1';
export function readFloatingVisibility(storage){
 try{return storage.getItem(NOTES_FAB_HIDDEN_KEY)==='1'}catch{return false}
}
export function saveFloatingVisibility(storage,hidden){
 try{
  if(hidden)storage.setItem(NOTES_FAB_HIDDEN_KEY,'1');
  else storage.removeItem(NOTES_FAB_HIDDEN_KEY);
  return true;
 }catch{return false}
}
