const CACHE='ekab-spoudi-v27.1.128-study-materials-only-20261102';
// Offline content: lessons, question bank, answers, exam topics and essential reader code.
// Classroom pictures are cached on first view, not downloaded in bulk.
const ASSETS=["./eoppep.html","./eoppep-hub.css","./eoppep-hub.js","./saek.html","./saek-hub.js","./saek-hub.css","./saek-exams.html","./saek-exams-bank.json","./saek-exams.css","./saek-exam-engine.js","./saek-exams.js","./saek-images.html","./saek-images.js","./saek-images.css","./saek-image-audit-2026.json","./saek-reader-safe.js","./saek-visual-ui.js","./saek-visual-ui.css","./saek-reviewed-image-ui.js","./saek-physiology-maps.js","./saek-learning-maps.js","./saek-course-series.css","./saek-course-series.js","./saek-search-A.json","./saek-search-B.json","./saek-search-C.json","./saek-search-D.json","./eoppep-sos.json","./eoppep-source.pdf","./ai-grading.css","./ai-grading-client.js","./ai-grading-config.js","./study-scheduler.js","./sources-ui.css?v=27.1.73","./sources-ui.js?v=27.1.73","./eoppep-page-17.webp","./eoppep-page-18.webp","./icon.svg","./saek-skeleton.svg","./saek-organs.svg","./saek-circulation.svg","./written_exam.html","./old_type_written.js","./old_type_written.json","./practical_exam.html","./practical-exam.css","./practical-exam.js","./saek-videos.js","./saek-video-player.js","./global-tools.css","./global-tools.js","./ekab-first-run.js","./version.json","./manifest.webmanifest","./saek-course-01.html","./saek-course-02.html","./saek-course-03.html","./saek-course-04.html","./saek-course-05.html","./saek-course-06.html","./saek-course-07.html","./saek-course-08.html","./saek-course-09.html","./saek-course-10.html","./saek-course-11.html","./saek-course-12.html","./saek-course-13.html","./saek-course-14.html","./saek-course-15.html","./saek-course-16.html","./saek-course-17.html","./saek-course-18.html","./saek-course-19.html","./saek-course-20.html"];
const CORE=['./index.html','./theory.html','./home.css','./styles.css','./app.js','./progress.js','./updates.js','./theme-init.js','./version.json','./manifest.webmanifest','./saek.html','./official_questions.json'];
const STUDY_PATHS=new Set([...CORE,...ASSETS].map(asset=>new URL(asset,self.registration.scope).pathname));
const STUDY_IMAGE=/\/(?:assets\/education\/[^/]+|saek-[^/]+|eoppep-page-\d+)\.(?:svg|png|webp|jpe?g)$/i;
const isStudyImage=url=>STUDY_IMAGE.test(url.pathname);
const isStudyUrl=url=>STUDY_PATHS.has(url.pathname)||isStudyImage(url);
const MAX_VIEWED_IMAGES=90;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 // Missing optional media cannot prevent a new service worker from installing.
 await Promise.allSettled([...new Set([...CORE,...ASSETS])].map(x=>cache.add(new Request(x,{cache:'reload'}))));
 await self.skipWaiting();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if((name.startsWith('ekab-eoppep-official-')||name.startsWith('ekab-spoudi-v'))&&name!==CACHE)await caches.delete(name);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 // Leave all non-study tools online-only. Do not cache clinical simulators, videos or 3D engines.
 if(!isStudyUrl(url))return;
 if(url.pathname.endsWith('/oauth-callback.html')||url.searchParams.has('secret')||url.searchParams.has('userId'))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const resp=await fetch(req,{cache:'no-cache'});
   if(resp.ok&&(url.protocol==='https:'||url.hostname==='localhost'||url.hostname==='127.0.0.1')&&req.cache!=='no-store'){
    cache.put(req,resp.clone()).then(async()=>{
     if(!isStudyImage(url))return;
     const images=(await cache.keys()).filter(r=>isStudyImage(new URL(r.url)));
     await Promise.all(images.slice(0,Math.max(0,images.length-MAX_VIEWED_IMAGES)).map(r=>cache.delete(r)));
    }).catch(()=>{});
   }
   return resp;
  }catch(e){
   const old=await cache.match(req,{ignoreSearch:true});
   if(old)return old;
   return Response.error();
  }
 })());
});
