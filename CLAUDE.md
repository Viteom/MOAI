# MOAI Ciudades del Cuidado · Guía para Claude Code

## Qué es este proyecto

MOAI es una plataforma de cuidado social contra la soledad, pensada para acompañar la longevidad con propósito. Su concepto rector es One Health: la salud de las personas, de los animales y del entorno es una sola. Rechaza lo transaccional y prioriza la economía de la presencia.

La voz de la interfaz se llama «Brisa» y es una inteligencia artificial (el nombre es provisional; la marca aún se está diseñando). El sello de la interfaz es «Mo».

**Estado actual:** diseño y documentación, un **prototipo cero** (sin servidor) y, desde octubre de 2026, **cuentas reales** con servidor propio (ver «Cuentas»). Nada está en producción. Los archivos de `docs/cypher/` son borradores que **no se han probado** contra una base de datos real.

## El prototipo cero (ya existe en este repositorio)

Es una web móvil de una sola pantalla secuencial (primer día en Medellín), sin servidor. Ya no depende de Lovable: este repositorio es la fuente de verdad.
- Pila: Vite + React 19 + TypeScript estricto + Tailwind 4, con Vitest y Testing Library. Tipografías autoalojadas con fontsource (Fraunces para la voz y los títulos, Inter para la interfaz).
- `src/components/moai/`: `app.tsx` (flujo y pantallas), `primitives.tsx` (piezas visuales compartidas), `scene.tsx` (escena de ciudad en SVG con imagen real intercambiable).
- `src/lib/moai/state.ts`: estado y lógica pura (ciudades, anillos, límites, saludos, carta del día), con sus pruebas.
- `src/test/privacy.test.ts`: falla si el código usa almacenamiento del navegador, hace solicitudes de red o referencia dominios externos. `src/test/app.test.tsx`: pruebas de la primera pantalla.
- Comandos: `npm run dev`, `npm run test`, `npm run build`, `npm run typecheck`.
- Reglas del prototipo (ver `AGENTS.md`): todo en memoria de React, escena intercambiable por una imagen del mismo origen en `public/backgrounds/{ciudad}-{hora}.jpg`, cero solicitudes a terceros.
- Los textos «Brisa» y «Mo» son provisionales. El nombre de trabajo de la marca es «MOAI».

## Cuentas (inicio de la Fase 1, octubre de 2026)

