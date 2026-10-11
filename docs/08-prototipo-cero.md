# MOAI · Especificación del prototipo cero

Borrador 1 · Para construir con Claude Code, con Lovable o con un desarrollador

## Objetivo y alcance

**Objetivo:** que una persona abra un enlace en su teléfono y viva el primer día de MOAI: llegar, decir su nombre y su ciudad, ver su ciudad amanecer, plantar su árbol, ver su calle y recibir la carta del día. Se valida la sensación, no la tecnología.

**Incluye**

- El onboarding completo (pantallas P1 a P13).
- La pantalla principal con la ciudad, la carta de Brisa, la calle y el árbol.
- Un Radar simulado, un Moai de ejemplo y una simulación de lluvia fuerte.
- Un panel de demostración para cambiar de ciudad, de hora y de clima.
- El Modo Ahorro.

**No incluye:** cuentas reales, servidor, base de datos, mensajería real, Radar real, inteligencia artificial real (las cartas son fijas), ubicación real, fotos reales, notificaciones ni pagos.

**Plataforma:** web móvil que se abre con un enlace, en vertical (referencia: 390 por 844). En escritorio se muestra dentro de un marco de teléfono. No se asume como base del producto real: se reutilizan el diseño y los textos, no el código.

**Datos y privacidad:** todo vive en la memoria de la sesión y no se envía a ningún servidor. El prototipo no pide permisos del teléfono. En la primera pantalla y en Ajustes se avisa: «Esto es un prototipo. Lo que escribas no se guarda.»

## Prioridades

| Prioridad | Qué entra |
| --- | --- |
| Imprescindible | Onboarding P1 a P13 y la pantalla principal (H1) |
| Importante | Perfil y árbol (H2), Radar simulado (H3), Moai de ejemplo (H4) |
| Deseable | Simulación de lluvia fuerte (H5), panel de demostración de ciudad, hora y clima (H6), Modo Ahorro (H7) |

## Pantallas del onboarding

Cada pantalla tiene un fondo (la ciudad), una voz (Brisa), una ventana (la pregunta y los botones, siempre como panel emergente) y un efecto en la ciudad. Una sola acción principal por pantalla y botón de volver siempre visible.

**P1 · Tu nombre**

- Voz: «Hola, soy Brisa. ¿Cómo te dicen los que te quieren?»
- Ventana: campo de texto («Tu nombre o apodo»), botón «Continuar». Aviso del prototipo en pequeño.
- Fondo: cielo genérico según la hora del día.

**P2 · Tu ciudad**

- Voz: «Mucho gusto, \[nombre\]. ¿En qué ciudad amaneces?»
- Ventana: Medellín, Bogotá, Ciudad de México, Nueva York y «Usar mi ubicación aproximada», que aparece desactivada con la nota «próximamente».
- Efecto: el cielo toma el color y el clima de la ciudad elegida.

**P3 · Amanecer**

- Fondo: la ciudad, a la hora y con el clima simulados, entre neblina. Sin menú.
- Voz (cambia según la hora): «Buenos días. La ciudad apenas despierta y te estaba esperando. No tengas afán: aquí nadie llega tarde.» Por la tarde: «Buenas tardes. La luz está bajando y la ciudad te guardó un lugar.» Por la noche: «Buenas noches. Las ventanas se están encendiendo. Pasa, que aquí hay luz.»
- Ventana: un solo botón, «Entrar».

**P4 · Mira tu mano**

- Voz: «Antes de entrar, mira tu mano. Tu huella y los anillos de un árbol se parecen. Tus venas dibujan lo mismo que las nervaduras de una hoja. La vida repite sus dibujos.» Luego: «Por eso, cuando cuidas a una persona, a un animal o a un jardín, estás cuidando de lo mismo. Tu salud, la de quienes te rodean y la del lugar donde vives son una sola. Esta ciudad se construye cuidándola entera.»
- Efecto: una huella se transforma en los anillos de un tronco, y una mano en una hoja.
- Ventana: «Quiero empezar».

**P5 · Tu semilla**

- Voz: «Todo árbol empieza en una semilla. Elige la que se parezca a ti.»
- Ventana: ceiba, guayacán, yarumo y palma de cera.
- Efecto: en el patio brota un retoño de esa especie.

**P6 · Lo que traes en las manos**

- Voz: «Todo el mundo trae algo en las manos. ¿Qué es lo tuyo?»
- Ventana: hasta tres oficios (cocinar para otros, contar historias, sembrar y cuidar, arreglar lo que se daña, escuchar, enseñar lo que sé, cuidar animales, tejer o bordar, cantar o tocar, acompañar).
- Efecto: cada oficio levanta un lugar en la calle de los oficios. Voz: «Gracias. Ya levantamos tu primera casa en la calle de los oficios.»

**P7 · Lo que te gustaría recibir**

- Voz: «Aquí también se recibe. Pedir es parte de cuidar. ¿Qué te gustaría que llegara a tu vida?»
- Ventana: compañía para caminar, aprender algo nuevo, alguien que me escuche, aprender tecnología, cocinar juntos, otra cosa.
- Efecto: aparece una banca vacía en la plaza.

