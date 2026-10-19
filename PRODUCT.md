# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Adultos de todas las edades en Medellín (de 18 a más de 80 años), muchas personas mayores, sobre todo desde el celular (confirmado por Mateo, 19 de octubre de 2026). Llegan con poco tiempo y, a veces, con la soledad encima: quieren saber qué pasa cerca y sumarse sin presión.

## Product Purpose

MOAI es una plataforma de cuidado social contra la soledad: ayuda a encontrarse con gente cerca de casa, en lugares públicos, y a formar Moais (grupos de 2 a 5 personas que se cuidan). El éxito se mide por la reconexión entre personas, no por el tiempo en la aplicación.

## Positioning

Planes sencillos del barrio («Voy a caminar, ¿alguien viene?») que cualquiera propone y a los que cualquiera se suma, con una guía conversacional (Brisa, una IA) y una privacidad estricta: nunca ubicación exacta, solo celdas aproximadas y franjas de distancia.

## Operating Context

Tres lugares y una barra única: Brisa (inicio conversacional), Mi barrio (planes cerca: mapa, lista y vecinos) y Mi gente (red de vínculos y Moais). Piloto en barrios de Medellín (349 barrios y veredas en `src/lib/colombia/barrios-medellin.json`). Planes con alcance por celdas H3 de ~1 km: «muy cerca» (~2 km) y «tu zona» (~4 km).

## Capabilities and Constraints

- Nunca coordenadas ni direcciones; distancias por franjas («A menos de 2 km»). Las celdas H3 y los nombres de barrio son lo único geográfico que se puede dibujar.
- Sin contadores de vanidad ni números de vínculos (regla 5).
- Planes siempre en lugares públicos; el lugar es texto libre que escribe quien propone.
- Convocatorias de entidades (luz naranja), planes semanales, planes a los que ya te sumaste.
- Brisa siempre se presenta como IA (sello «IA»).
- Frontend sin almacenamiento del navegador ni solicitudes a otros dominios.

## Brand Commitments

- Nombre de trabajo «MOAI»; la voz «Brisa» y el sello «Mo» son provisionales.
- Tipografías Fraunces (voz y títulos) e Inter (interfaz).
- Mundo actual: bosque oscuro con paneles de vidrio, acento lima.
- Textos en español, de tú, cálidos y sin jerga. Letra grande y accesibilidad desde el diseño.

## Evidence on Hand

Planes, barrios, celdas y personas reales de la beta interna (cuentas de prueba). No hay fotografías reales del barrio ni ilustraciones de lugares reales; no se deben inventar lugares, testimonios ni cifras.

## Product Principles

1. Liviana: una cosa a la vez, sin saturar.
2. Honesta: lo que se dibuja o promete coincide con lo que hace el código.
3. Cercana: personas y planes antes que funciones.
4. Cuidadosa con la privacidad: nunca se expone dónde vive nadie.

## Accessibility & Inclusion

Público con muchas personas mayores: texto base de 16–18 px o más, controles de al menos 44–48 px, contraste 4.5:1, nada que dependa solo del color, sin gestos de arrastre obligatorios, respeto a «reducir movimiento».
