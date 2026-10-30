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
- El service worker (cache `fto-v5`) no guarda ni intercepta direcciones de otros sitios.
