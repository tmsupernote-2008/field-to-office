/* ===== 📸 MARCAR REPARACIONES (cámara + puntos de colores) =====
   Límite honesto del navegador: una PWA no puede "anclar" puntos en la pared como un AR real
   (WebXR no existe en Safari de iPhone). Lo que sí funciona en Android y iPhone:
   - Cámara en vivo (getUserMedia, cámara trasera). MARCAR: el primer toque congela la imagen y cada toque pone un punto
     de color (uno por tipo de reparación). "Guardar vista" guarda esa imagen (JPEG ~1280 px) con los puntos en
     coordenadas normalizadas (x,y de 0 a 1).
   - VER: la cámara en vivo con la foto guardada encima, transparente ("foto guía"), y los puntos dibujados encima:
     el usuario mueve el teléfono hasta que la foto guía coincida con la pared y ve dónde va cada reparación.
   - GUIAR CON FLECHAS (guia.js): al marcar se guarda hacia dónde apuntaba el teléfono (sensores) y al ver se muestran
     flechas aproximadas hacia cada marca y un anillo que late cuando está a la vista (no es AR de verdad).
   Datos: lista de vistas en localStorage (igual que el resto de la app); fotos en IndexedDB.
   Este archivo se carga antes del script principal; solo usa funciones del principal cuando se llaman (no al cargar). */
const LSCAP='fto_capturas_v1', LSTREP='fto_tipos_rep_v1', LSSEQ='fto_seq_marcas_v1', LSMCFG='fto_marcas_cfg_v1';
const TREP_DEF=[
 {id:'parche',nombre:'Parche drywall',color:'#ff3b30',quien:'Drywall (nosotros): parche y acabado'},
 {id:'elec',nombre:'Electricista (alrededor de enchufes/luces)',color:'#ffd60a',quien:'Parche por trabajo del electricista: cajas, enchufes y luces'},
 {id:'plom',nombre:'Plomero',color:'#0a84ff',quien:'Parche por trabajo del plomero: tubos y válvulas'},
 {id:'fire',nombre:'Fire sprinkler',color:'#ff2d95',quien:'Parche por el contratista de fire sprinkler: cabezas y tubería'},
 {id:'bead',nombre:'Esquina/bead',color:'#30d158',quien:'Drywall: esquinero / corner bead dañado'},
 {id:'otro',nombre:'Otro',color:'#bf5af2',quien:'Otra reparación (escribe el detalle en Área / nota)'}];
const AGRUPAR={vista:'Un T&M por cada vista guardada',punto:'Un T&M por cada punto',unidad_dia:'Un T&M por unidad y por día (junta las vistas del día)'};
const NOTA_AR='ℹ️ La app no puede “pegar” los puntos a la pared como un AR de verdad (el navegador del iPhone no lo permite). Por eso guarda una foto de referencia con los puntos. Al volver, la cámara muestra esa foto transparente encima: mueve el teléfono hasta que coincida con la pared y verás dónde va cada reparación.';

/* ---- datos ---- */
function tiposRep(){try{const v=JSON.parse(localStorage.getItem(LSTREP));if(Array.isArray(v)&&v.length)return v}catch(e){}return TREP_DEF.map(x=>({...x}))}
function tipoRep(id,pt){const t=tiposRep().find(x=>x.id===id);return t||{id,nombre:(pt&&pt.nom)||id||'Otro',color:(pt&&pt.col)||'#999999',quien:''}}
function ptTipo(pt){const t=tipoRep(pt.tipo,pt);return {nombre:t.nombre,color:t.color}}
function capsAll(){return lsGet(LSCAP)}
function capsProj(pid){return capsAll().filter(c=>c.pid===pid)}
function capById(id){return capsAll().find(c=>c.id===id)}
function capsUnidad(pid,u){return capsProj(pid).filter(c=>c.unidad===u).sort((a,b)=>b.ts-a.ts)}
function mcfg(){try{const v=JSON.parse(localStorage.getItem(LSMCFG));if(v&&AGRUPAR[v.agrupar])return v}catch(e){}return {agrupar:'vista'}}
function setAgrupar(v){if(AGRUPAR[v]){localStorage.setItem(LSMCFG,JSON.stringify({agrupar:v}));toast('T&M: '+AGRUPAR[v])}}
function seqGet(pid){try{return (JSON.parse(localStorage.getItem(LSSEQ))||{})[pid]||0}catch(e){return 0}}
function seqSet(pid,n){let o={};try{o=JSON.parse(localStorage.getItem(LSSEQ))||{}}catch(e){}o[pid]=n;localStorage.setItem(LSSEQ,JSON.stringify(o))}
function cod(n){return 'P-'+String(n).padStart(3,'0')}
function uLabel(u){return /^(pasillo|hall|corredor|área|area)/i.test(u)?u:'Unidad '+u}
function txtCol(hex){const h=String(hex||'').replace('#','');if(h.length<6)return '#000';const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return (r*299+g*587+b*114)/1000>150?'#000':'#fff'}
function conteo(pts){const m={};pts.forEach(p=>{m[p.tipo]=(m[p.tipo]||[]);m[p.tipo].push(p)});return m}
function chipsConteo(pts){const m=conteo(pts);const k=Object.keys(m);if(!k.length)return '<span class="mut">Sin puntos</span>';
 return k.map(t=>{const x=ptTipo(m[t][0]);return `<span class="tag cnt" data-t="${esc(t)}"><span class="sw" style="background:${esc(x.color)}"></span>${esc(x.nombre)} × <b>${m[t].length}</b></span>`}).join('')}
