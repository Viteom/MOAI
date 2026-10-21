# Ilustraciones de ciudades · MOAI

Propuesta generada con OpenAI Image Generation el 20 de octubre de 2026, a petición de Mateo. La referencia aportada se usa como dirección de estilo: luz cálida, profundidad atmosférica, naturaleza y estructuras de micelio. Cada ciudad tiene una composición vertical y una horizontal propias. Son escenarios imaginados, no fotografías, mapas ni representaciones geográficas precisas. Pendientes de revisión editorial antes de publicar.

| Ciudad | Código DIVIPOLA | Móvil | Escritorio |
| --- | --- | --- | --- |
| Medellín | 05001 | 941 × 1672 | 1586 × 992 |
| Bogotá | 11001 | 941 × 1672 | 1585 × 992 |

Se exportan en AVIF y WebP. AVIF pesa aproximadamente 119–134 KiB; WebP, 264–278 KiB. No contienen interfaz, textos, marcadores de planes o datos personales. Los planes se dibujan como controles reales sobre el lienzo.

Dirección del prompt: ciudad colombiana cálida, arquitectura y vegetación local, cielo y profundidad visibles, centro tranquilo, sin personas ni interfaz. Medellín se distingue por el valle, laderas, guayacanes y cable; Bogotá por cerros orientales, altiplano, arquitectura de ladrillo, tejados y Monserrate. Una segunda pasada incorpora dos estructuras orgánicas de micelio en menta/lila conservando el encuadre. No se genera arte durante la navegación de la persona.

Los PNG originales se conservaron en `/workspace/generated_images` del entorno de trabajo; el repositorio incluye las exportaciones optimizadas. Identificadores de la generación final:

- Medellín móvil: `exec-a63577f9-fac7-4f39-8d04-a4d652396263.png`.
- Medellín escritorio: `exec-e38f5398-9946-4353-8c7d-3c728b7741e3.png`.
- Bogotá móvil: `exec-7154e3ad-440f-4619-9af4-9f30eb35ba4a.png`.
- Bogotá escritorio: `exec-58e292bd-030f-413b-86e9-48b6ba3f940e.png`.

La exportación solo cambia el formato y la compresión: AVIF con FFmpeg/libaom (`-still-picture 1 -cpu-used 6 -crf 34 -b:v 0 -pix_fmt yuv420p`); WebP con ImageMagick (`-strip -quality 78`). Se conserva el tamaño de cada composición.

El catálogo vive en `src/lib/fondos-ciudad.ts`. Para otras ciudades se reutiliza la ilustración genérica anterior (`internas/barrio-1586.webp`) y se identifica expresamente como genérica; no se presenta como Medellín ni Bogotá. Añadir una ciudad requiere incorporar y revisar sus dos composiciones y actualizar el catálogo.
