import React from 'react';
import {AbsoluteFill,Audio,Composition,Img,Sequence,interpolate,registerRoot,staticFile,useCurrentFrame} from 'remotion';
import scenes from './scenes.json';
import timing from './timing.json';
const {fps,totalFrames,sections}=timing;
const BG='#061523',CYAN='#6ad9e7',WHITE='#f6faff',SOFT='#b9cbd8';
const TEXTFONT='"Arial","DejaVu Sans",sans-serif';
const flowNodes=[{name:'ΣΩΜΑ',x:120,y:35,color:'#e46b5f'},{name:'ΔΕΞΙΑ ΚΑΡΔΙΑ',x:120,y:116,color:'#83c4f1'},{name:'ΠΝΕΥΜΟΝΕΣ',x:120,y:198,color:'#83c4f1'},{name:'ΑΡΙΣΤΕΡΗ ΚΑΡΔΙΑ',x:120,y:280,color:'#e97f70'}];
const Flow=({f})=><svg viewBox="0 0 350 338" width="340" style={{marginTop:12,maxWidth:'100%',height:322}}>
  <defs><marker id="blueArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="#90cef6" strokeWidth="2"/></marker><marker id="redArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="#ee877a" strokeWidth="2"/></marker></defs>
  {flowNodes.map((n,i)=><g key={n.name}><rect x={n.x-106} y={n.y-23} width="218" height="47" rx="16" fill="#193449" stroke={n.color} strokeWidth="2"/><text x={n.x+2} y={n.y+6} textAnchor="middle" fontSize="16.7" fill="#f6fbff" fontWeight="700">{n.name}</text></g>)}
  <path d="M120 61 L120 85" stroke="#90cef6" strokeWidth="4" markerEnd="url(#blueArrow)" opacity={.5+.5*Math.sin(f/13)**2}/>
  <path d="M120 143 L120 169" stroke="#90cef6" strokeWidth="4" markerEnd="url(#blueArrow)" opacity={.5+.5*Math.sin(f/13)**2}/>
  <path d="M120 225 L120 252" stroke="#ee877a" strokeWidth="4" markerEnd="url(#redArrow)" opacity={.5+.5*Math.sin(f/13)**2}/>
  <path d="M231 280 Q325 280 325 157 Q325 36 233 36" stroke="#ee877a" strokeWidth="3" fill="none" markerEnd="url(#redArrow)" strokeDasharray="8 10" strokeDashoffset={-f%72}/>
  <text x="326" y="182" fontSize="12" fill="#ee877a" textAnchor="middle" transform="rotate(-90 326 182)">Συστηματική κυκλοφορία</text>
