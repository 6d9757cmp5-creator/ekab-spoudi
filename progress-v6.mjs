import { canonicalLearnerProfile } from './atla/student/profile.mjs';
const profile=canonicalLearnerProfile(window.localStorage,{scheduler:window.EkabStudyScheduler||null});
const stats=profile.stats;
const integer=n=>new Intl.NumberFormat('el-GR').format(Math.max(0,Math.trunc(Number(n)||0)));
const pct=(n,total)=>Math.max(0,Math.min(100,total?Number(n)/total*100:0));
for(const [number,bar,value,total] of [
 ['saekRead','saekBar',stats.saek.read,stats.saek.readTotal],
 ['eopRead','eopReadBar',stats.eoppep.read,stats.eoppep.readTotal],
 ['saekAttempted','saekAttemptedBar',stats.saek.attempted,stats.saek.readTotal],
 ['eopAttempted','eopAttemptedBar',stats.eoppep.attempted,stats.eoppep.readTotal]
]){
 document.getElementById(number).textContent=`${integer(value)} / ${integer(total)}`;
 document.getElementById(bar).style.setProperty('--pct',`${pct(value,total)}%`);
}
const active=stats.saek.read+stats.saek.attempted+stats.eoppep.read+stats.eoppep.attempted>0;
const pick=profile.recommendation;
const title=document.getElementById('nextTitle');
const description=document.getElementById('nextDescription');
const link=document.getElementById('nextLink');
if(active){
 title.textContent=pick.label;
 description.textContent=pick.source==='due-review'?'Έχεις επανάληψη ΕΟΠΠΕΠ που εκκρεμεί.':
  pick.source==='resume'?'Συνέχισε από το τελευταίο σου σημείο.':
  pick.source==='historical-errors'?'Υπάρχουν ερωτήσεις ΣΑΕΚ για επανάληψη.':'Προτεινόμενο επόμενο βήμα από την καταγεγραμμένη πρόοδό σου.';
 link.href=pick.href;
 link.textContent='Άνοιγμα →';
}else{
 title.textContent='Διάλεξε τι θέλεις να μελετήσεις';
 description.textContent='Δεν υπάρχει ακόμη καταγεγραμμένη πρόοδος ΣΑΕΚ ή ΕΟΠΠΕΠ σε αυτή τη συσκευή.';
 link.href='study.html';
 link.textContent='Άνοιγμα Μελέτης →';
}
