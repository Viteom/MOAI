# Auditoría UX/UI y fondos por ciudad

20 de octubre de 2026 · Rama `codex/auditoria-ux-ciudades`, basada en `codex/mi-gente-redesign` (`211000d`). Auditoría y propuesta; los defectos indicados siguen pendientes de implementación. Se conserva el código de la aplicación.

## Dictamen

El problema principal del fondo combina identidad, encuadre y comportamiento. La ilustración actual comunica un jardín residencial: no identifica la ciudad seleccionada. El recorte móvil elimina aproximadamente el 71 % de su ancho, y todas las ciudades reciben el mismo recurso en Inicio. Además, Mi barrio vincula la ilustración a disponer de un mapa H3: al cambiar a Bogotá desaparece el escenario y queda Lista.

La referencia aportada por Mateo se usa **como dirección de estilo para fondos de cada ciudad**, no como reemplazo directo de Medellín. Tomar su luz cálida, profundidad atmosférica, vegetación y micelio como sello de MOAI. Mantener la arquitectura y el paisaje propios de cada ciudad, con la vida cotidiana como escala. Controlar la presencia de las estructuras gigantes para que la ciudad siga siendo reconocible. La composición debe prepararse por separado para móvil y escritorio.

## Método y alcance

Revisión de código y 42 capturas reales de Chromium a 390 × 844, 768 × 1024 y 1440 × 900, con movimiento reducido. Pantallas: Portada, Registro, Acceso, Inicio, Mi barrio (escenario, Lista, plan abierto), Mi gente, Mis lugares, Mi cuenta y crear plan. Se prueba activar Bogotá desde Medellín, recarga de contexto, sumarse al plan, navegación con teclado, fallo de activación y datos retrasados.

Los datos y errores se simulan exclusivamente durante la prueba mediante interceptación de `/api`. No se envían registros, planes o mensajes reales. Las comprobaciones existentes de servidor, rutas, comunidad y privacidad se ejecutan aparte: **58 pruebas pasadas en 4 archivos**. No se añaden dependencias ni se modifican imágenes de producto.

[Galería interactiva de las capturas](auditoria-ux-ciudades.html). [Mediciones del navegador](capturas/auditoria-ux-ciudades/mediciones.json).

Esto es una evaluación heurística y funcional. No sustituye pruebas con personas, lectores de pantalla, dispositivos físicos, medición de contraste de todos los píxeles de imágenes o rendimiento en una red móvil real. No constituye certificación de accesibilidad.

## Hallazgos priorizados

P1: corregir antes de ampliar la experiencia a más ciudades. P2: siguiente ajuste de consistencia y accesibilidad.

| Prioridad | Hallazgo y evidencia | Efecto para la persona | Corrección propuesta |
| --- | --- | --- | --- |
| P1 | Inicio usa el mismo `barrio-*.avif/webp` con Medellín y Bogotá. `brisa.tsx:597`. Capturas `*-inicio-medellin.jpg` / `*-inicio-bogota.jpg`. | La elección de ciudad no tiene respuesta visual ni identidad local. | Catálogo por código DIVIPOLA del lugar activo, compartido por Inicio y Mi barrio. |
| P1 | `EscenaBarrio` se monta solo si `/mapa` devuelve `disponible:true`. Sin celda, el servidor devuelve false. `comunidad.tsx:121` y `server/comunidad.ts:325`. Captura `390x844-barrio-bogota.jpg`. | Cambiar a otra ciudad elimina toda la experiencia ilustrada. | Independizar fondo decorativo y mapa; mantener Lista de planes reales donde no hay cobertura. No inventar posiciones de luces. |
| P1 | Tras activar Bogotá, mientras la consulta está pendiente siguen visibles planes anteriores de Medellín. Reproducido reteniendo la respuesta de `/planes`. Captura `390x844-cambio-ciudad-datos-anteriores.jpg`. | El contexto dice Bogotá mientras ofrece sumarse a un plan del lugar anterior. | Limpiar selección/datos, mostrar carga identificada por ciudad e ignorar respuestas obsoletas al cambiar el lugar. |
| P1 | Si activar el lugar devuelve 503, no hay mensaje ni aviso accesible y el selector queda abierto. `SelectorLugar`, `comunidad.tsx:37`. Captura `390x844-cambio-ciudad-error.jpg`. | No se sabe si el cambio está en curso, falló o fue aplicado. | Indicador de operación, error en línea, reintento y conservar el lugar anterior hasta confirmación. |
| P1 | En 390 × 844 se ve el 28,9 % del ancho del escenario; tableta 46,9 %; escritorio casi 100 %. `styles.css:826`. | La identidad y composición cambian radicalmente por dispositivo; el escenario parece un jardín ampliado. | Ilustraciones vertical y horizontal de la misma ciudad, con puntos focales y zonas seguras propios. Evitar depender de un recorte central de una sola panorámica. |
| P1 | Al navegar por teclado de Brisa a Mi gente, el foco termina en `BODY`. El efecto global busca `main h1`, pero varios títulos están en `header`. `portada.tsx:76`. | Se pierde la orientación y el siguiente Tab puede reiniciar el recorrido. | Unificar el destino de foco de cada ruta y anunciar su título; conservar el foco visible de controles. |
| P2 | Cabeceras de 250 px en formularios/cuenta; imagen detallada directamente detrás de títulos y bajadas. Capturas `*-crear-plan.jpg`, `*-lugares.jpg`. | El paisaje consume espacio de acción y obliga a leer sobre textura variable. | Cabecera funcional más compacta; degradado local y superficie casi opaca bajo el texto. Paisaje más presente en Inicio y Mi barrio. |
| P2 | Portada, bosque en video, barrio residencial y red orbital tienen lenguajes de ilustración diferentes. | El paso entre pantallas parece un cambio de producto. | Una guía de materiales, luz, arquitectura, naturaleza y micelio. Reservar las órbitas para personas y la escena urbana para contexto de ciudad. |
| P2 | Volver y Borrar miden 44 px de alto. En registro, casilla/etiqueta de Términos ronda 25–28 px y el enlace de acceso 27 px. | Se incumple el objetivo del proyecto de 48 px; dificulta el toque preciso. | Ampliar áreas interactivas sin agrandar todos los dibujos. Los enlaces legales dentro de párrafos requieren evaluación propia: no se cuentan automáticamente como un incumplimiento WCAG. |
| P2 | El recurso `brisa.mp4` pesa unos 8,8 MiB; Inicio monta dos videos y Registro cuatro, aunque las dos copias de cada orbe estén pausadas con movimiento reducido. | Se decodifica video para un orbe pequeño. El caché puede reutilizar bytes; no se afirma que cada elemento descargue el archivo completo de nuevo. | Usar `luz-orbe.webp` como póster/alternativa estática, especialmente con movimiento reducido; simplificar el fondo de formularios. |
| P2 | Un error de `/mapa` se trata como falta de cobertura y no se ofrece reintento específico; un error de planes muestra texto pero carece de acción de reintento. | Confunde falta de datos, ciudad sin mapa y problemas de conexión. | Separar estados de carga, vacío, sin cobertura y error, con una acción apropiada para cada uno. |

