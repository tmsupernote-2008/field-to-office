/* ===== 🔒 ROLES EN ESTE TELÉFONO: “Super / GC” y “Solo ver” =====
   Super / GC: marca, edita, borra vistas y tipos, y crea el T&M de las marcas.
   Solo ver (de fábrica): ve, busca y se guía con flechas; no puede marcar, editar ni borrar.
   LÍMITE HONESTO: el PIN es un candado de ESTE teléfono para evitar marcas por accidente, NO es seguridad completa.
   Alguien con acceso al navegador (borrar datos del sitio, herramientas de desarrollador) puede saltarlo.
   Permisos de verdad por persona (como los issues de Autodesk) necesitan un servidor con cuentas: no está hecho.
   Del PIN solo se guarda un hash PBKDF2-SHA-256 con sal aleatoria (nunca el PIN en texto). Sin red. */
const LSROL='fto_rol_v1', LSRPIN='fto_rol_pin_v1', LSRFAIL='fto_rol_fail_v1';
const ROL_IT=150000, ROL_MAXF=5, ROL_ESPERA=30000;
const NO_PERM='🔒 Solo Super o GC pueden marcar';
const NOTA_ROL='ℹ️ Este PIN es un candado de este teléfono para que nadie marque, edite o borre por accidente. No es seguridad completa: quien tenga el teléfono y sepa de navegadores puede saltarlo. Permisos de verdad por persona (como en Autodesk) necesitan un servidor con cuentas, y eso no está hecho.';
function esSuper(){try{return localStorage.getItem(LSROL)==='super'}catch(e){return false}}
function rolSet(r){try{localStorage.setItem(LSROL,r==='super'?'super':'ver')}catch(e){}rolBadge()}
function rolTxt(){return esSuper()?'🦺 Super / GC':'👁️ Solo ver'}
function rolPinData(){try{const v=JSON.parse(localStorage.getItem(LSRPIN));if(v&&v.s&&v.h)return v}catch(e){}return null}
function hex(b){return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function unhex(h){return new Uint8Array((h.match(/../g)||[]).map(x=>parseInt(x,16)))}
async function pbkdf2(pin,saltHex,it){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(saltHex),iterations:it},k,256))}
function pinValido(v){return /^\d{4,6}$/.test(v)}
async function rolSetPin(pin){if(!pinValido(pin))throw new Error('PIN');const s=hex(crypto.getRandomValues(new Uint8Array(16)));
 localStorage.setItem(LSRPIN,JSON.stringify({v:1,alg:'PBKDF2-SHA-256',it:ROL_IT,s,h:await pbkdf2(pin,s,ROL_IT)}))}
