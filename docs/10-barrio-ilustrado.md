# Mi comunidad · barrio ilustrado

La rama `codex/comunidad-ilustrada` parte de `fase-1/cuentas-y-comunidad` (b55b312).

El fondo limpio aprobado se incorpora en `public/backgrounds/comunidad-ilustrada.webp`. `BarrioIlustrado` sustituye la maqueta vacía en Mi comunidad y funciona sin WebGL. El archivo representa un escenario conceptual: los edificios y calles dibujados no corresponden al barrio real. Las luces siguen usando exclusivamente los planes y posiciones aproximadas recibidos por la API. No se añaden datos de personas ni nuevas solicitudes a servicios externos.

El arrastre y los botones de zoom transforman el escenario y los anclajes juntos; los textos conservan su tamaño. Hay botón de centrar, controles de 48 px, burbujas con mayor espacio de lectura y pulso suave de 4 segundos (desactivado con movimiento reducido). Si la imagen falla, se muestra el tablero SVG. La lista, la tarjeta del plan y sus acciones mantienen la integración existente.

## Abrir con Claude Code

Primero guarda los cambios locales actuales en tu rama. Después trae la rama `codex/comunidad-ilustrada` de GitHub y revísala localmente con `npm ci` y `npm run dev`. El servidor de cuentas se inicia con el comando habitual `npm run dev:api`; utiliza tu configuración local existente. La revisión debe entrar con una cuenta con comunidad configurada y planes existentes.

Revisa a 1440×900, 768×1024 y 390×844: cargar imagen, abrir una luz, Me sumo, cerrar tarjeta, alternar Mapa/Lista, acercar/alejar y arrastrar. Comprueba que invitaciones largas no tapen las otras acciones. No se fusiona ni publica automáticamente.

## Validación (14 de octubre, Claude Code)

Unido a `fase-1/cuentas-y-comunidad` con estos ajustes:

- Las luces, burbujas y zonas reservadas pasaron a `capas.tsx`, sin three.js: «Mi comunidad» ya no carga el motor 3D. `maqueta.tsx` queda guardado para cuando haya datos reales (tarea 05, en pausa).
- Se recuperó acercar con la rueda del mouse y con dos dedos, dejando quieto el punto bajo el cursor o entre los dedos.
- Ninguna burbuja tapa «Tu zona». Con un plan abierto, la nota del escenario se aparta.
- 134 pruebas, compilación revisión en las tres medidas (1440×900, 768×1024 y 390×844); en `docs/capturas/barrio-ilustrado/` quedan escritorio y teléfono.

Pendiente: la ilustración es un fondo 2D; no demuestra precisión cartográfica. En teléfono, si una burbuja no cabe junto a «Tu zona», queda solo su luz.
