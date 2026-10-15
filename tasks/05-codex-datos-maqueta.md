# Tarea 05 · Datos del barrio para la maqueta 3D (para Codex)

> **En pausa (14 de octubre).** Mateo eligió el barrio ilustrado para el piloto (`docs/10-barrio-ilustrado.md`). No empezar esta tarea hasta que se retome la maqueta con datos reales.

Lee primero `AGENTS.md` y `CLAUDE.md`: las reglas que no se negocian mandan sobre esta tarea.

## Contexto

«Mi comunidad» dibuja el barrio como una maqueta 3D (`src/components/moai/maqueta.tsx`, three.js). Por cada hexágono H3 (resolución 8) pide `/maqueta/{celda}.json` al mismo origen. Hoy `public/maqueta/` **no existe**, así que la escena muestra solo el suelo y los hexágonos.

`scripts/maqueta.mjs` ya convierte un JSON de OpenStreetMap (formato Overpass con `out geom`) en esos archivos. Lo que falló fue la descarga: el servicio público Overpass respondió 504 a la consulta de calles de Laureles (Medellín) en nueve intentos.

Formato de salida (no cambiarlo sin acordarlo; lo lee `maqueta.tsx`):
`{ v: 1, celda, edificios: [pisos, x1, y1, …][], verdes: [tipo, x1, y1, …][], agua: [x1, y1, …][], quebradas: [ancho, x1, y1, …][], vias: [ancho, x1, y1, …][] }`, con metros relativos al centro del hexágono (x este, y norte), redondeados a medio metro.

## Qué hacer

1. **`scripts/osm-descarga.mjs`**: descarga los datos de una zona sin saturar Overpass.
   - Entrada: una celda H3 centro y un número de anillos (por defecto, Laureles: la celda del barrio 1108 en `src/lib/colombia/barrios-medellin.json`, 2 anillos).
   - Parte la zona en teselas pequeñas (por ejemplo, una por hexágono) y pide por separado edificios, vías, zonas verdes y agua.
   - Prueba varios servidores en orden (overpass-api.de, overpass.kumi.systems, overpass.private.coffee), con reintentos y espera creciente, y `[timeout:60]` en la consulta.
   - Junta los elementos sin duplicados (por `type` + `id`) y escribe un único JSON que `scripts/maqueta.mjs` acepte tal cual.
   - Debe poder retomarse: guarda cada tesela en una carpeta temporal (ignorada por git) y no la vuelve a pedir.
   - Sin dependencias nuevas: Node 20+ con `fetch` y `h3-js`, que ya está.
2. **Separar la lógica pura de `scripts/maqueta.mjs`** (tipos, pisos, área, simplificación, recorte por hexágono) en un módulo importable y **agregar pruebas con Vitest**: edificio en el borde entre dos hexágonos (va a uno solo), `building:levels` y `height`, Douglas-Peucker y descarte de formas lejanas.
3. **Generar los datos de Laureles** y subir `public/maqueta/*.json` si cada archivo pesa menos de unos 150 KB. Si pesan más, avisa antes de subirlos.
4. Documenta el uso en el encabezado de los scripts (dos o tres líneas, en español, como el resto).

## Reglas

- Solo geometría: ningún nombre, dirección, `addr:*` ni etiqueta que identifique a personas en los archivos de salida (regla 1 y 7).
- La atribución «© colaboradores de OpenStreetMap» ya se muestra en el mapa; no la quites.
- No toques `src/components/`, `src/styles.css` ni `server/`: la parte visual y el servidor los está trabajando Claude Code en paralelo.
- El frontend no hace solicitudes a terceros (`src/test/privacy.test.ts`). La descarga ocurre solo en el script, nunca en el navegador.
- Trabaja en una rama propia, `codex/datos-maqueta`, a partir de `fase-1/cuentas-y-comunidad`, y abre un pull request hacia esa rama.
- Antes de terminar: `npm run typecheck` y `npm run test` sin errores.

## Cómo saber que quedó

`node scripts/osm-descarga.mjs` termina aunque algún servidor falle, `node scripts/maqueta.mjs <salida>.json` genera los archivos y, con `npm run dev` y `npm run dev:api`, «Mi comunidad» muestra edificios, calles y verde alrededor de Laureles.
