# Gemini para probar la comprensión de Brisa

Para ejecutar la API en Vercel, ver [17-vercel-beta.md](17-vercel-beta.md): guardar la clave no despliega por sí solo el servidor ni conecta la base.

20 de octubre de 2026 · Rama `codex/brisa-modelos-beta`, desde `489f8ef` de `codex/brisa-memoria-intenciones`.

Mateo eligió Gemini para probar la modalidad gratuita **con datos ficticios**. Se preparó un adaptador de servidor y una ayuda opcional en «Buscar un plan». No hay una clave configurada en este entorno: **no se ha realizado una llamada real a Gemini ni validado su calidad de interpretación**. Las verificaciones sustituyen únicamente el transporte de Google por respuestas de prueba; usan el servidor y las reglas reales de MOAI.

**Revisión humana antes de fusionar:** nueva autorización de envío al proveedor, metadatos de esa autorización y textos de privacidad. Datos reales, transferencia/retención, contrato y condiciones del proveedor siguen pendientes de revisión jurídica. Esta entrega no habilita el uso de conversaciones o memoria personal en un modelo externo.

## Recorrido

1. Abrir Brisa → «Buscar un plan» y escribir una idea ficticia, por ejemplo «Tengo libre el sábado y quisiera estirar las piernas con alguien».
2. Abrir «Entender mi idea con Gemini · beta». Autorizar **esa frase** como ficticia y su envío a Google. Editar la frase o terminar una petición retira la casilla: cada envío requiere otra acción expresa.
3. «Interpretar frase ficticia» llama a `/api/brisa/interpretar`. El servidor consulta Gemini y valida estrictamente su salida. No busca planes ni cambia datos de la persona.
4. La interpretación aparece en el campo, por ejemplo «caminar el sábado». La ayuda se cierra y el foco vuelve al campo para revisarla o corregirla.
5. Solo al pulsar «Buscar planes» se utiliza la búsqueda existente, con la memoria autorizada si la persona lo eligió. Siguen disponibles los filtros aplicados y el motivo de cada propuesta.
6. Sumarse sigue exigiendo revisar y confirmar, con las comprobaciones de lugar, ocurrencia, acceso y cupo ya construidas.

La conversación general continúa con guion. Las propuestas automáticas al abrir usan las reglas existentes y **nunca llaman al modelo**. No hay carga automática de historial ni autonomía para escribir mensajes, gestionar personas o cambiar ciudad.

## Datos y límites

Gemini recibe únicamente la frase autorizada, instrucciones generales de MOAI y un esquema JSON. No se incluyen cuenta, nombre, perfil, ciudad guardada, lugares, memoria, notas de vínculos, historial, mensajes ni planes. Si se escribe alguno de esos datos en la propia frase, podría salir en el texto: la interfaz exige usar ejemplos ficticios y el servidor frena algunos patrones de contacto, direcciones, salud y ánimo. **Ese filtro no prueba que todo texto sea ficticio o esté anonimizado.**

El modelo devuelve categorías y días del dominio, periodo relativo, filtro gratis y citas breves de la frase. Se rechazan campos extra, categorías/días inválidos y citas que no estén en el texto. La consulta se construye con palabras del dominio; no se muestra texto libre generado ni se aceptan identificadores de planes o instrucciones ejecutables.

La revisión humana de la interpretación es necesaria: comprobar estructura y citas no garantiza que Gemini haya entendido bien la intención. Horarios, fechas numéricas, exclusiones y restricciones de ritmo no están representados por esta primera versión y requieren reformular. Las señales de riesgo explícitas se atienden con el mensaje local existente, no con inferencias de ánimo o salud.

| Control | Límite de esta beta |
| --- | --- |
| Frase | Hasta 300 caracteres |
| Peticiones | 10 por cuenta y 100 en total en una ventana de 24 horas |
| Concurrencia | Una interpretación pendiente por cuenta; la reserva vence tras 20 segundos si quedó interrumpida |
| Espera del proveedor | Hasta 12 segundos |
| Salida solicitada | Hasta 600 tokens y un candidato |
| Lectura de respuesta | Hasta 32 KiB |
| Reintentos automáticos | Ninguno; los fallos también consumen la cuota reservada |

La reserva de cuota es atómica; se libera la transacción antes de esperar al proveedor. La sesión se comprueba otra vez antes de devolver la interpretación. Las llamadas del navegador siguen pasando únicamente por `src/lib/api.ts` hacia `/api`; la clave va en la cabecera de la petición del servidor al host fijo de Google, nunca en una URL del navegador. No se añadieron dependencias.

MOAI no guarda la frase ni la respuesta de esta función. `brisa_interpretaciones` conserva cuenta, modelo, versión de la autorización, fecha y resultado técnico durante 90 días. La descarga de datos incluye solo los registros propios en `autorizacionesGeminiBeta`. El borrado de cuenta los elimina en cascada; el mantenimiento existente retira los vencidos. Borrar la conversación o preferencias no borra esta prueba de autorización, que vence a los 90 días.

## Activación en un servidor de desarrollo

