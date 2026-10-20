# Brisa: intención, memoria autorizada y acciones confirmadas

20 de octubre de 2026 · Rama `codex/brisa-memoria-intenciones`, desde `f3c545c` de `codex/fondos-por-ciudad`. Sin dependencias nuevas.

**Revisión humana antes de fusionar:** memoria personal, consentimiento, cifrado existente, descarga/borrado y asistencia a planes. Nada publicado. El proveedor y el marco legal de un modelo externo siguen pendientes; esta versión funciona con reglas dentro de MOAI, sin servicios externos de IA.

## Recorrido construido

En Inicio, abrir Brisa → «Buscar un plan». También se puede escribir «Busca caminar el sábado» en el chat: conduce al mismo espacio. Las respuestas anteriores y el flujo existente para proponer planes se conservan.

1. La persona indica una actividad y, opcionalmente, un día o «gratis».
2. El servidor interpreta esos criterios y consulta `planesVisibles`: ciudad/alcance, miembros de Moais, bloqueos, suspensiones, cancelaciones, próxima ocurrencia y cupos existentes. No inventa planes ni participantes.
3. Muestra hasta tres opciones futuras dentro de los próximos 30 días, con lugar público, costo, fecha en Colombia y motivo visible. Excluye planes propios, ya aceptados, completos o descartados.
4. «Revisar para sumarme» abre una confirmación con plan, fecha y lugar. Cancelar no modifica la asistencia.
5. «Sí, confirmar asistencia» ejecuta en servidor. Se verifica otra vez la disponibilidad, el lugar activo, el contenido/fecha de la propuesta y el cupo. Una búsqueda nunca ejecuta la acción.
6. La confirmación permite abrir el plan real. Salir del plan sigue disponible en su pantalla existente.

El motor entiende caminar, tinto/café, huerta, ajedrez/parqués, tejido, mandados y voluntariado; hoy, mañana, pasado mañana, días de la semana y fin de semana. «El sábado» refiere a una fecha próxima concreta; «los sábados» y los días recordados son disponibilidad recurrente. Fechas y días usan `America/Bogota`.

Negaciones, horarios y restricciones de ritmo explícitas se devuelven para aclarar, en vez de asegurar que un plan las satisface. No es comprensión general del lenguaje: puede omitir matices fuera del vocabulario soportado. Se muestran los filtros aplicados y la ficha completa para revisarlos. Una ciudad colombiana reconocida que difiere del lugar activo requiere elegirla en el selector; no cambia de ciudad automáticamente.

## Memoria y permisos

La memoria comienza vacía. Se eligen actividades, días opcionales, filtro gratis y duración de 30 o 90 días. Una casilla expresa autoriza **guardar y usar** esos campos para buscar planes; el servidor exige la versión vigente de ese permiso. La fecha, versión y vencimiento quedan con la memoria cifrada.

Un permiso independiente, apagado por defecto, permite preparar propuestas al abrir «Buscar un plan». Se pausa durante el invierno **declarado**. La búsqueda que la persona solicita explícitamente sigue accesible. No hay notificaciones nuevas, sondeos periódicos, envío de mensajes ni asistencia automática.

La interfaz permite revisar, corregir y olvidar la memoria aquí y en Mi cuenta. No se extrae del historial, de estados emocionales, notas de vínculos, perfiles o mensajes de planes/Moais. No se guardan campos de texto libre en esta memoria. Tampoco se incorporan preferencias a la presentación pública.

Cambiar u olvidar la memoria anula todas las propuestas pendientes de esa cuenta. Olvidarla también elimina los descartes; conserva conversaciones y asistencias confirmadas. Borrar conversación conserva preferencias: ambos controles explican su alcance por separado.

## Datos y ejecución

| Registro | Contenido y acceso | Duración |
| --- | --- | --- |
| `brisa_memoria` | Preferencias y permiso cifrados con `server/cifrado.ts`; solo su cuenta | 30 o 90 días, o borrado manual |
| Propuesta pendiente | Identificador aleatorio asociado a la cuenta; plan/ocurrencia, huella y contexto de lugar cifrados | Hasta 15 minutos, sin superar el vencimiento de la memoria utilizada; otra búsqueda o edición la invalida |
| Comprobante confirmado | Plan, ocurrencia, motivo y momento de confirmación; contenido cifrado | 90 días |
| `brisa_descartes` | Identificador opaco HMAC de cuenta/plan/ocurrencia | 90 días, o al olvidar preferencias |

