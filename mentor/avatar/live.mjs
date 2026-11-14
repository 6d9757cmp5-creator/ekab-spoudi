/**
 * Fictional MENTOR visual performer. Renders a portrait with gentle idle motion,
 * blinking and best-effort speech-synchronized mouth shapes.
 *
 * This is not a true neural video avatar or phoneme-level lip-sync: Web Speech
 * may expose word boundaries; otherwise we approximate movement during playback.
 * Never records speech, stores student data or calls external services.
 */
export const MOUTH_SHAPES=Object.freeze(["rest","wide","round","open","closed"]);
const vowels={"α":"open","ά":"open","ε":"wide","έ":"wide","η":"wide","ή":"wide","ι":"wide","ί":"wide","ϊ":"wide","ΐ":"wide","ο":"round","ό":"round","ω":"round","ώ":"round","υ":"round","ύ":"round","ϋ":"round","ΰ":"round"};
export function chooseMouthShape(input,index=0){
 const text=String(input||"").toLocaleLowerCase("el");
 if(!text)return "rest";
 let at=Math.max(0,Math.min(text.length-1,Number(index)||0));
 for(let k=0;k<Math.min(7,text.length-at);k++){
  const ch=text[at+k];
  if(vowels[ch])return vowels[ch];
  if(/[.,;!?··:]/.test(ch))return "closed";
  if(/[μπφβπμ]/.test(ch))return "closed";
 }
 return "wide";
}
export function createMentorAvatar(node,{clock=globalThis}={}){
 if(!node)return {start(){},boundary(){},stop(){},destroy(){}};
 const img=node.querySelector(".mentor-photo-img");
 if(img){
  img.addEventListener("error",()=>{img.hidden=true;node.classList.add("mentor-photo-fallback")},{once:true});
 }
 const prefersReduced=!!clock.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 const ownerDoc=node.ownerDocument;
 let interval=null;
 let startedAt=0;
 let currentText="";
 let baseIndex=0;
 let boundaryAt=0;
 let active=false;
 let rate=1;
 function frame(){
  if(!active||ownerDoc?.hidden||prefersReduced)return;
  const elapsed=(Date.now()-boundaryAt)/1000;
  const advance=Math.round(elapsed*11*rate);
  const idx=currentText.length?Math.min(currentText.length-1,baseIndex+advance):0;
  const shape=chooseMouthShape(currentText,idx);
  node.dataset.viseme=shape;
 }
 function stop(){
  active=false;
  if(interval!==null){clock.clearInterval(interval);interval=null;}
  node.classList.remove("mentor-photo-speaking");
  node.dataset.viseme="rest";
 }
 function start(text,{speed=1}={}){
  stop();
  currentText=String(text||"").slice(0,2500);
  rate=Math.max(.7,Math.min(1.2,Number(speed)||1));
  active=true;startedAt=Date.now();boundaryAt=startedAt;baseIndex=0;
  node.classList.add("mentor-photo-speaking");
  node.dataset.viseme=prefersReduced?"rest":"wide";
  if(!prefersReduced){interval=clock.setInterval(frame,95);}
 }
 function boundary(event){
  if(!active||!event)return;
  const n=Number(event.charIndex);
  if(Number.isFinite(n)&&n>=0){
   baseIndex=Math.min(currentText.length,Math.floor(n));boundaryAt=Date.now();
   frame();
  }
 }
 function destroy(){stop();}
 // Hidden tab should not keep animating while speech is paused or stopped.
 ownerDoc?.addEventListener?.("visibilitychange",()=>{
  if(ownerDoc.hidden){node.dataset.viseme="rest";}
  else frame();
 });
 return {start,boundary,stop,destroy};
}
