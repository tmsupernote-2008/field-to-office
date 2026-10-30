/* ===== 🎤 DICTAR (Web Speech API: SpeechRecognition / webkitSpeechRecognition) =====
   Se agrega un botón 🎤 debajo de cada campo de descripción/nota que tenga el atributo data-mic.
   - Toca para empezar / toca otra vez para parar. Modo continuo con texto provisional (se ve mientras hablas).
   - El texto se inserta donde estaba el cursor (o al final) sin borrar lo que ya estaba escrito.
   - Idioma: el de la app (localStorage fto_idioma o <html lang>); español → es-US por defecto (o la región
     española del teléfono, ej. es-ES/es-MX).
   - Si el navegador no tiene la API, o niegan el micrófono: el botón se oculta/desactiva y sale un aviso para
     usar el micrófono del teclado del teléfono (dictado del sistema).
   Nota honesta: el reconocimiento lo hace el navegador/teléfono, no esta app. En algunos navegadores (Chrome)
   el audio se procesa en los servidores del fabricante del navegador. La app no manda nada a ningún servidor. */
const VozSR=window.SpeechRecognition||window.webkitSpeechRecognition;
const VOZ={rec:null,el:null,antes:'',despues:'',ultimo:'',on:false,negado:false,reint:0};
const VOZ_HINT='🎤 Para dictar, usa el micrófono del teclado del teléfono.';
/* 🌐 idioma del dictado = idioma escogido con el botón 🌐 (i18n.js). Si el teléfono tiene una región de ese idioma
   (ej. es-MX, pt-PT, fr-CA) se usa esa; si no: es-US, en-US, pt-BR, ht-HT, fr-FR, ru-RU, uk-UA. */
function vozLang(){let l='';try{l=(window.I18N&&I18N.lang)||localStorage.getItem('fto_idioma')||''}catch(e){}l=(l||document.documentElement.lang||'es').toLowerCase();
 const base=l.split(/[-_]/)[0];if(l.includes('-'))return l;
 const n=(navigator.languages||[navigator.language||'']).find(x=>new RegExp('^'+base+'-','i').test(x||''));
 const def={es:'es-US',en:'en-US',pt:'pt-BR',ht:'ht-HT',fr:'fr-FR',ru:'ru-RU',uk:'uk-UA'};if(n&&/^es-419$/i.test(n))return 'es-US';/* “es-419” (español latinoamericano en Android/Chrome) no es un idioma del dictado: es-US */
 return n||def[base]||base}
function vozPos(el){el._micPos=[el.selectionStart,el.selectionEnd]}
function vozAttach(){
 if(VOZ.on&&VOZ.el&&!document.body.contains(VOZ.el))vozStop(true);
 document.querySelectorAll('textarea[data-mic],input[data-mic]').forEach(el=>{if(el.dataset.micOk)return;el.dataset.micOk='1';
  ['keyup','click','select','blur'].forEach(t=>el.addEventListener(t,()=>vozPos(el)));
  const w=document.createElement('div');w.className='microw';w.dataset.for=el.id;
  if(!VozSR){w.innerHTML=`<span class="mut michint">${VOZ_HINT}</span>`}
  else{w.innerHTML=`<button type="button" class="sec sm mic" aria-pressed="false"${VOZ.negado?' disabled':''}>🎤 Dictar</button><span class="micst" aria-live="polite"></span><span class="mut michint${VOZ.negado?'':' hidden'}">Sin permiso para el micrófono. ${VOZ_HINT}</span>`;
   w.querySelector('.mic').addEventListener('click',()=>vozToggle(el))}
  el.insertAdjacentElement('afterend',w)});
 if(VozSR&&!VOZ.negado&&!VOZ._q&&navigator.permissions&&navigator.permissions.query){VOZ._q=1;
  navigator.permissions.query({name:'microphone'}).then(s=>{const f=()=>{if(s.state==='denied')vozNegado()};f();s.onchange=f}).catch(()=>{})}}
