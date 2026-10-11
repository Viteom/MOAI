# MOAI · Privacidad y consentimiento

Borrador 1 · Para validar con un abogado de protección de datos. No es asesoría legal.

Este documento fija qué dato recoge MOAI, dónde vive, quién lo ve y cuánto dura, y cómo se pide y se retira el consentimiento. Su regla de oro: lo que Brisa y la interfaz prometen sobre privacidad debe ser exactamente lo que la arquitectura cumple.

## Principios

- Mínimo necesario: si no hace falta, no se recoge.
- Lo íntimo se queda en el dispositivo por defecto: el estado del día, el Modo Invierno, la red declarada y las luces de ancestros.
- Todo permiso sensible se pide en el momento en que se usa, con palabras claras, y se puede retirar en un toque.
- Nada oculto: ni inferencias sobre tu estado, ni sugerencias disfrazadas de azar. Si la ciudad te sugiere algo, te dice por qué.
- Nunca se sube tu libreta de contactos.
- Los datos no se venden, no se usan para publicidad ni para entrenar modelos de terceros.
- Ubicación aproximada, nunca exacta, y sin historial.

## Inventario de datos

### Qué se guarda y dónde

| Dato | Para qué sirve | Dónde vive | Quién lo ve | Cuánto dura |
| --- | --- | --- | --- | --- |
| Nombre o apodo | Dirigirse a ti | Servidor | Las personas con vínculo aceptado | Mientras exista tu cuenta |
| Ciudad de residencia (y de origen, si la das) | Fondo y clima | Servidor, solo la ciudad | Solo tú | Mientras exista tu cuenta |
| Ciudad donde estás hoy | Cambiar el fondo al viajar | Se calcula en el dispositivo; al servidor solo llega el código de la ciudad | Solo tú | Sin historial |
| Foto | Dibujar tu árbol | Según la decisión pendiente (ver abajo); la original no se conserva | Solo tú | La original, nunca |
| Semilla y oficios | Personalizar tu ciudad y las sugerencias | Servidor | Según lo que elijas: nadie, tu Moai o tu red | Hasta que lo cambies |
| Lo que te gustaría recibir | Sugerencias | Dispositivo; al servidor solo categorías amplias, si lo permites | Según lo que elijas | Hasta que lo cambies |
| Estado del día (la lámpara) | Mostrar tu luz y afinar las cartas de Brisa | Dispositivo | Solo tú, salvo que decidas compartirlo con tu Moai | Sin historial en el servidor |
| Modo Invierno | Activar el cuidado de tu Moai | Dispositivo | Solo tú, salvo que decidas avisar a tu Moai | Mientras esté activo |
| Red declarada (personas que aún no usan MOAI) | Preparar tus Esporas | Solo dispositivo, cifrada | Solo tú | Hasta enviar la Espora o borrarla |
| Vínculos aceptados y su fuerza | Dibujar tu calle y el grosor del hilo | Neo4j | Las dos personas; la fuerza nunca se muestra como número | Mientras exista el vínculo |
| Intención de la Espora | Acompañar la invitación | Servidor, cifrada | Solo quien la recibe | 30 días si no se acepta; luego se borra |
| Luces de ancestros | Memoria familiar | Dispositivo | Solo tú, mientras no haya consentimiento de la familia | Hasta que las borres |
| Perfiles Brote (menores) | Ser parte de la familia | Servidor, con datos mínimos | Solo la familia, con tutor | Hasta la mayoría de edad o el retiro del tutor |
| Etiquetas del Radar | Detectar cercanía | Buzón con caducidad | Nadie puede leerlas | Minutos u horas |
| Saludos y mensajes | Comunicación entre personas | Cifrados de extremo a extremo | Solo los dos | Hasta que se borren |
| Registros técnicos | Seguridad y errores | Servidor, sin ubicación ni contenido | Equipo técnico, con acceso limitado | A definir (propuesta: 30 días) |
| Cumpleaños | Los anillos del árbol | Servidor, día y mes; el año es opcional y solo sirve para contar anillos | Solo tú | Mientras exista tu cuenta |

### Lo que no se recoge

- Ubicación exacta ni historial de ubicaciones.
- Tu libreta de contactos.
- Diagnósticos de salud, ni inferencias sobre tu salud o tu personalidad.
- El contenido de los mensajes (van cifrados).
- Identificadores publicitarios.

## Consentimiento

### Cómo se pide

1. **Al empezar:** solo lo mínimo (nombre y ciudad), con un aviso corto de cómo se cuida.
2. **En el momento de usar cada cosa sensible:** foto, ubicación aproximada, Radar, compartir tu estado con tu Moai. Un permiso por pantalla, con una frase clara sobre para qué sirve.
3. **Retirable en un toque** desde «Ajustes de la ciudad», con un interruptor por permiso y su texto a la vista.
4. **Prueba del consentimiento:** se guarda que aceptaste (fecha y versión del texto), no el contenido de lo que compartiste.
5. **Accesible:** lectura en voz alta y letra grande en todos los avisos.
6. **Sin ampliar en silencio:** cuando cambie un texto o un uso, se vuelve a pedir.

### Textos de muestra, en la voz de Brisa

Cada frase solo se usa si la arquitectura la cumple; si una decisión cambia, el texto cambia.

- Foto: «Si quieres, regálanos una foto para dibujar tu árbol. Se convierte en dibujo en tu teléfono y la foto no se guarda.» (solo si la foto se estiliza en el dispositivo)
- Ubicación: «Usamos tu ubicación aproximada solo para saber en qué ciudad estás, y no guardamos dónde estuviste.»
- Estado del día: «Esto lo ves solo tú.»
- Red declarada: «Estos nombres se quedan guardados en tu teléfono.»
- Radar: «Solo le avisaremos que estás cerca si esa persona también lo permite. Puedes pausarlo cuando quieras.»
- Retiro: «Puedes cambiar de opinión cuando quieras.»

