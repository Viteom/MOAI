# MOAI · Brief de arte · Medellín y el Valle de Aburrá

Primera ciudad · Borrador 1 · Para producir y validar los primeros fondos

Medellín define el lenguaje visual de MOAI: si su fondo se siente vivo, real y reconocible, las demás ciudades de Colombia heredan el método. Este brief fija la intención, las capas, la paleta aplicada, el paquete de prompts y las reglas para producir los primeros cinco fondos.

## Intención visual

**Realismo mágico urbano.** Un valle que cualquiera que lo vive reconoce, visto en una hora de luz especial, donde conviven personas, animales y plantas (One Health) y donde el micelio hace visible lo que normalmente no se ve. Hiperrealista en la luz, la niebla y la escala; onírico en los árboles translúcidos y luminosos que habitan el paisaje.

Reglas de tono:

- Cálido y sereno; nunca ominoso ni de ciencia ficción fría.
- Una figura humana pequeña, de espaldas, en un sendero: invita sin protagonizar.
- Escala grande, detalle fino: el paisaje domina y la persona cabe en él.
- Mismo lenguaje en todas las ciudades: cambia el territorio, no el método.

## Qué debe reconocerse de Medellín

Una persona de la ciudad debería reconocer el lugar en dos segundos, sin letreros.

- Valle angosto entre montañas verdes, con el río en el fondo.
- Laderas con vivienda de ladrillo a la vista, en escalera, con senderos y escaleras.
- Cables aéreos que cruzan de la ciudad a la montaña.
- Cerros que sobresalen dentro del valle.
- Neblina en la mañana y nubes cargadas en la tarde.
- Vegetación abundante: guayacanes en flor, yarumos de hoja plateada, ceibas y samanes.

Lo que no debe aparecer:

- Ninguna referencia a narcotráfico, violencia ni armas.
- Ni pobreza como espectáculo ni lujo como contraste: los barrios se distinguen por relieve, arbolado y tipo de vivienda, nunca por estrato.
- Sin logos, marcas, letreros legibles ni rostros reales identificables.
- Sin copiar edificios privados ni imágenes de terceros.

## Anatomía de la escena

La escena se produce en capas independientes con transparencia, para moverlas con paralaje al tocar o inclinar el teléfono. Formato principal: vertical, como se sostiene el teléfono. El árbol vital y las ventanas de cada persona no van horneados en el fondo: se dibujan encima, porque son únicos de cada quien.

| Capa | Qué contiene | Cómo se produce | Qué se ajusta en tiempo real |
| --- | --- | --- | --- |
| Cielo | Cielo, nubes, astros | Procedural, más una placa por momento del día | Color según hora y clima reales |
| Cordillera lejana | Montañas en la neblina | Generada, guiada por el relieve real | Niebla y tinte |
| Valle y ciudad | Edificios lejanos, río, cerros | Generada | Luces encendidas por la noche |
| Laderas | Casas de ladrillo, senderos, cables | Generada y retocada a mano | Ventanas encendidas |
| Primer plano | Vegetación, flores, hojas desenfocadas | Generada | Movimiento suave con el viento |
| Sendero | Camino y figura pequeña | Generada | Respiración sutil, o ninguno |
| Subsuelo | Micelio, raíces, luces | Arte propio, ilustrado | Se muestra al deslizar hacia abajo |
| Árbol vital | El árbol de cada persona | Generado desde la semilla elegida | Luz según el estado del día |

## Hora y clima

No se producen doce versiones de cada fondo. Se producen tres placas y se ajusta con código:

- Tres placas base: día, atardecer y noche. El amanecer es el atardecer con otra neblina.
- El clima va como capas encima: neblina, nubes, lluvia y brillo húmedo, generadas por código, no imágenes nuevas.
- La hora y el clima reales de la ciudad (o de donde estés) deciden la mezcla.
- Las tardes de lluvia son frecuentes en Medellín y deben quedar especialmente bellas.

## Paleta aplicada

Tomada de la paleta viva v1. Máximo dos o tres acentos por escena, nunca todos a la vez.

| Elemento del paisaje | Color de la paleta | Nota |
| --- | --- | --- |
| Cielo nocturno y sombras | Noche berenjena #1D1230 | En lugar de negro puro |
| Neblina de amanecer, luz difusa | Papel #F7EEDC | Cálida, nunca blanca fría |
| Ladrillo de las laderas y tierra | Cobre de corteza #B8582A | Base de la ciudad |
| Follaje | Verde selva #2DA16F | Con brotes en lima #B5D63D |
| Hilos del subsuelo y brillo de la red | Violeta micelio #7B4FD1 | Solo en la capa del subsuelo y de noche |
| Luz de ventanas encendidas | Dorado miel #F2B33D | Calidez de hogar |
| Cielo de atardecer | Coral vivo #EF6F5E | Con bordes de nube en rosa #F58FB5 |
| Río y reflejos | Agua #3CC3C8 | Con destellos puntuales en rayo #FFE45C |