Decidido por Mateo: la plataforma es web y horizontal primero, y el registro es real.
- Portada (`src/components/moai/portada.tsx`) con «Crear cuenta» e «Iniciar sesión». Pantallas de cuenta en `cuenta.tsx`.
- Sin contraseñas: se entra siempre con un código de 6 dígitos por correo (Resend) o WhatsApp (Twilio Verify). Vence en 10 minutos, 5 intentos por código y 5 envíos por hora.
- Registro liviano (diseño de Mateo): nombre, correo y dos consentimientos separados que se guardan con su versión. Después del código: fecha de nacimiento (18 años o más; si no, se borra la cuenta) y «Tu comunidad» (municipio de Colombia, DIVIPOLA del DANE en `src/lib/colombia/municipios.json`, barrio opcional, sin coordenadas). Flujos completos en `docs/09-flujos-acceso-y-comunidad.md`.
- Servidor en `server/` (Node + Fastify + PostgreSQL). Sin `DATABASE_URL` usa PGlite en `.data/`. Sin claves, el código se escribe en la consola con el destino enmascarado. Comandos: `npm run dev:api` junto a `npm run dev`.
- Reglas comunes en `src/lib/registro.ts`. El frontend solo habla con `/api` del mismo origen desde `src/lib/api.ts`; la sesión es una cookie httpOnly.
- WhatsApp está apagado («muy pronto») hasta contratar Twilio: `WHATSAPP_DISPONIBLE` en `src/lib/registro.ts`, y el servidor lo rechaza si no hay proveedor.
- Cuentas sin verificar: recordatorio por correo cada 3,5 días (dos por semana) y borrado a los 20 días (`server/mantenimiento.ts`, corre cada 6 horas).
- La fecha de nacimiento completa se guarda: sirve para los «momentos de verdad» de la persona (por ejemplo, su cumpleaños).
- Después del código, Brisa da la bienvenida (`bienvenida.tsx`) y se presenta como IA. Fondo: `public/backgrounds/brisa.mp4` (Higgsfield, 8 s). Hasta ~4 s trae texto que se deforma, así que solo se usa el tramo de 4,1 s al final, en bucle, y el panel de la interfaz tapa el panel del video.
- Lo que la persona responde en el primer día (semilla, oficios, gente…) todavía vive solo en memoria.
- **Planes, lugares guardados y Brisa confidente (12 de octubre):** nada de «pedir ayuda»; planes en lugares públicos con alcance por celdas (~2 km por defecto); lugares guardados como en Uber; piloto de barrios en Medellín. Ver `docs/09`, apartado 9.
- **Construido:** `server/comunidad.ts` (lugares y planes, alcance con `h3-js`), pantallas en `src/components/moai/comunidad.tsx` (Mi comunidad, Mis lugares, Proponer un plan). Reglas compartidas en `src/lib/lugares.ts`.
- **Planes de barrio (12 de octubre):** plantillas de tres toques («Voy a caminar, ¿alguien viene?»), planes semanales (sumarse vale para la próxima vez), conversación del plan solo para quienes van (Brisa no la lee; se borra a los 30 días), cartas de Brisa («fuiste por tu cuenta», sin culpas y sin inventar asistentes) y recomendaciones apagadas por defecto que solo usan los tipos de plan que la persona eligió en «Avisos», siempre con «¿Por qué veo esto?». Correo semanal opcional, máximo uno por semana y solo si hay planes. Brisa nunca deduce rutinas: solo recomienda planes que alguien publicó.
- **Barrios de Medellín:** 349 barrios y veredas en `src/lib/colombia/barrios-medellin.json`, generados desde la capa de GeoMedellín con `node scripts/barrios-medellin.mjs archivo.geojson`. Confirmar la licencia de uso de la capa.
- **Dirección para el primer día (Mateo):** nada de cuestionario. Brisa conversa como quien conoce a alguien: cómo va tu día, qué hiciste, y al otro día qué harías en tal caso. Los datos se llenan a medida que pasa la conversación, a lo largo de varios días.
- **Mi gente y Moais (14 de octubre, decisión de Mateo):** después de cada plan se pregunta «¿Te viste con…?»; si las dos personas confirman, pueden formar un Moai (de 2 a 5), sin necesidad de un plan grande. Crece por invitación y entran solo si todos los miembros aceptan; nadie ve quién votó qué. Conversación del Moai: últimos 90 días. Código en `server/moais.ts`, `src/components/moai/gente.tsx` y reglas en `src/lib/moai.ts`. A otras personas se las nombra con referencias por cuenta (`server/personas.ts`), nunca con su identificador.
- **Bloquear y reportar (14 de octubre):** nada de calificaciones visibles (regla 5). Bloquear oculta planes en las dos direcciones sin avisar. Reportar es privado; si dos personas distintas reportan a alguien en 90 días, su cuenta queda en pausa (no propone, no escribe, no invita) hasta una revisión humana. El equipo revisa en `/equipo` (correos en `EQUIPO_CORREOS`): cerrar sin medidas (levanta la pausa), suspender (no puede entrar, sus planes se ocultan) o reactivar. Código en `server/equipo.ts` y `src/components/moai/equipo.tsx`. **Pendiente:** decidir quiénes forman el equipo y escribirle a la persona suspendida (hoy es manual).
- **Convocatorias de entidades (14 de octubre, decisión de Mateo):** entidades públicas, privadas o comunitarias publican convocatorias («Buscamos 5 personas para sembrar árboles»). Solo el equipo las da de alta, con una persona responsable que publica desde su cuenta eligiendo «Publicar como». Cupo hasta 200; luz naranja en el mapa. Reglas en `src/lib/organizaciones.ts`.
- **Brisa, tu compañera (15 de octubre, decisión de Mateo):** el saludo es cálido («Soy Brisa, tu compañera en MOAI») y la regla 12 se cumple con un sello «IA» siempre visible junto a su nombre y, la primera vez, la frase «No soy una persona: soy una inteligencia artificial». Brisa será la pantalla de inicio: una guía conversacional (primero con guion, luego con un agente), y los planes nacen en la conversación, no en un formulario. El botón principal deja de ser «Contar qué voy a hacer».
- **¿Cómo cuidas y cómo te cuidas? (15 de octubre, decisión de Mateo):** test de 6 preguntas (A: conexión intensa, cuidar límites; B: equilibrio; C: más distancia) para cuidar a quien cuida. Voluntario, con autorización explícita (puede ser dato sensible, Ley 1581); la persona ve su resultado en palabras, nunca un puntaje; Brisa lo usa solo para cuidarla a ella (por ejemplo, recordarle su Moai interno). Nadie más lo ve; se puede repetir o borrar. No es un instrumento clínico ni diagnostica (reglas 6 y 11).
- **Moai interno (15 de octubre, propuesta aceptada):** quién te nutre, aunque no use MOAI. Privado; Brisa recuerda alimentar ese vínculo como mucho una vez por semana, sin contadores de días. Se guarda en el servidor, cifrado (decisión de Mateo, 15 de octubre). Código en `server/cuidado.ts`, `src/lib/cuidado.ts`, `src/components/moai/brisa.tsx` (inicio con Brisa y test) y `gente.tsx` (Moai interno).
- **Cercanía sin exponerse (15 de octubre, decisiones de Mateo):** Brisa arma conversando la tarjeta de la persona (frase, gustos, lo que comparte y quiere aprender) y solo se muestra en «Mi zona» (hoy «Vecinos», en Mi barrio; `/zona`, hasta dos anillos de celdas, «cerca» o «en tu zona») si la persona lo aprueba. En vez de invitar a un tinto, el **saludo de lejos** usa frases ya escritas, uno por semana a la misma persona; si es mutuo, Brisa sugiere coincidir. **Puerta abierta** (esta semana me caería bien compañía): la declara la persona, dura 7 días y **solo la ven quienes ya se vieron con ella**. **Invierno**: lo declara la persona, se guarda **en el servidor, cifrado** (excepción a la regla 2), Brisa baja el ritmo (sin sugerencias ni correo semanal) y solo lo saben las personas con las que se vio que ella elija; al salir del invierno se olvida a quién se le contó. Brisa ayuda a escribirle a alguien del Moai interno con un enlace `whatsapp://` (la persona lo envía; MOAI no ve nada). Código en `server/cercania.ts`, `src/lib/perfil.ts`, `src/components/moai/zona.tsx` y `brisa.tsx`.
- **Brisa sobre la ciudad y escena de cuidado (15 de octubre, referentes de Mateo):** la conversación con Brisa es un panel de vidrio (translúcido, desenfocado, con grano) a la derecha en escritorio y abajo en el teléfono, con la ciudad ilustrada de fondo en el inicio; en el mapa se abre desde el orbe de Brisa sin salir de la ciudad. Las seis preguntas de cuidado son una escena a pantalla completa sobre el bosque (dos círculos finos, una pregunta a la vez, respuestas como anillos), como una decisión de un juego de rol; se puede salir cuando se quiera. Si el resultado guardado tiene más de 90 días, Brisa propone repetirlo: las personas cambian. Código en `brisa.tsx` (`ConversacionBrisa`, `InicioBrisa`), `escena.tsx` y estilos `.vidrio`, `.panel-brisa`, `.escena`.
- **Mis lazos (15 de octubre, referente de Mateo):** la red que hoy es Mi gente (`/gente`; `/lazos` lleva ahí): tú al centro, grupos (Raíz = familia del Moai interno, Tronco = quien te nutre y cada Moai, Rama = personas con las que te viste) y cada persona en un arco. El color dice cómo va el vínculo, nunca un número (regla 5): vivo (contacto en 14 días), tibio (45), dormido. La raíz no se marchita: su hilo siempre es cálido y firme; solo el punto recuerda. El Moai interno admite «Es de mi familia» y sube a 8 personas. En desarrollo, sin `CODIGO_SECRETO`, el secreto se guarda en `.data/secreto-local` para que lo cifrado sobreviva a los reinicios. Código en `server/lazos.ts`, `src/lib/lazos.ts`, `src/components/moai/lazos.tsx`.
- **Tres lugares y una sola barra (15 de octubre, decisión de Mateo: «se siente saturada, debe sentirse liviana»):** Brisa (`/inicio`) · Mi barrio (`/comunidad`: Mapa, Lista y Vecinos; `/zona` abre Vecinos) · Mi gente (`/gente`: la red de Mis lazos con un panel; `/lazos` lleva ahí) · Más (Mis lugares, Avisos, Convocar, Equipo, Cerrar sesión). La barra (`Barra` en `diario.tsx`) es la misma en todas las pantallas privadas y va abajo en todos los tamaños (Mateo, 19 de octubre; antes iba arriba en el escritorio). Se quitó el prototipo «Mi ciudad» (`/ciudad`). En Mi gente, lo que espera respuesta (invitaciones, «¿Te viste con…?») llega de a una cosa en el panel; al tocar a alguien: saludar, formar un Moai, reportar o, si es del Moai interno, «Ya hablamos». Las pantallas de lectura (un plan, un Moai, Mis lugares, Avisos) llevan un «volver» arriba.
- **Brisa con pausas (15 de octubre, decisión de Mateo):** una cosa a la vez. Cada mensaje entra después de unos puntos de «escribiendo»; las opciones esperan a que termine y son como mucho tres a la vista (el resto, detrás de «Otra cosa»). Las cartas pendientes llegan de a una: la siguiente cuando se atiende la anterior. En las pruebas no hay pausas (`import.meta.env.MODE === 'test'`).
- **Conversaciones cuidadas (15 de octubre, decisión de Mateo):** antes de enviar un mensaje a un plan o a un Moai, `src/lib/moderacion.ts` lo revisa en el servidor, sin IA y sin guardar el resultado: amenazas, insultos graves o contenido sexual no se envían; dinero, teléfonos, casas, datos sensibles o insultos leves generan un aviso y la persona decide («Cambiarlo» o «Enviar de todos modos»). Cada mensaje ajeno se puede reportar: el texto se copia al reporte y lo ve el equipo en `/equipo`. Brisa no lee las conversaciones.
- **Mi cuenta (16 de octubre, Ley 1581):** en «Más», «Mi cuenta» (`/cuenta`): descargar todos mis datos en un archivo JSON (lo cifrado ya descifrado; de otras personas solo el primer nombre; nunca quién te reportó) y borrar la cuenta de inmediato, con una casilla de confirmación. Borrar se lleva todo en cascada, incluidos los mensajes que escribió en conversaciones ajenas; los Moais siguen para quienes quedan. Funciona también sin edad declarada. Código en `server/cuenta.ts` y `src/components/moai/micuenta.tsx`. **Abierto:** si en el futuro hay que conservar algo por ley (por ejemplo, reportes graves), decidirlo con el equipo jurídico.
- **Brisa conversa y recuerda (19 de octubre, decisiones de Mateo):** la conversación se guarda cifrada 90 días (`server/historial.ts`, solo texto) y Brisa la retoma; se borra en Mi cuenta. Matriz conversacional con guion (`src/lib/conversacion.ts`): una o dos preguntas directas por día («¿Qué haces normalmente un domingo en la tarde?»), primero las de conocerse; reacciona a lo que le cuentan y, si algo sirve para la tarjeta, pregunta antes de sumarlo. Responde dudas de la plataforma con respuestas escritas por el equipo (deben coincidir con el código, regla 10). «Cuéntame de ti» son cuatro preguntas seguidas sin opciones. Dictado por voz con el reconocimiento del navegador (en Chrome lo procesa Google; MOAI no recibe audio), avisado mientras escucha. **Pendiente:** que las cuentas existentes acepten los textos nuevos; y un modelo de lenguaje real cuando el equipo jurídico lo apruebe.
- **Rediseño de las internas (19 de octubre, decisiones de Mateo; rama `rediseno/internas`):** bosque profundo, paneles casi opacos con borde menta, lima para la acción principal y cian para la secundaria, Inter en todo. Mi barrio es un escenario ilustrado (no un mapa: sin calles inventadas, sin personas) con luces solo para los planes y el botón vuelve a ser «Contar qué voy a hacer» (revierte lo del 15 de octubre); al elegir una luz se abre su tarjeta. Vecinos sigue como tercera pestaña. En el inicio, Brisa espera cerrada en una tarjeta («Hablar con Brisa»); la conversación se abre al tocarla y se cierra con una X, y solo se abre sola la primera vez o al llegar a algo concreto. El saludo cambia según la hora y el tiempo sin hablar, nunca al azar (`saludoDeVuelta` en `src/lib/conversacion.ts`). Funciones nuevas: costo del plan (gratis o cada quien paga lo suyo; MOAI no maneja dinero), «Reportar este plan» (llega a `/equipo` con el plan tal como se publicó y permite bloquear), «Proponer un encuentro» solo para un Moai (`planes.moai_id`; lo ven solo sus miembros) y la frase del Moai. Piezas compartidas en `interna.tsx` (`Cabecera`, `Fila`, `Imagen`) y el escenario en `barrio-escena.tsx`. Imágenes: recortes de una sola ilustración en `public/backgrounds/internas/`. **Pendiente:** fotos o ilustraciones propias para cada cabecera, revisión humana de los reportes de planes y de la visibilidad de los encuentros de Moai, y que las cuentas acepten los textos nuevos.
- **Trabajo de Codex unido (20 de octubre):** Mi gente en órbitas (Red y Lista, buscador y filtros; `red-gente.tsx`, `ficha-gente.tsx`, `src/lib/red-gente.ts`), con la categoría (Raíz, Tronco, Ramas) separada de la pertenencia a Moais: estar en un Moai no sube a nadie a Tronco. **Fichas personales de vínculos** (cómo se conocen, algo que comparten, una nota): en el servidor, cifradas, solo las lee quien las escribe; se borran al quitar el contacto, al bloquear o al borrar la cuenta, y van en la descarga de datos. **Nombre preferido y presentación para la red**: permiso aparte, apagado por defecto, independiente de la tarjeta de Vecinos. Fondos propios por ciudad (Medellín y Bogotá) en `public/backgrounds/ciudades/` y cambio de ciudad atómico. **Confirmado por Mateo (20 de octubre):** las fichas sirven sobre todo al empezar, para registrar a las personas importantes de la red de apoyo que no están en MOAI (no son un Moai), con información general; se guardan en el servidor, cifradas (excepción de la regla 2). Brisa las llena conversando en los primeros días: «¿Quién es una persona importante para ti, que te apoya, aunque no use MOAI?» (segunda pregunta de conocerse; «¿Hay alguien más…?» rota después), una cosa a la vez: nombre, qué es para ti (familia va a Raíz; el resto, a Tronco), cómo se conocieron y algo que compartan; «Ahora no» y «Prefiero no decir» siempre a mano. **Pendiente:** revisión legal de los textos nuevos.
- **Brisa más natural (20 de octubre, comentarios de Mateo tras probar en Vercel):** sin respuestas automáticas en la conversación (nada de «Mejor otra cosa», «Ahora no», «Ver qué puedo hacer»; quedan solo los botones que confirman una acción, como publicar o sumarse); una pregunta por visita; si ya hablaron hoy, al abrir retoma sin volver a saludar; lo de días anteriores queda recogido tras «Ver lo que hablamos antes»; lo que la persona pide («estoy triste», «¿qué puedes hacer?») va antes que la pregunta pendiente. Red de apoyo: entiende «mi madre», «mi hermano Juan» o «Laura, mi amiga» (`entenderPersona`) y no repregunta; a la familia no le pregunta cómo se conocieron; **la privacidad no se explica en el chat** (va en la política y en las dudas frecuentes). Sigue siendo un guion: entender lo que se escribe libremente necesita un modelo de lenguaje (**pendiente:** decidir Gemini de pago y visto bueno jurídico). Correo del código con diseño y bienvenida (`server/plantillas-correo.ts`), sin imágenes remotas ni seguimiento.
- **Brisa conversa con Gemini en pruebas (20 de octubre, decisión de Mateo: «estamos en etapa de prueba… que esté resuelto»):** con `BRISA_GEMINI_CONVERSA=true` (apagada por defecto), Brisa responde lo que se le escribe con Gemini gratuito (`gemini-3.5-flash-lite`). Solo para el equipo de pruebas, con aviso visible bajo el campo de texto; Google puede usar lo enviado en la modalidad gratuita. Al modelo van solo los turnos de texto de hoy y la pregunta pendiente; las acciones siguen con guion y confirmación; el riesgo se atiende sin el modelo. Código: `server/brisa-conversa.ts`, `instruccionesConversa` en `server/lenguaje-brisa.ts`. **Antes de abrir a personas reales:** plan de pago (sin uso para entrenar) y revisión jurídica.
- **Textos legales (14 de octubre):** borradores del equipo en `src/lib/legal.ts` (Términos y Política de tratamiento de datos, Ley 1581), escritos a partir del código. Faltan razón social, NIT y correo de contacto. Pasan al equipo jurídico antes de producción. Si cambia qué se guarda o cuánto dura, se actualizan y se sube `VERSION_TEXTOS`.