function porTipoTxt(pts){const m=conteo(pts);return Object.keys(m).map(t=>ptTipo(m[t][0]).nombre+' ×'+m[t].length).join(' · ')}
function ptsUnidad(pid,u){return capsUnidad(pid,u).flatMap(c=>c.puntos)}

/* ---- fotos en IndexedDB (se guarda el ArrayBuffer + tipo: funciona también en Safari viejo) ---- */
let _db=null;const FURL={};
function idb(){if(_db)return _db;_db=new Promise((ok,no)=>{if(!window.indexedDB)return no(new Error('Este navegador no tiene IndexedDB'));const r=indexedDB.open('fto_fotos',1);r.onupgradeneeded=()=>r.result.createObjectStore('fotos');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});_db.catch(()=>{_db=null});return _db}
function idbReq(modo,fn){return idb().then(db=>new Promise((ok,no)=>{const t=db.transaction('fotos',modo),st=t.objectStore('fotos'),r=fn(st);let v;r.onsuccess=()=>v=r.result;t.oncomplete=()=>ok(v);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)}))}
async function fotoPut(k,blob){const buf=await blob.arrayBuffer();return idbReq('readwrite',st=>st.put({t:blob.type||'image/jpeg',b:buf},k))}
async function fotoGet(k){const v=await idbReq('readonly',st=>st.get(k));return v?new Blob([v.b],{type:v.t}):null}
function fotoDel(k){if(FURL[k]){URL.revokeObjectURL(FURL[k]);delete FURL[k]}return idbReq('readwrite',st=>st.delete(k))}
async function fotoURL(k){if(FURL[k])return FURL[k];const b=await fotoGet(k);if(!b)return null;return FURL[k]=URL.createObjectURL(b)}
function cargarImg(src){return new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src=src})}
function canvasBlob(c,q){return new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('toBlob')),'image/jpeg',q||.82))}
/* dibuja los puntos sobre un canvas (para la foto que se comparte) */
function dibujarPuntos(ctx,w,h,pts){const r=Math.max(13,Math.round(Math.max(w,h)*.019));ctx.textAlign='center';ctx.textBaseline='middle';
 pts.forEach(p=>{const x=p.x*w,y=p.y*h,t=ptTipo(p);ctx.beginPath();ctx.arc(x,y,r+Math.max(3,r*.28),0,7);ctx.fillStyle='#000';ctx.fill();
  ctx.beginPath();ctx.arc(x,y,r+Math.max(1.5,r*.14),0,7);ctx.fillStyle='#fff';ctx.fill();ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=t.color;ctx.fill();
  const s=String(p.num||'');ctx.font=`900 ${Math.round(r*(s.length>2?.85:1.05))}px system-ui,sans-serif`;ctx.fillStyle=txtCol(t.color);ctx.fillText(s,x,y+1)})}
/* foto con puntos (Blob JPEG). cods: solo esos puntos (para T&M por punto) */
async function fotoConPuntos(cid,cods){const c=capById(cid);if(!c)return null;const u=await fotoURL(cid);if(!u)return null;const im=await cargarImg(u);
 const cv=document.createElement('canvas');cv.width=im.naturalWidth;cv.height=im.naturalHeight;const ctx=cv.getContext('2d');ctx.drawImage(im,0,0);
 dibujarPuntos(ctx,cv.width,cv.height,cods?c.puntos.filter(p=>cods.includes(p.cod)):c.puntos);return canvasBlob(cv,.85)}

/* ---- cámara ---- */
const CAM={stream:null,pend:[],tipo:null,frz:false,aspect:4/3,starting:null,ori:null};
function camStop(){if(CAM.stream){CAM.stream.getTracks().forEach(t=>t.stop());CAM.stream=null}CAM.starting=null}
function camMsg(t){const m=$('camMsg');if(!m)return;if(!t){m.classList.add('hidden');return}m.innerHTML=t;m.classList.remove('hidden')}
async function camStart(){const v=$('vid');if(!v)return false;
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){camMsg('Este navegador no deja usar la cámara en vivo aquí.<br>Usa “📁 Usar una foto” abajo.'+(location.protocol!=='https:'&&location.hostname!=='localhost'?'<br>(La cámara necesita https)':''));return false}
 camMsg('Abriendo cámara…');
 try{if(!CAM.stream){const pr=CAM.starting||(CAM.starting=navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}}));
   const s=await pr;if(!$('vid')||CAM.starting!==pr){s.getTracks().forEach(t=>t.stop());return false}CAM.stream=s}
  const vv=$('vid');vv.srcObject=CAM.stream;vv.setAttribute('playsinline','');vv.muted=true;await vv.play().catch(()=>{});camMsg('');return true}
 catch(e){CAM.starting=null;const n=e&&e.name;camMsg((n==='NotAllowedError'||n==='SecurityError'?'Sin permiso para la cámara. Dale permiso en los ajustes del navegador y vuelve a entrar.':n==='NotFoundError'?'No se encontró cámara en este aparato.':'No se pudo abrir la cámara ('+esc(n||e)+').')+'<br>Puedes usar “📁 Usar una foto”.');return false}}
