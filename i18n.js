/* Field to Office – idiomas (🌐). Mismo enfoque que Firmax (I18N.t, botón 🌐, 7 idiomas, localStorage, idioma del teléfono).
   El diccionario está en i18n_dic.js: cada entrada es  "texto en español": [en, pt, ht, fr, ru, uk].
   Las claves pueden llevar marcadores {n} (número) o {a} {b}… (cualquier texto); las traducciones usan los mismos marcadores.
   La app sigue escribiendo su interfaz en español (ids y selectores no cambian); este archivo traduce al vuelo los textos
   que aparecen en la pantalla (MutationObserver), los placeholder/title/aria-label/alt y los alert/confirm/prompt.
   NO traduce lo que escribe el usuario: textarea, inputs, y todo lo que esté dentro de [data-noi18n] o [translate=no]
   (texto de las specs, mensajes ya armados, nombres de proyecto/unidad escritos por la oficina, etc.).
   Sin red: todo es estático. */
(function(){
'use strict';
var LANGS=['es','en','pt','ht','fr','ru','uk'];
var NAMES={es:'Español',en:'English',pt:'Português',ht:'Kreyòl ayisyen',fr:'Français',ru:'Русский',uk:'Українська'};
var SR={es:'es-US',en:'en-US',pt:'pt-BR',ht:'ht-HT',fr:'fr-FR',ru:'ru-RU',uk:'uk-UA'};
var K='fto_idioma';
var D=window.FTO_DIC||{};
var lang='es',subs=[],EX=Object.create(null),PAT=[];
function ok(l){return LANGS.indexOf(l)>=0}
function lsGet(){try{return localStorage.getItem(K)}catch(e){return null}}
function lsSet(v){try{localStorage.setItem(K,v)}catch(e){}}
(function detect(){
 var s=lsGet();if(s&&ok(s)){lang=s;return}
 var nl=[].concat(navigator.languages||[],navigator.language||[]);
 for(var i=0;i<nl.length;i++){var p=String(nl[i]||'').toLowerCase().split(/[-_]/)[0];if(ok(p)){lang=p;return}}
 lang='es';
})();
function sp(s){return String(s).replace(/\s+/g,' ').trim()}
function reEsc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
(function build(){
 Object.keys(D).forEach(function(k){var c=sp(k);
  if(/\{\w+\}/.test(c)){var names=[];var re=reEsc(c).replace(/\\\{(\w+)\\\}/g,function(m,n){names.push(n);return n.charAt(0)==='n'?'(\\d+(?:[.,]\\d+)?)':'(.+?)'});
   PAT.push({re:new RegExp('^'+re+'$'),names:names,k:k,len:c.replace(/\{\w+\}/g,'').length})}
  else EX[c]=k});
 PAT.sort(function(a,b){return b.len-a.len});
})();
function pick(k,lg){lg=lg||lang;if(lg==='es')return k;var e=D[k];var s=e&&e[LANGS.indexOf(lg)-1];return s==null||s===''?null:s}
function fill(s,p){return s.replace(/\{(\w+)\}/g,function(m,n){return p&&p[n]!=null?String(p[n]):m})}
/* traduce un texto completo (sin espacios de orilla). Devuelve null si no lo conoce. */
var MISS=Object.create(null),DEBUG=false;try{DEBUG=localStorage.getItem('fto_i18n_debug')==='1'}catch(e){}
/* textos que ya están en el idioma elegido (p. ej. armados con t()): se dejan tal cual */
var VALS=Object.create(null);function isVal(c,lg){var V=VALS[lg];if(!V){V=VALS[lg]=Object.create(null);var ix=LANGS.indexOf(lg)-1;Object.keys(D).forEach(function(k){var v=D[k][ix];if(v&&!/\{\w+\}/.test(v))V[sp(v)]=1})}return !!V[c]}
function tc(c,lg,depth){lg=lg||lang;if(lg==='es'||!c)return c;depth=depth||0;
 var k=EX[c];if(k!=null){var r=pick(k,lg);if(r!=null)return r}
 if(isVal(c,lg))return c;
 for(var i=0;i<PAT.length;i++){var P=PAT[i],m=P.re.exec(c);if(m){var s=pick(P.k,lg);if(s==null)continue;var o={};
   P.names.forEach(function(n,j){var v=m[j+1];o[n]=n.charAt(0)==='n'||depth>2?v:(tc(v,lg,depth+1)||v)});return fill(s,o)}}
 /* “Piso 2 · 1 vista ·” (el resto va en otro elemento): se traduce sin el separador de la orilla */
 var eg=/^(·\s+)?([\s\S]*?)(\s+·)?$/.exec(c);if(depth<3&&(eg[1]||eg[3])&&eg[2]){var r0=tc(eg[2],lg,depth+1);if(r0!=null)return (eg[1]||'')+r0+(eg[3]||'')}
 if(depth<2&&c.indexOf(' · ')>0){var parts=c.split(' · '),ch=false;parts=parts.map(function(x){var r=tc(x,lg,depth+1);if(r!=null&&r!==x)ch=true;return r==null?x:r});if(ch)return parts.join(' · ')}
 if(depth===0&&DEBUG&&/[a-záéíóúñ]{3}/i.test(c)&&!MISS[c]){MISS[c]=1;try{console.log('I18N-MISS:'+c)}catch(e){}}
 return null}
function tr(s,lg){if(s==null)return s;s=String(s);var m=/^(\s*)([\s\S]*?)(\s*)$/.exec(s);if(!m[2])return s;
 var r=tc(sp(m[2]),lg);return r==null?s:m[1]+r+m[3]}
/* t(): clave en español (o id) + parámetros; para el código que arma textos (mensajes, avisos) */
function t(k,p,lg){var s=pick(k,lg);if(s==null)s=(lg||lang)==='es'?k:(tc(sp(k),lg)||k);return fill(s,p)}
/* ---------- traducción de la pantalla ---------- */
var ATTR=['placeholder','title','aria-label','alt'];
function skipEl(el){var n=el.nodeName;if(n==='SCRIPT'||n==='STYLE'||n==='TEXTAREA'||n==='NOSCRIPT')return true;
 return el.hasAttribute&&(el.hasAttribute('data-noi18n')||el.getAttribute('translate')==='no')}
function inSkip(node){for(var e=node.nodeType===1?node:node.parentNode;e&&e.nodeType===1;e=e.parentNode)if(skipEl(e))return true;return false}
function doText(n){var v=n.data;if(n._tr!==undefined&&v===n._tr)return;n._es=v;var r=tr(v);n._tr=r;if(r!==v)n.data=r}
function doAttrs(el){if(!el.getAttribute)return;for(var i=0;i<ATTR.length;i++){var a=ATTR[i];if(!el.hasAttribute(a))continue;var v=el.getAttribute(a);
  el._esA=el._esA||{};el._trA=el._trA||{};if(el._trA[a]!==undefined&&v===el._trA[a])continue;el._esA[a]=v;var r=tr(v);el._trA[a]=r;if(r!==v)el.setAttribute(a,r)}}
function walk(root){if(!root)return;if(root.nodeType===3){if(!inSkip(root))doText(root);return}
 if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;if(root.nodeType===1&&inSkip(root))return;
 var st=[root];while(st.length){var e=st.pop();if(e.nodeType===1){if(skipEl(e))continue;doAttrs(e)}
  for(var c=e.lastChild;c;c=c.previousSibling){if(c.nodeType===3)doText(c);else if(c.nodeType===1)st.push(c)}}}
function retranslate(){/* vuelve a traducir desde el español guardado */
 var all=document.querySelectorAll('*');
 for(var i=0;i<all.length;i++){var e=all[i];if(e._esA){for(var a in e._esA){var r=tr(e._esA[a]);e._trA[a]=r;e.setAttribute(a,r)}}
  for(var c=e.firstChild;c;c=c.nextSibling)if(c.nodeType===3&&c._es!==undefined){var r2=tr(c._es);c._tr=r2;c.data=r2}}
 walk(document.documentElement);var tt=document.querySelector('title');if(tt)document.title=tr(tt._es||(tt._es=document.title))}
var mo=new MutationObserver(function(recs){for(var i=0;i<recs.length;i++){var r=recs[i];
 if(r.type==='childList'){for(var j=0;j<r.addedNodes.length;j++)walk(r.addedNodes[j])}
 else if(r.type==='characterData'){if(!inSkip(r.target))doText(r.target)}
 else if(r.type==='attributes'){if(!inSkip(r.target))doAttrs(r.target)}}});
function start(){mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR});walk(document.documentElement)}
document.documentElement.lang=lang;
start();
/* alert / confirm / prompt en el idioma escogido */
['alert','confirm','prompt'].forEach(function(f){var o=window[f];if(!o)return;window[f]=function(m,d){return o.call(window,tr(m==null?'':String(m)),d)}});
function set(l){if(!ok(l)||l===lang)return;lang=l;lsSet(l);document.documentElement.lang=l;retranslate();
 subs.forEach(function(f){try{f(l)}catch(e){console.error(e)}});[].forEach.call(document.querySelectorAll('.i18nBtn'),upd)}