## Mi gente orbital (20 de octubre de 2026)

La tarea de Mateo amplía exclusivamente `/gente`: Red orbital y Lista comparten búsqueda, filtros y ficha. Categoría (Raíz/Tronco/Rama) y pertenencia a Moais son independientes; una persona aparece una vez aunque comparta varios grupos. Solo se revelan Moais del observador. La promoción entre cuentas sigue necesitando confirmación mutua y aún no tiene flujo; la interfaz lo explica.

Las notas de «Mi ficha personal» se guardan cifradas con el servicio existente, solo para su autor, en `fichas_vinculo`; nunca entran al perfil compartido. «Mi presentación» reutiliza `perfiles` con nombre preferido y permiso independiente `visible_red`, apagado por defecto. Compartir en Vecinos no lo activa. Se actualizaron Política y `VERSION_TEXTOS`. **Necesita revisión humana antes de fusionar** por datos personales, cifrado y consentimiento. Detalles, límites y capturas reales: `docs/11-mi-gente-orbital.md`.

## Fondos por ciudad (20 de octubre de 2026)

Inicio y Mi barrio usan `FondoCiudad` y el catálogo `src/lib/fondos-ciudad.ts`, a partir del código DIVIPOLA del lugar activo confirmado por la API. Medellín y Bogotá tienen composiciones vertical y horizontal propias; otras ciudades reciben un escenario identificado como genérico. La ilustración no depende de disponer de mapa H3. No se genera arte durante el uso ni se pide ubicación del dispositivo.

