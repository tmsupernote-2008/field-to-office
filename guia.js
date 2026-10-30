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
 const T=guiaTarget(),st=$('stage');if(T)toast('🧭 Guiando a '+T.p.cod);if(st)st.scrollIntoView({block:'start',behavior:'smooth'})}
function guiaOptsHTML(c){const L=guiaLista(c);
 return `<option value="">${L.length?'— Sin guía —':'— Sin resultados —'}</option>`+L.map(t=>{const x=ptTipo(t.p);return `<option value="${esc(t.p.cod)}"${t.p.cod===vista.guia?' selected':''}>${esc(t.p.cod)} · ${esc(x.nombre)}${vista.buscar?' · '+esc(uLabel(t.c.unidad))+(t.c.area?' ('+esc(t.c.area)+')':''):(t.c.id===c.id?'':' · otra vista'+(t.c.area?' ('+esc(t.c.area)+')':''))}${ptDir(t.c,t.p)?'':' · sin dirección'}</option>`}).join('')}
function guiaBuscar(q){vista.gq=q;const c=capById(vista.cid);if(!c)return;const s=$('guiaSel');if(s){s.innerHTML=guiaOptsHTML(c);s.value=guiaTarget()&&guiaLista(c).some(t=>t.p.cod===vista.guia)?vista.guia:''}
 const n=$('guiaN');if(n)n.textContent=guiaLista(c).length+' marca'+(guiaLista(c).length===1?'':'s')}
function guiaBarHTML(c){return `<div class="guiabar" id="guiaBar"><button class="sec" id="btnGuiaAntC" aria-label="Anterior" onclick="guiaPaso(-1)">◀</button><button id="btnGuiar" onclick="guiar()">🧭 Guiar</button><button class="sec" id="btnGuiaSigC" aria-label="Siguiente" onclick="guiaPaso(1)">▶</button></div>
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
 return `<div class="gflecha" id="guiaFlecha" data-noi18n data-dir="${dir}" data-cod="${esc(T.p.cod)}" style="left:${L[0].toFixed(1)}px;top:${L[1].toFixed(1)}px;transform:${L[2]};flex-direction:${L[3]}" ${otra?'onclick="guiaIrVista()"':''} title="${esc(txt)}">
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
