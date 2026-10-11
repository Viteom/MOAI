# MOAI Ciudades del Cuidado · Documento maestro

Versión 1 · Resumen unificado de las decisiones y los documentos del proyecto

Este documento reúne en un solo lugar qué es MOAI, qué se ha decidido, qué está documentado, qué está construido y qué sigue abierto. Los detalles viven en los documentos enlazados.

## 1. Qué es MOAI

MOAI es una infraestructura de cuidado social contra la soledad y la desconexión, pensada para acompañar la longevidad con propósito. Nace de la metodología de Vasees: hacer visible lo invisible y entender la comunidad como un ecosistema vivo donde cada vínculo amplifica el propósito.

- **Concepto rector: One Health.** La salud de las personas, de los animales y del entorno es una sola. El onboarding lo cuenta mostrando cómo la vida repite sus dibujos (la huella y los anillos de un tronco, las venas y una hoja).
- **Economía de la presencia.** Se rechaza lo transaccional: sin contadores de vanidad, sin rankings, sin scroll infinito.
- **Intergeneracional.** No segrega por edad.
- **Cómo se siente.** Una ciudad viva, cálida y cercana que te recibe: tu ciudad real, con su hora y su clima, que va creciendo con cada decisión.

## 2. Principios que no se negocian

- Nada transaccional ni de vanidad: sin puntos, niveles ni cifras de cuántos o cuánto.
- Privacidad por diseño: ubicación aproximada y sin historial, cifrado de extremo a extremo, y lo íntimo se queda en el dispositivo por defecto.
- Regla del espejo: si la persona se sentiría observada al saber cómo lo sabemos, no lo hacemos.
- Equivocarse debe ser barato: el peor falso positivo es un mensaje amable que se puede ignorar.
- Nada oculto: las sugerencias vienen apagadas por defecto y siempre con su motivo a la vista.
- MOAI no es un servicio de emergencias ni un dispositivo médico, y lo dice.
- Brisa es una inteligencia artificial y se presenta como tal.
- El éxito se mide por reconexión entre personas, no por tiempo en la aplicación.
- Lo que la interfaz promete sobre privacidad debe ser exactamente lo que la arquitectura cumple.

## 3. Conceptos clave

| Concepto | Qué es |
| --- | --- |
| Brisa | La voz de la ciudad, una IA que escribe cartas y lleva las Esporas con el viento |
| Mo | El sello de la interfaz |
| Espora de Conexión | Invitación emocional a alguien nuevo, con una intención escrita |
| Polinización | El flujo de invitaciones: al aceptar nace un vínculo de rama |
| Anillos de Crecimiento | Raíz (familia y ancestros), Tronco (la gente más cercana) y Rama (conocidos queridos) |
| Moai | Círculo íntimo elegido por las personas (de tres a cinco). Una persona puede estar en varios Moais, y los grupos pueden solaparse |
| Radar Micelial | Aviso suave en los bordes de la pantalla cuando alguien de tu red está cerca, sin pines ni mapas |
| Estado del día | La lámpara del árbol: calma, energía, compañía o cuidado |
| Modo Invierno | Estado de cuidado: el árbol pierde hojas y la interfaz se atenúa |
| Tiempo Festivo | Encuentro sin agenda productiva, como un café |
| Punto Neutro | Espacio comunitario público donde ocurren los primeros encuentros |
| Vigilia de cuidado | Permiso previo y con vencimiento para que Brisa avise a una persona elegida si hay silencio |
| Perfil Brote | Perfil de un menor, creado y gestionado por un tutor |
| Luz de ancestro | Memoria de una persona fallecida, privada por defecto |
| Pilares One Health | Personas, animales y entorno: los tres tipos de encuentro |

## 4. La voz: Brisa

- Habla de tú, con calidez y sin prisa; firma las cartas con su nombre.
- Las cartas diarias se escriben a mano por contexto (hora, clima, oficio) y la IA las varía sin salirse de la voz.
- Cada mensaje apunta hacia otra persona: Brisa no busca ser la única compañía de nadie.
- No da consejos médicos. Ante señales de riesgo, acerca a una persona del Moai o a una línea de ayuda verificada por país.
- El nombre es provisional: puede cambiar mientras se define la marca.

## 5. Experiencia

### El primer día