Cambiar de lugar reinicia datos y selección del barrio y descarta respuestas anteriores. Selector compartido con errores/reintento; activación atómica en el servidor. El orbe usa imagen estática con movimiento reducido. Recursos y verificación real: `docs/14-fondos-ciudades-implementacion.md`. Revisión humana del flujo de lugares privados y revisión editorial del arte antes de fusionar/publicar; nada publicado desde aquí.

## Reglas que no se negocian

**Preparación de Vercel (20 de octubre de 2026):** `api/index.ts` adapta la API al mismo origen que Vite. `server/vercel.ts` exige PostgreSQL persistente, secreto estable, correo y autorización de tareas también en Preview; no abre puertos, escribe secretos locales ni crea tablas por visita. `npm run db:prepare` prepara el esquema explícitamente; nunca se ejecuta al compilar. `server/tareas-vercel.ts` requiere Bearer y un programador externo cada seis horas; aún no configurado. Sin cron automático ni despliegue desde aquí. Preview usa su propia base de datos ficticios. Instrucciones y límites en `docs/17-vercel-beta.md`. Revisión humana de infraestructura, permisos y privacidad antes de fusionar/desplegar.

**Beta de Gemini (20 de octubre, elección de Mateo):** adaptador `server/gemini.ts`, rutas `server/brisa-modelo.ts` e intérprete `server/lenguaje-brisa.ts`. Solo una frase **ficticia**, autorización vigente por envío, revisión de la interpretación antes de buscar. Nunca envía memoria, perfil, ciudad guardada o historial; no ejecuta acciones. Apagado por defecto; requiere clave y modelo del servidor y `BRISA_GEMINI_BETA=true`. Cuotas acotadas y metadatos de autorización durante 90 días, sin guardar frase/respuesta; exportación y borrado en cascada. Datos reales y condiciones del proveedor siguen pendientes jurídicos. Ver `docs/16-gemini-beta.md`, incluida la limitación de no haber hecho una llamada real por falta de clave. Revisión humana antes de fusionar.