## Casos delicados

### Menores (Perfiles Brote)

- Los crea un tutor, con su consentimiento.
- Sin ubicación, sin Radar, sin mensajes directos, sin sugerencias.
- Datos mínimos: apodo y vínculo con la familia.
- Visibles solo para la familia.
- Por definir con el abogado: a qué edad el menor pasa a tener cuenta propia y cómo se obtiene su consentimiento.

### Personas fallecidas (Nodos Ancestrales)

- Por defecto son una luz privada en tu árbol, solo en tu dispositivo.
- Para mostrarlas a otros familiares se pide el consentimiento de familiares directos.
- Un familiar directo puede pedir que se retire el homenaje.
- No se guardan datos sensibles de la persona fallecida.

### Estado emocional (estado del día y Modo Invierno)

- Se declara, nunca se infiere.
- No es un diagnóstico y no se presenta como tal.
- No sale del dispositivo con tu identidad, ni hacia modelos de IA externos.
- Solo se comparte con tu Moai si tú lo decides, cada vez o con un permiso que vence.
- Si aparecen señales de riesgo, Brisa no actúa como terapeuta: te acerca a una persona de tu Moai o a una línea de ayuda humana verificada para tu país.

### Personas que aún no están en MOAI (red declarada)

- Son datos de terceros que no han dado su consentimiento, por eso solo viven cifrados en tu teléfono.
- Solo nombre y relación; nunca teléfonos ni correos.
- La Espora se envía por el medio que tú elijas (por ejemplo, WhatsApp), sin que MOAI vea tu libreta.

### La voz de Brisa y la inteligencia artificial

- Brisa se presenta como la voz de la ciudad, y en Ajustes se explica con claridad que es una inteligencia artificial.
- Las cartas diarias se personalizan con contexto grueso (hora, clima, oficio), no con tu estado emocional ligado a tu identidad.
- Hay que confirmar por contrato que el proveedor de IA no conserva ni entrena con lo que recibe.
- Las sugerencias del algoritmo vienen apagadas por defecto, siempre con el motivo a la vista, y se pueden rechazar para que no se repitan.

### Encuentros físicos

- Los primeros encuentros ocurren solo en Puntos Neutros comunitarios.
- Nadie ve la dirección de otra persona ni dónde está en detalle.

## Derechos y borrado

- Ver, corregir, descargar y borrar tus datos desde Ajustes.
- Borrar tu cuenta elimina tu perfil, tus etiquetas y las intenciones de Espora pendientes; los vínculos se retiran de tu lado. Decisión pendiente: qué ve la otra persona (propuesta: su ventana queda en reposo, sin ningún mensaje que la señale a ti).
- Las luces de ancestros y la red declarada, al vivir en tu teléfono, se borran con la app.
- Plazo de eliminación definitiva en los servidores: a definir (propuesta: 30 días).
- Las solicitudes sobre tus datos se responden en los plazos legales.

## Seguridad

- Cifrado en tránsito y en reposo; cifrado de extremo a extremo para mensajes, intenciones y datos íntimos.
- Claves en el almacén seguro del teléfono; librerías de cifrado auditadas, sin criptografía propia.
- Acceso interno mínimo, con registro de accesos.
- Revisión de seguridad independiente antes de lanzar.
- Plan de respuesta a incidentes y de aviso a las personas afectadas y a la autoridad competente.

## Marco legal para validar

Según entiendo, y sujeto a revisión de un abogado:

- **Colombia:** la Ley 1581 de 2012 y su reglamentación (habeas data) exigen autorización previa, expresa e informada, y tratan como sensibles los datos de salud y los biométricos, como el rostro. Para los datos sensibles la autorización debe ser explícita y no obligatoria. Los datos de niños, niñas y adolescentes tienen protección reforzada. La autoridad es la Superintendencia de Industria y Comercio, y puede ser necesario registrar las bases de datos.
- **Otros países:** al abrir ciudades en España, México u otros países aplican sus propias leyes (por ejemplo, el RGPD en Europa). Conviene una revisión por país.

### Preguntas para el abogado

1. ¿Qué datos de MOAI cuentan como sensibles y qué autorización exige cada uno?
2. ¿Cómo se obtiene el consentimiento de un tutor para un Perfil Brote, y a qué edad pasa a tener cuenta propia?
3. ¿Qué consentimiento hace falta para los homenajes a personas fallecidas, y de qué familiares?
4. ¿La ubicación aproximada y las etiquetas del Radar son datos personales en este diseño?
5. ¿Qué obligaciones hay de registro de bases de datos y de política de tratamiento?
6. ¿Qué cláusulas debe tener el contrato con el proveedor de IA?
7. ¿Qué pasa con las transferencias internacionales si los servidores están fuera de Colombia?
8. ¿Hay obligaciones adicionales por trabajar con adultos mayores o con datos emocionales?
9. ¿Qué texto de consentimiento y de política cumple la exigencia de lenguaje sencillo?
10. ¿Cuál es el protocolo legal ante un incidente de seguridad?

## Decisiones por tomar

- ¿La foto se estiliza en el dispositivo (la foto nunca sale) o en la nube (más fácil, pero cambia la promesa de privacidad)?
- Edad mínima para tener cuenta propia.
- Visibilidad por defecto de oficios y deseos: ¿nadie, tu Moai o tu red?
- Qué ve la otra persona cuando alguien borra su cuenta.
- Plazo de retención de registros técnicos y de eliminación de cuentas.
- Proveedor de IA y región donde se alojan los datos.
- Duración por defecto del permiso del Radar (propuesta: 7 días) y qué revela un aviso.