## El árbol vital

- Copa translúcida en forma de paraguas, con nervaduras finas, que se ilumina con el color del estado del día.
- Tronco fibroso, como un haz de venas.
- Cuatro especies de semilla, cada una con silueta propia: ceiba (copa amplia y raíces en contrafuerte), guayacán (floración amarilla), yarumo (hojas con el envés plateado) y palma de cera (alta y esbelta).
- Un Moai es un pequeño claro de tres a cinco árboles cercanos: los fondos deben dejar espacio en el primer plano para ese claro.

## Paquete de prompts

Claude no genera imágenes: estos textos alimentan el modelo de imágenes que se elija. En inglés suelen rendir mejor. Los códigos de color no guían al modelo, así que se describen con palabras.

Bloque de estilo (va en todos):

```
Hyperreal cinematic photograph with a dreamlike quality, shot on 35mm film, soft grain, atmospheric haze, volumetric light, vertical 9:16 composition, a narrow Andean valley with a city on the hillsides, exposed red-brick houses climbing steep slopes, lush tropical vegetation, giant translucent umbrella-shaped trees with fine ribbed canopies glowing softly, warm and serene mood, a very small person seen from behind walking on a footpath, no faces, no text, no logos, no signs, no brands
```

Bloque de ciudad:

```
Medellín, Colombia, Aburrá Valley in the central Andes, aerial cable cars crossing over rooftops, a river along the valley floor, small rounded hills rising inside the valley, flowering yellow guayacán trees, silver-leaved yarumo trees, tall ceiba trees
```

Variantes de momento (se añaden a los dos bloques):

- **Amanecer:** low mist filling the valley, pale warm cream light, a few windows lit in amber.
- **Atardecer:** golden hour, coral and pink clouds, damp air after rain, warm reflections on brick.
- **Noche:** deep aubergine night sky, windows glowing honey-gold, faint violet threads of light under the soil like a mycelial network.
- **Lluvia de tarde:** afternoon rain, wet brick and leaves reflecting light, low grey-lilac clouds.
- **Patio:** a quiet hillside courtyard with one young translucent tree and a lamp hanging from a branch, view over the valley.

Negativo: text, logos, close-up faces, watermark, cartoon, 3D render look, oversaturated neon, cyberpunk, sci-fi.

## Proceso de producción

1. Relieve: tomar datos abiertos de elevación del valle (por ejemplo SRTM o Copernicus DEM; verificar licencia y atribución) y convertirlos en un mapa de profundidad que guíe la forma de las montañas.
2. Generar: usar ese mapa como guía en un modelo de imágenes que admita control por profundidad, para que la geografía sea fiel sin tocar imágenes de Google.
3. Elegir: una persona con ojo de arte selecciona entre muchas variantes y retoca a mano lo que falte.
4. Recortar: separar en capas con transparencia, según la tabla de anatomía.
5. Exportar: formatos modernos (WebP o AVIF), varias resoluciones y carga progresiva: primero una versión borrosa, luego la nítida.
6. Probar: en un teléfono modesto y con conexión lenta. Meta a validar: que la primera pantalla aparezca en pocos segundos.

## Reglas legales y éticas

- No usar imágenes de Google Maps ni de Street View, ni derivadas de ellas.
- Revisar los términos de uso comercial del modelo de imágenes elegido.
- Las imágenes de referencia compartidas son de atmósfera: no se reproducen ni se imitan obras concretas.
- El fondo corresponde a la ciudad o la comuna, nunca a la dirección de una persona.
- Una persona de Medellín (ilustrador, fotógrafo o arquitecto) aprueba cada fondo antes de publicarlo.

## Control de calidad

- [ ] Una persona de la ciudad lo reconoce en dos segundos, sin letreros.
- [ ] Una ventana emergente con texto es legible encima, sin perder el fondo.
- [ ] Se ve bien y carga rápido en un teléfono modesto.
- [ ] No hay texto, logos, rostros reales ni estereotipos.
- [ ] El árbol y las ventanas del usuario se ven nítidos encima.
- [ ] Funciona en las tres horas base y con lluvia.

## Primera ronda: cinco imágenes

1. Vista general del valle al amanecer.
2. Ladera al atardecer, con los cables.
3. El valle de noche, con el micelio visible.
4. Tarde de lluvia.
5. Patio con el primer árbol y la lámpara.

Objetivo: elegir una dirección antes de producir más.

## Decisiones pendientes

- ¿Más fotográfico y sutil (pocos árboles translúcidos) o más fantástico (bosque de paraguas gigantes, como la referencia)?
- ¿La figura humana pequeña aparece en todos los fondos o solo en el de bienvenida?
- ¿Con qué modelo de imágenes se prueba primero? La herramienta de imágenes de Figma, ya conectada, es una opción para una primera prueba.
