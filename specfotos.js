/* ===== 🖼️ FOTOS EN LAS CARPETAS DE ESPECIFICACIONES =====
   Fotos (cámara o galería) para ilustrar lo que explica cada documento/sección de las carpetas.
   - Se guardan SOLO en este teléfono, en IndexedDB ('fto_spec_fotos'), como JPEG de máx. 1200 px (calidad 0.8).
   - Cada foto: {id, doc (archivo del documento), cap (pie de foto), ts, por (nombre del teléfono, opcional), w, h, blob}.
   - Ver: todos. Agregar / cambiar pie / borrar: solo 🦺 Super / GC (roles.js).
   - Los pies de foto entran en la búsqueda de las carpetas. Van en el respaldo de la oficina (⬇️ Exportar / ⬆️ Importar).
   - Sin red: nada se sube a ningún servidor. */
const SFDB='fto_spec_fotos';let _sfdb=null,SF=[];const SFURL={};
function sfdb(){if(_sfdb)return _sfdb;_sfdb=new Promise((ok,no)=>{if(!window.indexedDB)return no(new Error('Sin IndexedDB'));const r=indexedDB.open(SFDB,1);
 r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('fotos'))r.result.createObjectStore('fotos',{keyPath:'id'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});_sfdb.catch(()=>{_sfdb=null});return _sfdb}
function sfTx(mode,fn){return sfdb().then(db=>new Promise((ok,no)=>{const tx=db.transaction('fotos',mode),st=tx.objectStore('fotos');let res;const q=fn(st);if(q)q.onsuccess=()=>{res=q.result};
 tx.oncomplete=()=>ok(res);tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error||new Error('abort'))}))}
async function sfCargar(){try{const all=await sfTx('readonly',st=>st.getAll());SF=(all||[]).map(x=>({id:x.id,doc:x.doc,cap:x.cap||'',ts:x.ts,por:x.por||'',w:x.w,h:x.h})).sort((a,b)=>a.ts-b.ts)}catch(e){SF=[]}return SF}
function sfDe(doc){return SF.filter(x=>x.doc===doc)}
async function sfURLde(id){if(SFURL[id])return SFURL[id];const r=await sfTx('readonly',st=>st.get(id));if(!r||!r.blob)return '';return SFURL[id]=URL.createObjectURL(r.blob)}
function sfAchicar(file,max){max=max||1200;return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();
 im.onload=()=>{const s=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*s));c.height=Math.max(1,Math.round(im.naturalHeight*s));
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?ok({blob:b,w:c.width,h:c.height}):no(new Error('jpeg')),'image/jpeg',.8)};
 im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('img'))};im.src=u})}