function fitStage(aspect){const st=$('stage');if(!st)return;const W=(st.parentElement&&st.parentElement.clientWidth)||360,H=Math.max(220,Math.round(window.innerHeight*.6));let w=W,h=w/aspect;if(h>H){h=H;w=h*aspect}st.style.width=Math.round(w)+'px';st.style.height=Math.round(h)+'px'}
/* (estos eventos pueden llegar antes de que cargue el script principal: no usar $ aquí) */
document.addEventListener('visibilitychange',()=>{const v=document.getElementById('vid');if(document.hidden)camStop();else if(v&&!v.classList.contains('hidden'))camStart()});
window.addEventListener('resize',()=>{if(document.getElementById('stage')){fitStage(CAM.aspect);if(typeof guiaTick==='function')guiaTick()}});

/* ---- HTML comunes ---- */
function dotsHTML(pts,prov){return pts.map((p,i)=>{const t=ptTipo(p);return `<div class="dot${prov?' prov':''}" data-cod="${esc(p.cod||'')}" data-t="${esc(p.tipo)}" style="left:${(p.x*100).toFixed(3)}%;top:${(p.y*100).toFixed(3)}%;background:${esc(t.color)};color:${txtCol(t.color)}">${esc(p.num)}</div>`}).join('')}
function banEj(p){return p.ejemplo?'<div class="ej">⚠️ EJEMPLO – no usar en obra</div>':''}
function secMarcas(p,lado){const caps=capsProj(p.id),n=caps.reduce((a,c)=>a+c.puntos.length,0);
 return `<div class="card list-item secmarcas" id="secMarcas_${lado}" onclick="vista={pantalla:'marcas',lado:'${lado}'};render()"><div class="big">📸 Marcar reparaciones</div><div class="mut">Abre la cámara en una unidad o pasillo y marca cada reparación con un punto de color (parche, electricista, plomero, fire sprinkler, esquina/bead…). Número automático y T&M automático.</div>${caps.length?`<div style="margin-top:6px"><span class="tag">${caps.length} vista${caps.length===1?'':'s'}</span><span class="tag">${n} punto${n===1?'':'s'}</span></div>`:''}</div>`}
function irMarcasU(u,desde){vista={pantalla:'marcasUnidad',unidad:u,desde:desde||'marcas',lado:vista.lado,q:vista.q};render()}

/* ---- pantalla: inicio de marcas ---- */
function unidadesMarcas(p){const L=p.unidades.map(u=>({u:u.unidad,piso:u.piso}));capsProj(p.id).forEach(c=>{if(!L.some(x=>x.u===c.unidad))L.push({u:c.unidad,piso:c.piso})});return L}
function marcasRes(p,q){q=nrm(q).trim();const L=unidadesMarcas(p).filter(x=>!q||nrm(x.u).includes(q)||nrm('piso '+x.piso).includes(q));
 if(!L.length)return '<div class="card mut">No se encontró esa unidad. Puedes marcar una nueva vista y escribir la unidad o el pasillo.</div>';
 return L.map(x=>{const cs=capsUnidad(p.id,x.u),pts=cs.flatMap(c=>c.puntos);return `<div class="card list-item munit" data-u="${esc(x.u)}" onclick="irMarcasU(this.dataset.u,'marcas')"><div class="big">${esc(uLabel(x.u))}</div><div class="mut">${x.piso?'Piso '+esc(x.piso)+' · ':''}${cs.length?cs.length+' vista'+(cs.length===1?'':'s')+' · '+pts.length+' punto'+(pts.length===1?'':'s'):'Sin marcas todavía'}</div>${pts.length?'<div>'+chipsConteo(pts)+'</div>':''}</div>`}).join('')}
function vMarcas(p){const T=tiposRep(),cfg=mcfg();
 return `<button class="sec sm" onclick="vista={pantalla:'inicio',lado:vista.lado};render()">← Volver</button>${banEj(p)}
 <div class="card" id="marcasHome"><h3>📸 Marcar reparaciones</h3><div class="mut">Toca “Marcar nueva vista”, apunta la cámara a la pared y toca la imagen donde va cada reparación. Cada punto lleva un número automático (P-001, P-002…) y se crea el T&M solo (sin precios).</div>
 <p><button id="btnNuevaMarca" onclick="abrirMarcar('')">📷 Marcar nueva vista</button></p></div>
 <div class="modnota" id="notaAR">${NOTA_AR}</div>
 <label for="qm">🔎 Busca la unidad o el pasillo para ver sus marcas</label><input id="qm" placeholder="Ej: 201, pasillo, piso 3" autocomplete="off">
 <div id="mres">${marcasRes(p,vista.qm||'')}</div>
 <h3>🎨 Tipos de reparación (colores)</h3><div class="card" id="leyenda">${T.map(t=>`<div class="leyrow"><span class="sw big" style="background:${esc(t.color)}"></span><div><b>${esc(t.nombre)}</b><div class="mut">${esc(t.quien||'')}</div></div></div>`).join('')}
 <p><button class="sec sm" id="btnTipos" onclick="vista={pantalla:'tiposRep',lado:vista.lado};render()">✏️ Editar tipos y colores</button></p></div>
 <div class="card"><h3>🛠️ T&M automático</h3><div class="mut">Cada vista guardada crea su T&M en “⬆️ Para la oficina” (historial), listo para mandar por WhatsApp, SMS, correo o copiar. Sin precios.</div>
 <label for="cfgAgrupar">Cómo agrupar</label><select id="cfgAgrupar" onchange="setAgrupar(this.value)">${Object.entries(AGRUPAR).map(([k,v])=>`<option value="${k}" ${cfg.agrupar===k?'selected':''}>${esc(v)}</option>`).join('')}</select></div>`}

