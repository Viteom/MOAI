# Mi comunidad · corrección visual (12 de octubre de 2026)

Capturas «antes» y «final» a 1440×900, 768×1024 y 390×844 (con un plan abierto y tras acercar y arrastrar la escena).

## Diagnóstico

- **Cómo se renderiza:** `src/components/moai/maqueta.tsx` dibuja la escena con three.js (WebGL). Sin WebGL (pruebas, navegadores viejos) se usa el tablero plano en SVG de `mapa.tsx`.
- **Por qué no hay edificios ni vegetación:** no hay datos. La escena pide `/maqueta/{celda}.json` por cada hexágono y **no existe ninguno** (`public/maqueta/` está vacío). La descarga de OpenStreetMap para Laureles falló: el servicio público Overpass respondió 504 (saturado) a las calles en nueve intentos. No es un error de carga del código.
- **Recursos ilustrados:** no existe ninguno para el barrio. Hoy solo están `public/backgrounds/portada.jpg` y `brisa.mp4`.

## Qué se corrigió

- Capas independientes: 1) escena del barrio (canvas), 2) luces interactivas ancladas, 3) burbujas, 4) controles y tarjeta.
- Desplazar (arrastrar), acercar (rueda, pellizco y botones + / −): luces y burbujas se recalculan con la cámara y siguen ancladas.
- Las burbujas nunca tapan el encabezado, los controles, la tarjeta, «Tu zona» ni otras luces. Si no caben, queda solo la luz.
- Encabezado en una franja compacta en escritorio y tableta; en teléfono, dos filas (marca y menú; ubicación y Mapa/Lista). Pasó de unos 215 px a unos 120 px en teléfono.
- Al elegir un plan, si su luz quedaba bajo la tarjeta, la escena se corre para mostrarla. En teléfono el detalle es una hoja inferior.

## Recursos que faltan (sin ellos no hay fidelidad con la referencia)

1. **Datos del barrio por hexágono** (`public/maqueta/*.json`): edificios, zonas verdes, agua y vías de OpenStreetMap. Pendiente de una descarga que funcione (fuera del alcance de esta corrección).
2. **Ilustraciones a tinta y acuarela** del estilo de la referencia:
   - fachadas y techos (casas de teja, edificios bajos, terrazas, pérgolas);
   - vegetación (árboles frondosos, palmas, guayacanes y flores, arbustos) como recortes o sprites;
   - agua turquesa (quebradas, cascadas, estanques) y piedra;
   - mobiliario: faroles, bancas, puentes, escaleras;
   - lugares reconocibles (biblioteca, café, cancha, parque) para ubicar los planes;
   - textura de suelo y de papel definitiva (hoy hay una textura de papel generada).
3. **Brisa** como recurso propio (hoy es un recorte del video de bienvenida).
4. **Fotos o ilustraciones de los planes** para la miniatura de la tarjeta.

## Diferencias que siguen frente a la referencia

- Sin barrio ilustrado: la escena muestra solo el suelo y la rejilla de hexágonos (falta el recurso 1 y el 2).
- Sin miniatura en la tarjeta del plan (recurso 4).
- La tipografía sigue siendo Inter; la referencia usa una sans redondeada (pendiente de definir).
- El globo de Brisa se oculta en tableta y teléfono para no tapar invitaciones.