**Brisa: memoria e intenciones (20 de octubre de 2026, petición de Mateo):** primer recorrido real en `brisa-intenciones.tsx`, reglas compartidas en `src/lib/brisa-intenciones.ts` y rutas en `server/brisa-intenciones.ts`. Memoria de actividades/días/gratis cifrada, opcional y autorizada por 30 o 90 días, revisable/corregible/borrable en Brisa y Mi cuenta. Permiso separado y apagado para propuestas al abrir; invierno las pausa. Solo consulta/prepara; sumarse exige confirmación y revalidación con cupo compartido con la ruta normal (`server/asistencia.ts`). Nada se deduce del historial, mensajes, ánimo o notas privadas. Sin modelo externo (sigue pendiente proveedor/revisión jurídica). Documentación y capturas: `docs/15-brisa-memoria-intenciones.md`; revisión humana antes de fusionar.

Antes de escribir código que toque datos de personas, lee `docs/` (en especial privacidad y consentimiento). Si una tarea contradice una de estas reglas, detente y pregunta.

1. Nunca se guarda ubicación exacta ni historial de ubicaciones. Ninguna base de datos contiene coordenadas ni direcciones. Los lugares guardados de cada persona (hasta 5, privados) son celdas H3 de ~1 km sin historial; la distancia se muestra por franjas, nunca exacta. El Radar usa celdas aproximadas y etiquetas efímeras con caducidad. (Ajustada por Mateo el 12 de octubre de 2026; pendiente de revisión legal.)
2. Lo íntimo se queda en el dispositivo por defecto: el estado del día, el Modo Invierno, la red declarada (personas que aún no usan MOAI) y las luces de ancestros. Excepción decidida por Mateo (15 de octubre de 2026): el Moai interno, el resultado del test de cuidado y el Modo Invierno se guardan en el servidor, cifrados (`server/cifrado.ts`), y solo los ve la persona. La conversación con Brisa también se guarda en el servidor, cifrada, 90 días (Mateo, 19 de octubre de 2026), y se puede borrar en Mi cuenta. Las fichas personales de vínculos (información general sobre la red de apoyo, también de personas que no usan MOAI) se guardan en el servidor, cifradas, y solo las lee quien las escribe (Mateo, 20 de octubre de 2026).
3. Nunca se sube la libreta de contactos.
4. Nada de criptografía propia: se usa una librería auditada (por ejemplo, libsodium).
5. Sin contadores de vanidad: ni puntos, niveles, rankings ni cifras de «cuántos» en la interfaz. La fuerza de un vínculo nunca se muestra como número.
6. No se infiere el ánimo ni la salud de nadie: el estado se declara. No se usan datos de otras redes sociales, ni el contenido de los mensajes, ni sensores del teléfono. Única excepción (Mateo, 15 de octubre de 2026): la revisión automática de un mensaje en el momento de enviarlo, solo para frenar abusos o avisar de riesgos, sin IA y sin guardar el resultado ni usarlo para nada más.
7. Los registros técnicos no incluyen datos personales, ubicación ni contenido de mensajes.
8. Perfiles Brote (menores): sin ubicación, sin Radar, sin mensajes directos, sin sugerencias y sin organizar encuentros.
9. Las sugerencias del algoritmo vienen apagadas por defecto, con el motivo siempre visible, y se pueden rechazar.
10. Lo que la interfaz promete sobre privacidad debe coincidir exactamente con lo que hace el código.
11. MOAI no es un servicio de emergencias ni un dispositivo médico: nunca promete rescate ni detección de caídas. Ante señales de riesgo, deriva a una persona del Moai o a una línea de ayuda humana verificada para el país.
12. Brisa se presenta siempre como una IA.
13. El éxito se mide por la reconexión entre personas, no por el tiempo en la aplicación. Nada de notificaciones insistentes.

