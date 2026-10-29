/**
 * MENTOR OS illustrative ECG-shape generator.
 * Artistic P–QRS–T curve ONLY. No patient data, real calibration, arrhythmia
 * detection, physiological prediction, diagnosis or clinical decisions.
 */
const MIN_BPM=45,MAX_BPM=135;
const bell=(x,center,width,height)=>height*Math.exp(-0.5*((x-center)/width)**2);
export function syntheticEcgValue(phase){
 if(!Number.isFinite(phase))throw Error('invalid-phase');
 const x=((phase%1)+1)%1;
 return bell(x,.19,.045,.16)+bell(x,.375,.015,-.22)+bell(x,.410,.011,1.10)+
   bell(x,.448,.017,-.32)+bell(x,.67,.09,.32);
}
export function createSyntheticEcg({bpm=75,seconds=4,samples=480}={}){
 if(!Number.isInteger(bpm)||bpm<MIN_BPM||bpm>MAX_BPM||
  !Number.isInteger(seconds)||seconds<2||seconds>6||
  !Number.isInteger(samples)||samples<120||samples>1200)throw Error('invalid-ecg-parameters');
 const items=Array.from({length:samples},(_,i)=>{
  const t=i/(samples-1)*seconds;
  return {t,value:syntheticEcgValue(t*bpm/60)};
 });
 return {bpm,seconds,description:'Συνθετική γραφική καμπύλη χωρίς κλινική βαθμονόμηση',
  points:items,beatsEstimated:Math.round(seconds*bpm/60)};
}
export function toSvgPoints(signal,{width=960,height=250}={}){
 if(!Array.isArray(signal?.points)||!signal.points.length||
  !Number.isFinite(width)||width<=0||width>2000||
  !Number.isFinite(height)||height<=0||height>1000)throw Error('invalid-svg-input');
 const n=signal.points.length;
 return signal.points.map((p,i)=>{
  if(!Number.isFinite(p.value))throw Error('invalid-ecg-sample');
  const x=(i/(n-1)*width).toFixed(2);
  const y=(height*.56-p.value*(height*.29)).toFixed(2);
  return x+','+y;
 }).join(' ');
}