</svg>;
const ValveDemo=({f})=>{
 const openness=Math.sin(f/13)**2;
 const angle=18+openness*40;
 return <div style={{marginTop:22,padding:12,border:'1px solid #376177',borderRadius:14,background:'#0b2639',width:340,maxWidth:'100%'}}>
  <div style={{color:SOFT,fontSize:14,marginBottom:11}}>Σχηματική αρχή ανοίγματος βαλβίδας</div>
  <svg viewBox="0 0 310 115" width="310" height="115">
   <rect x="45" y="19" width="220" height="77" rx="16" stroke="#4687a6" strokeWidth="2" fill="#0c1b2c"/>
   <path d={'M155 57 L'+(155-55*Math.cos(angle*Math.PI/180))+' '+(57-38*Math.sin(angle*Math.PI/180))} stroke="#e6b47c" strokeWidth="9" strokeLinecap="round"/>
   <path d={'M155 57 L'+(155+55*Math.cos(angle*Math.PI/180))+' '+(57-38*Math.sin(angle*Math.PI/180))} stroke="#e6b47c" strokeWidth="9" strokeLinecap="round"/>
   <path d="M88 57 h35 m-8 -7 8 7 -8 7" stroke="#f58a7b" strokeWidth="3" fill="none" strokeLinecap="round"/>
   <path d="M193 57 h34 m-9 -7 9 7 -9 7" stroke="#f58a7b" strokeWidth="3" fill="none" strokeLinecap="round"/>
  </svg>
 </div>
}
const videoIndex=(f,count)=>{const phase=Math.floor(f/2.65)%(count*2-2);return (phase<count?phase+1:count*2-1-phase)};
const Chapter=({scene,section,index})=>{
 const f=useCurrentFrame();
 const isBody=scene.mode==='body';
 const fname=isBody?'render/frame_'+String(videoIndex(f,60)).padStart(4,'0')+'.png':'render/detail_'+scene.mode+'_'+String(videoIndex(f,12)).padStart(4,'0')+'.png';
 const alpha=interpolate(f,[0,12],[0,1],{extrapolateRight:'clamp'});
 const progress=(section.startFrame+f)/totalFrames;
 return <AbsoluteFill style={{background:BG,color:WHITE,fontFamily:TEXTFONT}}>
   <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 16% 43%,#163c53 0%,#071523 67%)'}}/>
   <div style={{position:'absolute',left:0,top:0,width:720,height:720,borderRight:'1px solid #34546b',overflow:'hidden'}}>
     <Img src={staticFile(fname)} style={{height:720,width:720,objectFit:'cover'}}/>
     <div style={{position:'absolute',bottom:34,left:22,padding:'9px 15px',fontSize:13,background:'#061827dd',border:'1px solid #2c4d60',borderRadius:8,color:'#c4d7e3'}}>
      3D: Human Reference Atlas v1.2 · Πραγματική γεωμετρία οργάνων
     </div>
   </div>
   <div style={{position:'absolute',left:754,right:34,top:64,opacity:alpha}}>
      <div style={{fontSize:17,color:CYAN,letterSpacing:1.6,fontWeight:700}}>{scene.tag}</div>
      <div style={{fontWeight:800,fontSize:scene.title.length>25?36:46,lineHeight:1.13,marginTop:21,letterSpacing:-1}}>{scene.title}</div>
      <div style={{fontSize:25,color:'#ffd2a9',fontWeight:600,marginTop:17,lineHeight:1.23}}>{scene.sub}</div>
      {scene.graphic==='flow'?<Flow f={f}/>:scene.id==='valves'?<ValveDemo f={f}/>:<div style={{marginTop:31,display:'flex',flexDirection:'column',gap:17}}>
        {scene.bullets.map((b,i)=><div key={b} style={{opacity:interpolate(f,[14+i*12,28+i*12],[0,1],{extrapolateRight:'clamp'}),fontSize:22,lineHeight:1.3,color:'#d5e3ec',display:'flex',gap:12}}>
          <span style={{color:'#6ce1ed',fontWeight:900}}>•</span><span>{b}</span>
        </div>)}
      </div>}
      {scene.id==='recap'&&f>section.frames*0.64?<div style={{marginTop:22,padding:13,background:'#153a4d',borderRadius:12,fontSize:19}}>Απάντηση: <b style={{color:'#82e4d0'}}>Αριστερή κοιλία</b></div>:null}
   </div>
   <div style={{position:'absolute',left:0,top:0,right:0,height:6,background:'#15354d'}}><div style={{height:6,width:Math.min(100,progress*100)+'%',background:'#64d6e5'}}/></div>
   <div style={{position:'absolute',left:754,bottom:24,right:29,fontSize:12.5,color:'#9db1c2'}}>Πιλοτική ανασκόπηση • Εκπαιδευτικό υλικό • Όχι οδηγία θεραπείας</div>
   <div style={{position:'absolute',bottom:24,left:24,fontSize:14,color:'#bdd1db'}}>{String(index+1).padStart(2,'0')} / {String(scenes.length).padStart(2,'0')}</div>
 </AbsoluteFill>;
}
const Complete=()=> <AbsoluteFill style={{background:BG}}>
 {sections.map((section,index)=>{
   const scene=scenes.find(s=>s.id===section.id);
   return <Sequence key={section.id} from={section.startFrame} durationInFrames={section.frames} layout="none">
     <Chapter scene={scene} section={section} index={index}/>
     <Audio src={staticFile('audio/'+section.id+'.mp3')} volume={1}/>
   </Sequence>;
 })}
</AbsoluteFill>;
registerRoot(()=> <Composition id="HeartComplete" component={Complete} width={1280} height={720} fps={fps} durationInFrames={totalFrames}/>);
