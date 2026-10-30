import {ALL_TOPICS} from './protocols-data.mjs';
const requested=new URLSearchParams(location.search).get('topic');
const topic=ALL_TOPICS.find(x=>x.id===requested);
if(topic){
 const hero=document.getElementById('mentor-presence');
 const field=document.getElementById('mentor-hero-question');
 if(hero){
  const line=document.createElement('p');line.setAttribute('role','status');
  line.style.cssText='margin:14px 0;padding:11px 14px;border-radius:11px;border:1px solid #84b9c3;background:#e7f3f6;color:#153a4a;font-weight:650;';
  line.textContent='Συνδεδεμένο εκπαιδευτικό θέμα: '+topic.name+'. Η άσκηση και η ανασκόπηση ανοίγουν από το MENTOR | PROTOCOL LAB. Οι ερωτήσεις προς τον MENTOR παραμένουν περιορισμένη εκπαιδευτική καθοδήγηση.';
  hero.insertBefore(line,hero.firstChild);
 }
 if(field&&!field.value)field.value='Θέλω να μελετήσω το θέμα: '+topic.name;
}
