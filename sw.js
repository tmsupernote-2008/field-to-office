const C='fto-v11';const F=['./','index.html','i18n.js','i18n_dic.js','specs.js','specfotos.js','roles.js','marcas.js','guia.js','voz.js','manifest.json','tema.js','icon.svg','icon-192.png','icon-512.png'];
/* 🌐 traducciones de las carpetas: NO se bajan al instalar; se guardan en el cache la primera vez que se escoge ese idioma
   (después funcionan sin red). */
const L=['specs_en.js','specs_pt.js','specs_ht.js','specs_fr.js','specs_ru.js','specs_uk.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 const u=new URL(e.request.url),lazy=L.some(f=>u.pathname.endsWith('/'+f));
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(lazy?u.pathname:e.request,cp))}return r}).catch(()=>caches.match(lazy?u.pathname:e.request,{ignoreSearch:true})))});