Los comprobantes sustituyen el borrador: **no conservan el identificador del lugar activo ni su contexto como historial de ciudades**. Registrar una asistencia es una acción explícita, como en el flujo de planes existente. Los registros técnicos no reciben estos contenidos.

Los datos vencidos dejan de usarse inmediatamente. El mantenimiento existente retira físicamente registros vencidos al arrancar y cada seis horas. La descarga de datos incluye memoria vigente, borradores vigentes, comprobantes recientes y descartes. Borrar cuenta elimina las tablas nuevas en cascada.

Preparar, cambiar memoria y confirmar se serializan con el candado de cuenta usado al cambiar lugar. La reserva de asistencia comparte candado y mecanismo de cupos entre Brisa y la pantalla del plan. La confirmación es idempotente: un reintento devuelve el comprobante, sin crear otra asistencia ni volver a sumarte si después saliste del plan. Los comprobantes describen una acción pasada, no el estado actual de la asistencia.

Los textos legales y `VERSION_TEXTOS` se actualizaron. El permiso de memoria se solicita también a cuentas existentes al usarlo; la renovación general de términos de cuentas existentes continúa siendo un pendiente anterior a este cambio.

## Verificación

- Suite completa: **263 pruebas, 35 archivos**. Tras los ajustes visuales y de comprobantes, pasaron también las comprobaciones dirigidas de servidor, interfaz, conversación, privacidad y cuenta.
- `npm run build`: TypeScript y Vite correctos; permanece el aviso previo de paquete principal mayor de 500 kB.
- Chromium real a **390 × 844**, **768 × 1024**, **1440 × 900**, movimiento reducido. API Fastify/PGlite aislada, cuentas y planes ficticios; sin interceptar respuestas correctas ni enviar correos. Solo se abortó una consulta para comprobar recuperación de red.
- En los tres tamaños: buscar → revisar → cancelar → confirmar → abrir plan → autorizar memoria → volver a abrir con propuestas → recargar → descartar → error de red → reintentar → revisar comprobante en Mi cuenta → olvidar preferencias → entrar desde texto en chat → cambiar a Bogotá y comprobar ausencia de resultados anteriores.
- Sin errores JavaScript ni solicitudes externas. Controles nuevos de al menos 48 px, foco en resultados y confirmación, sin desbordamiento horizontal y panel por encima de la barra inferior.
- Pruebas de servidor: consentimiento/validación, cifrado, acceso entre cuentas, exclusión de otras ciudades/bloqueos, ausencia de inferencia desde historial/perfil/fichas, invierno, caducidad, confirmación requerida, reintentos simultáneos, último cupo compartido con la ruta normal, cambio/cancelación de plan y revocación de memoria.

Se inspeccionaron las capturas y se corrigieron el exceso de introducción en móvil, la transparencia del texto sobre la ciudad y el foco/desplazamiento hacia resultados. **21 capturas reales** y mediciones en [capturas/brisa-intenciones](capturas/brisa-intenciones/); [galería navegable](brisa-intenciones.html).

Las pruebas del navegador se ejecutaron con `/tmp/moai-brisa-browser.mts` y `/tmp/playwright-test-brisa-intenciones.cjs`. Son archivos temporales de verificación; los datos ficticios no entran en el producto.

## Límites y evolución

Esta entrega proporciona memoria controlada, recomendaciones explicables y autonomía para consultar/preparar. No entrena un modelo, predice estados personales ni delega compromisos sociales. El siguiente paso de lenguaje libre requiere proveedor, contrato/retención/región y credenciales de servidor; la decisión jurídica del proyecto sigue abierta. Un futuro modelo solo debería producir criterios estructurados y solicitudes de preparación. La comprobación de permisos y ejecución confirmada debe seguir en el servidor, fuera de sus instrucciones.

Pendientes antes de producción: revisión humana de este flujo y textos, renovación general de términos, pruebas con personas usuarias y lectores de pantalla/dispositivos físicos. Estas verificaciones no equivalen a una auditoría independiente de seguridad o accesibilidad.
