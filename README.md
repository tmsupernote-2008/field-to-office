# Field to Office (prototipo)
Guía de campo de drywall para supers y foremen. Lado oficina (con PIN) para cargar fichas por tipo de pared, fire walls, shafts y RC1, con fotos y PDFs; lado campo para buscar por unidad o tipo de pared.

**El proyecto incluido es un EJEMPLO – no usar en obra.** Sus datos vienen de documentos reales (hoja de tipos de partición y spec 092900) sin nombre de proyecto, sin nombres de empresas o personas y sin códigos de partición del proyecto. Lo que no está en los documentos (separación de tornillos en orillas/campo, detalles del RC1, números UL/GA, spec 092216) aparece como "Pendiente: falta en los documentos".

**Carpetas de especificaciones** (lado campo, botón 📁): Framing, Finishing, Pintura, Instalación de drywall y Paredes 2 h fire rated. Solo texto limpio en `specs.js` (sin PDFs, sin nombres de proyecto, empresas ni personas), con búsqueda y una nota "Pendiente / faltantes" por carpeta. Cada documento dice **"Del proyecto del usuario: revisar antes de usar en obra"**.

**Organizado por dirección** (rama `direction-split`):
- Campo: **⬇️ De la oficina** (carpetas de especificaciones, búsqueda por unidad/tipo de pared, cómo leer el código) y **⬆️ Para la oficina** (formularios *Reportar problema / pregunta*, *Trabajo extra T&M* y *Atraso*). Cada formulario crea un mensaje de texto (+ foto opcional) que se comparte por Web Share, WhatsApp, SMS, correo o copiar. Historial guardado solo en el teléfono.
- Oficina (PIN): **⬆️ Subir al campo** (la edición de siempre) y **⬇️ Recibido del campo** (pegar el texto recibido para llevar una lista con Pendiente / Atendido).
- No hay servidor ni chat: todo viaja por los mensajes que el usuario comparte.

**🧩 Módulos** (rama `modulo-firmax`): apps anexas a Field to Office, al final de la pantalla de inicio del campo y de la oficina. Es un registro (`MODULOS` en `index.html`: `id`, `nombre`, `icono`, `url`, `descripcion`, y `oficina` opcional para una nota del lado oficina); para agregar otro módulo basta con añadir un objeto.
- **✍️ Hoja de firmas (Firmax)**: abre https://tmsupernote-2008.github.io/hoja-firmas/ en una pestaña nueva (es otra app/origen: no comparte datos). Los enlaces de Firmax para superintendentes y subcontratistas se crean dentro de Firmax.
- El service worker no guarda ni intercepta direcciones de otros sitios.

**📸 Marcar reparaciones** (rama `marcas-camara`, código en `marcas.js`): en el inicio del campo (las dos pestañas) y en cada unidad/pasillo (“📸 Marcar / ver reparaciones”).
- **Marcar**: cámara trasera en vivo (getUserMedia). Se escoge el tipo en la leyenda y se toca la imagen: el primer toque congela la imagen y cada toque pone un punto de color con número automático por proyecto (P-001, P-002…). “💾 Guardar vista” guarda la imagen (JPEG, máx. 1280 px) con los puntos en coordenadas normalizadas (x,y de 0 a 1), unidad/piso/área, fecha y quién tomó la foto. Si la cámara en vivo no abre, “📁 Usar una foto”.
- **Ver**: cámara en vivo con la foto guardada encima como “foto guía” transparente (control de transparencia y apagar/prender) y los puntos encima; o la foto fija con puntos. Lista por unidad con contadores por tipo.
- **Tipos** editables (nombre, color, quién/qué es). De fábrica: Parche drywall, Electricista (alrededor de enchufes/luces), Plomero, Fire sprinkler, Esquina/bead, Otro.
- **T&M automático** (sin precios) en el historial de “⬆️ Para la oficina”, con el mismo formato del reporte *Trabajo extra T&M* y los botones de compartir; se puede agrupar por vista, por punto o por unidad y día. Al pegarlo en “⬇️ Recibido del campo” salen todos los campos.
- **Límite**: no es AR de verdad (una PWA no puede anclar puntos en la pared; WebXR no existe en Safari de iPhone). Se alinea a ojo con la foto guía.
- Datos: lista de vistas en localStorage; fotos en IndexedDB (solo en ese teléfono). Cache del service worker: ver abajo (`fto-v9`).

