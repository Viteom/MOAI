# Fondos por ciudad · primera implementación

20 de octubre de 2026 · Rama `codex/fondos-por-ciudad`, basada en la auditoría (`8180f08`). No publicado ni fusionado. Conserva el rediseño anterior de Mi gente y las funciones de planes y Moais.

## Resultado

Inicio y Mi barrio seleccionan ilustración a partir de `perfil.lugar.ciudad`. Medellín y Bogotá tienen arte propio para móvil y escritorio, con luz cálida, arquitectura local, vegetación y dos estructuras de micelio como acento MOAI. El catálogo está separado de la disponibilidad de mapa H3. Bogotá conserva su escenario aunque los planes deban consultarse en Lista.

La composición vertical reduce el recorte móvil: a 390 × 844 queda visible aproximadamente el 82 % del ancho del arte, frente al 29 % del fondo panorámico anterior. En tableta se usa la composición vertical; en escritorio, la horizontal. El horizonte y los rasgos previstos permanecen visibles. Las variantes se seleccionan con `<picture>` según la relación de aspecto del dispositivo.

[Galería comparativa de capturas reales](fondos-ciudades.html). [Recursos, procedencia y exportaciones](../public/backgrounds/ciudades/README.md).

## Contexto y funcionamiento

- `SelectorLugar` es compartido por Inicio y Mi barrio. El nombre de ciudad permanece visible en una segunda línea, aunque el nombre largo del lugar se abrevie.
- Los cambios se aplican al recibir la lista de lugares confirmada por la API. Esa respuesta actualiza el perfil en memoria sin depender de otra consulta de sesión. Recargar retoma el lugar guardado en el servidor.
- Durante una activación se deshabilitan nuevas activaciones. Un error conserva el contexto anterior y ofrece un reintento visible. El desplegable es desplazable y no altera la posición de los controles de la pantalla; Escape devuelve el foco.
- Cambiar de contexto reemplaza los datos, mapa y selección del barrio. Las respuestas de consultas anteriores se ignoran. La vista Mapa/Lista elegida se conserva durante el cambio.
- Error de planes, error de mapa y falta de cobertura son estados distintos. Los errores ofrecen reintento; la falta de cobertura permite abrir Lista sin inventar luces o coordenadas.
- El servidor activa lugares dentro de una transacción y bloquea la fila de la cuenta para serializar cambios simultáneos. Se mantiene la comprobación de propiedad y el índice de un único lugar activo.
- El foco al cambiar de ruta va al título aunque esté fuera de `main`; al cambiar de lugar vuelve al selector. Con movimiento reducido, el orbe de Brisa usa la imagen estática existente en lugar de montar video.

## Imágenes y respaldo

`FondoCiudad` sirve únicamente recursos del mismo origen. Prueba AVIF, después WebP si falla la carga y, finalmente, la ilustración genérica identificada. Si también falla esta, conserva una superficie legible y los controles. No mantiene el fondo de la ciudad anterior bajo el nombre nuevo.

Las ciudades fuera del catálogo reciben un escenario genérico rotulado como tal. No se han producido imágenes propias para todos los municipios. La fuente sigue siendo el código del lugar ya elegido; no hay geolocalización, datos nuevos, historial de viajes ni solicitudes a terceros. No se genera ninguna imagen por persona o durante el uso de la aplicación.

Los AVIF pesan 119–134 KiB y los WebP 264–278 KiB. Las imágenes son estáticas. Los textos, controles y luces de planes siguen siendo HTML/SVG accesible.

## Verificación

Chromium a 390 × 844, 768 × 1024 y 1440 × 900, con datos ficticios interceptados exclusivamente durante las pruebas. En cada tamaño:

1. Inicio en Medellín, activar Bogotá, comprobar el fondo correspondiente y recargar manteniendo Bogotá.
2. Abrir Mi barrio en Bogotá sin cobertura H3, pasar a Lista, abrir su plan y sumarse.
3. Volver a Medellín, abrir una luz y su ficha. Activar Bogotá reteniendo su consulta: se muestra carga y desaparecen ficha y planes anteriores.
4. Regresar rápidamente a Medellín y liberar después la respuesta de Bogotá: se conserva el contexto correcto.
5. Forzar fallo de activación, verificar que no cambie el lugar y reintentar con éxito.
6. Forzar errores de planes y mapa por separado y recuperarlos con Reintentar.
7. Forzar fallo de AVIF y WebP de Bogotá; comprobar respaldo identificado. Activar Cali y comprobar escenario genérico.
8. Navegar por teclado a Mi gente y verificar foco en el título. Comprobar área de controles, espacio sobre navegación inferior y ausencia de desbordamiento horizontal.

Resultado: 9 activaciones confirmadas por tamaño, sin errores JavaScript ni solicitudes inesperadas o a terceros. 33 capturas y [mediciones de verificación](capturas/fondos-ciudades/verificacion.json). La API real se comprueba además con pruebas de integración Fastify/PGlite; los ejemplos no forman parte de la aplicación.

`npm test -- --maxWorkers=2`: **250 pruebas pasadas, 32 archivos**. Incluye concurrencia de activación, aislamiento entre cuentas, respuestas atrasadas, reintentos, respaldo y privacidad. `npm run build`: correcto; Vite mantiene su advertencia por el paquete principal mayor de 500 kB. No se añaden dependencias ni migraciones.

| Tamaño | Medellín · Inicio | Bogotá · Inicio | Medellín · Mi barrio | Bogotá · Mi barrio |
| --- | --- | --- | --- | --- |
| 390 × 844 | [Captura](capturas/fondos-ciudades/390x844-medellin-inicio.jpg) | [Captura](capturas/fondos-ciudades/390x844-bogota-inicio.jpg) | [Captura](capturas/fondos-ciudades/390x844-medellin-barrio.jpg) | [Captura](capturas/fondos-ciudades/390x844-bogota-barrio.jpg) |
| 768 × 1024 | [Captura](capturas/fondos-ciudades/768x1024-medellin-inicio.jpg) | [Captura](capturas/fondos-ciudades/768x1024-bogota-inicio.jpg) | [Captura](capturas/fondos-ciudades/768x1024-medellin-barrio.jpg) | [Captura](capturas/fondos-ciudades/768x1024-bogota-barrio.jpg) |
| 1440 × 900 | [Captura](capturas/fondos-ciudades/1440x900-medellin-inicio.jpg) | [Captura](capturas/fondos-ciudades/1440x900-bogota-inicio.jpg) | [Captura](capturas/fondos-ciudades/1440x900-medellin-barrio.jpg) | [Captura](capturas/fondos-ciudades/1440x900-bogota-barrio.jpg) |

## Revisión y límites

**Revisión humana antes de fusionar**, conforme a `CLAUDE.md`, por el flujo de lugares privados y la transacción de activación. No cambia qué datos se recogen ni su visibilidad, por lo que no se modifica `VERSION_TEXTOS` en esta tarea.

El arte necesita revisión editorial de Mateo: interpreta la referencia con micelio más contenido y panoramas urbanos amplios; no reproduce literalmente su perspectiva ni su geografía. Es una propuesta de identidad local, no una vista real verificable. Las cabeceras de cuenta/formularios conservan sus recursos anteriores; el alcance es Inicio, Mi barrio y el cambio de contexto. Otras ciudades siguen pendientes de arte propio. No se declara validación con lectores de pantalla, personas usuarias o dispositivos físicos; el teclado y los tamaños se verificaron en Chromium.