/* ---------- botón 🌐 y selector ---------- */
var css='.i18nBtn{flex:none;font:inherit;font-size:20px;line-height:1;width:40px;min-width:40px;height:44px;min-height:44px;border-radius:12px;cursor:pointer;padding:0!important;display:inline-flex;align-items:center;justify-content:center;margin:0}'+
'.i18nPop{position:fixed;inset:0;z-index:100002;display:none;background:rgba(10,14,20,.38)}.i18nPop.open{display:block}'+
'.i18nPop .in{position:absolute;top:calc(10px + env(safe-area-inset-top));right:10px;width:260px;max-width:calc(100vw - 20px);background:#fff;color:#0f172a;border-radius:16px;box-shadow:0 10px 34px rgba(0,0,0,.35);padding:8px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}'+
'.i18nPop h4{margin:4px 8px 6px;font-size:14px;color:#64748b;font-weight:700}'+
'.i18nPop .in button{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;min-height:48px;font:inherit;font-size:17px;font-weight:650;text-align:left;padding:10px 12px;margin:0 0 6px;border:2px solid #e2e8f0;border-radius:12px;background:#fff;color:#0f172a;cursor:pointer;box-shadow:none}'+
'.i18nPop .in button.on{border-color:#ff6b00;background:#fff1e6}.i18nPop .in button small{color:#64748b;font-size:12.5px;font-weight:500}'+
'html[data-theme=dark] .i18nPop .in{background:#171d26;color:#f1f5f9}html[data-theme=dark] .i18nPop .in button{background:#1f2733;border-color:#334155;color:#f1f5f9}html[data-theme=dark] .i18nPop .in button.on{border-color:#ff7a1a;background:#3a210c}';
var pop=null;
function ensurePop(){if(pop)return pop;pop=document.createElement('div');pop.className='i18nPop';pop.id='langPop';pop.setAttribute('role','dialog');pop.setAttribute('aria-modal','true');pop.setAttribute('data-noi18n','');
 document.body.appendChild(pop);
 pop.addEventListener('click',function(e){var b=e.target.closest('[data-lang]');if(b){pop.classList.remove('open');set(b.getAttribute('data-lang'));return}if(e.target===pop)pop.classList.remove('open')});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&pop)pop.classList.remove('open')});return pop}
