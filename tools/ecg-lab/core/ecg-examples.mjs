/**
 * Deterministic illustrative 12-lead ECG teaching examples.
 * These are NOT actual patients, diagnostic traces, clinical measurements,
 * or samples from PhysioNet/PTB-XL. Limb leads satisfy Einthoven/Goldberger
 * algebra by construction; chest lead shapes are stylized, NOT validated.
 */
export const ECG_EXAMPLE_CASES = Object.freeze([
  {id:'sinus72', label:'Φλεβοκομβικός ρυθμός · 72/min', rate:72,
   description:'Συνθετικό σταθερό RR με σχηματικό P–QRS–T και ενδεικτική εξέλιξη R στις προκάρδιες.'},
  {id:'brady46', label:'Φλεβοκομβική βραδυκαρδία · 46/min', rate:46,
   description:'Συνθετικός αργός, τακτικός φλεβοκομβικός ρυθμός. Δεν χρησιμοποιείται για κλινικές μετρήσεις.'},
  {id:'tachy122', label:'Φλεβοκομβική ταχυκαρδία · 122/min', rate:122,
   description:'Συνθετικός τακτικός γρήγορος ρυθμός με ενδεικτική μορφολογία P–QRS–T.'},
  {id:'af-irregular', label:'Ακανόνιστο μοτίβο τύπου ΚΜ', rate:null, pattern:'af',
   description:'Συνθετικό παράδειγμα ακανόνιστων RR χωρίς διακριτά P· όχι αυθεντική καταγραφή κολπικής μαρμαρυγής.'},
  {id:'paced64', label:'Σχηματικό κοιλιακά βηματοδοτούμενο · 64/min', rate:64, pattern:'paced',
   description:'Σχηματικές αιχμές βηματοδότη και ευρύτερα QRS. Δεν αξιολογεί σύλληψη ή λειτουργία συσκευής.'}
]);
const byId = new Map(ECG_EXAMPLE_CASES.map(item => [item.id, item]));
const LEADS = Object.freeze(['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6']);
const g = (x, center, sigma) => Math.exp(-.5 * ((x - center) / sigma) ** 2);
function eventsFor(profile) {
  const events = [];
  if (profile.pattern === 'af') {
    const intervals = [.67,.83,.51,.94,.59,.72,1.02,.58,.78,.56,.89,.71,.65,.97,.55,.74];
    let t = .40;
    for (let i=0;t < 10.5;i++) { events.push(t); t += intervals[i % intervals.length]; }
  } else {
    const period = 60 / profile.rate;
    for (let t=.42;t<10.45;t+=period) events.push(t);
  }
  return events;
}
function partsAt(t, events, profile) {
  let p=0,q=0,r=0,s=0,tw=0,spike=0;
  const paced = profile.pattern === 'paced';
  for (const at of events) {
    const x = t - at;
    if (x < -.48 || x > .55) continue;
    if (!paced && profile.pattern !== 'af') p += .16 * g(x,-.18,.032);
    if (paced) {
      q += -.22 * g(x,-.052,.024);
      r += .95 * g(x,.0,.042);
      s += -.53 * g(x,.080,.035);
      tw += -.25 * g(x,.32,.085);
      spike += .80 * g(x,-.070,.006);
    } else {
      q += -.13 * g(x,-.026,.010);
      r += 1.10 * g(x,0,.012);
      s += -.30 * g(x,.030,.014);
      tw += .28 * g(x,.255,.072);
    }
  }
  return {p,q,r,s,tw,spike};
}
function voltageFor(t, events, profile) {
  const x = partsAt(t,events,profile);
  const fibrillatory = profile.pattern === 'af'
    ? .018 * Math.sin(2 * Math.PI * 6.3 * t) + .010 * Math.sin(2 * Math.PI * 8.1 * t)
    : 0;
  const drift = .015 * Math.sin(2 * Math.PI * .18 * t);
  const I = .70*x.p + .80*x.r + .48*x.q + .70*x.s + .58*x.tw + .65*x.spike + fibrillatory + drift;
  const II = 1.06*x.p + 1.08*x.r + x.q + x.s + x.tw + .90*x.spike + fibrillatory + drift;
  return {
    I, II, III:II-I, aVR:-(I+II)/2, aVL:I-II/2, aVF:II-I/2,
    V1: .26*x.p + .12*x.r + .20*x.q + 2.1*x.s + .20*x.tw + .42*x.spike + fibrillatory,
    V2: .36*x.p + .36*x.r + .65*x.q + 1.85*x.s + .45*x.tw + .50*x.spike + fibrillatory,
    V3: .40*x.p + .75*x.r + .70*x.q + 1.25*x.s + .76*x.tw + .58*x.spike + fibrillatory,
    V4: .45*x.p + 1.26*x.r + .85*x.q + .66*x.s + .96*x.tw + .70*x.spike + fibrillatory,
    V5: .42*x.p + 1.18*x.r + .90*x.q + .37*x.s + .88*x.tw + .72*x.spike + fibrillatory,
    V6: .36*x.p + .96*x.r + .86*x.q + .32*x.s + .70*x.tw + .65*x.spike + fibrillatory
  };
}
export function createEducationalTwelveLead(id, sampleRate=200) {
  const profile = byId.get(id);
  if (!profile) throw new Error('Άγνωστο εκπαιδευτικό παράδειγμα.');
  if (!Number.isInteger(sampleRate) || sampleRate < 100 || sampleRate > 500)
    throw new Error('Μη υποστηριζόμενος ρυθμός δειγματοληψίας.');
  const events=eventsFor(profile);
  const samples=Array.from({length: sampleRate*10}, (_,i)=>{
    const data=voltageFor(i/sampleRate,events,profile);
    for(const lead of LEADS) if(!Number.isFinite(data[lead])) throw new Error('Μη πεπερασμένο δείγμα.');
    return data;
  });
  return {
    sampleRate, samples, synthetic:true,
    metadata:{id:profile.id,label:profile.label,description:profile.description,
      origin:'Deterministic educational mathematical generator; no clinical source or patient data.'}
  };
}
