/* EKAB Spoudi: accessible visual recap for each SAEK chapter.
 * Purely transforms the current lesson text into a simple concept map.
 * NOT an anatomical drawing, clinical procedure diagram, or independently certified illustration.
 * Keeps source-attributed anatomical images separate in saek-reviewed-image-ui.js.
 */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
function tag(name,attrs,text){
 const node=document.createElementNS(NS,name);
 for(const [key,value] of Object.entries(attrs||{}))node.setAttribute(key,String(value));
 if(text!=null)node.textContent=text;
 return node;
}
function wrapWords(value,maxLetters,maxRows){
 const words=String(value||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);
 const lines=[];let line='';
 for(const word of words){
  const add=line?line+' '+word:word;
  if(add.length<=maxLetters){line=add;continue;}
  if(line)lines.push(line);
  line=word;
  if(lines.length===maxRows)break;
 }
 if(line&&lines.length<maxRows)lines.push(line);
 const full=words.join(' ');
 if(lines.join(' ').length<full.length&&lines.length){
  lines[lines.length-1]=lines[lines.length-1].replace(/[.,;: ]+$/,'')+'…';
 }
 return lines;
}
function lines(svg,text,x,y,maxLen,maxLines,color){
 wrapWords(text,maxLen,maxLines).forEach((line,i)=>svg.appendChild(tag('text',{
  x,y:y+i*24,fill:color,'font-size':17,'font-family':'system-ui, -apple-system, sans-serif'
 },line)));
}
function card(svg,x,heading,value,background,accent){
 svg.appendChild(tag('rect',{x,y:78,width:282,height:184,rx:16,fill:background,stroke:accent,'stroke-width':1.5}));
 svg.appendChild(tag('rect',{x:x+17,y:96,width:6,height:28,rx:3,fill:accent}));
 svg.appendChild(tag('text',{x:x+35,y:116,fill:'#173c54','font-size':20,'font-weight':700,'font-family':'system-ui, sans-serif'},heading));
 lines(svg,value,x+20,154,27,4,'#193c51');
}
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
 const svg=tag('svg',{viewBox:'0 0 960 300',role:'img','aria-label':'Τρεις ιδέες για επανάληψη: βασική θεωρία, SOS, ερώτηση αυτοελέγχου','preserveAspectRatio':'xMidYMid meet'});
 svg.appendChild(tag('title',{},'Οπτικός χάρτης επανάληψης: '+title));
 svg.appendChild(tag('rect',{x:0,y:0,width:960,height:300,rx:18,fill:'#f7fbfd'}));
 svg.appendChild(tag('text',{x:22,y:43,fill:'#153c54','font-size':23,'font-weight':700,'font-family':'system-ui, sans-serif'},'Από τη θεωρία στην επανάληψη'));
 card(svg,20,'1. Βασική ιδέα',first,'#edf6fb','#3984b3');
 card(svg,339,'2. Σημείο SOS',essential,'#fff7e9','#c88e32');
 card(svg,658,'3. Αυτοέλεγχος',ask,'#eef7f1','#4a916f');
 svg.appendChild(tag('path',{d:'M307 171 H333 M625 171 H651',fill:'none',stroke:'#628199','stroke-width':3,'stroke-linecap':'round'}));
 figure.appendChild(svg);
 const caption=document.createElement('figcaption');
 caption.textContent='Σχηματική σύνοψη από τη θεωρία, το SOS και την ερώτηση του ίδιου κεφαλαίου. Δεν είναι ανατομική εικόνα ούτε κλινικό πρωτόκολλο. Διαβάστε το πλήρες κείμενο πριν από οποιαδήποτε εφαρμογή.';
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