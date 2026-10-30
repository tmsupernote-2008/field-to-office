/* ===== 🧭 GUIAR A MARCA CON FLECHAS (sensores de orientación del teléfono) =====
   Límite honesto: NO es AR de verdad. Al marcar, se guarda hacia dónde apuntaba el teléfono (DeviceOrientationEvent:
   alpha/beta/gamma; brújula si el teléfono la da) y, con el campo de visión aproximado de la cámara, la dirección
   de cada punto (yaw = rumbo, pitch = arriba/abajo). Al volver, se compara con hacia dónde apunta el teléfono ahora
   y se dibuja una flecha en la orilla de la imagen. Cuando la marca queda dentro de la imagen se muestra un anillo
   que late sobre el punto (en la foto guía); la posición exacta se ajusta a ojo alineando la foto guía.
   - Brújula (absoluta): sirve otro día. Sin brújula (relativa): izquierda/derecha solo en la misma sesión; arriba/abajo siempre.
   - La brújula falla cerca de metal (studs, ductos) y aparatos eléctricos: la flecha es aproximada.
   - Vistas viejas (sin dirección guardada) o sin sensores: anillo en la foto guía + ◀ ▶ por lista y flecha “otra vista”.
   iPhone: hay que tocar “Activar sensores” (DeviceOrientationEvent.requestPermission). Todo en el teléfono, sin servidor. */
const GFOV_LARGO=64; /* grados del lado largo de la imagen de la cámara trasera (aprox., teléfono típico) */
const NOTA_FLECHAS='ℹ️ Las flechas son una guía aproximada con los sensores del teléfono (brújula y giro), no AR de verdad. La brújula falla cerca de metal. Cuando veas el anillo, termina de alinear con la foto guía.';
const SENS={a:0,b:0,g:0,abs:false,ok:false,src:'',on:false,perm:null,ses:Math.random().toString(36).slice(2,8),last:0,raf:0,nada:false};
const RAD=Math.PI/180;
function sensPideTap(){return typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'&&SENS.perm!=='granted'}
function sensEv(e,absEv){if(e.alpha==null&&e.beta==null&&e.gamma==null)return;let a=e.alpha||0,abs=!!(absEv||e.absolute);
 if(typeof e.webkitCompassHeading==='number'&&!isNaN(e.webkitCompassHeading)&&e.webkitCompassHeading>=0){a=(360-e.webkitCompassHeading)%360;abs=true}
 if(!absEv&&SENS.src==='absoluta'&&Date.now()-SENS.last<1500)return; /* Android manda las dos: se prefiere la absoluta */
 SENS.a=a;SENS.b=e.beta||0;SENS.g=e.gamma||0;SENS.abs=abs;SENS.src=absEv?'absoluta':'normal';SENS.last=Date.now();const antes=SENS.ok;SENS.ok=true;SENS.nada=false;
 if(!antes)sensEstado();guiaTick()}
function sensStart(){if(SENS.on||typeof window.DeviceOrientationEvent==='undefined'){if(!SENS.on){SENS.nada=true;sensEstado()}return}SENS.on=true;
 window.addEventListener('deviceorientationabsolute',e=>sensEv(e,true));window.addEventListener('deviceorientation',e=>sensEv(e,false));
 setTimeout(()=>{if(!SENS.ok){SENS.nada=true;sensEstado();guiaTick()}},1800)}
async function sensPedir(){if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
  try{SENS.perm=await DeviceOrientationEvent.requestPermission()}catch(e){SENS.perm='denied'}
  if(SENS.perm!=='granted'){toast('Sin permiso para los sensores: se usa solo la foto guía');sensEstado();return}}
 SENS.on=false;sensStart();sensEstado()}
window.addEventListener('orientationchange',()=>guiaTick());
function sensEstado(){const txt=SENS.ok?(SENS.abs?'🧭 Sensores activos con brújula (dirección aproximada).':'🧭 Sensores activos sin brújula: izquierda/derecha solo sirve hasta que cierres la app; arriba/abajo sí.')
 :sensPideTap()?(SENS.perm==='denied'?'🧭 Sin permiso para los sensores: se usa solo la foto guía y ◀ ▶.':'🧭 Toca “Activar sensores” para que las flechas sepan hacia dónde apunta el teléfono.')
 :SENS.nada?'🧭 Este teléfono/navegador no da la orientación: se usa solo la foto guía y ◀ ▶.':'🧭 Buscando sensores…';
 ['sensEstado','sensMarcar'].forEach(id=>{const e=$(id);if(e)e.textContent=txt+(id==='sensMarcar'&&SENS.ok?' Al congelar la imagen se guarda hacia dónde apunta el teléfono.':'')});
 document.querySelectorAll('.btnSens').forEach(b=>b.classList.toggle('hidden',SENS.ok||!(sensPideTap()&&SENS.perm!=='denied')))}
/* ---- matemáticas (W3C: R = Rz(alpha)·Rx(beta)·Ry(gamma); mundo = Este, Norte, Arriba) ---- */
function matR(a,b,g){a*=RAD;b*=RAD;g*=RAD;const cA=Math.cos(a),sA=Math.sin(a),cB=Math.cos(b),sB=Math.sin(b),cG=Math.cos(g),sG=Math.sin(g);
 return [[cA*cG-sA*sB*sG,-cB*sA,cA*sG+cG*sA*sB],[cG*sA+cA*sB*sG,cA*cB,sA*sG-cA*cG*sB],[-cB*sG,sB,cB*cG]]}
