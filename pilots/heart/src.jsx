import React from 'react';
import {AbsoluteFill,Composition,Img,registerRoot,staticFile,useCurrentFrame,interpolate} from 'remotion';
const FONT='"Arial", "DejaVu Sans", sans-serif';
const BG='#061221';
const entries=[
  {at:0,kicker:'ΣΑΕΚ ΕΚΑΒ · Α΄ ΕΞΑΜΗΝΟ',title:'ΑΝΑΤΟΜΙΑ',subtitle:'Η καρδιά στον θώρακα',text:'Πρώτο οπτικό κεφάλαιο · πραγματικό τρισδιάστατο ανατομικό μοντέλο'},
  {at:105,kicker:'ΚΕΦΑΛΑΙΟ 01',title:'ΠΟΥ ΒΡΙΣΚΕΤΑΙ;',subtitle:'Μέσο μεσοθωράκιο',text:'Πίσω από το στέρνο · πάνω από το διάφραγμα'},
  {at:220,kicker:'ΠΑΡΑΤΗΡΗΣΕ ΣΤΟ 3D',title:'ΚΑΡΔΙΑ ΚΑΙ ΠΝΕΥΜΟΝΕΣ',subtitle:'Ανατομική σχέση',text:'Το μεγαλύτερο μέρος της καρδιάς βρίσκεται αριστερά της μέσης γραμμής.'},
  {at:325,kicker:'ΤΙ ΘΥΜΑΣΑΙ;',title:'Η ΘΕΣΗ ΤΗΣ ΚΑΡΔΙΑΣ',subtitle:'Μία ερώτηση',text:'Ποια ανατομική δομή βρίσκεται μπροστά από την καρδιά;'}
];
const Heart=()=>{
 const f=useCurrentFrame();
 const frameIdx=Math.floor((f%144)/2.4);
 const index=Math.max(1,Math.min(60,frameIdx+1));
 const active=[...entries].reverse().find(s=>f>=s.at)||entries[0];
 const titleOpacity=interpolate(f-active.at,[0,10,22],[0,1,1],{extrapolateRight:'clamp'});
 return <AbsoluteFill style={{backgroundColor:BG,color:'#f1f7fc',fontFamily:FONT,overflow:'hidden'}}>
  <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 25% 52%, #17364b 0%, #071424 64%, #061221 100%)'}}/>
  <div style={{position:'absolute',left:0,top:0,width:720,height:720,overflow:'hidden',borderRight:'1px solid #31516c'}}>
   <Img src={staticFile('render/frame_'+String(index).padStart(4,'0')+'.png')} style={{width:720,height:720,objectFit:'cover'}}/>
   <div style={{position:'absolute',bottom:35,left:28,right:28,fontSize:16,color:'#bdceda',background:'#071827b0',padding:'14px 18px',borderRadius:9}}>
    HRA v1.2 • πραγματικά 3D μοντέλα • όχι φυσιολογική προσομοίωση
   </div>
  </div>
  <div style={{position:'absolute',left:752,right:48,top:68,opacity:titleOpacity}}>
   <div style={{fontSize:18,letterSpacing:2,color:'#6bd5e6',fontWeight:700}}>{active.kicker}</div>
   <div style={{marginTop:28,fontSize:53,fontWeight:800,lineHeight:1.07,letterSpacing:-1.5}}>{active.title}</div>
   <div style={{fontSize:29,color:'#ffcfab',marginTop:25,fontWeight:650}}>{active.subtitle}</div>
   <div style={{fontSize:24,color:'#c8d6e2',lineHeight:1.5,marginTop:31}}>{active.text}</div>
  </div>
  <div style={{position:'absolute',top:0,left:0,right:0,height:7,background:'#153c54'}}>
    <div style={{height:'100%',width:(100*f/432)+'%',background:'#59cddc'}}/>
  </div>
  <div style={{position:'absolute',bottom:26,left:756,fontSize:17,color:'#9daebb'}}>ΠΙΛΟΤΙΚΗ ΠΡΟΕΠΙΣΚΟΠΗΣΗ · ΧΩΡΙΣ ΔΗΜΟΣΙΕΥΣΗ</div>
  <div style={{position:'absolute',bottom:26,right:39,fontSize:17,color:'#aac9dc'}}>00:{String(Math.floor(f/24)).padStart(2,'0')}</div>
 </AbsoluteFill>
};
const Root=()=> <Composition id="HeartAnatomyPilot" component={Heart} durationInFrames={432} fps={24} width={1280} height={720}/>;
registerRoot(Root);