El prototipo antiguo (`Scene`, `scene.tsx:21`) construye rutas por ciudad/hora, pero no hay esos archivos en `public/backgrounds`. **No es el renderizador de las pantallas actuales**: `/ciudad` se redirige a Inicio. Modificar solo ese componente no resolvería el cambio de ciudad del producto.

## Qué funciona y conviene conservar

- Navegación inferior consistente, destino activo y acciones principales separadas de ella en los casos revisados. Las listas y fichas se pueden desplazar para acceder al contenido que queda más abajo.
- Paneles oscuros, bordes menta, Inter y acciones lima dan una base legible. La prioridad visual de «Contar qué voy a hacer» es clara.
- Abrir una luz y sumarse al plan funciona; la hoja mantiene su contenido sobre una superficie sólida.
- Mi gente separa contactos y grupos, tiene búsqueda/filtros y conserva la selección al cambiar Red/Lista. Su fondo discreto deja leer los nombres.
- Se informa que el barrio es ilustrativo; las luces son planes. Se conserva la distinción entre notas privadas y presentación compartida.
- No se observaron desbordamientos horizontales de la página, imágenes fallidas, errores JavaScript ni solicitudes a terceros en los escenarios ejecutados. Esto no convierte en correctos los defectos de estado descritos arriba.

## Recomendación de dirección visual

| Lugar | Uso del paisaje | Tratamiento |
| --- | --- | --- |
| Portada | Presentar el universo MOAI; aún no hay ciudad elegida. | Escena editorial de marca con espacio previsto para el mensaje. |
| Inicio | Hacer sentir «esta es la ciudad que estoy explorando». | Identidad local reconocible, luz cálida y composición amplia; Brisa en su panel de lectura. |
| Mi barrio | Contexto para encontrar planes. | Misma familia visual de la ciudad activa; zonas tranquilas para luces/controles y aviso ilustrativo. |
| Mi gente | Priorizar nombres y vínculos. | Naturaleza discreta en bordes, fondo petróleo; no añadir otra ciudad detallada detrás de la red. |
| Cuenta, lugares y formularios | Leer, decidir y completar una acción. | Cabeceras contenidas, imagen secundaria y texto sobre superficies estables. |

Para la imagen nueva: mantener el valle, la atmósfera y la integración entre vegetación y edificios; reducir la cantidad de detalle justo bajo textos y controles. El micelio puede ser un elemento reconocible de la marca sin repetirse con la misma silueta urbana en todas las ciudades. No convertir las casas o las luces del arte en ubicaciones de personas.

## Cambio de ciudad propuesto

1. La persona activa un lugar en Mis lugares o en el selector. La fuente de verdad ya existe: `perfil.lugar.ciudad`, un código DIVIPOLA; no hace falta GPS.
2. Al confirmar el servidor, se anuncia el nuevo contexto y se resuelven en paralelo los planes y el fondo correspondiente. Se cancelan o descartan respuestas del contexto anterior.
3. Un catálogo selecciona el paquete visual por código de ciudad. Cada paquete contiene composición móvil/escritorio, versión, créditos y recursos optimizados del mismo origen.
4. Si todavía no hay ilustración para esa ciudad, se muestra un paisaje MOAI genérico rotulado como ilustrativo. No se reutiliza Medellín presentándolo como Bogotá.
5. El mapa es una capacidad aparte. La ciudad puede tener un fondo propio sin tener aún catálogo de barrios ni posiciones de planes.

**Automático es elegir el recurso correcto al cambiar de lugar.** Tener una ciudad visualmente distinta requiere producir y aprobar previamente sus ilustraciones. No se propone generar una imagen por persona, subir su ubicación o esperar una generación de IA cada vez que navega.

Especificación y criterios verificables: [13-fondos-por-ciudad.md](13-fondos-por-ciudad.md).

## Pendientes para dar por aprobada la experiencia

Resolver los P1, preparar y revisar arte vertical/horizontal al menos para las ciudades iniciales y ejecutar nuevamente el cambio de contexto con carga lenta/fallida. Después: comprobar contraste AA de textos y controles sobre los nuevos recursos, probar VoiceOver/TalkBack, zoom de texto al 200 % y realizar tareas con personas del público objetivo. Ninguno de estos puntos se declara pasado por las capturas actuales.
