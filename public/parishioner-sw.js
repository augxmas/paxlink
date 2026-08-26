const CACHE_NAME="paxlink-parishioner-v14";
const APP_SHELL=[
  "/parishioner/",
  "/parishioner/parishioner.css?v=20260817-3",
  "/assets/parishioner.js?v=20260825-124",
  "/assets/paxlink-pwa-192.png",
  "/assets/paxlink-pwa-512.png",
  "/parishioner/manifest.webmanifest?v=2",
  "/parishioner/offline.html"
];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).catch(()=>caches.match("/parishioner/offline.html")));
    return;
  }
  if(!url.pathname.startsWith("/assets/")&&!url.pathname.startsWith("/parishioner/"))return;
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response})));
});