**🧭 Guiar a marca con flechas** (rama `flechas-guia`, código en `guia.js`): en “👁️ Ver con cámara”.
- Al marcar, si el teléfono da los sensores de orientación (DeviceOrientationEvent; en iPhone hay que tocar “🧭 Activar sensores”), se guarda hacia dónde apuntaba el teléfono y el rumbo/inclinación de cada punto (campo de visión de la cámara aproximado: 64° del lado largo).
- “Guiar a marca”: escoge una marca de la unidad (o ◀ Anterior / Siguiente ▶). Si está fuera de la imagen o en otra vista, sale una flecha grande en la orilla (izquierda/derecha/arriba/abajo, o “detrás de ti”) con el número, color, tipo y “gira a la izquierda (≈40°)”. Si está en otra vista, al tocar la flecha se abre su foto guía. Cuando está a la vista, un anillo late sobre el punto.
- Sin brújula: izquierda/derecha solo en la misma sesión (arriba/abajo siempre). Sin sensores o vistas viejas (sin dirección): anillo sobre el punto + foto guía, y ◀ ▶ por lista.
- **Límite**: guía aproximada, no AR de verdad; la brújula falla cerca de metal y aparatos eléctricos.

**🎤 Dictar** (`voz.js`): botón 🎤 debajo de los campos de descripción/nota (Reportar problema, Trabajo extra T&M, Atraso, nota de 📸 Marcar reparaciones y Notas de la ficha en la oficina). Web Speech API (SpeechRecognition / webkitSpeechRecognition), idioma de la app (español → es-US por defecto o la región del teléfono), continuo con texto provisional, toca para empezar/parar, “escuchando…”, y el texto se inserta en el cursor sin borrar lo escrito. Si el navegador no lo tiene o niegan el micrófono, sale un aviso para usar el micrófono del teclado. El reconocimiento lo hace el navegador (en Chrome el audio puede ir a los servidores de Google); la app no manda nada a ningún servidor.

**🔒 Roles y 🔎 Buscar marcas** (rama `roles-buscar`, código en `roles.js`; cache del service worker: `fto-v8`, ahora con `roles.js`):
- **🔎 Buscar marcas**: botón grande justo debajo de “📷 Marcar nueva vista”. Un toque abre “👁️ Ver con cámara” (la vista más nueva) con la lista de **todas** las marcas del proyecto y una búsqueda (número P-003, tipo, unidad, área, piso).
- **🧭 Guiar en la pantalla de la cámara** (Buscar marcas y Ver con cámara): debajo de la imagen en vivo hay **◀ 🧭 Guiar ▶** grandes. Guiar lleva a la marca escogida (o a la siguiente si no hay) y muestra flecha o anillo; ◀ ▶ pasan a la anterior/siguiente.
- **Roles en este teléfono** (insignia arriba: 👁️ Solo ver / 🦺 Super/GC):
  - **Super / GC**: marca, edita tipos, borra vistas y crea el T&M de las marcas.
  - **Solo ver** (de fábrica, la primera vez): ve, busca y se guía con flechas. Los botones de marcar salen desactivados con “🔒 Solo Super o GC pueden marcar”; editar tipos, 🗑️ borrar, T&M de las marcas y “Marcar otra vista” no salen.
  - **🔒 Entrar como Super/GC** pide un PIN de 4 a 6 números. La primera vez el Super lo crea (con confirmación). Luego: **🔑 Cambiar PIN** (pide el actual) y **👁️ Salir (solo ver)**. Después de 5 errores hay que esperar 30 s entre intentos (también si recargan).
  - Del PIN solo se guarda en localStorage un hash **PBKDF2-SHA-256** (150 000 vueltas, sal aleatoria de 16 bytes), nunca el PIN. Es distinto del PIN de 🏢 Oficina.
- **Límite honesto**: el PIN es un **candado de este teléfono** para que nadie marque, edite o borre por accidente; **no es seguridad completa** (quien tenga el teléfono puede borrar los datos del sitio o usar herramientas del navegador, y quien cree el PIN primero queda como Super). Permisos de verdad por persona, como los issues de Autodesk, necesitan un servidor con cuentas: **no está hecho**. Si olvidan el PIN no hay forma de recuperarlo en la app (solo borrando los datos del sitio, lo que borra también las marcas del teléfono).
- Las marcas guardadas antes siguen funcionando igual (ver, buscar, guiar). Los formularios de “⬆️ Para la oficina” (Reportar problema, Trabajo extra T&M, Atraso) no cambian. Sin red: todo queda en el teléfono.

**🎨 Diseño y tema** (rama `diseno-pro`; cache del service worker: `fto-v9`, ahora con `tema.js`):
- Sistema de diseño con variables CSS: paleta común con Firmax (naranja principal `#ff6b00`, azul `#0a66ff`, verde `#0e8a3e`, amarillo `#f5b700`, rojo `#e0281c`), botones grandes (≥48 px) con estilos principal / secundario / peligro y estados de pulsado, tarjetas con sombra suave, encabezado y pestañas fijos, márgenes seguros (notch).
- Tema 🌓 Automático (sigue al teléfono), ☀️ Claro o 🌙 Oscuro: botón en el encabezado; se guarda en localStorage (`tema_v1`). `tema.js` es el mismo archivo en ambas apps.
- Los colores de los tipos de marca no cambian (siguen siendo distinguibles).