/* ---- pantalla: editar tipos ---- */
function vTiposRep(){const T=tiposRep();
 return `<button class="sec sm" onclick="vista={pantalla:'marcas',lado:vista.lado};render()">← Volver</button>
 <div class="card" id="tiposEdit"><h3>✏️ Tipos de reparación</h3><div class="mut">Cada tipo tiene su color y quién/qué es. Los puntos ya guardados guardan su tipo; si borras un tipo, sus puntos quedan con el último nombre y color.</div>
 ${T.map((t,i)=>`<div class="card trow" data-id="${esc(t.id)}"><div class="row"><input type="color" class="t_col" value="${esc(t.color)}" style="flex:0 0 56px;height:46px;padding:2px"><input class="t_nom" value="${esc(t.nombre)}" placeholder="Nombre"><button class="red sm" style="flex:0" onclick="this.closest('.trow').remove()">✕</button></div><label>Quién / qué es</label><input class="t_quien" value="${esc(t.quien||'')}"></div>`).join('')}
 <div id="tnuevos"></div>
 <div class="row"><button class="sec sm" id="btnAddTipo" onclick="addTipoRow()">+ Agregar tipo</button><button class="sec sm" onclick="if(confirm('¿Volver a los tipos de fábrica?')){localStorage.removeItem(LSTREP);render()}">↺ De fábrica</button></div>
 <p><button id="btnGuardarTipos" onclick="guardarTipos()">💾 Guardar tipos</button></p></div>`}
function addTipoRow(){const d=document.createElement('div');d.className='card trow';d.dataset.id='t'+Date.now().toString(36);
 d.innerHTML=`<div class="row"><input type="color" class="t_col" value="#ff9f0a" style="flex:0 0 56px;height:46px;padding:2px"><input class="t_nom" placeholder="Nombre del tipo"><button class="red sm" style="flex:0" onclick="this.closest('.trow').remove()">✕</button></div><label>Quién / qué es</label><input class="t_quien">`;$('tnuevos').appendChild(d)}
function guardarTipos(){const T=[...document.querySelectorAll('.trow')].map(r=>({id:r.dataset.id,nombre:r.querySelector('.t_nom').value.trim(),color:r.querySelector('.t_col').value,quien:r.querySelector('.t_quien').value.trim()})).filter(t=>t.nombre);
 if(!T.length)return alert('Deja al menos un tipo.');lsSet(LSTREP,T);toast('Tipos guardados');vista={pantalla:'marcas',lado:vista.lado};render()}

/* ---- pantalla: marcas de una unidad / pasillo ---- */
function vMarcasUnidad(p,u){const cs=capsUnidad(p.id,u),pts=cs.flatMap(c=>c.puntos),pu=p.unidades.find(x=>x.unidad===u);
 const back=vista.desde==='unidad'?`vista={pantalla:'unidad',id:this.dataset.u,q:vista.q}`:`vista={pantalla:'marcas',lado:vista.lado}`;
 return `<button class="sec sm" data-u="${esc(u)}" onclick="${back};render()">← Volver</button>${banEj(p)}
 <div class="card" id="marcasU"><div class="big">📸 ${esc(uLabel(u))}</div><div class="mut">${pu&&pu.piso?'Piso '+esc(pu.piso)+' · ':''}${cs.length} vista${cs.length===1?'':'s'} · <b id="totU">${pts.length}</b> punto${pts.length===1?'':'s'}</div>
 <div id="conteoU" style="margin-top:6px">${chipsConteo(pts)}</div>
 <div class="row" style="margin-top:10px"><button id="btnMarcarU" data-u="${esc(u)}" onclick="abrirMarcar(this.dataset.u)">📷 Marcar nueva vista</button>${cs.length?`<button class="sec" id="btnVerU" onclick="abrirCap('${esc(cs[0].id)}','cam')">👁️ Ver con cámara</button>`:''}</div></div>
 ${cs.length?'<h3>🖼️ Vistas guardadas</h3>':'<div class="card mut" id="sinMarcas">Todavía no hay marcas en esta unidad.</div>'}
 ${cs.map(c=>`<div class="card capitem" data-cid="${esc(c.id)}"><div class="row" style="align-items:flex-start"><img class="thumb" data-foto="${esc(c.id)}" alt="foto" style="flex:0 0 96px" onclick="abrirCap('${esc(c.id)}','foto')"><div><b>${esc(c.area||'Sin área')}</b><div class="mut">${esc(c.fecha)}${c.nombre?' · 📷 '+esc(c.nombre):''}</div><div class="mut">${esc(c.puntos[0].cod)}${c.puntos.length>1?' – '+esc(c.puntos[c.puntos.length-1].cod):''}</div><div>${chipsConteo(c.puntos)}</div></div></div>
  <div class="row" style="margin-top:8px"><button class="sm" onclick="abrirCap('${esc(c.id)}','cam')">👁️ Cámara</button><button class="sec sm" onclick="abrirCap('${esc(c.id)}','foto')">🖼️ Foto</button><button class="sec sm" onclick="verTMCap('${esc(c.id)}')">🛠️ T&M</button><button class="red sm" style="flex:0" onclick="borrarCap('${esc(c.id)}')">🗑️</button></div></div>`).join('')}
 <div class="modnota">${NOTA_AR}</div>`}
