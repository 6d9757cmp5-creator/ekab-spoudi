/** Reusable contextual bridge to the ONE MENTOR OS from related modules. */
const filename=location.pathname.split('/').pop();
const routes={
 'farmaka.html':['pharmacy','Φαρμακολογία'],
 'seminar-prep.html':['seminars','Προετοιμασία σεμιναρίων'],
 'mentor-ecg.html':['ecg','ECG Lab'],
 'saek.html':['saek','Κατάρτιση ΣΑΕΚ'],
 'eoppep.html':['eoppep','Πιστοποίηση ΕΟΠΠΕΠ']
};
const choice=location.pathname.endsWith('/ui-tools/anatomy-3d/index.html')?['anatomy','3D Ανατομία']:routes[filename];
if(choice){
 const main=document.querySelector('main');
 if(main){
  const [topic,subject]=choice;
  const base=new URL('./',import.meta.url);
  const url=(path)=>new URL(path,base).href;
  const panel=document.createElement('section');
  panel.className='mentor-connected-study';
  panel.setAttribute('aria-label','Σύνδεση με τον MENTOR OS');
  const heading=document.createElement('h2');heading.textContent='Συνέχισε με τον MENTOR';
  const p=document.createElement('p');
  p.textContent='Το θέμα «'+subject+'» συνδέεται με το υπάρχον εργαστήριο και την ανασκόπηση MENTOR. Δεν δημιουργείται δεύτερος εκπαιδευτής ούτε επηρεάζεται η πρόοδος αυτής της ενότητας.';
  const actions=document.createElement('div');actions.className='mentor-connected-actions';
  const links=[
   ['MENTOR | LAB',url('mentor-protocol-suite.html?topic='+encodeURIComponent(topic)+'&view=lab')],
   ['MENTOR DEBRIEF',url('mentor-protocol-suite.html?topic='+encodeURIComponent(topic)+'&view=debrief')],
   ['Συζήτησε με τον MENTOR',url('mentor-lab.html?topic='+encodeURIComponent(topic)+'#mentor-presence')]
  ];
  for(const [label,target] of links){
   const a=document.createElement('a');a.href=target;a.textContent=label;actions.append(a);
  }
  panel.append(heading,p,actions);
  const style=document.createElement('style');
  style.textContent='.mentor-connected-study{margin:18px auto;padding:17px 19px;border-radius:16px;border:1px solid #9dcbd5;background:linear-gradient(130deg,#eaf5f8,#f7fbfc);color:#153648;box-sizing:border-box;max-width:1080px}.mentor-connected-study h2{font-size:1.12rem;margin:0 0 7px;color:#153648}.mentor-connected-study p{font-size:.89rem;line-height:1.5;margin:0 0 12px;color:#375567}.mentor-connected-actions{display:flex;flex-wrap:wrap;gap:8px}.mentor-connected-actions a{padding:10px 13px;border-radius:10px;background:#15546c;color:#fff;font-weight:750;font-size:.84rem;text-decoration:none;min-height:43px;display:inline-flex;align-items:center}.mentor-connected-actions a:nth-child(2){background:#fff;color:#15546c;border:1px solid #9dcbd5}.mentor-connected-actions a:nth-child(3){background:#d9ebef;color:#15445a}.mentor-connected-actions a:focus-visible{outline:3px solid #1dabc5;outline-offset:3px}@media(prefers-color-scheme:dark){.mentor-connected-study{background:#173745;color:#edf7f9;border-color:#507987}.mentor-connected-study h2{color:#edf7f9}.mentor-connected-study p{color:#c5dde4}}';
  document.head.append(style);
  const first=main.querySelector(':scope > section');
  if(first)first.insertAdjacentElement('afterend',panel);
  else main.prepend(panel);
 }
}
