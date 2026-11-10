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

/** Additional schematic rhythm cases for the ECG recognition trainer; not clinical waveforms. */
const gaussian = (time, center, width) => Math.exp(-((time - center) ** 2) / (2 * width ** 2));

function beat(t, { p = true, wide = false, polarity = 1 } = {}) {
  if (t < -.30 || t > .44) return 0;
  const atrial = p ? .14 * gaussian(t, -.17, .029) : 0;
  if (wide) {
    return polarity * (1.03 * gaussian(t, -.02, .033) - .61 * gaussian(t, .064, .036)
      - .24 * gaussian(t, .22, .055));
  }
  return atrial - .13 * gaussian(t, -.023, .008) + 1.12 * gaussian(t, 0, .011)
    - .27 * gaussian(t, .025, .011) + .29 * gaussian(t, .235, .055);
}

function regular(rate, options) {
  const period = 60 / rate;
  return time => {
    const phase = ((time % period) + period) % period;
    return beat(phase, options) + beat(phase - period, options) + beat(phase + period, options);
  };
}

function irregular(intervals, options, earlyBeat = -1) {
  const starts = [];
  let length = 0;
  for (const interval of intervals) {
    starts.push(length);
    length += interval;
  }
  return time => {
    const phase = ((time % length) + length) % length;
    return starts.reduce((voltage, start, index) => {
      const offset = phase - start;
      const shape = index === earlyBeat ? { p: false, wide: true, polarity: -1 } : options;
      return voltage + beat(offset, shape) + beat(offset - length, shape) + beat(offset + length, shape);
    }, 0);
  };
}

const flutterQrs = regular(150, { p: false });
const afQrs = irregular([.61, .82, .52, .7, .99, .48, .77, .58, .89, .64, .55, .93, .71, .49, .81, .6, 1.03, .57], { p: false });
const sinus = regular(76);

const rhythms = [
  ['sinus', 'Φλεβοκομβικός ρυθμός', 'Σταθερά RR και κύμα P πριν από κάθε στενό QRS.', sinus],
  ['brady', 'Φλεβοκομβική βραδυκαρδία', 'Φλεβοκομβική μορφολογία με κανονικά και αραιά QRS.', regular(44)],
  ['tachy', 'Φλεβοκομβική ταχυκαρδία', 'Γρήγορος κανονικός ρυθμός με ορατό P πριν από κάθε QRS.', regular(118)],
  ['af', 'Κολπική μαρμαρυγή', 'Ακανόνιστα RR χωρίς διακριτά κύματα P.', t => afQrs(t) + .025 * Math.sin(45 * t) + .019 * Math.sin(58 * t)],
  ['flutter', 'Κολπικός πτερυγισμός 2:1', 'Τακτικά στενά QRS και επαναλαμβανόμενα πριονωτά κύματα F.', t => flutterQrs(t) + .19 * ((t * 5 + .25) % 1 - .5)],
  ['svt', 'Τακτική υπερκοιλιακή ταχυκαρδία', 'Πολύ γρήγορα, τακτικά και στενά QRS. Σε αυτό το παράδειγμα τα P δεν διακρίνονται.', regular(185, { p: false })],
  ['pvc', 'Κοιλιακή έκτακτη συστολή', 'Πρόωρο ευρύ σύμπλεγμα διαφορετικής μορφολογίας με παύση πριν από την επόμενη φλεβοκομβική συστολή.', irregular([.8, .8, .51, 1.09, .8, .8], {}, 3)],
  ['vt', 'Μονόμορφη κοιλιακή ταχυκαρδία', 'Τακτικά, γρήγορα και ευρέα συμπλέγματα ίδιας μορφής. Ο σφυγμός χρειάζεται χωριστή αξιολόγηση.', regular(169, { p: false, wide: true })],
  ['vf', 'Κοιλιακή μαρμαρυγή', 'Χαοτικές διακυμάνσεις χωρίς αναγνωρίσιμα οργανωμένα QRS.', t => .4 * Math.sin(24 * t + 1.2 * Math.sin(3.1 * t)) + .22 * Math.sin(37.7 * t) + .13 * Math.sin(49.1 * t)],
  ['asystole', 'Ασυστολία', 'Απουσία αναγνωρίσιμης κοιλιακής δραστηριότητας σε αυτή τη λωρίδα. Έλεγξε και τη σύνδεση, την ενίσχυση και άλλη απαγωγή.', t => .008 * Math.sin(4 * t)],
  ['artifact', 'Τεχνικό παράσιτο πάνω σε φλεβοκομβικό ρυθμό', 'Οι αιχμές και η μετατόπιση της γραμμής βάσης συνυπάρχουν με οργανωμένα QRS που συνεχίζουν στον ίδιο ρυθμό.', t => sinus(t) + (.22 + .17 * Math.sin(3.4 * t)) * Math.sin(91 * t) + .18 * Math.sin(5 * t)]
].map(([id, label, explanation, sample]) => ({ id, label, explanation, sample }));
export const educationalRhythmCases = Object.freeze(rhythms);
