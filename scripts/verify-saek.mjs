// Έλεγχος στατικής πληρότητας ΣΑΕΚ: δεν πιστοποιεί την επιστημονική ορθότητα.
import {readFileSync} from 'node:fs';

const expected=[14,13,10,10,14,10,11,11,11,17,11,12,11,14,13,13,13,13,13,13];
const checks=[];
const fail=(message)=>checks.push(message);
const get=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const groups={A:0,B:0,C:0,D:0};
let total=0;
for(let i=1;i<=20;i++){
 const num=String(i).padStart(2,'0'),file='saek-course-'+num+'.html',html=get(file);
 const sections=html.split(/(?=<details class="fold reader-fold" id="lesson-\d+">)/).slice(1);
 if(sections.length!==expected[i-1])fail(file+': κεφάλαια '+sections.length+'/'+expected[i-1]);
 if(!html.includes('class="reader-chapters"'))fail(file+': λείπει ο αναγνώστης κεφαλαίων');
 if((html.match(/Only one chapter is displayed at a time/g)||[]).length!==1)fail(file+': λείπει ο ενιαίος αναγνώστης ενός κεφαλαίου');
 for(let j=0;j<sections.length;j++){
  const section=sections[j];
  const match=section.match(/^<details class="fold reader-fold" id="lesson-(\d+)">/);
  if(!match||Number(match[1])!==j+1)fail(file+': λανθασμένη αρίθμηση κεφαλαίου '+(j+1));
  for(const marker of ['class="lesson-sos"','class="lesson-more"','class="knowledge-check"','class="check-question"','class="check-answer"','class="small muted chapter-source-note"','data-lesson="'+(j+1)+'"']){
   if(!section.includes(marker))fail(file+', κεφάλαιο '+(j+1)+': λείπει '+marker);
  }
  if(!section.includes('https://www.ekab.gr/files/2024/10/'))fail(file+', κεφάλαιο '+(j+1)+': χωρίς επιβεβαιωμένο σύνδεσμο Οδηγού');
  // έλεγχος ενιαίας σειράς: θεωρία → αυτοέλεγχος → ολοκλήρωση
  if(section.indexOf('<details class="lesson-more"')>section.indexOf('<details class="knowledge-check"'))fail(file+', κεφάλαιο '+(j+1)+': η θεωρία εμφανίζεται μετά τον αυτοέλεγχο');
  const plain=section.replace(/<p class="small muted chapter-source-note">[\s\S]*?<\/p>/g,'').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/g,' ').trim().replace(/\s+/g,' ');
  const words=plain?plain.split(' ').length:0;
  if(words<170)fail(file+', κεφάλαιο '+(j+1)+': μόνο '+words+' λέξεις (κάτω από ενδεικτικό κατώφλι 170)');
 }
 total+=sections.length;
 groups[i<=6?'A':i<=12?'B':i<=16?'C':'D']+=sections.length;
}
for(const [key,value] of Object.entries({A:71,B:73,C:51,D:52}))if(groups[key]!==value)fail('Εξάμηνο '+key+': '+groups[key]+'/'+value);
if(total!==247)fail('Συνολικά κεφάλαια: '+total+'/247');
const version=JSON.parse(get('version.json')).version;
if(!get('README.md').includes('Έκδοση v'+version))fail('Η έκδοση README δεν συμφωνεί με version.json ('+version+')');
if(!get('updates.js').includes("CURRENT='"+version+"'"))fail('Η έκδοση updates.js δεν συμφωνεί με version.json');
const sw=get('sw.js');
if(!sw.includes('ekab-spoudi-v'+version))fail('Η έκδοση cache sw.js δεν συμφωνεί με version.json');
for(let i=1;i<=20;i++)if(!sw.includes('saek-course-'+String(i).padStart(2,'0')+'.html'))fail('Ο service worker δεν προαποθηκεύει το μάθημα '+i);
if(checks.length){console.error('❌ ΣΑΕΚ: '+checks.length+' προβλήματα\n'+checks.join('\n'));process.exitCode=1;}
else console.log('✅ ΣΑΕΚ: 20/20 μαθήματα · 247/247 κεφάλαια · Α 71, Β 73, Γ 51, Δ 52 · κοινή δομή, SOS, αυτοέλεγχος, πηγές και offline cache · έκδοση '+version+'.\nΗ κλινική εγκυρότητα απαιτεί ανεξάρτητη επαλήθευση από ειδικό.');