**P8 · Cómo amaneciste**

- Voz: «¿Cómo amaneciste hoy? Esto lo ves solo tú. Tu árbol lo mostrará con una luz.»
- Ventana: cuatro tarjetas con forma y color (calma, energía, compañía, cuidado) y «Prefiero no decirlo».
- Efecto: se enciende la lámpara del árbol.

**P9 · Tu gente**

- Voz: «¿Quién ha estado a tu lado cuando más lo necesitaste? Puedes nombrar a una persona o a varias. Esto se queda guardado en tu teléfono.»
- Ventana: nombre más el lugar que ocupa (mi raíz, mi tronco, mi rama), hasta cinco personas.
- Efecto: cada nombre es una casa con la ventana apagada en tu calle, con el color de su anillo.

**P10 · Los que no hablan**

- Voz: «También cuentan los que no hablan. ¿Quién más te acompaña?»
- Ventana: un perro, un gato, otro animal, mi huerta, mis matas.
- Efecto: aparecen en tu patio.

**P11 · Si hoy no se te viene nadie** (solo si en P9 no se nombró a nadie)

- Voz: «Si hoy no se te viene nadie a la mente, no pasa nada. Las ciudades también empiezan con una sola lámpara.»
- Ventana: «Quiero conocer a alguien de mi barrio», «Quiero ir a un Tiempo Festivo» y «Prefiero mirar primero».
- Efecto: se enciende un farol en tu calle. Esta rama salta directo a P13.

**P12 · Tu primera Espora**

- Voz: «¿A quién le debes un café?», y luego: «Escríbele con tus palabras. Es lo único que importa.»
- Ventana: las casas de tu calle, un campo libre y cuatro puntos de partida («Me acordé de ti y quise saber cómo estás.», «Te siembro en mi bosque porque tus consejos me dan paz.», «Extraño nuestras conversaciones del colegio.», «Quiero que volvamos a cruzar caminos.»), y la simulación de envío.
- Voz de cierre: «Tu Espora salió con la brisa. No hay prisa: quedará en el viento treinta días.» La ventana de esa casa late suave.

**P13 · Primer amanecer**

- Fondo: la cámara baja despacio hasta tu patio (de tres a cuatro segundos, con opción de saltarla): tu árbol con su lámpara, tu calle con sus ventanas.
- Voz: «Listo, \[nombre\]. Esta es tu ciudad. Hoy encendiste tu primera luz.» Luego: «Mientras esperas respuesta, sal a mirar el cielo de \[ciudad\]. Hoy está así: \[clima\].» Y: «Mañana te escribo otra vez.»

## Pantallas después del onboarding

**H1 · Principal**

- La ciudad a la hora y con el clima simulados; tu calle con las casas (ventana encendida o apagada); el patio con tu árbol, tu lámpara, tus animales y tus matas.
- La carta del día de Brisa, como tarjeta, con un gesto hacia otra persona.
- Navegación inferior de cuatro entradas: Inicio, Árbol, Calle y Ajustes.

**H2 · Perfil y árbol**

- Zoom hasta tu árbol: la copa (tu red extendida), el tronco con sus anillos de crecimiento, las raíces con las luces de ancestros y la lámpara de hoy.
- Al deslizar hacia abajo se ve el subsuelo: el micelio que conecta las casas.

**H3 · Radar simulado**

- Un botón de demostración: «Simular que alguien de tu tronco está cerca».
- Se enciende el borde de la pantalla con el color del anillo, sin nombre.
- Al tocarlo se ofrece un saludo; al aceptarlo, la otra persona «acepta» (simulado) y se revela el nombre.

**H4 · Tu Moai**

- Un claro con tres árboles. Una carta de Brisa: «Hace un tiempo que tu Moai no se reúne. ¿Y si esta semana alguien propone un café sin agenda? Esta vez le toca proponer a Luis.»
- Dos gestos de un toque: «Mandar un abrazo corto» y «Ya nos vimos» (que engruesa los hilos).

**H5 · Lluvia fuerte (simulada)**

- Un botón de demostración activa un evento. Brisa cambia de tono: «Hoy llovió muy fuerte en \[ciudad\]. ¿Cómo estás?»
- Confirmación en tres toques: «Estoy bien», «Necesito que alguien me escriba», «Prefiero no decir».
- Las ventanas de tu calle muestran la luz de vela para quien confirmó y una luz tenue para quien no. Nunca rojo ni alarma.
- Se ofrece el Modo Ahorro.

**H6 · Panel de demostración**

- Un menú oculto para cambiar la ciudad, la hora (amanecer, día, atardecer, noche) y el clima (despejado, nublado, lluvia), y ver cómo cambia el fondo.
- Para las ciudades sin imagen propia se muestra un fondo provisional claramente marcado como tal.

**H7 · Modo Ahorro**

- Fondo plano y oscuro, sin vidrio esmerilado, sin movimiento y sin imágenes; letra más grande; un solo gesto por pantalla.
- Meta: confirmar «estoy bien» en dos toques.

## Componentes