## Decisiones tomadas

**Pila tecnológica (propuesta, pendiente de validar por un responsable técnico)**
- App: React Native con TypeScript y módulos nativos.
- API: Node.js con TypeScript.
- PostgreSQL: cuentas, consentimientos, preferencias, colas y registros.
- Neo4j 5: vínculos, Moais, encuentros, animales, plantas y eventos. Solo lo relacional.
- Redis: datos efímeros (buzón de etiquetas del Radar, límites de frecuencia).
- Cifrado: libsodium. Notificaciones: APNs y FCM, con texto genérico.

**Alcance por fases**
- Fase 0: prototipo clicable, sin backend.
- Fase 1: producto real, con Radar de zona (internet y ubicación aproximada).
- Fase 2: Bluetooth y conexión sin internet; solo el SMS de «estoy bien» podría adelantarse.

**Modelo del grafo**
- Anillos: RAIZ (familia y ancestros), TRONCO (la gente más cercana) y RAMA (conocidos queridos).
- Un Moai es un grupo elegido por las personas, de dos a cinco (decisión de Mateo, 14 de octubre de 2026: puede empezar entre dos y crecer). Una persona puede estar en varios Moais, y los grupos pueden solaparse.
- La fuerza de un vínculo engrosa con las interacciones y se marchita solo en lo visual: se calcula al leer, nunca se borra (pasa a DORMIDO). RAIZ no se marchita.
- La Polinización crea una RAMA con confianza inicial de 0,25. Subir a TRONCO exige la confirmación de ambas personas.
- Louvain solo propone grupos; nunca asigna Moais.
- Animales y plantas son nodos mínimos, sin datos de salud. Lo que una persona cuida es privado por defecto.

