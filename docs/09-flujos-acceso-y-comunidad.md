# MOAI · Flujos de acceso, bienvenida y comunidad

**Versión 1.1 · 12 de octubre de 2026.** Ajuste de la versión 1.0 (diseñada con ChatGPT el 11 de octubre) a lo que ya existe en el repositorio y a las decisiones de Mateo de esta semana. Los cambios frente a la 1.0 están en el apartado 0. Las reglas de `CLAUDE.md` mandan sobre este documento.

## 0. Qué cambió frente a la versión 1.0

| Tema | Versión 1.0 | Ahora | Por qué |
|---|---|---|---|
| Datos del registro | Solo nombre y correo; «no pedir fecha de nacimiento» | Registro: nombre, correo y dos casillas (diseño de Mateo). Después del código: fecha de nacimiento (18 años o más; si no, se borra la cuenta) y luego «Tu comunidad» con la ciudad | La fecha sirve para los «momentos de verdad». Empezar es más liviano. |
| Consentimiento | Una casilla: términos y privacidad juntos | Dos casillas separadas: términos, y autorización de tratamiento de datos (Ley 1581) | La autorización de datos debe ser previa, expresa e informada; los textos están con el abogado. |
| WhatsApp | No se menciona | Visible como «muy pronto», sin poder elegirse | Twilio es de pago; se activa después. |
| Proveedor de códigos | «Bajo gestión del proveedor» | Servidor propio (`server/`): códigos de 6 dígitos con hash, 10 min, 5 intentos, 5 envíos por hora; correo con Resend | Ya construido y probado. |
| Resend | — | Configurado en código, sin clave todavía; en desarrollo el código sale en la consola | Mateo lo deja para una etapa posterior. |
| Cuentas sin verificar | — | Recordatorio por correo dos veces por semana; se borran a los 20 días | Decisión de Mateo. |
| Video de Brisa | «No disponible» | Existe (`public/backgrounds/brisa.mp4`). Su texto se deforma, así que se usa el tramo de 4,1 s al final y el panel HTML lo tapa | Falta un video limpio, sin panel ni textos, para cumplir la regla de assets limpios (apartado 7). |
| Brisa | «Guía» | Además, siempre se presenta como IA (regla 12) | Regla del proyecto. |
| Ubicación (P06) | Botón «Usar mi ubicación» con permiso del navegador y geocodificación | **Decidido:** solo manual. La ciudad ya viene del registro; aquí se confirma y se añade un barrio opcional | Reglas 1 y 6, y `privacy.test.ts` prohíbe la geolocalización; no hay geocodificador. |
| Primer día | — | El cuestionario del prototipo (semilla, oficios, gente…) se reemplaza por conversación con Brisa a lo largo de varios días (ver apartado 4, P11) | Dirección de Mateo: «que no parezca un formulario». |
| Pantalla principal | «Mi comunidad» (encuentros, saberes, apoyos, mensajes) | **Decidido: conviven.** Mi comunidad es la principal; la ciudad, el árbol, la calle y el Moai siguen como secciones | Decisión de Mateo. |
| Tipografía | Sans redondeada, una sola familia | La define el diseño de Figma; se autoaloja con fontsource. Hoy hay Inter y Fraunces | Las maquetas de Mateo usan sans redondeada. |
| Rutas | `/bienvenida`, `/registro`… | Hoy es una sola página con estados; hay que pasar a rutas reales sin añadir dependencias (History API) | Recargar, volver atrás y enlaces privados lo exigen. |
| Diseño visual | Lo propone el documento | **Lo diseña Mateo en Figma** y Claude Code lo implementa; este documento define comportamiento | La visual hecha por Claude no convenció. |

## 1. Qué estamos construyendo

MOAI — Ciudades del cuidado — conecta personas, saberes, encuentros y apoyos comunitarios. Cualquier persona puede aportar y recibir. La experiencia es comprensible, acogedora e intergeneracional, sin infantilizar a las personas mayores ni clasificarlas como receptoras de ayuda.

Brisa es la guía de entrada: una esfera abstracta de luz perlada y verde menta. No es un personaje humano y siempre dice que es una IA. Para este alcance sus textos son predefinidos; no hay chatbot generativo (el proveedor de IA está pendiente).

