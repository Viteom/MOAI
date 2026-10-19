---
version: 1
slug: "src-components-moai-comunidad-tsx"
primary_target: "src/components/moai/comunidad.tsx"
related_targets: ["src/components/moai/barrio.tsx"]
---

> Reemplazado el 19 de octubre de 2026 por el escenario ilustrado (ver DESIGN.md, «Internas»). Se conserva como historia.

# Mi barrio

Scope: la pantalla Mi barrio (`/comunidad`, pestañas Planes y Vecinos). Mode: Operate. Build: code-led (superficie de trabajo; sin generación de imágenes).

Audiencia y tarea: adultos de todas las edades en Medellín, muchas personas mayores, en el celular. Tarea: ver qué pasa esta semana cerca y sumarse en un toque. Restricciones: nunca ubicación exacta; solo celdas H3 y nombres de barrio; sin cifras de vanidad; sin gestos de arrastre obligatorios.

Dirección fijada por Mateo (19 de octubre de 2026): mezclar A (barrio vivo: gente y calidez), B (mapa en tinta de los barrios reales) y C (postales). Postales sobre el mapa; luz según la hora.

## Direction contract

THESIS: el barrio como un mapa en tinta de celdas reales, con los nombres de los barrios, y encima una pila de postales; cada plan es una postal sellada con su día y hora, y ese mismo sello marca su lugar en el mapa. Rechaza la escena ilustrada falsa con pines diminutos y el mapa de calles genérico.

OWN-WORLD: de día, papel salvia claro con tinta verde bosque; de noche, el mismo dibujo en tinta niebla sobre el verde bosque. Hexágonos con trazo de tinta temblorosa; anillos punteados «cerca» y «tu zona». Postales con viñeta dibujada a tinta según el tipo de plan (caminata, tinto, huerta…), con personas pequeñas, y un sello postal redondo con la fecha. Lima para «tú» y lo que ya te sumaste; cian para lo semanal; naranja para las convocatorias. Fraunces para títulos y sellos, Inter para la interfaz.

STORY: la persona ve de inmediato qué hay cerca esta semana, a qué hora y quién lo propone; toca una postal y el mapa le muestra dónde queda, sin exponer a nadie; se suma con un botón grande.

FIRST VIEWPORT: en el teléfono, arriba el lugar («Estás en: Casa · Laureles») y las pestañas Planes · Vecinos; el mapa en tinta ocupa el fondo; desde abajo sube una hoja con «Esta semana, cerca» y dos postales a la vista, la acción «Tengo ganas de…» en su encabezado, y un botón para ver el mapa entero o la lista entera. En el escritorio, el mapa a la izquierda y la columna de postales a la derecha. La barra única abajo en el teléfono, arriba en el escritorio. Firma: el sello compartido entre postal y mapa; al elegir una postal, su sello se resalta en el mapa y se dibuja su trazo hacia «tú».

FORM: fijada por el usuario (mezcla de A, B y C de la ronda del 19 de octubre); no hubo tirada de concept-seed. Posición 1 de 1.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
