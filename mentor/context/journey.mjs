/**
 * One educational journey across SAEK, EOPPEP, anatomy, pharmacy, protocols and MENTOR.
 * Public topic/heading and an allowlisted return page only; NO grades, notes, answer
 * text, account IDs, clinical records, chat, localStorage or personal information.
 * Context is visible in the URL and is never used to answer active exams.
 */
import {ALL_TOPICS} from '../../protocols-data.mjs';

const TOPICS=new Set(ALL_TOPICS.map(item=>item.id));
const SOURCES=new Set([
  'saek.html','eoppep.html','farmaka.html','seminar-prep.html',
  'mentor-ecg.html','protocols.html','mentor-live.html','ui-tools/anatomy-3d/index.html'
]);
const COURSE=/^saek-course-(?:0[1-9]|1[0-9]|20)\.html$/;
const tidy=(value,max)=>String(value??'').replace(/[\x00-\x1f\x7f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export function validTopic(id){return TOPICS.has(id)?id:'';}
export function validSource(path){return SOURCES.has(path)||COURSE.test(String(path))?path:'';}
export function safeFocus(value){return tidy(value,90);}
export function contextFromQuery(query){
  const q=query instanceof URLSearchParams?query:new URLSearchParams(String(query||'').replace(/^\?/,''));
  const topic=validTopic(q.get('topic'));
  if(!topic)return null;
  return {topic,from:validSource(q.get('from')),focus:safeFocus(q.get('focus'))};
}
export function makeJourneyUrl(page,{topic,from='',focus=''},view=''){
  if(!['mentor-lab.html','mentor-protocol-suite.html'].includes(page))return '';
  const id=validTopic(topic);
  if(!id)return '';
  const params=new URLSearchParams({topic:id});
  const source=validSource(from);
  if(source)params.set('from',source);
  const caption=safeFocus(focus);
  if(caption)params.set('focus',caption);
  if(page==='mentor-protocol-suite.html')params.set('view',view==='debrief'?'debrief':'lab');
  return page+'?'+params.toString()+(page==='mentor-lab.html'?'#mentor-presence':'');
}
export function topicForSource(from){
  const source=validSource(from);
  if(COURSE.test(source)||source==='saek.html')return 'saek';
  return {
    'eoppep.html':'eoppep','farmaka.html':'pharmacy',
    'seminar-prep.html':'seminars','mentor-ecg.html':'ecg',
    'protocols.html':'trauma','mentor-live.html':'trauma',
    'ui-tools/anatomy-3d/index.html':'anatomy'
  }[source]||'';
}
export function sourceFromPath(path){
  const raw=String(path||'');
  if(raw.endsWith('/ui-tools/anatomy-3d/index.html'))return 'ui-tools/anatomy-3d/index.html';
  return validSource(raw.split('/').pop());
}
export function journeyFromPage(path,focus=''){
  const from=sourceFromPath(path),topic=topicForSource(from);
  return topic?{topic,from,focus:safeFocus(focus)}:null;
}
export function returnPage(context){return context?validSource(context.from):'';}
