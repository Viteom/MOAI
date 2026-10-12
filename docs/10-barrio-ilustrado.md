# Mi comunidad · barrio ilustrado

La rama `codex/comunidad-ilustrada` parte de `fase-1/cuentas-y-comunidad` (b55b312).

El fondo limpio aprobado se incorpora en `public/backgrounds/comunidad-ilustrada.webp`. `BarrioIlustrado` sustituye la maqueta vacía en Mi comunidad y funciona sin WebGL. El archivo representa un escenario conceptual: los edificios y calles dibujados no corresponden al barrio real. Las luces siguen usando exclusivamente los planes y posiciones aproximadas recibidos por la API. No se añaden datos de personas ni nuevas solicitudes a servicios externos.

El arrastre y los botones de zoom transforman el escenario y los anclajes juntos; los textos conservan su tamaño. Hay botón de centrar, controles de 48 px, burbujas con mayor espacio de lectura y pulso suave de 4 segundos (desactivado con movimiento reducido). Si la imagen falla, se muestra el tablero SVG. La lista, la tarjeta del plan y sus acciones mantienen la integración existente.

## Abrir con Claude Code

Primero guarda los cambios locales actuales en tu rama. Después trae la rama `codex/comunidad-ilustrada` de GitHub y revísala localmente con `npm ci` y `npm run dev`. El servidor de cuentas se inicia con el comando habitual `npm run dev:api`; utiliza tu configuración local existente. La revisión debe entrar con una cuenta con comunidad configurada y planes existentes.

Revisa a 1440×900, 768×1024 y 390×844: cargar imagen, abrir una luz, Me sumo, cerrar tarjeta, alternar Mapa/Lista, acercar/alejar y arrastrar. Comprueba que invitaciones largas no tapen las otras acciones. No se fusiona ni publica automáticamente.

## Validación y pendiente

Compilación y las 134 pruebas existentes pasan. La revisión visual con Chromium no se completó: la descarga del navegador falló en este entorno. Está pendiente la inspección en el navegador del usuario y las capturas de estas tres medidas. La ilustración es un fondo 2D: no permite explorar edificios en 3D ni demuestra precisión cartográfica. En móvil los planes fuera del encuadre se consultan en Lista o moviendo el escenario.