function mulM(M,v){return [0,1,2].map(i=>M[i][0]*v[0]+M[i][1]*v[1]+M[i][2]*v[2])}
function mulMT(M,v){return [0,1,2].map(i=>M[0][i]*v[0]+M[1][i]*v[1]+M[2][i]*v[2])}
function scrAng(){try{const a=screen.orientation&&typeof screen.orientation.angle==='number'?screen.orientation.angle:(window.orientation||0);return +a||0}catch(e){return 0}}
function rotZ(v,deg){const t=deg*RAD,c=Math.cos(t),s=Math.sin(t);return [v[0]*c-v[1]*s,v[0]*s+v[1]*c,v[2]]}
const scr2dev=(v,ang)=>rotZ(v,-ang), dev2scr=(v,ang)=>rotZ(v,ang);
function fovDe(w,h){const r=Math.min(w,h)/Math.max(w,h),corto=+(2*Math.atan(Math.tan(GFOV_LARGO*RAD/2)*r)/RAD).toFixed(1);return w>=h?{h:GFOV_LARGO,v:corto}:{h:corto,v:GFOV_LARGO}}
function oriSnap(){return SENS.ok?{a:+SENS.a.toFixed(2),b:+SENS.b.toFixed(2),g:+SENS.g.toFixed(2),abs:SENS.abs,ses:SENS.ses,scr:scrAng()}:null}
function dirPunto(o,x,y){const tx=Math.tan(o.fh*RAD/2),ty=Math.tan(o.fv*RAD/2),d=scr2dev([(x-.5)*2*tx,-(y-.5)*2*ty,-1],o.scr||0),w=mulM(matR(o.a,o.b,o.g),d),n=Math.hypot(w[0],w[1],w[2]);return w.map(v=>+(v/n).toFixed(5))}
function yawPitch(w){return {yaw:+((Math.atan2(w[0],w[1])/RAD+360)%360).toFixed(1),pitch:+(Math.asin(Math.max(-1,Math.min(1,w[2])))/RAD).toFixed(1)}}
/* al guardar una vista: dirección de la cámara y de cada punto */
function oriGuardar(cap,snap){if(!snap)return;const f=fovDe(cap.w,cap.h);cap.ori=Object.assign({},snap,{fh:f.h,fv:f.v});
 const cen=yawPitch(dirPunto(cap.ori,.5,.5));cap.ori.yaw=cen.yaw;cap.ori.pitch=cen.pitch;
 cap.puntos.forEach(p=>{p.dir=dirPunto(cap.ori,p.x,p.y);Object.assign(p,yawPitch(p.dir))})}
function ptDir(c,p){if(p&&Array.isArray(p.dir)&&p.dir.length===3)return p.dir;if(c&&c.ori&&typeof c.ori.fh==='number')return dirPunto(c.ori,p.x,p.y);return null}
/* hacia dónde está la marca respecto a la cámara ahora */
function guiaCalc(c,p){const w0=ptDir(c,p);if(!w0)return {modo:'sinDir'};if(!SENS.ok)return {modo:'sinSens'};
 const R=matR(SENS.a,SENS.b,SENS.g),ang=scrAng();let w=w0,solo=false;
 const yawOk=(c.ori.abs&&SENS.abs)||(!c.ori.abs&&!SENS.abs&&c.ori.ses===SENS.ses);
 if(!yawOk){/* sin brújula común: se usa solo arriba/abajo (se iguala el rumbo al de la cámara) */
  const cam=mulM(R,scr2dev([0,0,-1],ang)),cy=Math.atan2(cam[0],cam[1]),hz=Math.hypot(w0[0],w0[1]);w=[hz*Math.sin(cy),hz*Math.cos(cy),w0[2]];solo=true}
 const s=dev2scr(mulMT(R,w),ang),fz=-s[2],fov=c.ori?{h:c.ori.fh,v:c.ori.fv}:fovDe(c.w,c.h);
 const h=Math.atan2(s[0],fz)/RAD,v=Math.atan2(s[1],Math.hypot(fz,s[0]))/RAD,tot=Math.acos(Math.max(-1,Math.min(1,fz)))/RAD;
 const dentro=fz>0&&Math.abs(Math.atan2(s[0],fz)/RAD)<fov.h/2*.85&&Math.abs(Math.atan2(s[1],fz)/RAD)<fov.v/2*.85;
 return {modo:'ok',dentro,h,v,tot,solo,sx:s[0],sy:s[1],fz,atras:fz<0}}
/* 🌐 los textos de la guía se arman con frases completas del diccionario (i18n_dic.js); en español salen igual que antes */
function GT(k,p){if(window.I18N)return I18N.t(k,p);return k.replace(/\{(\w+)\}/g,(m,n)=>p&&p[n]!=null?p[n]:m)}
function GTR(s){return window.I18N&&s?I18N.tr(s):s}
function cuantoTxt(g){return g<20?'un poco ':g>110?'mucho ':''}
function guiaPalabras(g){const P=[];
 if(g.atras&&Math.abs(g.h)>135){P.push(GT('está detrás de ti: date la vuelta'+(g.h>0?' por la derecha':' por la izquierda')))}
 else if(Math.abs(g.h)>=6)P.push(GT('gira '+cuantoTxt(Math.abs(g.h))+(g.h>0?'a la derecha':'a la izquierda')+' (≈{n}°)',{n:Math.round(Math.abs(g.h))}));
 if(Math.abs(g.v)>=6&&!(g.atras&&Math.abs(g.h)>135))P.push(GT(cuantoTxt(Math.abs(g.v))+(g.v>0?'más arriba':'más abajo')+' (≈{n}°)',{n:Math.round(Math.abs(g.v))}));
 return P.join(', ')||GT('casi enfrente')}
/* ---- lista de marcas de la unidad (todas las vistas) ---- */
/* en “🔎 Buscar marcas” (vista.buscar) la lista es de TODO el proyecto y se puede filtrar (vista.gq) */
function guiaTodas(c){const cs=vista.buscar?capsProj(c.pid):capsUnidad(c.pid,c.unidad);return cs.flatMap(x=>x.puntos.map(p=>({c:x,p}))).sort((a,b)=>(a.p.num||0)-(b.p.num||0))}
function guiaFiltro(t,q){q=nrm(q||'').trim();if(!q)return true;const x=ptTipo(t.p);return nrm([t.p.cod,t.p.num,x.nombre,uLabel(t.c.unidad),t.c.unidad,t.c.area,'piso '+(t.c.piso||'')].join(' ')).includes(q)}
function guiaLista(c){const L=guiaTodas(c);return vista.buscar&&vista.gq?L.filter(t=>guiaFiltro(t,vista.gq)):L}
function guiaTarget(){const c=capById(vista.cid);if(!c||!vista.guia)return null;return guiaTodas(c).find(t=>t.p.cod===vista.guia)||null}
function guiaSel(cod){vista.guia=cod||'';const s=$('guiaSel');if(s)s.value=vista.guia;guiaUpd()}
/* botón grande 🧭 Guiar (debajo de la imagen): guía a la marca escogida, o a la siguiente si no hay */
function guiar(){if(typeof sensPideTap==='function'&&sensPideTap()&&SENS.perm!=='denied')sensPedir();
 if(vista.guia&&guiaTarget())guiaUpd();else guiaPaso(1);
 const T=guiaTarget(),st=$('stage');if(T)toast('🧭 Guiando a '+T.p.cod);if(st)st.scrollIntoView({block:'start'});
 /* fto-v11: la cámara en vivo pasa a pantalla completa con la flecha grande encima */
 if(typeof vivoAbrir==='function')vivoAbrir()}