Documentado en el [guion del primer día](https://claude.ai/artifact/HmzfmGnifzhKK9JuPmnM2S). Recorrido: nombre, ciudad, la revelación del amanecer, «mira tu mano» (One Health), semilla, oficios, estado del día, red de apoyo (personas, animales y ancestros), sugerencias, el camino para quien llega sin nadie y la primera Espora. Cierra con el primer amanecer.

### La ciudad

- Fondo realista según la ciudad de residencia, con hora y clima reales. Si la persona viaja, la ubicación aproximada del dispositivo cambia el fondo; viajar no se publica.
- Medellín y el Valle de Aburrá son la primera ciudad ([brief de arte](https://claude.ai/artifact/LsyZVJofJLTh4GgpaqWsq6)). Para toda Colombia, cada municipio recibe su fondo por arquetipo regional y parámetros (altura, clima, relieve); los barrios, por relieve y arbolado, nunca por estrato.
- Escena por capas con paralaje. El árbol vital y las ventanas de cada persona se dibujan encima. Las personas pequeñas del paisaje son una capa animada aparte, no parte de la imagen.

### Interfaz y tarjetas

- Ventanas emergentes como paneles de papel translúcido (vidrio esmerilado) sobre el paisaje, con una decisión por pantalla.
- Tipografía propuesta: una serifa (Fraunces) para la voz de Brisa e Inter para la interfaz.
- Cinco tarjetas: la carta de Brisa, la casa de tu calle (el anillo se ve en el borde del avatar y la ventana se enciende o se apaga), el oficio, el estado del día y la Espora recibida.
- Accesibilidad: letra grande, voz, el color nunca como única señal, opción de reducir el movimiento y un Modo Ahorro.

### Paleta viva v1

| Grupo | Color | Valor |
| --- | --- | --- |
| Pilar personas | Coral vivo | #EF6F5E |
| Pilar animales | Dorado miel | #F2B33D |
| Pilar entorno | Verde selva | #2DA16F |
| Anillo raíz | Cobre de corteza | #B8582A |
| Anillo tronco | Violeta micelio | #7B4FD1 |
| Anillo rama | Lima de brote | #B5D63D |
| Estado: calma | Agua | #3CC3C8 |
| Estado: energía | Rayo | #FFE45C |
| Estado: compañía | Atardecer | #FF8A3D |
| Estado: cuidado | Rosa nube | #F58FB5 |
| Base | Noche berenjena | #1D1230 |
| Base | Papel | #F7EEDC |
| Base | Tinta | #23302B |
| Botón | Verde selva profundo | #1F7A52 |

El amarillo y el lima no tienen contraste suficiente para texto sobre el papel: se usan solo como luz y forma.

## 6. Datos y algoritmos

### El grafo en Neo4j

- **Nodos:** Persona, Brote, Ancestro, Moai, Punto Neutro, Espora, Animal, Planta, Encuentro y Evento.
- **Relaciones de anillo:** raíz, tronco y rama, con una fuerza que engrosa con las interacciones y se marchita solo en lo visual: nunca se borra, pasa a dormido. La raíz no se marchita.
- **Polinización:** al aceptar una Espora nace una rama con confianza modesta (0,25) y subir a tronco exige la confirmación de ambas personas.
- **One Health:** los animales y las plantas son nodos mínimos, sin datos de salud, y lo que una persona cuida es privado por defecto. Los lugares íntimos viven solo en el dispositivo.
- Detalle en los archivos Cypher: moai\_anillos\_de\_crecimiento.cypher y moai\_one\_health\_extension.cypher.

### Sugerencias y comunidades

- Sugerencias por cierre triádico, con doble aceptación y motivo visible.
- Louvain solo propone grupos, nunca asigna Moais. Como asigna cada persona a una sola comunidad, con Moais solapados hace falta otro enfoque.

### Algoritmo de cuidado

Documentado en el [algoritmo de cuidado](https://claude.ai/artifact/8zKosYdGoe39ki2FQXewDk). Dos niveles: mensajes al Moai por defecto, a partir de la cohesión del grupo frente a su propio ritmo, y una escalera de cuidado individual solo con permiso. Mide el tejido, no el ánimo; no usa otras redes sociales; y lo que ocurre fuera de MOAI lo cuentan las propias personas con el botón «Ya nos vimos».

## 7. Radar Micelial

Documentado en la [arquitectura del Radar](https://claude.ai/artifact/LYnJGBUkpeZ2wAHTfsfZHJ).

- **Fase 0:** Radar simulado para validar la sensación visual.
- **Fase 1:** Radar de zona, con internet y ubicación aproximada. Las etiquetas por pareja se calculan con una clave compartida, el servidor no puede leerlas y la comparación ocurre en los teléfonos.
- **Fase 2:** Bluetooth y conexión sin internet, para una actualización posterior.
- El Radar promete «presencia aproximada», no tiempo real.

## 8. Privacidad y seguridad

Documentado en [privacidad y consentimiento](https://claude.ai/artifact/8qvctmdePhvcuWB8UWaVf9): inventario de 17 tipos de dato con su ubicación, quién los ve y cuánto duran; consentimiento por permiso, en el momento de usarlo y retirable en un toque; casos delicados (menores, personas fallecidas, estado emocional, red declarada, la IA de Brisa); y diez preguntas listas para un abogado de protección de datos.

- Lo íntimo (estado del día, Modo Invierno, red declarada, luces de ancestros) vive en el dispositivo por defecto.
- Nunca se sube la libreta de contactos ni se recoge ubicación exacta.
- El marco legal (Ley 1581 de 2012 y sus equivalentes en otros países) está pendiente de validación por un abogado.

## 9. Emergencias

Documentado en [Modo Cuidado en emergencias](https://claude.ai/artifact/SRhnzNZ5CtoEaLBESFbj6S): preparación, confirmación en tres toques, Vigilia de cuidado, Puntos Neutros con luz, Modo Ahorro y encuentros de cuidado después. MOAI no sustituye a los servicios de emergencia.

## 10. Hoja de ruta propuesta

Sin fechas definidas todavía.

1. **Prototipo cero.** Onboarding y pantalla principal con la ciudad de Medellín, el Radar simulado y las cartas de Brisa escritas a mano.
2. **Fase 1.** Backend mínimo (personas, Esporas, Polinización, Moais), Radar de zona, cartas diarias con IA, Modo Ahorro, cobertura de ciudades por arquetipo y primer piloto del algoritmo de cuidado.
3. **Fase 2.** Bluetooth y conexión sin internet, SMS de «estoy bien» y nivel persona del algoritmo de cuidado.

Antes de lanzar: revisión de seguridad independiente, concepto legal, validación local de cada fondo y pruebas con personas mayores (aplazadas por ahora).

## 11. Estado de los entregables

| Entregable | Estado | Dónde está |
| --- | --- | --- |
| Guion del primer día | Borrador 1 | [Enlace](https://claude.ai/artifact/HmzfmGnifzhKK9JuPmnM2S) |
| Brief de arte de Medellín | Borrador 1 | [Enlace](https://claude.ai/artifact/LsyZVJofJLTh4GgpaqWsq6) |
| Arquitectura del Radar | Borrador 1 | [Enlace](https://claude.ai/artifact/LYnJGBUkpeZ2wAHTfsfZHJ) |
| Privacidad y consentimiento | Borrador 1 | [Enlace](https://claude.ai/artifact/8qvctmdePhvcuWB8UWaVf9) |
| Modo Cuidado en emergencias | Borrador 1 | [Enlace](https://claude.ai/artifact/SRhnzNZ5CtoEaLBESFbj6S) |
| Algoritmo de cuidado | Borrador 1 | [Enlace](https://claude.ai/artifact/8zKosYdGoe39ki2FQXewDk) |
| Cypher de anillos | Borrador, sin ejecutar | moai\_anillos\_de\_crecimiento.cypher |
| Cypher One Health | Borrador, sin ejecutar | moai\_one\_health\_extension.cypher |
| Figma | Kit y dos pantallas con el fondo real. Las tarjetas rediseñadas solo existen como boceto web; la reconstrucción en Figma quedó pendiente por el límite de llamadas del plan | [Archivo](https://www.figma.com/design/ysY7rr3Nf7LOsPmekZwt3x) |
| Fondos de Medellín | Dos pruebas generadas; faltan atardecer, noche, lluvia y patio | Figma |

## 12. Pendientes y decisiones abiertas

### Producto y operación

- Definir el nombre de la voz junto con la marca (Brisa es provisional); verificarlo en el registro de marcas cuando se fije.
- Quiénes serán los anfitriones y anfitrionas comunitarios del piloto y qué Puntos Neutros se usarán.
- Verificación de identidad invisible: qué variables se piden y quién aprueba (líderes comunitarios), con reglas sobre quién valida a los validadores.
- Flujo de texto plano (SMS o USSD) que emule la experiencia para quien no tiene internet.

### Privacidad y legal

- ¿La foto se estiliza en el dispositivo o en la nube?
- Edad mínima para tener cuenta propia.
- Qué ve la otra persona cuando alguien borra su cuenta.
- Visibilidad por defecto de oficios y deseos (nadie, el Moai o la red).
- Proveedor de IA y región donde se alojan los datos.
- Plazos de retención de registros y de eliminación de cuentas.
- Revisión por un abogado de protección de datos, por país.

### Técnico

- Radar: tamaño de la celda, duración del permiso (propuesta: 7 días) y si se empieza con el Radar de zona o con avisos de «llegué» en los Puntos Neutros.
- Emergencias: quién declara un evento de zona, cuánto tiempo sin noticias dispara la Vigilia y si el SMS entra en la fase 1.
- Algoritmo de cuidado: los umbrales, el tope global por persona y el algoritmo que propone Moais cuando se solapan.
- Probar los dos archivos Cypher contra una base de datos real.

### Visual

- Qué tan fantástico debe ser el paisaje y dónde aparecen las figuras humanas.
- Modelo de imágenes de mayor calidad para las versiones finales.
- Los cuatro fondos que faltan.
- Diseño real del sello Mo.
- Reconstruir las tarjetas en Figma cuando se libere el cupo.
- Confirmar la tipografía.

## 13. Riesgos principales

- **Radar y rastreo:** puede servir para seguir a alguien si falla el diseño.
- **Datos sensibles:** foto, estado emocional, menores y personas fallecidas.
- **Promesas de privacidad que no coincidan con la arquitectura.**
- **Arranque en frío:** quien llega sin nadie y la necesidad de anfitriones reales.
- **Fiabilidad en segundo plano** en iOS y Android.
- **Dependencia emocional de la voz de la IA.**
- **Falsos positivos del algoritmo de cuidado.**
- **Costo y calidad de producción de arte** para cada ciudad.
- **Marco legal** sin validar y varios países por delante.