Tomados del kit de Figma. Medidas de referencia sobre un ancho de 390.

| Componente | Especificación |
| --- | --- |
| Panel emergente | Ancho 358, relleno interno 24, esquinas de 28, relleno papel a cerca del 78 por ciento con desenfoque de fondo, borde blanco suave y sombra |
| Botón principal | Alto 60, esquinas de 30, verde selva profundo, texto blanco de 18 en peso medio y flecha |
| Botón secundario | Alto 60, esquinas de 30, sin relleno y con borde |
| Campo de texto | Alto 60, esquinas de 16, fondo blanco casi opaco |
| Opción de lista | Alto 60, esquinas de 16, igual que el campo |
| Carta de Brisa | Panel con el sello Mo, una línea de contexto, un texto en serifa de 24 y un botón principal |
| Casa de tu calle | Avatar de 52 con borde de 4 del color del anillo, nombre, nivel y una ventana de 26 por 34 (dorado si está encendida) |
| Oficio | Tarjeta pequeña en tres columnas; al elegirla, borde lima de 3 y resplandor |
| Estado | Cuatro tarjetas con forma, color y etiqueta; la elegida lleva borde verde profundo |
| Espora recibida | Disco de círculos concéntricos violeta, texto de la intención y dos botones |

**Tipografía propuesta:** Fraunces para la voz de Brisa y los títulos (24 a 28), e Inter para la interfaz (14 a 18). Mínimo 14 para texto secundario y 16 para cuerpo.

**Estados de cada componente:** normal, presionado, elegido, deshabilitado y variante del Modo Ahorro.

**Paleta:** la de la paleta viva v1 del documento maestro. El amarillo y el lima se usan solo como luz y forma, nunca como texto sobre papel.

## Accesibilidad

- Zonas táctiles de al menos 48 de alto.
- Contraste suficiente de los textos sobre el fondo y el panel; el color nunca es la única señal.
- Etiquetas para lectores de pantalla y orden de lectura lógico.
- Respeta el ajuste de reducir movimiento del teléfono.
- Lectura en voz alta opcional de las cartas, con la voz del navegador.
- Letra que respeta el tamaño configurado por la persona.

## Datos de mentira

- **Persona:** el nombre y la ciudad que escribe, su semilla, sus oficios y su estado del día.
- **Red de ejemplo:** Mamá (raíz, con luz de vela), Luis (tronco, con luz de vela) y Carolina (rama, apagada); un perro llamado Luna y un helecho; una luz de ancestro.
- **Moai de ejemplo:** tú, Luis y Carolina, con ritmo quincenal y el último encuentro hace treinta días.
- **Cartas de Brisa:** las siete muestras del guion, más una de evento y una de Moai.
- **Fondos:** las dos imágenes de Medellín disponibles. Las demás ciudades usan un fondo provisional marcado.
- **Hora y clima:** simulados desde el panel de demostración.

## Reglas de comportamiento

- Una sola acción principal por pantalla y siempre un camino de vuelta.
- Ningún número, punto, nivel ni contador visible.
- Transiciones suaves de no más de 400 milisegundos; el descenso de cámara de P13 tiene opción de saltarse.
- Sesión en memoria y un botón «Empezar de nuevo».
- Sin analítica de terceros. Si se mide algo, que sea anónimo y con aviso (por decidir).
- Textos en español, de tú.

## Criterios de aceptación

- Una persona nueva completa el onboarding en unos diez minutos sin ayuda.
- Todos los textos se leen sobre el fondo en las cuatro horas del día.
- Funciona en un teléfono de gama media y con conexión móvil lenta.
- No pide permisos ni envía datos.
- En el panel de demostración se cambian la ciudad, la hora y el clima.
- Funciona con el ajuste de reducir movimiento activado.
- No se ve ningún número ni puntaje.

## Fuera del prototipo

Cuentas, servidor, base de datos, mensajería real, Radar real, cifrado, IA real, ubicación real, fotos, notificaciones, pagos, Perfiles Brote y luces de ancestros compartidas.

## Cómo se prueba

Sin pruebas formales por ahora, según lo decidido. Se recomienda mostrarlo a unas pocas personas de confianza y observar dónde se pierden y qué sienten. No se mide el tiempo en la aplicación.

## Plan de construcción por pasos

1. El marco de teléfono, la paleta y el kit de componentes.
2. El onboarding completo (P1 a P13).
3. La pantalla principal y el árbol (H1 y H2).
4. Radar, Moai y lluvia simulados (H3 a H5).
5. El panel de demostración y el Modo Ahorro (H6 y H7).
6. Pulido de movimiento y accesibilidad.

## Decisiones por tomar

- ¿Web móvil o aplicación nativa de entrada? Recomiendo web móvil, porque se comparte con un enlace.
- Herramienta de construcción: Claude Code, Lovable o un desarrollador.
- Qué imágenes usar para las otras ciudades en la demostración.
- Si se mide con analítica anónima.
- Quién lo prueba primero.
- Qué recortar si hay poco tiempo: yo dejaría el onboarding completo antes que la pantalla principal.