function guiaOptsHTML(c){const L=guiaLista(c);
 return `<option value="">${L.length?'— Sin guía —':'— Sin resultados —'}</option>`+L.map(t=>{const x=ptTipo(t.p);return `<option value="${esc(t.p.cod)}"${t.p.cod===vista.guia?' selected':''}>${esc(t.p.cod)} · ${esc(x.nombre)}${vista.buscar?' · '+esc(uLabel(t.c.unidad))+(t.c.area?' ('+esc(t.c.area)+')':''):(t.c.id===c.id?'':' · otra vista'+(t.c.area?' ('+esc(t.c.area)+')':''))}${ptDir(t.c,t.p)?'':' · sin dirección'}</option>`}).join('')}
function guiaBuscar(q){vista.gq=q;const c=capById(vista.cid);if(!c)return;const s=$('guiaSel');if(s){s.innerHTML=guiaOptsHTML(c);s.value=guiaTarget()&&guiaLista(c).some(t=>t.p.cod===vista.guia)?vista.guia:''}
 const n=$('guiaN');if(n)n.textContent=guiaLista(c).length+' marca'+(guiaLista(c).length===1?'':'s')}
function guiaBarHTML(c){return `<div class="guiabar" id="guiaBar"><button class="sec" id="btnGuiaAntC" aria-label="Anterior" onclick="guiaPaso(-1)">◀</button><button id="btnGuiar" onclick="guiar()">🧭 Guiar</button><button class="sec" id="btnGuiaSigC" aria-label="Siguiente" onclick="guiaPaso(1)">▶</button></div>
 <div class="row" style="margin-top:6px"><button class="big1" id="btnVivo" onclick="vivoAbrir()">📷 Cámara grande con flechas</button></div>
 <div id="guiaInfo" aria-live="polite" data-noi18n></div><div class="row" style="margin-top:6px"><button class="sec sm hidden" id="btnGuiaVista" onclick="guiaIrVista()">📷 Ir a la vista de esa marca</button></div>`}
function guiaPaso(d){const c=capById(vista.cid);if(!c)return;const L=guiaLista(c);if(!L.length){toast('No hay marcas con esa búsqueda');return}let i=L.findIndex(t=>t.p.cod===vista.guia);
 i=i<0?(d>0?0:L.length-1):(i+d+L.length)%L.length;guiaSel(L[i].p.cod)}
function guiaIrVista(){const T=guiaTarget();if(!T||T.c.id===vista.cid)return;vista.cid=T.c.id;vista.m='cam';render();toast('Foto guía de '+T.p.cod)}
function guiaCtlHTML(c){
 return `<div class="card" id="guiaCtl"><b>🧭 Guiar a marca</b><div class="mut">${vista.buscar?'Todas las marcas del proyecto. Busca o escoge una y toca 🧭 Guiar.':'Escoge una marca (o ◀ ▶) y sigue la flecha.'}</div>
 ${vista.buscar?`<input id="guiaQ" type="search" placeholder="Busca: P-003, plomero, 201, baño…" autocomplete="off" value="${esc(vista.gq||'')}" oninput="guiaBuscar(this.value)" onkeydown="if(event.key==='Enter'){const L=guiaLista(capById(vista.cid));if(L.length){guiaSel(L[0].p.cod);guiar()}this.blur()}" style="margin:6px 0"><div class="mut" id="guiaN">${guiaLista(c).length} marca${guiaLista(c).length===1?'':'s'}</div>`:''}
 <select id="guiaSel" onchange="guiaSel(this.value)">${guiaOptsHTML(c)}</select>
 <div class="row" style="margin-top:6px"><button class="sec sm" id="btnGuiaAnt" onclick="guiaPaso(-1)">◀ Anterior</button><button class="sm" id="btnGuiaSig" onclick="guiaPaso(1)">Siguiente ▶</button></div>
 <div class="mut" id="sensEstado" style="margin-top:6px"></div><p style="margin:6px 0"><button class="sm btnSens hidden" id="btnSens" onclick="sensPedir()">🧭 Activar sensores (flechas)</button></p>
 <div class="mut" id="notaFlechas">${NOTA_FLECHAS}</div></div>`}