**Fuera de este alcance:** el rito de 21 días, tokens, modelos predictivos, biometría y visualización radial avanzada. No se trasladan a la interfaz afirmaciones médicas ni promesas de longevidad.

## 2. Recorridos

| Situación | Recorrido | Destino |
|---|---|---|
| Persona nueva | Portada → Crear cuenta → Brisa → Registro → Código → Comunidad → Intención | Mi comunidad, estado inicial |
| Cuenta existente, sin sesión | Portada → Iniciar sesión → Correo → Código | Mi comunidad, o el primer paso pendiente |
| Sesión activa y pasos resueltos | Validar la sesión sin interrumpir | Mi comunidad o el enlace pedido |
| Sesión activa, pasos pendientes | Resolver el primer paso pendiente | Comunidad o intención; luego el destino |
| Sesión vencida en una ruta privada | Iniciar sesión → Código | El destino interno pedido |

**Orden para alta nueva (cambia lo que hay hoy):** «Crear cuenta» abre el saludo de Brisa y «Continuar» lleva al registro. No hay un segundo saludo después del código. Hoy el saludo sale después del código; se mueve.

**Quien vuelve (decidido):** no ve la bienvenida de Brisa. Mi comunidad lo saluda con «Hola, [nombre]».

## 3. Lenguaje visual

El diseño de cada pantalla lo entrega Mateo en Figma (`https://www.figma.com/design/ysY7rr3Nf7LOsPmekZwt3x`). Claude Code lo implementa en HTML real y respeta estas reglas, que son de comportamiento y accesibilidad:

- Paneles translúcidos con capa oscura suficiente para leer; el vidrio no sacrifica legibilidad.
- Texto base de 18 px como objetivo; títulos de 28 a 40 px; botones de 48 px de alto o más; foco visible.
- Desktop: contenido máximo de 1200 px; formularios de 440 a 480 px. Móvil: una columna, márgenes de 20 px, sin scroll horizontal desde 360 px; el teclado no tapa el campo activo ni el botón principal.
- Tokens propuestos (a confirmar con el diseño): fondo `#071C1B`, panel `#15312E`, texto `#F5F7EF`, secundario `#C6D4CF`, acción lima `#CEFA63` con texto `#10231C`, foco `#8BE4D5`.
- Uso cotidiano (Mi comunidad y siguientes): superficies más uniformes; nada de bosque detallado detrás de cada tarjeta.
- Transiciones de 180 a 300 ms. Nada depende de terminar un video, audio o animación. Audio apagado de inicio, con control «Escuchar a Brisa» (voz del navegador, sin servicios externos). Video solo decorativo, con alternativa quieta; respeta «reducir movimiento».
- Teclado completo, etiquetas persistentes, errores junto al campo, estados anunciados y foco al encabezado al cambiar de pantalla.

### Assets que hacen falta (limpios, sin texto ni botones)

1. Portada: ciudad con naturaleza a la derecha. **Hoy:** recorte de la maqueta de Mateo, 836 × 941 px; conviene una versión más grande.
2. Bienvenida: bosque y agua con la esfera, en video (y un fotograma quieto). **Hoy:** video con el panel y el botón incrustados.
3. Brisa sola (esfera), para usarla pequeña en registro, configuración y Mi comunidad.

## 4. Pantallas

Estado: ✅ existe · 🔧 existe y cambia · 🆕 por hacer.

### P00 · Resolución de sesión 🆕
Al cargar cualquier ruta, vista sobria con MOAI y «Estamos abriendo tu espacio…» mientras se consulta `/api/sesion`. Evita que alguien con sesión vea la portada un instante. Si falla la red: «Reintentar»; un error de conexión no es un cierre de sesión.

### P01 · Portada pública ✅ `/`
MOAI, «Ciudades del cuidado», «Conecta. Comparte. Cuida.», **Crear cuenta** → `/bienvenida`, **Iniciar sesión** → `/acceso`. 🆕 Pie discreto: Privacidad, Términos y Ayuda, con páginas reales (los textos legales se muestran como «en revisión» hasta que el abogado los apruebe).