function openPicker(){var p=ensurePop();
 p.innerHTML='<div class="in"><h4>🌐 '+t('Idioma')+(lang==='en'?'':' / Language')+'</h4>'+LANGS.map(function(l){return '<button type="button" data-lang="'+l+'" lang="'+l+'" class="'+(l===lang?'on':'')+'"><span>'+NAMES[l]+'</span><small>'+(l===lang?'✔':l.toUpperCase())+'</small></button>'}).join('')+'</div>';
 p.classList.add('open');var b=p.querySelector('button.on');if(b)b.focus()}
function upd(b){var s=t('Idioma')+' / Language: '+NAMES[lang];b._trA=b._trA||{};b._esA=b._esA||{};b._esA['aria-label']=b._esA.title=s;b.setAttribute('aria-label',s);b.title=s;b._trA['aria-label']=b._trA.title=s;b.setAttribute('data-lang',lang)}
function button(cls){var b=document.createElement('button');b.type='button';b.className='i18nBtn'+(cls?' '+cls:'');b.id='langBtn';b.textContent='🌐';b.onclick=openPicker;upd(b);return b}
(function(){var st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st)})();
/* pone el botón donde haya [data-i18n-slot] (en el encabezado, al lado del 🌓) */
function mount(){[].forEach.call(document.querySelectorAll('[data-i18n-slot]'),function(s){if(!s.querySelector('.i18nBtn'))s.appendChild(button(s.getAttribute('data-i18n-slot')))})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.I18N={t:t,tr:tr,set:set,get lang(){return lang},langs:LANGS.slice(),names:NAMES,sr:function(l){return SR[l||lang]},
 onChange:function(f){subs.push(f)},button:button,open:openPicker,has:function(k){return !!D[k]},dic:D,miss:function(){return Object.keys(MISS)},
 /* para pruebas: claves a las que les falta algún idioma */
 faltan:function(){var f=[];Object.keys(D).forEach(function(k){var e=D[k];if(!Array.isArray(e)||e.length!==6)return f.push(k+' (tamaño)');e.forEach(function(s,i){if(typeof s!=='string'||!s.trim())f.push(k+' ['+LANGS[i+1]+']');
  var a=(k.match(/\{\w+\}/g)||[]).sort().join(),b=(String(s).match(/\{\w+\}/g)||[]).sort().join();if(a!==b)f.push(k+' ['+LANGS[i+1]+'] marcadores')})});return f}};
})();
