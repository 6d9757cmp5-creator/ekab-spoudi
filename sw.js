const CACHE='ekab-eoppep-official-v19';
const ASSETS=['./','./index.html','./styles.css','./app.js','./official_questions.json','./eoppep-source.pdf','./eoppep-page-17.webp','./eoppep-page-18.webp','./practical_exam.html','./saek.html','./study_map.html','./farmaka.html','./supplementary_practice.html','./supplementary_exercises.json','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(response=>{if(response.ok){let copy=response.clone();caches.open(CACHE).then(cache=>cache.put(e.request,copy))}return response}).catch(()=>caches.match(e.request)))});