### P02 · Brisa da la bienvenida 🔧 `/bienvenida`
Se mueve antes del registro. **Hola, soy Brisa.** · **Qué bueno tenerte aquí.** · línea de IA · **Continuar** → `/registro` · secundario pequeño **Ya tengo cuenta** → `/acceso` · 🆕 **Escuchar a Brisa** / **Silenciar**. El botón funciona desde el primer instante.

### P03 · Crear cuenta 🔧 `/registro`
Diseño de Mateo: panel de vidrio centrado sobre el bosque en movimiento, Brisa pequeña arriba, «Volver» arriba a la izquierda. Título: **Empecemos por conocernos** · «Crea tu cuenta para conectar con tu comunidad.» Campos: **¿Cómo te llamas?** (ayuda: «Como prefieras que te llamemos»; hasta 60 caracteres) y **Tu correo electrónico**. Dos casillas sin marcar: «Acepto los Términos de uso y he leído la Política de privacidad» (con enlaces a `/terminos` y `/privacidad`) y «Autorizo el tratamiento de mis datos personales según la Ley 1581 de 2012». WhatsApp aparece como «muy pronto». Principal: **Crear mi cuenta** (mientras envía: «Enviando código…»). Pie: **¿Ya tienes cuenta? Iniciar sesión**. Volver a Brisa y regresar conserva lo escrito. Si el correo ya tiene cuenta verificada, el servidor envía un código de acceso sin sobrescribir sus datos y sin revelar que existe.

### P04 · Iniciar sesión 🔧 `/acceso`
**Qué bueno verte de nuevo** · «Escribe tu correo para recibir un código de acceso.» · **Tu correo electrónico** · **Enviar código** · pie **¿Es tu primera vez? Crear cuenta** → `/bienvenida`. Un correo sin cuenta no recibe código y la respuesta es la misma (no se revela quién está registrado).

### P05 · Verificar correo 🔧 `/verificar`
**Revisa tu correo** · «Escribe el código que enviamos a [correo enmascarado].» · campo único **Código de acceso** (pegar y autocompletar) · **Verificar y continuar** · **Enviar otro código** · **Cambiar correo** · «Si no lo ves, revisa la carpeta de correo no deseado.» Errores distintos para código incorrecto, vencido y demasiados intentos, con los mensajes que ya da el servidor. Recargar vuelve al correo con una explicación (el desafío no se guarda en el navegador).

### P05b · Fecha de nacimiento ✅ `/configuracion/nacimiento`
**Qué gusto, [nombre].** · «¿Cuándo naciste? Así puedo acordarme de tu día.» Día, mes y año (se muestran todos los años: la regla de edad se explica, no se esconde). No se puede omitir. Menor de 18: el servidor borra la cuenta y sus datos, y la pantalla lo explica sin culpas.

### P06 · Tu comunidad ✅ `/configuracion/comunidad`
**¿Dónde quieres conectar con tu comunidad?** · «Elige una zona para descubrir personas y encuentros cerca de ti.» La ciudad del registro viene elegida; se confirma o se cambia, y se puede añadir un barrio en texto libre (no hay catálogo de barrios). **Confirmar** · **Lo haré después** (guarda `skipped`). Nota visible: «No necesitamos la dirección de tu casa. Tu zona no se muestra en tu perfil.» **Decidido:** sin «Usar mi ubicación» en esta versión. La zona es privada por defecto y solo ordena sugerencias.

### P07 · Intención 🆕 `/configuracion/intencion`
Brisa pequeña arriba. **¿Qué te gustaría hacer hoy?** · «Te ayudaré a encontrar por dónde empezar.» · «Último paso · Puedes cambiarlo después». Tres tarjetas de selección única: **Conocer personas** (`connect`), **Compartir lo que sé** (`share`), **Encontrar apoyo** (`support`). Seleccionar no navega. **Continuar** (deshabilitado sin selección) · **Explorar primero** (guarda `skipped`).