function abrirCap(cid,m){vista={pantalla:'verCap',cid,m:m||'cam',desde:vista.desde,lado:vista.lado,q:vista.q};render()}
async function borrarCap(cid){const c=capById(cid);if(!c||!confirm(`¿Borrar esta vista y sus ${c.puntos.length} puntos? Los números no se vuelven a usar. Los T&M ya creados se quedan en el historial (sin la foto).`))return;
 lsSet(LSCAP,capsAll().filter(x=>x.id!==cid));try{await fotoDel(cid)}catch(e){}toast('Vista borrada');render()}
function verTMCap(cid){const c=capById(cid);const h=lsGet(LSENV);const r=c&&(c.tm||[]).map(id=>h.find(x=>x.id===id)).find(Boolean);
 if(r){vista={pantalla:'reporte',rid:r.id,lado:'para'};return render()}
 if(c&&confirm('El T&M de esta vista ya no está en el historial. ¿Crearlo otra vez?')){const ids=crearTMs(c,'vista');c.tm=ids;guardarCap(c);vista={pantalla:'reporte',rid:ids[0],lado:'para'};render()}}
function guardarCap(c){const A=capsAll(),i=A.findIndex(x=>x.id===c.id);if(i>=0)A[i]=c;else A.unshift(c);return lsSet(LSCAP,A)}

/* ---- pantalla: MARCAR (cámara en vivo) ---- */
function abrirMarcar(u){CAM.pend=[];CAM.frz=false;CAM.ori=null;vista={pantalla:'marcar',unidad:u||'',desde:vista.desde,lado:vista.lado,q:vista.q};render()}
function vMarcar(p){const T=tiposRep();if(!CAM.tipo||!T.some(t=>t.id===CAM.tipo))CAM.tipo=T[0].id;const u=vista.unidad||'',pu=p.unidades.find(x=>x.unidad===u);
 const back=u?`irMarcasU(this.dataset.u,vista.desde==='unidad'?'unidad':'marcas')`:`vista={pantalla:'marcas',lado:vista.lado};render()`;
 return `<button class="sec sm" data-u="${esc(u)}" onclick="if(!CAM.pend.length||confirm('¿Salir sin guardar los puntos?')){${back}}">← Volver</button>${banEj(p)}
 <div class="card" id="marcarCard" style="padding:10px"><div class="row"><div><label for="m_unidad" style="margin-top:0">Unidad / pasillo *</label><input id="m_unidad" list="unidadesListM" value="${esc(u)}" autocomplete="off" oninput="const x=proj().unidades.find(z=>z.unidad===this.value);if(x&&!$('m_piso').value)$('m_piso').value=x.piso"></div><div style="flex:0 0 28%"><label for="m_piso" style="margin-top:0">Piso</label><input id="m_piso" inputmode="numeric" value="${esc(pu?pu.piso:'')}"></div></div>
 <datalist id="unidadesListM">${p.unidades.map(x=>`<option value="${esc(x.unidad)}">`).join('')}</datalist>
 <div class="row"><div><label for="m_area">Área / pared</label><input id="m_area" placeholder="Ej: baño, closet"></div><div><label for="m_nombre">Quién toma la foto</label><input id="m_nombre" value="${esc(localStorage.getItem(LSNOM)||'')}"></div></div>
 <label for="m_nota">Descripción / nota (opcional, sale en el T&M)</label><textarea id="m_nota" data-mic placeholder="Ej: parches alrededor de la tina después del plomero"></textarea>
 <div class="mut" id="sensMarcar" style="margin-top:6px"></div><button class="sm btnSens hidden" id="btnSensM" style="margin-top:6px" onclick="sensPedir()">🧭 Activar sensores (para guiar con flechas después)</button></div>
 <div class="mut">1) Escoge el tipo · 2) toca la imagen donde va la reparación (el primer toque congela la imagen) · 3) 💾 Guardar vista</div>
 <div class="chips" id="leyMarcar">${T.map(t=>`<button class="chiprep${t.id===CAM.tipo?' sel':''}" data-t="${esc(t.id)}" title="${esc(t.quien||'')}" onclick="selTipo(this.dataset.t)"><span class="sw" style="background:${esc(t.color)}"></span>${esc(t.nombre)}</button>`).join('')}</div>
 <div id="tipoInfo" class="mut"></div>
 <div class="stagewrap"><div class="stage" id="stage"><video id="vid" playsinline muted autoplay></video><canvas id="frz" class="hidden"></canvas><div class="dots" id="dots"></div><div class="cammsg" id="camMsg">Abriendo cámara…</div><div class="badge hidden" id="frzBadge">⏸ Imagen congelada</div></div></div>
 <div id="pendInfo" class="mut" style="text-align:center">Toca la imagen para poner un punto</div>
 <div class="row" style="margin-top:8px"><button class="sec" id="btnUndo" onclick="undoPunto()">↩️ Deshacer</button><button class="sec" id="btnVivo" onclick="volverVivo()">▶️ En vivo</button></div>
 <p><button id="btnGuardarVista" style="width:100%" onclick="guardarVista()">💾 Guardar vista</button></p>
 <div id="pendList"></div>
 <label class="btn sec" style="display:block;text-align:center;background:#333;color:#fff;margin-top:10px">📁 Usar una foto (si la cámara en vivo no abre)<input type="file" id="m_foto" accept="image/*" capture="environment" class="hidden" onchange="fotoMarcar(this)"></label>
 <div class="modnota">${NOTA_AR}</div>`}
