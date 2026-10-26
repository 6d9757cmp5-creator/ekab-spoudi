/* Optional recap of the existing lesson, separate from anatomical source images. */
(function(){
'use strict';
function makeVisual(lesson){
 const body=lesson.querySelector('.reader-main')||lesson.querySelector('.body');
 const intro=body&&body.querySelector('p.reader-paragraph');
 const sos=body&&body.querySelector('p.lesson-sos');
 const question=body&&body.querySelector('p.check-question');
 const heading=lesson.querySelector('.chapter-heading');
 if(!body||!intro||!sos||!question||!heading)return false;
 if(lesson.querySelector('.saek-recap-map'))return true;
 const title=Array.from(heading.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
 const first=(intro.textContent||'').trim().split(/(?<=[.!;;])\s+/)[0]||intro.textContent;
 const essential=(sos.textContent||'').replace(/^\s*SOS\s*·\s*/,'').trim();
 const ask=(question.textContent||'').trim();
 if(!title||!first||!essential||!ask)return false;
 const details=document.createElement('details');
 details.className='saek-recap-map';
 const summary=document.createElement('summary');
 summary.textContent='Οπτικός χάρτης επανάληψης · '+title;
 details.appendChild(summary);
 const figure=document.createElement('figure');
 figure.className='saek-recap-figure';
 const cards=document.createElement('ol');
 cards.className='saek-recap-cards';
 cards.setAttribute('aria-label','Βασική ιδέα, σημείο SOS και αυτοέλεγχος');
 [['Βασική ιδέα',first],['Σημείο SOS',essential],['Αυτοέλεγχος',ask]].forEach(([label,value],index)=>{
  const card=document.createElement('li');
  card.className='saek-recap-card';
  const heading=document.createElement('h4');
  heading.textContent=(index+1)+'. '+label;
  const paragraph=document.createElement('p');
  paragraph.textContent=value;
  card.append(heading,paragraph);
  cards.appendChild(card);
 });
 figure.appendChild(cards);
 const caption=document.createElement('figcaption');
 caption.textContent='Προαιρετική σύνοψη του κεφαλαίου για επανάληψη.';
 figure.appendChild(caption);
 details.appendChild(figure);
 intro.insertAdjacentElement('afterend',details);
 return true;
}
function start(){
 if(!/saek-course-\d{2}\.html$/.test(location.pathname))return;
 document.querySelectorAll('details.reader-fold[id^="lesson-"]').forEach(makeVisual);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