1. Crear una clave de API en [Google AI Studio](https://aistudio.google.com/apikey). Comprobar allí la disponibilidad, modelo y modalidad gratuita **del proyecto y región concretos**. No compartir la clave en el chat ni guardarla en Git.
2. Configurar en el entorno **del servidor de MOAI**:

   ```dotenv
   GEMINI_API_KEY=tu_clave_privada
   GEMINI_MODEL=el_identificador_gemini_de_tu_proyecto
   BRISA_GEMINI_BETA=true
   ```

   `GEMINI_MODEL` debe ser un identificador válido que empiece por `gemini-`, con soporte de salida estructurada. El README actual del SDK oficial usa `gemini-flash-latest` como ejemplo; es un alias que puede cambiar y **no garantiza elegibilidad gratuita**. Elegir y verificar el modelo en AI Studio antes de activar.
3. Reiniciar la API con `npm run dev:api` y mantener Vite con `npm run dev`, o reiniciar el servidor de desarrollo equivalente. Con `BRISA_GEMINI_BETA=false` no se crea el proveedor aunque haya clave; la búsqueda por reglas continúa disponible.
4. Probar una frase artificial, revisar el resultado, comprobar la cuota y retirar la activación cuando termine la prueba. La primera llamada real y su calidad siguen pendientes hasta que exista la clave.

Los límites de MOAI acotan peticiones, no son un presupuesto monetario. **No se puede garantizar costo cero desde este código:** un proyecto con facturación y un modelo de pago puede generar cargos. Revisar [precios](https://ai.google.dev/gemini-api/docs/pricing), [límites](https://ai.google.dev/gemini-api/docs/rate-limits) y [condiciones](https://ai.google.dev/gemini-api/terms) en la cuenta de Google. No se prometen retención cero ni condiciones concretas de entrenamiento; esta beta admite solo texto ficticio.

## Verificación y capturas

- Suite completa: **275 pruebas, 37 archivos**. Pruebas dirigidas posteriores para los ajustes de controles y revisión de la interpretación.
- `npm run build`: TypeScript/Vite correctos. Persiste el aviso previo del paquete principal mayor de 500 kB.
- Contrato de `generateContent`, `systemInstruction`, JSON Schema y salida contrastado con el [SDK oficial de Google](https://github.com/googleapis/js-genai), revisión `40d6e98` del 20 de octubre de 2026. No se añadió el SDK al proyecto. Las páginas de precios/condiciones no fueron accesibles desde la red del entorno (HTTP 403, también al reintentar con permiso); por eso sus cuotas y condiciones actuales quedan para comprobar en AI Studio.
- Pruebas de transporte: petición/cabecera/esquema correctos, credencial fuera de URL, respuesta incompleta/JSON inválido/exceso de tamaño/herramientas/error del proveedor rechazados y sin reflejar su contenido.
- Pruebas de API: sesión adulta, autorización vigente y ficción, filtros previos, cuotas por cuenta/global y peticiones simultáneas, privacidad de contexto, sesión revocada durante la espera, descarga propia, borrado y caducidad. Ninguna interpretación crea asistencias, propuestas ni memoria.
- Navegador Chromium a **390 × 844**, **768 × 1024** y **1440 × 900**, con movimiento reducido. Fastify/PGlite aislado y cuentas/planes ficticios; respuesta de Gemini simulada en el transporte, sin solicitudes reales a Google. Verificados autorización, edición que retira permiso, interpretación revisable, búsqueda explícita, confirmación real, fallo de red/reintento y ayuda desactivada.
- Sin errores JavaScript, solicitudes externas del navegador ni desbordamiento horizontal; controles nuevos de 48 px y panel por encima de la navegación. Se corrigió la composición para que el botón principal preceda la ayuda y esta se cierre al interpretar.

[18 capturas reales de la interfaz](gemini-beta.html), con la condición de simulación indicada en la galería y las [mediciones](capturas/gemini-beta/verificacion.json). Scripts de verificación temporales: `/tmp/moai-gemini-browser.mts` y `/tmp/playwright-test-gemini-beta.cjs`. No se incorporan datos de prueba al producto.

## Primera llamada real (20 de octubre de 2026)

Con la clave de Mateo en su `.env` local y `GEMINI_MODEL=gemini-flash-latest`, desde la cuenta de prueba y con frases inventadas:

- Al principio fallaba: el modelo «pensaba» antes de responder y gastaba casi todo el límite de 600 tokens de salida (`finishReason: MAX_TOKENS`). Se corrigió pidiendo que piense lo menos posible (`thinkingConfig`: `thinkingBudget: 0` en la familia 2.x y `thinkingLevel: 'low'` en las siguientes; `minimal` no lo admite este modelo).
- «Tengo libre el sábado y quisiera estirar las piernas con alguien» → «caminar el sábado». «quiero sembrar en la huerta este fin de semana» → «huerta esta semana el sábado el domingo». Unos 7 segundos por frase a través de MOAI.
- Una de varias llamadas superó los 12 segundos y se cortó como estaba previsto: en la modalidad gratuita, la latencia de Google varía.
- «me provoca un café el jueves, algo que no cueste» llegó bien a Gemini, pero MOAI la rechazó: «algo que no cueste» cuenta como restricción que esta versión no representa todavía.

Diagnóstico sin exponer la clave ni el texto de la respuesta: `npx tsx --env-file=.env scripts/diagnostico-gemini.ts "frase inventada"` (muestra modelo, estado HTTP, `finishReason` y tokens).