function guiaTick(){if(SENS.raf)return;SENS.raf=(window.requestAnimationFrame||setTimeout)(()=>{SENS.raf=0;guiaUpd()})}
const FLECHA_SVG=col=>`<svg viewBox="0 0 100 100"><path d="M8 36 H52 V12 L94 50 L52 88 V64 H8 Z" fill="${esc(col)}" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></svg>`;
function guiaFlechaHTML(T,dx,dy,txt,otra){const st=$('stage');if(!st)return '';const W=st.clientWidth,H=st.clientHeight,t=ptTipo(T.p);
 let n=Math.hypot(dx,dy);if(n<1e-6){dx=1;dy=0;n=1}dx/=n;dy/=n;
 const ex=Math.max(0,W/2-34),ey=Math.max(0,H/2-34),k=Math.min(Math.abs(dx)>1e-6?ex/Math.abs(dx):1e9,Math.abs(dy)>1e-6?ey/Math.abs(dy):1e9);
 const dir=Math.abs(dx)>=Math.abs(dy)?(dx>0?'der':'izq'):(dy>0?'abajo':'arriba'),rot=Math.atan2(dy,dx)/RAD;
 let x=W/2+dx*k,y=H/2+dy*k;if(dir==='izq'||dir==='der')y=Math.max(40,Math.min(H-40,y));else x=Math.max(80,Math.min(W-80,x));
 /* la flecha va en la orilla; la etiqueta hacia adentro */
 const L={izq:[x-29,y,'translate(0,-50%)','row'],der:[x+29,y,'translate(-100%,-50%)','row-reverse'],arriba:[x,y-29,'translate(-50%,0)','column'],abajo:[x,y+29,'translate(-50%,-100%)','column-reverse']}[dir];
 return `<div class="gflecha${otra?' otra':''}" id="guiaFlecha" data-noi18n data-dir="${dir}" data-cod="${esc(T.p.cod)}" style="left:${L[0].toFixed(1)}px;top:${L[1].toFixed(1)}px;transform:${L[2]};flex-direction:${L[3]}" ${otra?'onclick="guiaIrVista()"':''} title="${esc(txt)}">
 <div class="garrow" style="transform:rotate(${rot.toFixed(1)}deg)">${FLECHA_SVG(t.color)}</div>
 <div class="glbl"><span class="gnum" style="background:${esc(t.color)};color:${txtCol(t.color)}">${esc(T.p.num)}</span>${esc(T.p.cod)} · ${esc(GTR(t.nombre))}<br>${esc(txt)}</div></div>`}
function guiaRing(T){const d=document.querySelector(`#dots .dot[data-cod="${CSS.escape(T.p.cod)}"]`);if(!d)return;d.classList.add('objetivo');
 const t=ptTipo(T.p);['','r2'].forEach(k=>{const r=document.createElement('div');r.className='ring '+k;if(!k)r.id='guiaRing';r.style.left=d.style.left;r.style.top=d.style.top;r.style.borderColor=t.color;$('dots').appendChild(r)})}
function guiaUpd(){const ov=document.getElementById('guiaOv');if(!ov)return;const c=capById(vista.cid);if(!c)return;
 const bg=$('btnGuiar'),T0=guiaTarget();if(bg){bg.textContent=T0?'🧭 Guiar a '+T0.p.cod:'🧭 Guiar';bg.classList.toggle('on',!!T0)}
 document.querySelectorAll('#dots .ring').forEach(e=>e.remove());document.querySelectorAll('#dots .dot.objetivo').forEach(e=>e.classList.remove('objetivo'));
 const info=$('guiaInfo'),bv=$('btnGuiaVista'),T=guiaTarget();ov.dataset.estado='';
 const pon=(h,t,e)=>{ov.innerHTML=h;ov.dataset.estado=e;if(info)info.textContent=t};
 if(bv)bv.classList.toggle('hidden',!(T&&T.c.id!==c.id));
 if(!T)return pon('','','');
 const otra=T.c.id!==c.id,g=guiaCalc(T.c,T.p),x=ptTipo(T.p),nom=T.p.cod+' ('+GTR(x.nombre)+')',dondeV=(T.c.unidad!==c.unidad?' – '+GTR(uLabel(T.c.unidad)):'')+(T.c.area?' – '+GTR(T.c.area):'');
 if(!otra){
  if(g.modo!=='ok'){guiaRing(T);return pon('',GT(g.modo==='sinDir'?'🎯 {a}: esta vista se guardó sin dirección (vista vieja o sin sensores). Alinea la foto guía con la pared: la marca está donde late el anillo.':'🎯 {a}: sin sensores de orientación. Alinea la foto guía con la pared: la marca está donde late el anillo.',{a:nom}),'anillo')}
  if(g.dentro){guiaRing(T);return pon('',GT('✅ {a} está a la vista: termina de alinear la foto guía; la marca está en el anillo.',{a:nom})+(g.solo?' '+GT('(Sin brújula: solo se revisó arriba/abajo.)'):''),'anillo')}
  const p=guiaPalabras(g);return pon(guiaFlechaHTML(T,g.sx,-g.sy,p,false),GT('➡️ {a}: {b}.',{a:nom,b:p})+(g.solo?' '+GT('(Sin brújula: solo arriba/abajo es confiable; izquierda/derecha guíate con la foto guía.)'):''),'flecha')}
 /* la marca está en otra vista/foto */
 if(g.modo==='ok'&&!g.dentro){const p=guiaPalabras(g);return pon(guiaFlechaHTML(T,g.sx,-g.sy,p+' · '+GT('otra vista'),true),GT('➡️ {a} está en otra vista{b}: {c}. Cuando la tengas enfrente, toca “Ir a la vista”.',{a:nom,b:dondeV,c:p}),'flecha')}
 if(g.modo==='ok'&&g.dentro)return pon(guiaFlechaHTML(T,1,0,GT('ya estás mirando hacia ella: toca para ver su foto guía'),true),GT('✅ Ya estás mirando hacia {a} (otra vista{b}). Toca la flecha o “Ir a la vista” para ver su foto guía.',{a:nom,b:dondeV}),'flecha');
 return pon(guiaFlechaHTML(T,1,0,GT('está en otra vista: toca para ir'),true),GT('📷 {a} está en otra vista{b}{c}. Toca la flecha o “Ir a la vista” para ver su foto guía.',{a:nom,b:dondeV,c:g.modo==='sinDir'?' '+GT('(guardada sin dirección)'):''}),'otraVista')}

/* ===== 📷 CÁMARA GRANDE CON FLECHAS EN VIVO (fto-v11) =====
   Al tocar 🧭 Guiar (o “Buscar marcas” → Guiar), la cámara EN VIVO ocupa toda la pantalla y encima va una capa
   transparente que se redibuja en cada cuadro (requestAnimationFrame) con una flecha grande hacia donde hay que
   girar/inclinar la cámara para que la marca quede donde se guardó (así el punto de color cae sobre la pared real).
   - Dirección: sensores (deviceorientation) → mismo cálculo que guiaCalc(), suavizado (≈0,12 s) para que no tiemble.
     Si te pasas, la flecha se voltea y dice “Te pasaste, regresa…”. Cerca se hace chica y verde; alineado: “¡Aquí está!”.
   - Distancia (acércate / aléjate): al marcar se guarda la referencia de la cámara (resolución, campo de visión, zoom).
     En vivo se compara la imagen de la cámara con la foto guía (bordes en miniatura, varias escalas y corrimientos):
     si la pared se ve más chica que en la foto guía → “Acércate”; más grande → “Aléjate / retrocede”.
     Si la imagen no se parece lo suficiente (pared lisa, poca luz, otra vista) se dice que NO hay dato fiable y
     se usa la transparencia de la foto guía a ojo.
   - Sin sensores (computadora / teléfono viejo): si la imagen se parece a la foto guía, la flecha sale de esa
     comparación (aproximada); si no, solo texto: alinear la foto guía a ojo.
   LÍMITE HONESTO: no es AR de verdad; la brújula falla cerca de metal y la distancia es una estimación. Sin red. */