**Algoritmo de cuidado**
- Nivel Moai (por defecto): mensajes a todo el grupo, según la cohesión frente al ritmo que el propio Moai eligió. Anfitrión rotativo. Tope global de un mensaje por semana por persona.
- Nivel persona (solo con permiso): escalera de cuidado, siempre del paso más suave al más fuerte, y la persona recibe el primer mensaje.
- Lo que ocurre fuera de MOAI lo cuentan las personas con «Ya nos vimos».

## Estilo de código

- TypeScript estricto.
- Identificadores del dominio en español y sin tildes (Persona, Espora, Moai, Raiz), y la infraestructura en inglés.
- Textos de interfaz en español, de tú, cálidos y sin jerga. Letra grande y accesibilidad desde el diseño.
- Toda consulta Cypher lleva pruebas contra una base Neo4j real (Docker).
- Ninguna dependencia nueva sin justificarla.
- Commits pequeños con mensajes claros.

## Skills de diseño instaladas

En `.claude/skills/` hay skills de terceros (ver `.claude/skills/ORIGEN.md`): diseño de interfaz, animación, pruebas con Playwright. **Son consejeras, no mandan.** Si una skill contradice la paleta, las tipografías (Fraunces e Inter), el tono de voz, las reglas de privacidad o la especificación del proyecto, gana este archivo y `docs/`. En particular, `taste-skill` está pensada para páginas de aterrizaje: úsala con cuidado en una app de producto.

