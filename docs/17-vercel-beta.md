# Preparar la API de MOAI en Vercel

20 de octubre de 2026. Rama `codex/vercel-api-beta`, sobre `codex/brisa-modelos-beta`. **Preparación para revisión; no se ha desplegado desde este entorno.** Mateo indicó haber guardado las variables de Gemini en Vercel; este entorno no puede leerlas ni confirmar su contenido. Tampoco se ha hecho una llamada real a Google.

## Qué falta comprobar en la cuenta de Vercel

La parte visual de Vite no ejecuta por sí sola `server/index.ts`. Este cambio añade una función de Node en `api/index.ts` y mantiene `/api` en el mismo dominio que la web, sin exponer credenciales al navegador.

1. Abrir el proyecto **moai → Storage**. Revisar si aparece una base PostgreSQL conectada. Una base de tipo Blob o Redis no sustituye PostgreSQL.
2. Si no existe, conectar una integración PostgreSQL desde **Storage / Marketplace**, por ejemplo Neon, revisando los límites, región y condiciones de su cuenta. No se ha contratado ni creado ningún recurso desde aquí; no se promete gratuidad permanente.
3. Usar una base o rama **exclusiva de la beta**, con datos ficticios. Conectarla al entorno **Preview**. Nunca reutilizar la base de producción para previews de ramas.
4. En **Settings → Environment Variables**, comprobar que existe **`DATABASE_URL`**. Algunas integraciones crean `POSTGRES_URL` u otro nombre: MOAI necesita `DATABASE_URL`, cuyo valor debe ser la conexión PostgreSQL agrupada que ofrece el proveedor. Introducirlo únicamente en Vercel o en el entorno privado de desarrollo; no en el chat, capturas, Git ni variables `VITE_`.

Enlace del proyecto indicado por Mateo: <https://vercel.com/vasees/moai/settings/environment-variables>. Las etiquetas de la interfaz pueden variar.

## Configuración del servidor para Preview

Cada variable se añade por separado. El despliegue usa Node 24; fijar **Node.js 24.x** en los ajustes del proyecto. Las claves se marcan sensibles cuando el panel lo permita.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL persistente de la beta, preferiblemente con pooler y TLS según el proveedor. No se desactiva la verificación del certificado. |
| `CODIGO_SECRETO` | Secreto aleatorio de al menos 32 caracteres para cifrado y autenticación. Debe conservarse estable junto con las copias de la base. |
| `RESEND_API_KEY` | Clave del proveedor de correo. No hay códigos de acceso en los registros de Vercel, tampoco en Preview. |
| `CORREO_REMITENTE` | Remitente de un dominio verificado en Resend, por ejemplo `MOAI <hola@tu-dominio.co>`. |
| `APP_URL` | Origen HTTPS de la beta, sin rutas, consultas ni credenciales, para enlaces de correo. Usar un dominio o alias estable del entorno de pruebas. |
| `CRON_SECRET` | Otro secreto aleatorio de al menos 32 caracteres. Autoriza únicamente el mantenimiento. Debe ser diferente de `CODIGO_SECRETO`. |
| `GEMINI_API_KEY` | Clave ya configurada según Mateo. Exclusiva del servidor. |
| `GEMINI_MODEL` | Identificador de un modelo con salida estructurada disponible en su proyecto de AI Studio. Verificar cuota y facturación antes de probar. |
| `BRISA_GEMINI_BETA` | `true` para la prueba explícita con frases ficticias; `false` desactiva el proveedor y mantiene las búsquedas por reglas. |

`EQUIPO_CORREOS` y las claves de Twilio siguen siendo opcionales. No configurar Twilio para esta prueba. No se cambian los permisos ni la selección de adultos de MOAI.

**No generar de nuevo `CODIGO_SECRETO` si la base ya contiene información cifrada:** perdería legibilidad. Si se migra una base local existente, se necesita su secreto original, no uno nuevo. Una base de beta recién creada sí debe tener su propio secreto aleatorio.

## Preparar el esquema antes de recibir visitas

Desde un entorno de desarrollo de confianza que tenga acceso a **la base de Preview**, configurar de forma privada `DATABASE_URL` y ejecutar:

```sh
npm ci
npm run db:prepare
```

La tarea solo prepara el esquema de PostgreSQL; no envía correos, no consulta Gemini ni crea ejemplos. Usa una transacción y un candado de PostgreSQL para evitar dos preparaciones simultáneas. Puede repetirse sobre esta versión y conserva las cuentas y los datos actuales. Hereda las migraciones anteriores del proyecto, incluidas las eliminaciones de tablas obsoletas `plan_asistentes` e `invierno_avisos`: revisar y respaldar una base existente antes de migrarla. Se ha probado sobre una base ficticia, no sobre datos de usuarios.

`npm run build` **no** prepara ni conecta la base. Así, compilar una rama no modifica datos. La función tampoco crea tablas en un arranque en frío y responde 503 si falta el esquema. No se usa `.data/`, PGlite ni un secreto generado automáticamente en Vercel.

## Comprobar un despliegue de Preview, después de la revisión

