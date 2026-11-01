import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const nav=read('navigation.js'),home=read('index.html'),sim=read('mentor-next.html'),lab=read('mentor-lab.html'),catalog=read('tools.html');
for(const target of ['index.html','saek.html','eoppep.html','mentor-next.html','tools.html'])assert(nav.includes("'"+target+"'"),'missing global navigation: '+target);
for(const label of ['Αρχική','ΣΑΕΚ','ΕΟΠΠΕΠ','Αποστολές','Εργαλεία'])assert(nav.includes(label));
assert(nav.includes("getElementById('ekab-global-nav')"),'navigation must not duplicate');
assert(home.includes('href="tools.html"')&&home.includes('href="mentor-next.html"'));
assert(!home.includes('href="farmaka.html"')&&!home.includes('href="seminar-prep.html"'),'auxiliary tools belong to tools hub');
for(const p of ['farmaka.html','seminar-prep.html','saek-images.html','protocols.html','mentor-next.html','mentor-lab.html','ui-tools/anatomy-3d/index.html'])assert(existsSync(p),'missing linked tool '+p);
assert(sim.includes('src="tools/patient-simulator/app/next-sim.mjs"'),'simulator remains independent');
assert(sim.includes('src="mentor/presence/presence.mjs"'),'mentor is an optional companion');
assert(catalog.includes('Προσομοιωτής Ασθενών')&&catalog.includes('MENTOR OS')&&catalog.includes('Εργαστήριο ΗΚΓ'));
assert(read('mentor-ecg.js').includes('tools/ecg-lab/app/ecg.js'));
assert(read('mentor-ecg.html').includes('Εργαστήριο ΗΚΓ'));

assert(read('sw.js').includes('./tools.html'));

const protocols=read('protocols.html'),review=read('mentor-protocol-suite.mjs'),homeText=read('index.html');
assert(!homeText.includes('MENTOR PROTOCOL LAB'),'protocol card must use its own name');
assert(sim.includes('ΠΡΟΣΟΜΟΙΩΤΗΣ ΑΣΘΕΝΩΝ · WEBGL 3D'));
assert(!sim.includes('MENTOR NEXT · WEBGL 3D'),'simulator must not be branded as MENTOR');
assert(protocols.includes('Εργαστήριο Πρωτοκόλλων'));
assert(review.includes('Ανασκόπηση Πρωτοκόλλου'));
assert(read('mentor-lab.html').includes('Ψηφιακός εκπαιδευτής'));
assert(read('tools/patient-simulator/core/next-sim.mjs').includes("ekab.mentor.next-v1"),'legacy progress key retained');
console.log('PASS: unified navigation, tool ownership, stable URLs and links');