function vozRow(el){return el&&el.nextElementSibling&&el.nextElementSibling.classList.contains('microw')?el.nextElementSibling:null}
function vozUI(){document.querySelectorAll('.microw').forEach(w=>{const b=w.querySelector('.mic'),st=w.querySelector('.micst');if(!b)return;
 const on=VOZ.on&&VOZ.el&&VOZ.el.id===w.dataset.for;b.classList.toggle('on',!!on);b.setAttribute('aria-pressed',on?'true':'false');b.textContent=on?'⏹️ Parar':'🎤 Dictar';
 b.disabled=VOZ.negado;st.textContent=on?'🔴 escuchando…':'';const h=w.querySelector('.michint');if(h)h.classList.toggle('hidden',!VOZ.negado)})}
function vozNegado(){VOZ.negado=true;vozStop(true);vozUI()}
function vozSep(a,t){return a&&t&&!/\s$/.test(a)?' ':''}
function vozPintar(t){const el=VOZ.el;if(!el)return;t=t.replace(/\s+/g,' ').trim();VOZ.ultimo=t;
 const pre=VOZ.antes+vozSep(VOZ.antes,t)+t,post=(t&&VOZ.despues&&!/^\s/.test(VOZ.despues)?' ':'')+VOZ.despues;el.value=pre+post;
 try{if(document.activeElement===el)el.setSelectionRange(pre.length,pre.length)}catch(e){}el._micPos=[pre.length,pre.length];
 el.dispatchEvent(new Event('input',{bubbles:true}))}
function vozCommit(){if(!VOZ.el)return;const t=VOZ.ultimo;if(t){VOZ.antes=VOZ.antes+vozSep(VOZ.antes,t)+t;if(VOZ.despues&&!/^\s/.test(VOZ.despues))VOZ.despues=' '+VOZ.despues}VOZ.ultimo=''}
function vozToggle(el){if(VOZ.on&&VOZ.el===el)return vozStop();if(VOZ.on)vozStop(true);vozStart(el)}
function vozStart(el){if(!VozSR||VOZ.negado)return;const v=el.value,P=el._micPos||[v.length,v.length],s=Math.min(P[0]??v.length,v.length),e=Math.min(P[1]??s,v.length);
 VOZ.el=el;VOZ.antes=v.slice(0,s);VOZ.despues=v.slice(e);VOZ.ultimo='';VOZ.on=true;VOZ.reint=0;vozNueva();vozUI()}
function vozNueva(){let r;try{r=new VozSR()}catch(e){VOZ.on=false;vozUI();return}
 r.lang=vozLang();r.continuous=true;r.interimResults=true;try{r.maxAlternatives=1}catch(e){}
 r.onresult=ev=>{if(VOZ.rec!==r)return;const fin=[],tmp=[];for(let i=0;i<ev.results.length;i++){const x=ev.results[i];(x.isFinal?fin:tmp).push(x[0].transcript)}vozPintar(fin.concat(tmp).join(' '))};
 r.onerror=ev=>{if(VOZ.rec!==r)return;const n=ev&&ev.error;
  if(n==='not-allowed'||n==='service-not-allowed'){vozCommit();VOZ.on=false;VOZ.rec=null;vozNegado();toast('Sin permiso para el micrófono: usa el micrófono del teclado')}
  else if(n==='network'||n==='audio-capture'||n==='language-not-supported'){vozCommit();VOZ.on=false;vozUI();toast(n==='audio-capture'?'No se encontró micrófono':'No se pudo dictar aquí: usa el micrófono del teclado')}};
 r.onend=()=>{if(VOZ.rec!==r)return;vozCommit();
  /* algunos teléfonos cortan solos tras un silencio: si no tocaste Parar, se sigue escuchando */
  if(VOZ.on&&VOZ.el&&document.body.contains(VOZ.el)&&VOZ.reint<30){VOZ.reint++;vozNueva();return}
  VOZ.on=false;VOZ.rec=null;vozUI()};
 VOZ.rec=r;try{r.start()}catch(e){VOZ.on=false;VOZ.rec=null;vozUI()}}
function vozStop(abortar){VOZ.on=false;const r=VOZ.rec;if(r){try{abortar?r.abort():r.stop()}catch(e){}}if(abortar){vozCommit();VOZ.rec=null}vozUI()}