## Cómo trabajar

- Antes de una tarea grande, resume el plan en pocas líneas y espera confirmación.
- Todo lo que toque datos personales, cifrado, ubicación o consentimiento necesita revisión humana antes de fusionarse: márcalo en la descripción.
- Si algo no está decidido, está en la lista de decisiones abiertas de abajo: no lo inventes, pregunta.
- Los archivos Cypher de `docs/cypher/` son borradores: no los trates como correctos.
- Nada sale a producción desde aquí.

## Mapa del repositorio

- `CLAUDE.md`: esta guía.
- `AGENTS.md`, `src/`, `public/`, `index.html`: el prototipo cero.
- `docs/`: los documentos del proyecto y los borradores Cypher (ver `docs/README.md`).
- `tasks/`: tareas para Claude Code, en orden.
- `prompts/`: el primer mensaje para empezar.
- `docker-compose.yml`: entorno local con Neo4j, PostgreSQL y Redis (para la tarea 01).

## Decisiones abiertas (resumen)

- Foto de perfil: ¿se estiliza en el dispositivo o en la nube?
- Edad mínima para tener cuenta propia.
- Qué ve la otra persona cuando alguien borra su cuenta.
- Visibilidad por defecto de oficios y deseos (nadie, el Moai o la red).
- Claves de cifrado al cambiar de teléfono (propuesta: re-vinculación asistida).
- Radar: tamaño de la celda y duración del permiso (propuesta: 7 días).
- Emergencias: quién declara un evento de zona y cuánto tiempo sin noticias activa la Vigilia.
- Algoritmo de cuidado: los umbrales, y qué algoritmo propone Moais cuando se solapan.
- Proveedor de IA, región de los datos y marco legal (pendiente de abogado).