const NOTA_VIVO='ℹ️ Guía aproximada: usa los sensores del teléfono y compara la cámara con la foto guía. No es AR de verdad; termina de alinear a ojo con la foto guía.';
const VIVO={raf:0,tPrev:0,eh:null,ev:null,ax:{h:{s:0},v:{s:0}},pas:null,m:null,mT:0,gKey:'',G:null,s:null,last:null,key:'',ui:{}};
const VTAU=.12,VSNAP=25,VAQ=4,VCERCA=12,VPAS=3,VPAS_MS=2500,VZ_CERCA=.87,VZ_LEJOS=1.15;
function vivoOn(){return !!(typeof vista!=='undefined'&&vista&&vista.vivo&&vista.pantalla==='verCap'&&document.getElementById('vid')&&document.getElementById('stage'))}
function vivoAbrir(){if(!$('vid'))return;vista.vivo=true;vivoAplicar()}
function vivoCerrar(){vista.vivo=false;vivoAplicar();const st=$('stage');if(st)st.scrollIntoView({block:'start'})}
function vivoReset(){VIVO.eh=VIVO.ev=null;VIVO.pas=null;VIVO.ax={h:{s:0},v:{s:0}};VIVO.s=null;VIVO.ui={}}
function vivoAplicar(){const st=$('stage');if(!st)return;const w=st.parentElement,on=vivoOn();
 document.body.classList.toggle('vivoOn',on);w.classList.toggle('full',on);st.classList.toggle('full',on);
 let h=$('vivoHud');if(on&&!h)w.insertAdjacentHTML('beforeend',vivoHudHTML());if(!on&&h)h.remove();
 fitStage(CAM.aspect);vivoReset();if(on){sensEstado();vivoLoop()}else vivoStop();guiaTick()}
function vivoHudHTML(){const op=vista.op!=null?vista.op:45,on=vista.ghost!==false;
 return `<div class="vivohud" id="vivoHud" data-noi18n data-estado="" data-dir="" data-zoom="" data-fuente="">
 <div class="vtop"><button id="vivoSalir" onclick="vivoCerrar()">✕ ${esc(GT('Salir'))}</button><div class="vtit" id="vivoTit"></div><button id="vivoGhostBtn" class="${on?'on':''}" onclick="vivoGhost()">👻 ${esc(GT('Foto guía'))}</button></div>
 <div class="vop${on?'':' hidden'}" id="vivoOpW"><input type="range" id="vivoOp" min="0" max="100" step="5" value="${op}" aria-label="${esc(GT('Transparencia de la foto guía'))}" oninput="vivoOp(this.value)"></div>
 <div class="vflecha hidden" id="vivoFlecha"><svg viewBox="0 0 100 100"><path d="M8 36 H52 V12 L94 50 L52 88 V64 H8 Z" fill="currentColor" stroke="#fff" stroke-width="5" stroke-linejoin="round"/></svg></div>
 <div class="vzoom hidden" id="vivoZoom">${[0,1,2,3].map(i=>`<div class="vz" data-i="${i}"><svg viewBox="0 0 100 100"><path d="M8 36 H52 V12 L94 50 L52 88 V64 H8 Z" fill="currentColor" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></svg></div>`).join('')}</div>
 <div class="vaqui hidden" id="vivoAqui"><div class="vring"></div><div class="vaquit">✓ ${esc(GT('¡Aquí está!'))}</div></div>
 <div class="vbot"><div class="vtxt" id="vivoTxt" aria-live="polite"></div><div class="vsub" id="vivoSub"></div><div class="vdist" id="vivoDist"></div>
  <div class="vrow"><button id="vivoAnt" aria-label="${esc(GT('Anterior'))}" onclick="guiaPaso(-1)">◀</button><button class="hidden" id="vivoIr" onclick="guiaIrVista()">📷 ${esc(GT('Ir a la vista'))}</button><button class="btnSens hidden" id="vivoSens" onclick="sensPedir()">🧭 ${esc(GT('Activar sensores'))}</button><button id="vivoSig" aria-label="${esc(GT('Siguiente'))}" onclick="guiaPaso(1)">▶</button></div>
  <div class="vnota" id="vivoNota">${esc(GT(NOTA_VIVO))}</div></div></div>`}
function vivoGhost(){vista.ghost=vista.ghost===false;const on=vista.ghost!==false,g=$('ghost'),c=$('ghostOn');if(g)g.classList.toggle('hidden',!on);if(c)c.checked=on;
 const b=$('vivoGhostBtn');if(b)b.classList.toggle('on',on);const w=$('vivoOpW');if(w)w.classList.toggle('hidden',!on)}
function vivoOp(v){vista.op=+v;const g=$('ghost');if(g)g.style.opacity=v/100;const r=$('ghostOp');if(r)r.value=v;const t=$('opVal');if(t)t.textContent=v+'%'}
function vivoLoop(){if(!VIVO.raf){VIVO.tPrev=0;VIVO.raf=requestAnimationFrame(vivoFrame)}}
function vivoStop(){if(VIVO.raf)cancelAnimationFrame(VIVO.raf);VIVO.raf=0;if(!vivoOn())document.body.classList.remove('vivoOn')}
function vivoFrame(ts){VIVO.raf=0;if(!vivoOn()||!$('vivoHud')){vivoStop();return}
 const dt=VIVO.tPrev?Math.min(.25,Math.max(0,(ts-VIVO.tPrev)/1000)):.016;VIVO.tPrev=ts;
 try{vivoMatchTick();const E=vivoCalc(dt);VIVO.last=E;vivoPinta(E)}catch(e){console.error(e)}
 VIVO.raf=requestAnimationFrame(vivoFrame)}
