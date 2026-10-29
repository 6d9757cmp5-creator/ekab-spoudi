/* Illustrative ECG shape study. Local math only. Never accepts patient input or interprets ECGs. */
import {createSyntheticEcg,toSvgPoints} from './mentor/core/ecg-synthetic.mjs';
const $=id=>document.getElementById(id);
function render(){
 const bpm=Number($('ecg-rate').value);
 const signal=createSyntheticEcg({bpm,seconds:4,samples:720});
 $('ecg-curve').setAttribute('points',toSvgPoints(signal));
 $('ecg-rate-out').textContent=bpm+' /λεπτό';
 $('ecg-rate').setAttribute('aria-valuetext','Σχηματικός ρυθμός '+bpm+' επαναλήψεις ανά λεπτό, όχι πραγματική μέτρηση');
 $('ecg-caption').textContent='Συνθετικό παράδειγμα τεσσάρων δευτερολέπτων με περίπου '+signal.beatsEstimated+' επαναλήψεις της τεχνητής καμπύλης. Καμία κλινική μέτρηση ή διάγνωση.';
}
$('ecg-rate').addEventListener('input',render);
for(const btn of document.querySelectorAll('[data-ecg-rate]')){
 btn.addEventListener('click',()=>{$('ecg-rate').value=btn.dataset.ecgRate;render();});
}
$('ecg-toggle-key').addEventListener('click',()=>{
 const next=$('ecg-key').hidden;
 $('ecg-key').hidden=!next;
 $('ecg-toggle-key').setAttribute('aria-expanded',String(next));
});
render();