function selTipo(t){CAM.tipo=t;document.querySelectorAll('#leyMarcar .chiprep').forEach(b=>b.classList.toggle('sel',b.dataset.t===t));const x=tipoRep(t);$('tipoInfo').textContent=x.quien||''}
function pendNums(){const p=proj(),s=seqGet(p.id);return CAM.pend.map((x,i)=>({...x,num:s+i+1,cod:cod(s+i+1)}))}
function pintarPend(){const P=pendNums();$('dots').innerHTML=dotsHTML(P,true);
 $('pendInfo').innerHTML=P.length?`<b id="nPend">${P.length}</b> punto${P.length===1?'':'s'} sin guardar · ${chipsConteo(P)}`:'Toca la imagen para poner un punto';
 $('pendList').innerHTML=P.map((x,i)=>{const t=ptTipo(x);return `<div class="pitem"><span class="sw" style="background:${esc(t.color)}"></span><b>${esc(x.cod)}</b> ${esc(t.nombre)} <button class="red sm" style="float:right;padding:3px 9px" onclick="CAM.pend.splice(${i},1);pintarPend()">✕</button></div>`}).join('')}
function congelar(){const v=$('vid'),c=$('frz');if(!v||!v.videoWidth)return false;const s=Math.min(1,1280/Math.max(v.videoWidth,v.videoHeight));
 c.width=Math.round(v.videoWidth*s);c.height=Math.round(v.videoHeight*s);c.getContext('2d').drawImage(v,0,0,c.width,c.height);CAM.aspect=c.width/c.height;fitStage(CAM.aspect);
 CAM.ori=oriSnap();c.classList.remove('hidden');v.classList.add('hidden');$('frzBadge').classList.remove('hidden');CAM.frz=true;camStop();return true}
function volverVivo(){if(CAM.pend.length&&!confirm(`Se borran los ${CAM.pend.length} puntos sin guardar. ¿Seguir?`))return;CAM.pend=[];CAM.frz=false;CAM.ori=null;$('frz').classList.add('hidden');$('vid').classList.remove('hidden');$('frzBadge').classList.add('hidden');pintarPend();camStart()}
function undoPunto(){if(CAM.pend.length){CAM.pend.pop();pintarPend()}}
function tocarStage(e){const st=$('stage');if(!st)return;if(!CAM.frz&&!congelar()){toast('La cámara todavía no está lista');return}
 const r=st.getBoundingClientRect(),x=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y=Math.min(1,Math.max(0,(e.clientY-r.top)/r.height));
 const t=tipoRep(CAM.tipo);CAM.pend.push({tipo:t.id,nom:t.nombre,col:t.color,x:+x.toFixed(4),y:+y.toFixed(4)});pintarPend()}
async function fotoMarcar(inp){const f=inp.files&&inp.files[0];if(!f)return;try{const u=URL.createObjectURL(f),im=await cargarImg(u),c=$('frz'),s=Math.min(1,1280/Math.max(im.naturalWidth,im.naturalHeight));
 c.width=Math.round(im.naturalWidth*s);c.height=Math.round(im.naturalHeight*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
 camStop();CAM.pend=[];CAM.frz=true;CAM.ori=null;CAM.aspect=c.width/c.height;fitStage(CAM.aspect);c.classList.remove('hidden');$('vid').classList.add('hidden');camMsg('');$('frzBadge').classList.remove('hidden');pintarPend();toast('Foto lista: toca para marcar')}catch(e){alert('No se pudo leer la foto.')}}
function setupMarcar(){const st=$('stage');fitStage(CAM.aspect);st.addEventListener('click',tocarStage);selTipo(CAM.tipo);
 const v=$('vid');v.addEventListener('loadedmetadata',()=>{if(!CAM.frz&&v.videoWidth){CAM.aspect=v.videoWidth/v.videoHeight;fitStage(CAM.aspect)}});v.addEventListener('resize',()=>{if(!CAM.frz&&v.videoWidth){CAM.aspect=v.videoWidth/v.videoHeight;fitStage(CAM.aspect)}});
 pintarPend();camStart();sensStart();sensEstado()}
let guardando=false;
async function guardarVista(){if(guardando)return;const p=proj(),u=$('m_unidad').value.trim();
 if(!u){alert('Escribe la unidad o el pasillo.');return $('m_unidad').focus()}
 if(!CAM.pend.length||!CAM.frz)return alert('Primero toca la imagen para poner al menos un punto.');
 guardando=true;try{const nombre=$('m_nombre').value.trim();try{localStorage.setItem(LSNOM,nombre)}catch(e){}
  const c=$('frz'),blob=await canvasBlob(c,.82),now=new Date(),cid='V-'+now.getTime().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();
  try{await fotoPut(cid,blob)}catch(e){alert('No se pudo guardar la foto en el teléfono ('+(e&&e.message||e)+'). Libera espacio e intenta otra vez.');return}
  const s=seqGet(p.id),pts=CAM.pend.map((x,i)=>({num:s+i+1,cod:cod(s+i+1),tipo:x.tipo,nom:x.nom,col:x.col,x:x.x,y:x.y}));seqSet(p.id,s+pts.length);
  const cap={id:cid,pid:p.id,proyecto:p.nombre,unidad:u,piso:$('m_piso').value.trim(),area:$('m_area').value.trim(),nota:(($('m_nota')||{}).value||'').trim(),ts:now.getTime(),fecha:fechaTxt(now),nombre,w:c.width,h:c.height,puntos:pts,tm:[]};
  try{oriGuardar(cap,CAM.ori)}catch(e){}
  if(!guardarCap(cap)){await fotoDel(cid).catch(()=>{});seqSet(p.id,s);return alert('No hay espacio en el teléfono para guardar la vista.')}
  cap.tm=crearTMs(cap,mcfg().agrupar);guardarCap(cap);
  try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
  CAM.pend=[];CAM.frz=false;CAM.ori=null;vista={pantalla:'verCap',cid,m:'foto',nuevo:1,desde:vista.desde,lado:vista.lado,q:vista.q};render();
  toast(`Vista guardada · ${pts.length} punto${pts.length===1?'':'s'} · T&M creado`)}finally{guardando=false}}

/* ---- T&M automático ---- */
function idUnico(h){let id;do{id=nuevoId()}while(h.some(x=>x.id===id));return id}
function diaKey(ts){const d=new Date(ts),z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())}
function tmCampos(r){const caps=(r.vistas||[]).map(capById).filter(Boolean);const pts=caps.flatMap(c=>c.puntos.filter(p=>(r.pts||[]).includes(p.cod)));
 const c0=caps[0]||{},areas=[...new Set(caps.map(c=>c.area).filter(Boolean))],notas=[...new Set(caps.map(c=>c.nota).filter(Boolean))];const n=pts.length||(r.pts||[]).length;
 r.campos=Object.assign(r.campos||{},{unidad:c0.unidad||r.campos.unidad||'',piso:c0.piso||r.campos.piso||'',area:areas.join(', ')||r.campos.area||'',
  texto:`Reparaciones marcadas con la cámara (📸 Marcar reparaciones): ${n} punto${n===1?'':'s'} de colores en la foto, uno por reparación.`+(notas.length?' Nota: '+notas.join(' / '):''),
  total:String(n),portipo:pts.length?porTipoTxt(pts):(r.campos.portipo||''),numeros:(r.pts||[]).join(', '),vista:(r.vistas||[]).join(', ')});return r}