/* ángulo (grados) del punto respecto al centro de la foto guía: ahí debe quedar la marca */
function angGuardado(c,p){const o=c.ori,f=o&&typeof o.fh==='number'?{h:o.fh,v:o.fv}:fovDe(c.w,c.h);
 return {h:Math.atan((p.x-.5)*2*Math.tan(f.h*RAD/2))/RAD,v:Math.atan(-(p.y-.5)*2*Math.tan(f.v*RAD/2))/RAD,f}}
const ang180=a=>{a=((a+180)%360+360)%360-180;return a};
function suave(prev,raw,dt){if(prev==null||Math.abs(raw-prev)>VSNAP)return raw;return prev+(raw-prev)*(1-Math.exp(-dt/VTAU))}
function vivoCalc(dt){const c=capById(vista.cid),T=guiaTarget();
 const E={estado:'',dir:'',eh:0,ev:0,d:0,fuente:'',txt:'',sub:'',zoom:'',ztxt:'',zsub:'',otra:false,atras:false,pas:'',solo:false,cod:T?T.p.cod:''};
 if(!c||!T){E.estado='sinMarca';E.txt=GT('Escoge una marca con ◀ ▶');return E}
 const key=T.p.cod+'|'+c.id;if(VIVO.key!==key){VIVO.key=key;vivoReset()}
 E.otra=T.c.id!==c.id;const nom=T.p.cod;
 const g=guiaCalc(T.c,T.p),a=angGuardado(T.c,T.p),m=VIVO.m&&VIVO.m.cid===c.id&&performance.now()-VIVO.m.t<2500?VIVO.m:null,mOk=!!(m&&m.conf&&!E.otra);
 let eh=null,ev=null;
 if(g.modo==='ok'){E.fuente='sensores';ev=g.v-a.v;if(!g.solo)eh=ang180(g.h-a.h);else{E.solo=true;if(mOk){eh=m.eh;E.fuente='sensores+imagen'}else eh=0}E.atras=!!(g.atras&&Math.abs(g.h)>135)}
 else if(mOk){E.fuente='imagen';eh=m.eh;ev=m.ev}
 else{E.fuente='ninguna';
  if(E.otra){E.estado='otraVista';E.txt=GT('{a} está en otra vista: toca “Ir a la vista”.',{a:nom});return E}
  E.estado=g.modo==='sinDir'?'sinDir':'sinSens';
  E.txt=g.modo==='sinDir'?GT('Esta vista se guardó sin dirección: mueve la cámara hasta que la foto guía coincida con la pared.')
   :!SENS.ok&&!SENS.nada&&!(sensPideTap()&&SENS.perm!=='granted')?GT('Buscando sensores…')
   :sensPideTap()&&SENS.perm!=='denied'?GT('Toca “Activar sensores” para que las flechas sigan al teléfono.')
   :GT('Sin sensores de orientación (computadora o teléfono viejo): mueve la cámara hasta que la foto guía coincida con la pared.');
  E.sub=GT('La marca está en el punto de color. La imagen todavía no se parece lo suficiente a la foto guía para dar flechas.');return E}
 VIVO.eh=suave(VIVO.eh,eh,dt);VIVO.ev=suave(VIVO.ev,ev,dt);eh=VIVO.eh;ev=VIVO.ev;E.eh=+eh.toFixed(2);E.ev=+ev.toFixed(2);E.d=Math.hypot(eh,ev);
 /* ¿te pasaste? (el error cambió de signo en un eje) */
 const now=performance.now();
 [['h',eh],['v',ev]].forEach(([k,e])=>{const A=VIVO.ax[k],s=Math.abs(e)>=VPAS?Math.sign(e):0;if(k==='h'&&E.solo&&E.fuente==='sensores')return;
  if(s&&A.s&&s!==A.s)VIVO.pas={k,t:now};if(s)A.s=s;if(VIVO.pas&&VIVO.pas.k===k&&Math.abs(e)<VPAS)VIVO.pas=null});
 if(VIVO.pas&&now-VIVO.pas.t>VPAS_MS)VIVO.pas=null;
 const ah=Math.abs(eh),av=Math.abs(ev);
 const H=ah>=2&&ah>=.414*av?(eh>0?'der':'izq'):'',V=av>=2&&av>=.414*ah?(ev>0?'arriba':'abajo'):'';E.dir=V&&H?V+'-'+H:(V||H);
 /* distancia (acércate / aléjate) con la comparación de la imagen */
 if(E.d<15||E.fuente==='imagen'){
  if(mOk&&m.conf){VIVO.s=VIVO.s==null?m.s:VIVO.s+(m.s-VIVO.s)*(1-Math.exp(-dt/.25));const s=VIVO.s;
   if(s<VZ_CERCA){E.zoom='acercate';E.ztxt=GT(s<.72?'Acércate a la pared':'Acércate un poco');E.zsub=GT('Se ve ≈{n}% más chico que en la foto guía',{n:Math.round((1-s)*100)})}
   else if(s>VZ_LEJOS){E.zoom='alejate';E.ztxt=GT(s>1.4?'Aléjate: retrocede un paso':'Aléjate un poco');E.zsub=GT('Se ve ≈{n}% más grande que en la foto guía',{n:Math.round((s-1)*100)})}
   else{E.zoom='ok';E.ztxt=GT('Distancia bien')}}
  else if(!E.otra){E.zoom='sinEscala';E.ztxt=GT('Distancia: sin dato fiable. Sube o baja la transparencia de la foto guía y compara a ojo.')}}
 /* textos */
 const gH=()=>GT(eh>0?(ah<VCERCA?'Gira un poco a la derecha':'Gira a la derecha'):(ah<VCERCA?'Gira un poco a la izquierda':'Gira a la izquierda'));
 const gV=()=>GT(ev>0?(av<VCERCA?'Sube un poco':'Sube la cámara'):(av<VCERCA?'Baja un poco':'Baja la cámara'));
 const parts=[];if(ah>=1&&!(E.solo&&E.fuente==='sensores'))parts.push(GT(eh>0?'≈{n}° a la derecha':'≈{n}° a la izquierda',{n:Math.round(ah)}));if(av>=1)parts.push(GT(ev>0?'≈{n}° arriba':'≈{n}° abajo',{n:Math.round(av)}));
 E.sub=parts.join(' · ');
 if(E.solo&&E.fuente==='sensores')E.sub=(E.sub?E.sub+' · ':'')+GT('Sin brújula: izquierda/derecha no es confiable; guíate con la foto guía.');
 if(E.fuente==='imagen')E.sub=(E.sub?E.sub+' · ':'')+GT('Sin sensores: la flecha sale de comparar la cámara con la foto guía (aproximado).');
 if(E.atras){E.estado='atras';E.dir=eh>0?'der':'izq';E.txt=GT(eh>0?'Está detrás de ti: date la vuelta por la derecha':'Está detrás de ti: date la vuelta por la izquierda');return E}
 if(E.d<VAQ){if(E.zoom==='acercate'||E.zoom==='alejate'){E.estado='cerca';E.dir='';E.txt=E.ztxt;return E}
  E.estado=E.otra?'otraAqui':'aqui';E.dir='';E.txt=E.otra?GT('Ya estás mirando hacia {a}: toca “Ir a la vista”.',{a:nom}):GT('¡Aquí está!');
  if(!E.otra)E.sub=GT('{a}: la marca está en el anillo verde.',{a:nom});return E}
 /* “te pasaste” solo si ese eje es el que más falta (si no, manda la flecha normal) */
 if(VIVO.pas&&(VIVO.pas.k==='h'?ah>=av:av>=ah)){E.estado='pasaste';E.pas=VIVO.pas.k;E.txt=GT(VIVO.pas.k==='h'?(eh>0?'Te pasaste, regresa a la derecha':'Te pasaste, regresa a la izquierda'):(ev>0?'Te pasaste, sube un poco':'Te pasaste, baja un poco'));return E}
 E.estado=E.d<VCERCA?'cerca':'lejos';
 if(H&&V){const k={'arriba-der':'Gira a la derecha y sube','abajo-der':'Gira a la derecha y baja','arriba-izq':'Gira a la izquierda y sube','abajo-izq':'Gira a la izquierda y baja'}[E.dir];E.txt=GT(k)}
 else E.txt=H?gH():V?gV():GT('Ya casi…');
 return E}