function sfNuevoId(){return 'SF-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}
let sfOcupado=false;
async function sfElegido(inp){const f=inp.files&&inp.files[0];inp.value='';if(!f)return;if(!exigeSuper())return;if(sfOcupado)return;sfOcupado=true;
 const doc=$('sfotos')&&$('sfotos').dataset.doc,cap=($('sfCap')&&$('sfCap').value||'').trim();
 try{const r=await sfAchicar(f,1200);let por='';try{por=localStorage.getItem('fto_nombre')||''}catch(e){}
  await sfTx('readwrite',st=>st.put({id:sfNuevoId(),doc,cap,ts:Date.now(),por,w:r.w,h:r.h,blob:r.blob}));await sfCargar();toast('Foto agregada');render()}
 catch(e){alert('No se pudo guardar la foto en este teléfono.')}finally{sfOcupado=false}}
async function sfBorrar(id){if(!exigeSuper())return;if(!confirm('¿Borrar esta foto de este teléfono?'))return;
 try{await sfTx('readwrite',st=>st.delete(id));if(SFURL[id]){URL.revokeObjectURL(SFURL[id]);delete SFURL[id]}await sfCargar();sfCerrar();toast('Foto borrada');render()}catch(e){alert('No se pudo borrar.')}}
async function sfPie(id){if(!exigeSuper())return;const f=SF.find(x=>x.id===id);if(!f)return;const n=prompt('Pie de foto (qué muestra):',f.cap||'');if(n==null)return;
 const r=await sfTx('readonly',st=>st.get(id));if(!r)return;r.cap=n.trim();await sfTx('readwrite',st=>st.put(r));await sfCargar();sfCerrar();render();sfVer(id)}
function sfHTML(doc){const fs=sfDe(doc),sup=esSuper();
 return `<div class="card" id="sfotos" data-doc="${esc(doc)}"><h3>🖼️ Fotos de esta sección (${fs.length})</h3>
 ${fs.length?`<div class="sfgrid">${fs.map(f=>`<figure class="sfit" data-id="${esc(f.id)}" onclick="sfVer('${esc(f.id)}')"><img data-sf="${esc(f.id)}" alt="${esc(f.cap||'foto')}"><figcaption data-noi18n>${esc(f.cap||'')}</figcaption></figure>`).join('')}</div>`:'<div class="mut" id="sfVacio">Todavía no hay fotos en esta sección.</div>'}
 ${sup?`<div id="sfAdd"><label for="sfCap">Pie de foto (qué muestra)</label><input id="sfCap" autocomplete="off" placeholder="Ej: separación de tornillos en la orilla">
  <div class="row" style="margin-top:8px"><label class="btn" id="sfBtnCam" style="margin:0">📷 Cámara<input type="file" id="sfCam" accept="image/*" capture="environment" class="hidden" onchange="sfElegido(this)"></label><label class="btn sec" id="sfBtnGal" style="margin:0">🖼️ Galería<input type="file" id="sfGal" accept="image/*" class="hidden" onchange="sfElegido(this)"></label></div></div>`
  :`<div class="rolaviso" id="sfSoloVer"><b>🔒 Solo Super o GC pueden agregar o borrar fotos</b><button class="sec" onclick="irRol()">🔒 Entrar como Super/GC</button></div>`}
 <div class="mut" style="margin-top:8px">Las fotos se guardan solo en este teléfono (no se suben a ningún servidor) y van en el respaldo de la oficina.</div></div>`}
async function sfLlenar(){for(const im of document.querySelectorAll('img[data-sf]')){if(im.src)continue;try{const u=await sfURLde(im.dataset.sf);if(u)im.src=u}catch(e){}}}
async function sfVer(id){const f=SF.find(x=>x.id===id);if(!f)return;sfCerrar();const sup=esSuper();
 const d=document.createElement('div');d.id='sfVisor';d.className='sfvisor';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
 d.innerHTML=`<div class="sfin"><img id="sfGrande" alt="${esc(f.cap||'foto')}"><div class="sfcap" data-noi18n>${esc(f.cap||'')}</div><div class="mut" data-noi18n>${esc(fechaTxt(new Date(f.ts)))}${f.por?' · '+esc(f.por):''}</div>
 <div class="row" style="margin-top:10px">${sup?`<button class="sec sm" id="sfBtnPie" onclick="sfPie('${esc(id)}')">✏️ Cambiar pie</button><button class="red sm" id="sfBtnBorrar" onclick="sfBorrar('${esc(id)}')">🗑️ Borrar foto</button>`:''}<button class="sm" id="sfBtnCerrar" onclick="sfCerrar()">✕ Cerrar</button></div></div>`;
 d.addEventListener('click',e=>{if(e.target===d)sfCerrar()});document.body.appendChild(d);try{$('sfGrande').src=await sfURLde(id)}catch(e){}}
function sfCerrar(){const d=$('sfVisor');if(d)d.remove()}
/* respaldo */
function blobAData(b){return new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(fr.result);fr.onerror=no;fr.readAsDataURL(b)})}
async function sfRespaldo(){try{const all=await sfTx('readonly',st=>st.getAll())||[];const o=[];for(const x of all){o.push({id:x.id,doc:x.doc,cap:x.cap||'',ts:x.ts,por:x.por||'',w:x.w,h:x.h,data:x.blob?await blobAData(x.blob):''})}return o}catch(e){return []}}
async function sfRestaurar(arr){let n=0;for(const x of (arr||[])){if(!x||!x.id||!x.doc||!/^data:image\//.test(x.data||''))continue;const b=await (await fetch(x.data)).blob();
 await sfTx('readwrite',st=>st.put({id:x.id,doc:x.doc,cap:x.cap||'',ts:x.ts||Date.now(),por:x.por||'',w:x.w,h:x.h,blob:b}));n++}await sfCargar();return n}
document.addEventListener('keydown',e=>{if(e.key==='Escape')sfCerrar()});