1. Desplegar la rama revisada con las variables de Preview. Si la protección de despliegue lo requiere, entrar primero con la cuenta autorizada de Vercel. Las variables nuevas solo se incorporan a nuevos despliegues.
2. Visitar `https://TU-PREVIEW/api/health`: debe responder `{"ok":true}`. Solo comprueba el servidor y una consulta a la base; **no** certifica el correo ni la conexión a Gemini.
3. Recargar directamente `/gente` y `/inicio`: deben cargar la aplicación. `/api/no-existe` debe devolver JSON con 404, nunca el HTML de la portada.
4. Crear una cuenta ficticia con un correo de pruebas controlado. Comprobar que llega el código y permite entrar. La cookie de sesión debe ser `HttpOnly`, `Secure` y `SameSite=Lax`.
5. Abrir Brisa → Buscar un plan → Entender mi idea con Gemini. Escribir una actividad ficticia, autorizar ese envío, interpretar y revisar el texto. Una interpretación no debe buscar, publicar ni sumarse automáticamente. Confirmar una acción sigue siendo un paso separado.
6. Apagar `BRISA_GEMINI_BETA` y desplegar de nuevo si hay que detener las llamadas externas. La búsqueda local por reglas permanece disponible.

Un 503 puede indicar configuración incompleta, base inaccesible o esquema pendiente. Los registros muestran solo nombres de variables faltantes y mensajes genéricos: nunca pegar una URL de conexión o un error completo del proveedor en un reporte público. Las cuotas de Gemini siguen siendo 10 peticiones por cuenta y 100 en toda la beta por cada 24 horas; no constituyen un presupuesto monetario.

## Limpieza y recordatorios: no se programan automáticamente

Las funciones efímeras no mantienen el `setInterval` de `server/index.ts`. Se añadió una ruta protegida:

```text
GET /api/interno/mantenimiento
Authorization: Bearer VALOR_PRIVADO_DE_CRON_SECRET
```

Conservar el secreto en la configuración privada del programador, **nunca en la URL**. Programar esta petición cada seis horas y esperar a que termine. En una Preview protegida, el programador también necesita el acceso legítimo de Vercel; no desactivar la protección para hacerlo funcionar.

La tarea reutiliza el borrado de conversaciones vencidas, memoria, propuestas y metadatos de Gemini, las cuentas sin verificar y los correos existentes. Un candado transaccional evita solapamientos entre instancias. Un segundo mantenimiento simultáneo devuelve 409. La respuesta no incluye nombres, direcciones, mensajes ni recuentos de personas.

**Pendiente operativo:** elegir y configurar el programador compatible con el plan. No se añadió un cron automático a `vercel.json` ni se contrató un plan: comprobar las restricciones actuales de Vercel Hobby antes de intentar una frecuencia de seis horas. Una tarea manual sirve para la verificación, pero no sustituye la limpieza periódica. No abrir la beta a usuarios reales sin configurar y comprobar esta tarea y sus alertas de fallo.

La función tiene un máximo configurado de 60 segundos. El mantenimiento actual recorre destinatarios y mantiene una transacción durante los envíos: es una adaptación para una beta pequeña, no una cola de trabajo para un despliegue grande. Antes de crecer se requieren procesamiento por lotes, límite temporal, cola de envíos e idempotencia para no duplicar correos si el proveedor acepta un envío y luego falla la transacción. Verificar esto con PostgreSQL administrado y el programador real forma parte de la revisión de despliegue.

## Implementación y límites de la verificación

- `api/index.ts`, `server/vercel.ts`: una inicialización compartida por instancia; pool de hasta tres conexiones, reutilizable; reintento del arranque después de un fallo. Sin puertos propios ni tareas de fondo en la función. Sin SDK ni dependencias nuevas.
- `vercel.json`: frontend Vite en `dist`, `/api/*` a la función y rutas de la aplicación a `index.html`. PGlite se carga dinámicamente solo en desarrollo y se excluye del paquete de la función.
- Respuestas de API sin caché compartida, claves solo del servidor, errores de infraestructura sanitizados y correo obligatorio incluso en Preview. Se conservan límites, permisos, cifrado, sesiones y reglas de Brisa.
- `server/vercel.test.ts`: solicitudes HTTP reales a la entrada de la función con PGlite aislado y transporte externo simulado: arranque concurrente, JSON POST, código de correo, cookie segura, sesión, interpretación con autorización sin ejecutar acciones, conservación de datos al preparar el esquema otra vez, tarea protegida, borrado de vencidos y recuperación de errores.
- Verificación local: **283 pruebas en 38 archivos aprobadas**, `npm run build` aprobado y entrada `api/index.ts` compilada con esbuild para Node. Persiste el aviso previo de Vite por el paquete principal de más de 500 kB. No se añadieron dependencias.
- **Sin conexión al panel de Vercel, PostgreSQL administrado, correo real ni Google real.** Las pruebas locales no demuestran el enrutamiento de la plataforma, TLS del proveedor, límites del plan, concurrencia entre procesos de PostgreSQL ni calidad real del modelo. Completar el recorrido de Preview de arriba antes de declarar operativo el despliegue.

Patrón del adaptador contrastado con el ejemplo oficial `vercel/examples`, `starter/fastify/api/index.js` y `vercel.json`, revisión `de86723` (16 de octubre de 2026). Tipos y runtime de Node contrastados con `vercel/vercel`. La documentación web de Vercel no pudo consultarse desde este entorno por el proxy; estos repositorios oficiales sí fueron accesibles por Git.

**Revisión humana antes de fusionar/desplegar:** credenciales, aislamiento de entornos, región/proveedor de datos, copia y recuperación de base y secreto, correo, programación y privacidad. No se ha publicado en producción.