const setTxt=(el,t)=>{if(el&&el.textContent!==t)el.textContent=t};
const setAttr=(el,k,v)=>{if(el&&el.dataset[k]!==v)el.dataset[k]=v};
function vivoPinta(E){const h=$('vivoHud'),st=$('stage');if(!h||!st)return;const r=st.getBoundingClientRect(),S=Math.min(innerWidth,innerHeight),T=guiaTarget();
 setAttr(h,'estado',E.estado);setAttr(h,'dir',E.dir);setAttr(h,'zoom',E.zoom);setAttr(h,'fuente',E.fuente);
 const tit=T?`${T.p.cod} · ${GTR(ptTipo(T.p).nombre)}${E.otra?' · '+GT('otra vista'):''}`:GT('Cámara en vivo');
 const te=$('vivoTit');if(te&&te.dataset.t!==tit){te.dataset.t=tit;const x=T?ptTipo(T.p):null;te.innerHTML=(x?`<span class="gnum" style="background:${esc(x.color)};color:${txtCol(x.color)}">${esc(T.p.num)}</span>`:'')+esc(tit)}
 setTxt($('vivoTxt'),E.txt);setTxt($('vivoSub'),E.sub||'');setTxt($('vivoDist'),E.ztxt?(E.ztxt+(E.zsub?' ('+E.zsub+')':'')):'');
 const ir=$('vivoIr');if(ir)ir.classList.toggle('hidden',!E.otra);
 const cx=r.left+r.width/2,cy=r.top+r.height/2;
 /* flecha grande: más grande y roja lejos, chica y verde cerca */
 const f=$('vivoFlecha'),verF=!!E.dir&&/^(lejos|cerca|pasaste|atras)$/.test(E.estado);f.classList.toggle('hidden',!verF);
 if(verF){const k=Math.max(0,Math.min(1,(E.d-VAQ)/36)),size=Math.round(S*(.2+.2*k)),hue=E.estado==='pasaste'?48:E.atras?0:Math.round(120*(1-k));
  let rot=Math.atan2(-E.ev,E.eh)/RAD;if(E.atras)rot=E.eh>0?0:180;else if(E.solo&&E.fuente==='sensores')rot=E.ev>0?-90:90;
  const off=Math.min(r.width,r.height)*.18+size*.15,x=cx+Math.cos(rot*RAD)*off-size/2,y=cy+Math.sin(rot*RAD)*off-size/2;
  f.style.width=f.style.height=size+'px';f.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;f.style.color=`hsl(${hue},95%,${E.estado==='cerca'?45:52}%)`;
  f.dataset.rot=rot.toFixed(1);f.dataset.size=size;f.dataset.hue=hue}
 /* acércate (flechas hacia afuera) / aléjate (hacia adentro) en las esquinas */
 const z=$('vivoZoom'),verZ=E.zoom==='acercate'||E.zoom==='alejate';z.classList.toggle('hidden',!verZ);
 if(verZ){const zs=Math.round(S*.13),ins=Math.min(r.width,r.height)*.16;[...z.children].forEach((el,i)=>{const sx=i%2?1:-1,sy=i<2?-1:1,
   ax=E.zoom==='acercate'?Math.atan2(sy,sx)/RAD:Math.atan2(-sy,-sx)/RAD,px=(sx<0?r.left+ins:r.right-ins)-zs/2,py=(sy<0?r.top+ins:r.bottom-ins)-zs/2;
   el.style.width=el.style.height=zs+'px';el.style.transform=`translate(${px.toFixed(1)}px,${py.toFixed(1)}px) rotate(${ax.toFixed(1)}deg)`})}
 /* ¡Aquí está!: anillo verde sobre el punto de la marca */
 const aq=$('vivoAqui'),verA=E.estado==='aqui'||E.estado==='otraAqui';aq.classList.toggle('hidden',!verA);
 if(verA){const px=E.otra||!T?cx:r.left+T.p.x*r.width,py=E.otra||!T?cy:r.top+T.p.y*r.height,rs=Math.round(S*.26);aq.style.left=px.toFixed(1)+'px';aq.style.top=py.toFixed(1)+'px';const ring=aq.firstElementChild;ring.style.width=ring.style.height=rs+'px'}}
