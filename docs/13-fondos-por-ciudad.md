# Fondos por ciudad · especificación propuesta

Complemento de la [auditoría UX/UI](12-auditoria-ux-ciudades.md). No es una implementación ni un catálogo de ilustraciones ya disponibles.

## Fuente de verdad

Usar el código DIVIPOLA de `perfil.lugar.ciudad`, no el texto libre del nombre, el lugar inicial del registro ni una ubicación obtenida del dispositivo. Cambiar el lugar activo cambia el contexto visual y los planes. Un mismo usuario puede tener lugares en ciudades distintas; no hace falta añadir datos personales al modelo.

```text
Lugar confirmado por el servidor
         ├── ciudad (DIVIPOLA) → catálogo visual → FondoCiudad
         └── lugar/ciudad → consultas de planes y cobertura del mapa
```

La ciudad visual no depende de `mapa.disponible`. La ilustración es un escenario de identidad; la cobertura H3 permite consultar y ubicar planes de forma aproximada. Si no hay cobertura, Lista sigue ofreciendo los planes reales que permita la API y el fondo puede seguir siendo el de la ciudad.

## Catálogo

Proponer un módulo único `src/lib/fondos-ciudad.ts`, con un registro validado de paquetes de recursos. Ejemplos de claves: `05001` Medellín, `11001` Bogotá, `13001` Cartagena. Esas claves no implican que ya exista arte para ellas.

Cada paquete aprobado tendrá:

- Código, nombre público de la ciudad, versión de arte y créditos/licencia.
- Composición vertical para móvil y horizontal para escritorio, con AVIF y respaldo WebP, dimensiones y tamaños de descarga.
- Punto focal y zonas tranquilas para controles en cada composición. No asumir que una panorámica recortada dará el mismo resultado vertical.
- Variantes de luz solo si existen recursos aprobados. No prometer clima en tiempo real ni imágenes de una hora concreta sin implementarlo.
- Respaldo estático si falla la carga. Si la ciudad no está en el catálogo, usar un recurso MOAI genérico y el aviso «Escenario ilustrativo». No recurrir a otra ciudad identificable bajo el nombre elegido.

Los recursos se sirven desde `/backgrounds/ciudades/` del mismo origen y se seleccionan mediante catálogo; no se construyen URLs remotas a partir de lo que escribe una persona. La generación o adquisición de ilustraciones ocurre antes de publicarlas, con revisión editorial; no en cada cambio de ciudad ni por usuario.

Un componente compartido `FondoCiudad` resolvería el `<picture>`, el estado de carga/error y las variantes de composición. Inicio y Mi barrio deben consumirlo; las cabeceras funcionales pueden usar recortes discretos de esa familia. Mi gente conserva su red y fondo de lectura, sin introducir otra escena urbana detrás de los nombres.

## Comportamiento al cambiar de lugar

1. Deshabilitar activaciones repetidas mientras se confirma el cambio. Si falla, conservar el lugar anterior y ofrecer reintento con error legible/anunciado.
2. Al confirmar, refrescar sesión/contexto; limpiar plan seleccionado, planes, mapa y errores del lugar anterior.
3. Cargar nuevos datos con un identificador del lugar solicitado. Cancelar o ignorar respuestas que ya no correspondan al lugar activo, incluso al navegar rápido entre ciudades.
4. Mostrar «Cargando planes de Bogotá…» y el nuevo fondo cuando esté disponible. No permitir actuar sobre planes antiguos durante la transición.
5. Anunciar el nuevo contexto y conservar un destino de foco comprensible. En móvil, el nombre de ciudad debe poder consultarse completo aunque se abrevie el nombre largo del lugar.
6. Distinguir ciudad sin mapa, lista vacía, error de red y fallo de imagen. Ofrecer Lista o Reintentar según el caso.

## Dirección de arte

Compartir luz cálida, naturaleza integrada, materiales creíbles y micelio sutil. Cada ciudad debe conservar paisaje, arquitectura, vegetación y escala cotidiana propios. No aplicar el valle, cable y ladera de Medellín a Bogotá o a una ciudad costera. El micelio identifica MOAI; la ciudad conserva su identidad.

Preparar dos encuadres desde el origen:

- Móvil: cielo/profundidad y un rasgo reconocible que permanezca visible, zonas tranquilas arriba y abajo, con el eje central libre para las acciones.
- Escritorio: panorama amplio, foco local a un lado y área de lectura estable donde corresponda. Mantener la altura de los controles independiente del horizonte del arte.

El arte no contiene textos, botones, tarjetas, marcadores de personas ni luces de planes preimpresas. Los controles y planes se construyen como HTML/SVG real. No se incorporan video o 3D para resolver los fondos.

Objetivos iniciales de exportación, a validar visualmente: móvil alrededor de 960 px de ancho y 1700 px de alto; escritorio alrededor de 1920 × 1200. Buscar AVIF móvil por debajo de 250 KiB y escritorio por debajo de 450 KiB sin degradar lectura del escenario. Son presupuestos de trabajo, no mediciones de recursos nuevos.

## Orden de implementación

1. Corregir confirmación, carga/errores y datos obsoletos del cambio de lugar.
2. Implementar catálogo y resolver compartido con un recurso genérico honesto. Añadir solo ciudades con arte aprobado, manteniendo las funciones actuales.
3. Incorporar el arte vertical/horizontal de las ciudades iniciales y verificarlo con los controles reales. Hace falta producir esos recursos; el repositorio actual solo tiene la ilustración compartida y sus recortes.
4. Compactar cabeceras funcionales, ampliar áreas de toque y unificar el foco de rutas.
5. Repetir pruebas visuales y de permisos, contraste, teclado y lectores de pantalla. Dejar los cambios en una rama para revisión, sin publicar.

## Criterios de aceptación

- Activar un lugar de otra ciudad cambia la etiqueta y el paquete visual correcto sin recargar la página completa; recargar conserva el lugar activo confirmado por el servidor.
- Inicio y Mi barrio muestran el mismo contexto. No quedan planes seleccionados del lugar anterior ni se aplican respuestas atrasadas.
- Error de activación conserva contexto previo y ofrece reintento. No hay acciones duplicadas por clic repetido.
- Una ciudad sin cobertura H3 puede tener arte propio y Lista; no se inventan celdas o distancias para dibujar luces.
- Ciudad sin arte o recurso fallido muestra respaldo identificado y controles funcionales. No se expone ubicación exacta ni se envían peticiones a servicios de terceros desde el navegador.
- En 390 × 844, 768 × 1024 y 1440 × 900 permanece un rasgo local previsto, sin recortes accidentales de la composición ni superposición de controles.
- Texto principal de 18 px, objetivos de toque de 48 px, foco visible y navegación por teclado. Contraste AA comprobado sobre los recursos finales; movimiento reducido y modo estático respetados.
- Incluir estados vacío, sin barrio/mapa, error de API, error de imagen, cambio rápido de ciudad y títulos/nombres largos. Los datos de ejemplo solo pertenecen a las pruebas.