### P08 · Mi comunidad 🆕 `/comunidad`
Estado nuevo: **Hola, [nombre]. Este es tu espacio.** · «Puedes empezar por algo que disfrutas o por algo que necesitas.» · tarjeta pequeña de Brisa con **Ver cómo empezar** · tres acciones: **Explorar encuentros**, **Compartir un saber**, **Buscar apoyo** (la intención destaca una). Si se omitió la zona: recordatorio descartable. Estado recurrente: **Hola, [nombre]**, tu próximo encuentro y tus conversaciones solo si existen de verdad. Nunca inventar participantes, conversaciones, distancias ni recomendaciones; nada de contadores (regla 5). Navegación: Mi comunidad, Encuentros, Mensajes, Mi perfil. La ciudad del prototipo (árbol, calle, carta de Brisa, Radar, Moai) convive como sección propia, «Mi ciudad», enlazada desde Mi comunidad.

### P09 · Destinos de las acciones 🆕
`/encuentros`, `/saberes/nuevo`, `/apoyos`, `/mensajes`, `/perfil`: pantallas mínimas y honestas (estado vacío o borrador real). Perfil: nombre, zona privada, intención editable y cerrar sesión. Ningún botón que parezca funcionar sin hacerlo.

### P10 · Sesión vencida y cierre 🔧
«Tu sesión terminó. Vuelve a entrar para continuar.» → **Iniciar sesión**, y después vuelve al destino interno pedido (nunca a URLs externas). Cerrar sesión ya existe (Ajustes); pasa a Mi perfil.

### P11 · Conocerse con Brisa 🆕 (siguiente etapa, después de este documento)
Reemplaza el cuestionario del prototipo. Brisa pregunta poco y en días distintos, como quien conoce a alguien: cómo va tu día, qué hiciste; al otro día, qué harías en un caso hipotético. Las respuestas llenan el perfil (oficios, gustos, su gente) sin parecer un formulario. Siempre se puede no responder. Requiere su propio diseño y guion.

## 5. Navegación y estado

Una sola función decide a dónde va cada persona:

```text
sesión cargando → P00
error de red al consultar → reintentar (no asumir «sin sesión»)
sin sesión: ruta pública → se queda; ruta privada → /acceso con destino interno
con sesión:
  comunidad = pending → /configuracion/comunidad
  intención = pending → /configuracion/intencion
  ambos completed o skipped → destino interno pedido o /comunidad
```

- `skipped` no es `pending`: lo omitido no se vuelve a preguntar.
- Cuentas que ya existen (las de prueba): migrar con `pending` en ambos pasos.
- La sesión solo la valida el servidor (cookie httpOnly). Nada en el navegador autentica.
- Reintentos sin duplicar cuentas ni envíos.

## 6. Datos (sobre las tablas que ya existen)

`cuentas` ya guarda nombre, canal, destino, ciudad (código DIVIPOLA), fecha de nacimiento y verificación; `consentimientos` guarda tipo, versión y fecha. Se añade:

```sql
alter table cuentas add column barrio text;                       -- opcional, texto libre
alter table cuentas add column comunidad_estado text not null default 'pending';  -- pending | completed | skipped
alter table cuentas add column intencion text;                    -- connect | share | support
alter table cuentas add column intencion_estado text not null default 'pending';
alter table cuentas add column visibilidad_zona text not null default 'private';
```

Nunca coordenadas (regla 1). Nuevas operaciones: `GET /api/perfil`, `POST /api/perfil/comunidad`, `POST /api/perfil/intencion`. Cada una responde éxito o error real antes de avanzar.

## 7. Casos de aceptación

Los de la versión 1.0 siguen vigentes, salvo: «permiso de ubicación rechazado» y «ubicación detectada equivocada» (no aplican si se aprueba P06 manual) y «correo nuevo en acceso» (aquí no se envía código). Se añaden: menor de 18 años no crea cuenta; WhatsApp no se puede elegir; Brisa siempre se presenta como IA; el panel del video nunca deja leer su texto roto.

## 8. Orden de trabajo

1. Rutas reales con History API, resolvedor de sesión (P00) y protección de rutas.
2. Mover Brisa antes del registro y ajustar textos de P02 a P05.
3. Columnas nuevas, API de perfil, P06 y P07.
4. P08 y P09, con «Mi ciudad» como sección.
5. Aplicar el diseño de Figma pantalla por pantalla, a medida que Mateo lo entregue.
6. Accesibilidad, estados de error y carga, pruebas y revisión en móvil y desktop.

**Dependencias:** clave de Resend (después), textos legales aprobados, assets limpios y diseños en Figma.