/* ---- comparación de la cámara con la foto guía (escala y corrimiento aproximados) ---- */
function vivoMatchTick(){const now=performance.now();if(now-VIVO.mT<350)return;VIVO.mT=now;try{VIVO.m=vivoMatch()}catch(e){VIVO.m=null}}
function blur3(A,w,h){const B=new Float32Array(A.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let j=-1;j<=1;j++){const yy=y+j;if(yy<0||yy>=h)continue;for(let i=-1;i<=1;i++){const xx=x+i;if(xx<0||xx>=w)continue;s+=A[yy*w+xx];n++}}B[y*w+x]=s/n}return B}
function rasgos(src,sx,sy,sw,sh,w,h){const c1=VIVO.c1||(VIVO.c1=document.createElement('canvas')),c2=VIVO.c2||(VIVO.c2=document.createElement('canvas'));
 c1.width=w*4;c1.height=h*4;const x1=c1.getContext('2d');x1.imageSmoothingEnabled=true;x1.imageSmoothingQuality='high';x1.drawImage(src,sx,sy,sw,sh,0,0,c1.width,c1.height);
 c2.width=w;c2.height=h;const x2=c2.getContext('2d',{willReadFrequently:true});x2.imageSmoothingEnabled=true;x2.imageSmoothingQuality='high';x2.drawImage(c1,0,0,w,h);
 const d=x2.getImageData(0,0,w,h).data,n=w*h,L=new Float32Array(n),E=new Float32Array(n);for(let i=0;i<n;i++)L[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;E[i]=Math.abs(L[i+1]-L[i-1])+Math.abs(L[i+w]-L[i-w])}return blur3(blur3(E,w,h),w,h)}
function ncc(G,Lv,w,h,mx,my,cx,cy,s,tx,ty){let n=0,sa=0,sb=0,sab=0,saa=0,sbb=0,tot=0;
 for(let y=my;y<h-my;y++){const ly=Math.round(cy+(y-cy)*s+ty);for(let x=mx;x<w-mx;x++){tot++;if(ly<0||ly>=h)continue;const lx=Math.round(cx+(x-cx)*s+tx);if(lx<0||lx>=w)continue;
  const a=G[y*w+x],b=Lv[ly*w+lx];n++;sa+=a;sb+=b;sab+=a*b;saa+=a*a;sbb+=b*b}}
 if(n<tot*.5)return -1;const va=saa-sa*sa/n,vb=sbb-sb*sb/n;if(va<=1e-6||vb<=1e-6)return -1;return (sab-sa*sb/n)/Math.sqrt(va*vb)}
function vivoMatch(){const v=$('vid'),g=$('ghost'),c=capById(vista.cid);if(!v||!g||!c||!v.videoWidth||!g.naturalWidth||v.readyState<2)return null;
 const A=g.naturalWidth/g.naturalHeight,N=48,w=A>=1?N:Math.max(16,Math.round(N*A)),h=A>=1?Math.max(16,Math.round(N/A)):N;
 const key=g.currentSrc+'|'+w+'x'+h;if(VIVO.gKey!==key){VIVO.G=rasgos(g,0,0,g.naturalWidth,g.naturalHeight,w,h);VIVO.gKey=key}
 const vw=v.videoWidth,vh=v.videoHeight;let sx=0,sy=0,sw=vw,sh=vh;if(vw/vh>A){sw=vh*A;sx=(vw-sw)/2}else{sh=vw/A;sy=(vh-sh)/2}
 const Lv=rasgos(v,sx,sy,sw,sh,w,h),G=VIVO.G,mx=Math.round(w*.14),my=Math.round(h*.14),cx=(w-1)/2,cy=(h-1)/2,R=2*Math.round(Math.min(w,h)*.15);/* par: la rejilla de paso 2 incluye el 0 */
 const per=[];let best={sc:-2};
 for(let k=-7;k<=7;k++){const s=Math.pow(1.07,k);let bs=-2,bt=[0,0];for(let ty=-R;ty<=R;ty+=2)for(let tx=-R;tx<=R;tx+=2){const q=ncc(G,Lv,w,h,mx,my,cx,cy,s,tx,ty);if(q>bs){bs=q;bt=[tx,ty]}}
  per.push(bs);if(bs>best.sc)best={sc:bs,s,tx:bt[0],ty:bt[1]}}
 const b0=Object.assign({},best);for(const ds of [1/1.035,1,1.035])for(let ty=b0.ty-2;ty<=b0.ty+2;ty++)for(let tx=b0.tx-2;tx<=b0.tx+2;tx++){const s=b0.s*ds,q=ncc(G,Lv,w,h,mx,my,cx,cy,s,tx,ty);if(q>best.sc+1e-4)best={sc:q,s,tx,ty}}
 const lo=Math.min(...per.filter(x=>x>-2)),conf=best.sc>=(c.ref?.4:.5)&&best.sc-lo>=.1;
 const f=c.ori&&typeof c.ori.fh==='number'?{h:c.ori.fh,v:c.ori.fv}:fovDe(c.w,c.h);
 return {cid:c.id,t:performance.now(),s:+best.s.toFixed(3),tx:best.tx/(w/2),ty:best.ty/(h/2),score:+best.sc.toFixed(3),conf,
  eh:+(Math.atan(best.tx/(w/2)*Math.tan(f.h*RAD/2))/RAD).toFixed(2),ev:+(-Math.atan(best.ty/(h/2)*Math.tan(f.v*RAD/2))/RAD).toFixed(2)}}
if(window.I18N)I18N.onChange(()=>{const h=document.getElementById('vivoHud');if(h){h.remove();vivoAplicar()}});