function igual(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
function rolFail(){try{return JSON.parse(localStorage.getItem(LSRFAIL))||{n:0,hasta:0}}catch(e){return {n:0,hasta:0}}}
function rolEspera(){const f=rolFail();return Math.max(0,(f.hasta||0)-Date.now())}
/* revisa el PIN; cuenta los errores; después de 5 errores, espera 30 s entre intentos */
async function rolRevisar(pin){const d=rolPinData();if(!d)return {ok:false,msg:'No hay PIN todavía.'};
 const w=rolEspera();if(w)return {ok:false,msg:`Demasiados intentos. Espera ${Math.ceil(w/1000)} s.`};
 const ok=pinValido(pin)&&igual(await pbkdf2(pin,d.s,d.it||ROL_IT),d.h);const f=rolFail();
 if(ok){localStorage.removeItem(LSRFAIL);return {ok:true}}
 f.n=(f.n||0)+1;if(f.n>=ROL_MAXF)f.hasta=Date.now()+ROL_ESPERA;localStorage.setItem(LSRFAIL,JSON.stringify(f));
 return {ok:false,msg:f.n>=ROL_MAXF?`PIN incorrecto. Espera ${ROL_ESPERA/1000} s para intentar otra vez.`:`PIN incorrecto (${f.n} de ${ROL_MAXF}).`}}
/* ---- insignia arriba ---- */
function rolBadge(){const h=document.querySelector('header');if(!h)return;let b=document.getElementById('rolBadge');
 if(!b){b=document.createElement('button');b.id='rolBadge';b.className='rolb';b.onclick=()=>irRol();const m=document.getElementById('btnModo');h.insertBefore(b,m)}
 const sup=esSuper();b.textContent=sup?'🦺 Super/GC':'👁️ Solo ver';b.classList.toggle('sup',sup);b.title='Rol en este teléfono: '+rolTxt();
 b.classList.toggle('hidden',typeof modo!=='undefined'&&modo==='oficina')}
/* ---- pantalla del rol ---- */
function irRol(f){const vv=(typeof vista!=='undefined'&&vista.pantalla!=='rol')?vista:(vista&&vista.volver)||{pantalla:'inicio'};
 if(typeof modo!=='undefined'&&modo!=='campo'){modo='campo'}vista={pantalla:'rol',volver:JSON.parse(JSON.stringify(vv)),f:f||''};render()}
function rolVolver(){vista=vista.volver||{pantalla:'inicio'};render()}
function vRol(){const sup=esSuper(),d=rolPinData(),w=rolEspera(),f=vista.f;
 const pinIn=(id,ph)=>`<input id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="${ph}" class="pinin">`;
 let h=`<button class="sec sm" onclick="rolVolver()">← Volver</button>
 <div class="card" id="rolCard"><h3>🔒 Rol en este teléfono</h3><div class="big" id="rolActual">${rolTxt()}</div>
 <div class="mut" style="margin-top:4px">${sup?'Puedes marcar, editar, borrar y crear el T&M.':'Puedes ver, buscar y guiarte con flechas. Para marcar, editar o borrar entra como Super / GC.'}</div></div>`;
 if(sup&&f!=='cambiar')h+=`<div class="card"><p><button class="big1" id="btnSalirRol" onclick="rolSalir()">👁️ Salir (solo ver)</button></p><p><button class="sec big1" id="btnCambiarPin" onclick="vista.f='cambiar';render()">🔑 Cambiar PIN</button></p></div>`;
 else if(f==='cambiar')h+=`<div class="card" id="rolForm"><h3>🔑 Cambiar PIN</h3><label for="pinAct">PIN actual</label>${pinIn('pinAct','PIN actual')}<label for="pinN1">PIN nuevo (4 a 6 números)</label>${pinIn('pinN1','PIN nuevo')}<label for="pinN2">Repite el PIN nuevo</label>${pinIn('pinN2','Repite el PIN nuevo')}
  <div id="rolMsg" class="rolmsg" aria-live="polite"></div><p><button class="big1" id="btnGuardarPin" onclick="rolCambiar()">💾 Guardar PIN nuevo</button></p><p><button class="sec sm" onclick="vista.f='';render()">Cancelar</button></p></div>`;
 else if(!d)h+=`<div class="card" id="rolForm"><h3>🦺 Primera vez: el Super crea el PIN</h3><div class="mut">4 a 6 números. Solo queda en este teléfono (guardado como hash, nunca el PIN).</div><label for="pin1">PIN nuevo</label>${pinIn('pin1','PIN nuevo')}<label for="pin2r">Repite el PIN</label>${pinIn('pin2r','Repite el PIN')}
  <div id="rolMsg" class="rolmsg" aria-live="polite"></div><p><button class="big1" id="btnCrearPin" onclick="rolCrear()">✅ Crear PIN y entrar</button></p></div>`;
 else h+=`<div class="card" id="rolForm"><h3>🔒 Entrar como Super / GC</h3><label for="pinE">PIN</label>${pinIn('pinE','PIN')}
  <div id="rolMsg" class="rolmsg" aria-live="polite">${w?`Demasiados intentos. Espera ${Math.ceil(w/1000)} s.`:''}</div><p><button class="big1" id="btnEntrarRol" onclick="rolEntrar()">🔓 Entrar</button></p></div>`;
 return h+`<div class="modnota" id="notaRol">${NOTA_ROL}</div>`}
function rolMsg(t){const m=$('rolMsg');if(m)m.textContent=t}
let rolOcupado=false;
async function rolCrear(){if(rolOcupado)return;const a=$('pin1').value.trim(),b=$('pin2r').value.trim();
 if(!pinValido(a))return rolMsg('El PIN debe tener de 4 a 6 números.');if(a!==b)return rolMsg('Los PIN no coinciden. Escríbelos otra vez.');
 if(rolPinData())return rolMsg('Ya hay un PIN en este teléfono.');
 rolOcupado=true;try{await rolSetPin(a);rolSet('super');toast('PIN creado · Super / GC');rolVolver()}catch(e){rolMsg('No se pudo guardar el PIN.')}finally{rolOcupado=false}}
async function rolEntrar(){if(rolOcupado)return;const v=$('pinE').value.trim();rolOcupado=true;
 try{const r=await rolRevisar(v);if(!r.ok){rolMsg(r.msg);$('pinE').value='';return}rolSet('super');toast('Entraste como Super / GC');rolVolver()}finally{rolOcupado=false}}
async function rolCambiar(){if(rolOcupado)return;const a=$('pinAct').value.trim(),n1=$('pinN1').value.trim(),n2=$('pinN2').value.trim();
 if(!pinValido(n1))return rolMsg('El PIN nuevo debe tener de 4 a 6 números.');if(n1!==n2)return rolMsg('Los PIN nuevos no coinciden.');
 rolOcupado=true;try{const r=await rolRevisar(a);if(!r.ok){rolMsg(r.msg.replace('PIN incorrecto','PIN actual incorrecto'));$('pinAct').value='';return}
  await rolSetPin(n1);toast('PIN cambiado');vista.f='';render()}finally{rolOcupado=false}}
function rolSalir(){rolSet('ver');toast('Ahora: Solo ver');rolVolver()}
/* para las pantallas de marcas: bloque “solo ver” */
function rolAviso(){return `<div class="rolaviso" id="rolAviso"><b>${NO_PERM}</b><button class="sec" id="btnEntrarSuper" onclick="irRol()">🔒 Entrar como Super/GC</button></div>`}
function exigeSuper(){if(esSuper())return true;toast(NO_PERM);return false}
