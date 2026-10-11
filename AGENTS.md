# Reglas de arquitectura del prototipo cero

- Todos los datos de MOAI viven en la memoria de React. La lógica de límites y ramas del flujo va en funciones puras y seguras para el navegador; las pruebas de privacidad no deben depender de persistencia ni de servicios.
- La escena de la ciudad es intercambiable: una imagen del mismo origen (`/backgrounds/{ciudad}-{hora}.jpg`) con respaldo SVG procedural. Las fotografías futuras no deben exigir cambios en el flujo.
- Las pantallas del prototipo viven dentro de la experiencia de inicio, con componentes visuales y tokens CSS compartidos: es una app secuencial de primer día, no páginas de contenido separadas.
- Las tipografías se autoalojan con fontsource y toda solicitud del código es del mismo origen: el prototipo funciona sin servicios de terceros.
- Ver también `CLAUDE.md` (reglas de privacidad y decisiones del proyecto).
