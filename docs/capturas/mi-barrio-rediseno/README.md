# Mi barrio · implementación para revisión

Rama: `codex/mi-barrio-redesign`, basada en `rediseno/internas` (`2914140`). Esa rama contiene la versión más reciente de Mi barrio y los cambios posteriores de los planes. Se conservó el checkout anterior en su rama `work`; antes de comenzar no había cambios locales.

## Referencia pendiente

La imagen mencionada como adjunta no llegó en la conversación. **El diseño no se da por terminado ni se afirma fidelidad a esa referencia.** Hace falta adjuntarla para comparar composición, proporciones, colores y recortes, y corregir las diferencias que aparezcan. Las capturas siguientes son del navegador real; no son imágenes generadas ni composiciones de diseño.

La implementación avanza los requisitos escritos: selector compacto, Mapa / Lista, paneles verde profundo, borde menta, acción lima `#CEFA63`, navegación inferior con Mi barrio activo y detalle bajo demanda. Vecinos conserva su acceso junto a los controles; no se rediseñaron sus contenidos ni otras pantallas internas.

## Recurso reutilizado

Se inspeccionaron `codex/comunidad-ilustrada` y `refs/pull/1/head` por Git. Ambas referencias apuntaban a `0619c7f`; su propuesta incluye `public/backgrounds/comunidad-ilustrada.webp` y su componente de escenario. La API de GitHub respondió Forbidden, por lo que no se pudieron consultar los comentarios ni la descripción del PR.

Se reutiliza la misma ilustración limpia, ya optimizada por `rediseno/internas` en `public/backgrounds/internas/barrio-{1100,1586}.{avif,webp}`. La documentación de esa rama la identifica como la ilustración incorporada anteriormente; no se añadió una imagen de origen distinto. No contiene controles ni tarjetas. AVIF pesa aproximadamente 143 KiB (1100 px) y 252 KiB (1586 px); WebP es el respaldo. La escena y sus controles son estáticos; no hay desplazamiento ni zoom. No se usa video ni canvas/3D en esta pantalla.

## Capturas reales

| Tamaño | Mapa | Plan abierto | Lista |
| --- | --- | --- | --- |
| Móvil · 390 × 844 | [Mapa](390x844.png) | [Hoja inferior](390x844-plan.png) | [Lista](390x844-lista.png) |
| Tableta · 768 × 1024 | [Mapa](768x1024.png) | [Plan](768x1024-plan.png) | [Lista](768x1024-lista.png) |
| Escritorio · 1440 × 900 | [Mapa](1440x900.png) | [Plan](1440x900-plan.png) | [Lista](1440x900-lista.png) |

`antes-*.png` registra la implementación de `rediseno/internas` antes de estos cambios. Es una línea base, **no la referencia visual del usuario**. Se revisaron las capturas tras los cambios y se ajustaron los recortes, la separación de la barra, los bordes de la tarjeta en tableta y el desplazamiento independiente de Lista.

## Comprobaciones

- Chromium real con Playwright, servido por Vite; tres tamaños, idioma español y zona horaria de Bogotá. La API se interceptó solo en el contexto de prueba con un perfil y tres planes ficticios. No se sembraron datos ni se añadieron fixtures al código de la aplicación.
- En cada tamaño: abrir una luz, consultar el plan, sumarse (una solicitud al endpoint existente), ver la confirmación, cerrar y recuperar el foco, pasar a Lista, desplazarla hasta su acción final, volver al mapa, cerrar con Escape y abrir el detalle por su ruta real.
- Sin desbordamiento horizontal, sin errores JavaScript y sin solicitudes externas. Controles medidos de al menos 48 × 48 px; tarjetas y acción principal por encima de la navegación. Con movimiento reducido, el pulso está desactivado.
- Máximo dos invitaciones: se retiran cuando no caben o se superponen a controles, luces u otra invitación. Al seleccionar un plan se ocultan; queda una sola tarjeta de detalle. Cada luz sigue correspondiendo a un plan de la API, nunca a una persona.
- En móvil se bloqueó intencionalmente la descarga de la ilustración: aparece un aviso visible, no se dibuja un mapa sustitutivo y Lista sigue disponible.
- La hoja recibe foco al abrirse y lo devuelve a la luz al cerrar. Los errores al sumarse se muestran dentro de la hoja. Se añadieron dos pruebas de regresión para esos comportamientos.
- `npm run test -- --maxWorkers=2`: 225 pruebas pasaron en 30 archivos, incluidas las pruebas del servidor con PGlite y las de privacidad.
- `npm run build`: incluye TypeScript y compilación Vite. El empaquetador advierte que el bundle principal supera 500 kB; dividir el resto de la aplicación queda fuera del alcance de esta pantalla.
- `git diff --check`: sin errores.

El registro de medidas y comprobaciones está en `verificacion.json`. El script de navegador de esta sesión se conserva fuera del repositorio en `/tmp/playwright-test-mi-barrio.cjs`.

Pendiente para cerrar el diseño: recibir la referencia original y cotejar estas capturas con ella. Las interacciones se comprobaron con respuestas de API de prueba; no con cuentas ni planes reales de usuarios.