function crearTMs(cap,modo){const h=lsGet(LSENV),ids=[],now=Date.now();
 const nuevo=(pts,grupo)=>{const r={id:idUnico(h),tipo:'tm',ts:now,fecha:cap.fecha,proyecto:cap.proyecto,campos:{},nombre:cap.nombre,compartido:false,auto:'marcas',vistas:[cap.id],pts:pts.map(p=>p.cod)};if(grupo)r.grupo=grupo;tmCampos(r);h.unshift(r);ids.push(r.id)};
 if(modo==='punto')cap.puntos.slice().reverse().forEach(p=>nuevo([p]));
 else if(modo==='unidad_dia'){const g=cap.pid+'|'+cap.unidad+'|'+diaKey(cap.ts),r=h.find(x=>x.grupo===g&&!x.compartido);
  if(r){r.vistas.push(cap.id);r.pts=r.pts.concat(cap.puntos.map(p=>p.cod));tmCampos(r);ids.push(r.id);h.splice(h.indexOf(r),1);h.unshift(r)}else nuevo(cap.puntos,g)}
 else nuevo(cap.puntos);
 if(h.length>HMAX)h.length=HMAX;if(!guardarHist(h))toast('No hay espacio para guardar el T&M');return ids.reverse()}
/* fotos de un T&M automático (con los puntos dibujados) */
const REPF={};
async function archivosRep(r){if(REPF[r.id])return REPF[r.id];const out=[];for(const cid of (r.vistas||[])){try{const b=await fotoConPuntos(cid,r.pts);if(b)out.push({cid,blob:b,file:new File([b],'marcas-'+cid+'.jpg',{type:'image/jpeg'})})}catch(e){}}return REPF[r.id]=out}
function repFotosHTML(r){return `<div id="repFotos" data-rid="${esc(r.id)}"><div class="mut">Cargando foto con puntos…</div></div><p><button class="sec sm" id="btnVerPuntos" onclick="abrirCap('${esc((r.vistas||[])[0]||'')}','foto')">📸 Ver los puntos</button></p>`}
async function llenarRepFotos(){const d=$('repFotos');if(!d)return;const r=repById(d.dataset.rid);if(!r)return;delete REPF[r.id];const fs=await archivosRep(r);if(!$('repFotos'))return;
 d.innerHTML=fs.length?fs.map((f,i)=>{const u=URL.createObjectURL(f.blob);return `<img class="adj repfoto" src="${u}" alt="foto con puntos"><p><a class="btn sec lnkFotoM" style="display:inline-block;text-decoration:none;background:#333;color:#fff" href="${u}" download="${esc(f.file.name)}">⬇️ Guardar foto ${fs.length>1?i+1:''}</a></p>`}).join(''):'<div class="mut">La foto de esta vista ya no está en el teléfono.</div>'}

/* ---- pantalla: VER (cámara en vivo + foto guía + puntos) o foto fija ---- */
function vCap(p,cid,m){const c=capById(cid);if(!c){vista={pantalla:'marcas',lado:vista.lado};return vMarcas(p)}const cam=m!=='foto';
 const op=vista.op!=null?vista.op:45,on=vista.ghost!==false;
 return `<button class="sec sm" data-u="${esc(c.unidad)}" onclick="irMarcasU(this.dataset.u,vista.desde==='unidad'?'unidad':'marcas')">← ${esc(uLabel(c.unidad))}</button>${banEj(p)}
 <div class="tabs"><button id="tabCam" class="${cam?'on':'off'}" onclick="vista.m='cam';render()">👁️ Ver con cámara</button><button id="tabFoto" class="${cam?'off':'on'}" onclick="vista.m='foto';render()">🖼️ Foto con puntos</button></div>
 ${cam?`<div class="mut">Mueve el teléfono hasta que la foto guía (transparente) coincida con la pared. Los puntos quedan donde va cada reparación.</div>`:''}
 <div class="stagewrap"><div class="stage${cam?' live':''}" id="stage">${cam?'<video id="vid" playsinline muted autoplay></video>':''}<img id="${cam?'ghost':'capImg'}" alt="foto guardada" class="${cam&&!on?'hidden':''}" style="${cam?'opacity:'+op/100:''}"><div class="dots" id="dots">${dotsHTML(c.puntos)}</div>${cam?'<div class="guiaov" id="guiaOv"></div><div class="cammsg" id="camMsg">Abriendo cámara…</div>':''}</div></div>
 ${cam?guiaCtlHTML(c):''}
 ${cam?`<div class="card" id="ghostCtl"><label style="color:var(--tx);margin:0"><input type="checkbox" id="ghostOn" style="width:auto" ${on?'checked':''} onchange="vista.ghost=this.checked;$('ghost').classList.toggle('hidden',!this.checked)"> Mostrar foto guía</label>
  <label for="ghostOp">Transparencia de la foto guía: <b id="opVal">${op}%</b></label><input type="range" id="ghostOp" min="0" max="100" step="5" value="${op}" oninput="vista.op=+this.value;$('ghost').style.opacity=this.value/100;$('opVal').textContent=this.value+'%'"></div>`
 :`<p><a class="btn sec" id="lnkCapFoto" style="display:inline-block;text-decoration:none;background:#333;color:#fff">⬇️ Guardar foto con puntos</a></p>`}
 ${vista.nuevo?`<div class="card" id="guardadoOk" style="border-color:var(--ok)"><b>✅ Vista guardada</b><div class="mut">Se creó el T&M en “⬆️ Para la oficina”.</div><p><button class="sm" id="btnIrTM" onclick="verTMCap('${esc(c.id)}')">🛠️ Ver y mandar el T&M</button></p></div>`:''}
 <div class="card" id="capCard"><div class="big">${esc(uLabel(c.unidad))}${c.area?' · '+esc(c.area):''}</div><div class="mut">${c.piso?'Piso '+esc(c.piso)+' · ':''}${esc(c.fecha)}${c.nombre?' · 📷 '+esc(c.nombre):''} · ${esc(c.id)}</div>${c.nota?`<div id="capNota">📝 ${esc(c.nota)}</div>`:''}<div class="mut" id="capOri">${c.ori?'🧭 Dirección guardada'+(c.ori.abs?' (con brújula)':' (sin brújula)'):'🧭 Sin dirección guardada: solo foto guía'}</div><div style="margin-top:6px">${chipsConteo(c.puntos)}</div></div>
 <h3>📍 Puntos (${c.puntos.length})</h3>${c.puntos.map(x=>{const t=ptTipo(x);return `<div class="pitem" data-cod="${esc(x.cod)}"><span class="sw" style="background:${esc(t.color)}"></span><b>${esc(x.cod)}</b> ${esc(t.nombre)}${cam?`<button class="sec sm" style="float:right;padding:3px 9px" onclick="guiaSel('${esc(x.cod)}');$('stage').scrollIntoView({block:'center'})">🧭 Guiar</button>`:''}</div>`}).join('')}
 <div class="row" style="margin-top:10px"><button class="sec" onclick="verTMCap('${esc(c.id)}')">🛠️ T&M</button><button class="sec" data-u="${esc(c.unidad)}" onclick="abrirMarcar(this.dataset.u)">📷 Marcar otra vista</button></div>`}
async function setupCap(){const c=capById(vista.cid);if(!c)return;const st=$('stage');CAM.aspect=c.w/c.h;fitStage(CAM.aspect);
 const im=$('ghost')||$('capImg');try{const u=await fotoURL(c.id);if(u&&im)im.src=u;else if(!u&&st)st.insertAdjacentHTML('beforeend','<div class="cammsg">La foto de esta vista ya no está en el teléfono.</div>')}catch(e){}
 if($('vid')){camStart();sensStart();sensEstado();guiaUpd()}
 const l=$('lnkCapFoto');if(l){try{const b=await fotoConPuntos(c.id);if(b&&$('lnkCapFoto')){l.href=URL.createObjectURL(b);l.download='marcas-'+c.id+'.jpg'}}catch(e){}}}
async function llenarThumbs(){for(const im of document.querySelectorAll('img[data-foto]')){try{const u=await fotoURL(im.dataset.foto);if(u)im.src=u}catch(e){}}}

/* ---- enganche con render() ---- */
function rutaMarcas(p){const s=vista.pantalla;
 if(s==='marcas')return vMarcas(p);if(s==='tiposRep')return vTiposRep();if(s==='marcasUnidad')return vMarcasUnidad(p,vista.unidad);
 if(s==='marcar')return vMarcar(p);if(s==='verCap')return vCap(p,vista.cid,vista.m);return null}
function despuesRender(){const s=vista.pantalla;
 if(modo==='campo'){if(s==='marcar')setupMarcar();if(s==='verCap')setupCap();
  if(s==='marcas'){const q=$('qm');if(q){q.value=vista.qm||'';q.oninput=()=>{vista.qm=q.value;$('mres').innerHTML=marcasRes(proj(),q.value)}}}
  if(s==='reporte')llenarRepFotos()}
 llenarThumbs();if(typeof vozAttach==='function')vozAttach()}
