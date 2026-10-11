# MOAI · Modo Cuidado en emergencias

Borrador 1 · Parte del conjunto de documentos de MOAI (Radar, Privacidad, One Health, Guion)

Cuando una tormenta, un apagón o una inundación golpea una ciudad, MOAI puede ayudar a que las personas se cuiden entre sí. No es un servicio de emergencias: es una red de cuidado entre personas que ya se conocen, antes, durante y después del evento.

## Caso de partida

Planteado por Mateo: una lluvia muy fuerte en Medellín tumbó cables principales y dejó varias zonas sin luz. Estos episodios se repiten en la ciudad, así que el diseño debe servir para el próximo.

## Alcance y límites

- **Qué es:** cuidado entre personas vinculadas, con gestos pequeños y consentimiento previo.
- **Qué no es:** un servicio de emergencias, un sistema de rescate, un mapa de necesidades ni una fuente oficial de información.
- **Urgencias:** se remiten siempre a los canales oficiales (en Medellín, la línea 123). Los números se verifican por ciudad y por país.
- **Información de servicios:** se remite a la empresa de servicios y a la entidad de gestión del riesgo de cada ciudad.
- **Brisa no afirma lo que no sabe.** Solo habla de un evento cuando hay una fuente oficial.

## Principios

- Lo sensible se decide antes de la crisis, no durante.
- Sin vigilancia permanente.
- Sin mapa de personas solas o vulnerables.
- Sin cifras públicas de «cuántas personas están a salvo».
- Sin marca en la crisis: nada de promociones ni metas de uso.
- Calma: sin alarmismo, un mensaje y un gesto.
- Accesible: letra grande, voz, y funcionamiento con poca batería y poca conexión.

## Antes · Preparación

- **Tarjeta «Mi plan por si falla la luz».** Linterna, batería externa, agua, a quién avisar, a dónde ir si hace falta y recordar tener a mano lo que no puede faltar. Se guarda en el dispositivo y MOAI no recoge datos de salud.
- **Vigilia de cuidado** (ver más abajo): se activa antes, por decisión propia.
- **Aviso previo.** Con una alerta oficial de lluvias fuertes, Brisa puede escribir: «Se esperan lluvias fuertes. ¿Ya tienes tu plan?». Por confirmar: si el sistema de alerta temprana del Valle de Aburrá ofrece datos que se puedan usar.

## Durante

### Cómo se activa un evento de zona

- Solo con una fuente oficial, o con un criterio de varias fuentes. Nunca por el reporte de una sola persona.
- Lo declara una persona del equipo, con un criterio escrito (por definir).
- Se define por ciudad o zona gruesa, no por barrio.

### Qué cambia en la aplicación

1. **Carta distinta de Brisa.** Por ejemplo: «Hoy llovió muy fuerte en Medellín. ¿Cómo estás?».
2. **Confirmación en tres toques:** «Estoy bien», «Necesito que alguien me escriba», «Prefiero no decir». Solo la ve el Moai de la persona, y solo si ella lo permite. No revela ubicación.
3. **Las ventanas de tu calle.** Una luz de vela significa que esa persona confirmó que está bien. Una ventana tenue significa solo «sin noticias»: nunca rojo ni alarma, porque no tener señal no es estar en peligro.
4. **La ciudad en penumbra** en la zona afectada. Es visual y usa solo el evento de zona, no datos personales.
5. **Modo Ahorro** (ver abajo).
6. **Puntos Neutros con luz.** Una lista curada por anfitriones humanos de sitios donde cargar el celular o esperar acompañada, con la hora de la última verificación. Nadie ve la dirección de la casa de nadie.

### Vigilia de cuidado

- **Quién la activa:** la persona, antes de que haya un evento y con vencimiento (propuesta: 30 días, renovable).
- **Qué la dispara:** un evento de zona y que la persona no haya confirmado en cierto tiempo (propuesta: 3 horas; a calibrar).
- **Qué ocurre:** Brisa avisa con suavidad a una o dos personas de su Moai, elegidas por ella: «No hemos tenido noticias de \[nombre\] después de la lluvia. Puede que no tenga señal. ¿Quieres escribirle?».
- **Qué no ocurre:** no se avisa a desconocidos, ni a anfitriones, ni a autoridades sin permiso; no hay aviso si la persona confirmó; no hay seguimiento una vez termina el evento.
- **Anfitriones humanos:** solo participan si la persona los autorizó al activar la Vigilia («que alguien de mi comunidad me llame»).

### Sin internet

- El aviso por SMS de «estoy bien» sería lo único que se adelanta de la fase 2. No hace falta Bluetooth.
- Requiere un acuerdo con operadores y un número corto; costos y consentimiento por verificar.
- La aplicación muestra lo último que sabe, marcado con «actualizado hace…».

### Modo Ahorro

- Se ofrece, sin imponerse, cuando hay un evento de zona o la batería está baja.
- Fondo plano y oscuro, sin vidrio esmerilado, sin movimiento y sin carga de imágenes; letra más grande y un solo gesto por pantalla.
- El Radar se apaga.
- Meta: que una confirmación se haga en dos toques y con muy pocos datos.

## Después

- **Carta de reconstrucción de Brisa:** «La ciudad se está levantando. Gracias por cuidarte y cuidar».
- **Encuentros de cuidado** en Puntos Neutros: limpiar una quebrada o recoger árboles caídos (pilar entorno), atender a animales asustados (pilar animales) y acompañar a quien perdió algo (pilar personas).
- **Cierre del evento:** la Vigilia termina y las confirmaciones se borran en 24 a 48 horas (propuesta).
- **Sin balance público** de cuántas personas participaron.

## Qué cambia en cada documento

| Documento | Cambio |
| --- | --- |
| Arquitectura del Radar | Añadir el Modo Ahorro, con el Radar apagado; adelantar solo el SMS de «estoy bien» desde la fase 2 |
| Privacidad y consentimiento | Nueva fila: confirmaciones en emergencias (servidor, caducan en 24 a 48 horas, solo las ve el Moai elegido); nuevo permiso: Vigilia de cuidado, con vencimiento; nuevo caso delicado: emergencias; nueva pregunta para el abogado |
| Guion y voz de Brisa | Cartas de evento y de reconstrucción; tono más sobrio |
| Tarjetas | Tarjeta de confirmación de cuidado (tres toques), tarjeta «Mi plan por si falla la luz», estados de ventana: vela y tenue |
| Cypher | Nodo de evento y confirmaciones que caducan (ver abajo) |

## Cypher (borrador)

No se ejecutó contra una base de datos real. La propiedad zonaGruesa de Persona ya está prevista en el esquema de anillos.

```
CREATE CONSTRAINT evento_id IF NOT EXISTS FOR (e:Evento) REQUIRE e.id IS UNIQUE;

// Evento de zona, creado por el equipo a partir de fuentes oficiales
CREATE (e:Evento {
  id: randomUUID(), tipo: $tipo, zonaGruesa: $zona, fuente: $fuente,
  desde: datetime(), estado: 'ACTIVO', expiraEn: datetime() + duration('P2D')
})
RETURN e.id AS eventoId;

// Confirmación de cuidado (caduca con el evento)
// $estado: 'BIEN' | 'NECESITO_QUE_ME_ESCRIBAN' | 'PREFIERO_NO_DECIR'
MATCH (p:Persona {id: $yo}), (e:Evento {id: $eventoId, estado: 'ACTIVO'})
MERGE (p)-[c:CONFIRMA]->(e)
SET c.estado = $estado, c.cuando = datetime()
RETURN c.estado AS estado;

// Activar la Vigilia: a quién se avisa y por cuánto tiempo
MATCH (yo:Persona {id: $yo}), (c:Persona {id: $contacto})
WHERE EXISTS { (yo)-[:RAIZ|TRONCO]-(c) }
MERGE (yo)-[v:VIGILA_CON]->(c)
SET v.hasta = datetime() + duration('P30D'), v.horasSinNoticias = 3
RETURN v.hasta AS vigenteHasta;

// A quién avisar: personas con Vigilia vigente, en la zona del evento, sin confirmar
MATCH (e:Evento {id: $eventoId, estado: 'ACTIVO'})
MATCH (p:Persona)-[v:VIGILA_CON]->(c:Persona)
WHERE p.zonaGruesa = e.zonaGruesa
  AND v.hasta > datetime()
  AND datetime() > e.desde + duration({hours: v.horasSinNoticias})
  AND NOT EXISTS { (p)-[:CONFIRMA]->(e) }
RETURN p.id AS personaId, collect(c.id) AS avisarA;

// Limpieza: al vencer el evento se borran él y sus confirmaciones
MATCH (e:Evento)
WHERE e.expiraEn < datetime()
DETACH DELETE e;
```

## Preguntas para el abogado y las entidades locales

1. ¿Qué responsabilidad implica avisar a un tercero cuando alguien no confirma?
2. ¿Cómo se clasifican las confirmaciones, sobre todo «necesito que alguien me escriba»? ¿Son datos sensibles?
3. ¿Se puede coordinar con la gestión del riesgo de la ciudad y con la empresa de servicios para obtener datos oficiales?
4. SMS: operadores, costos y consentimiento.
5. ¿Cómo se redacta todo para que nadie lo entienda como un servicio de emergencias?

## Decisiones por tomar

- Quién declara un evento de zona y con qué criterio.
- Tiempo sin noticias para la Vigilia (propuesta: 3 horas) y a cuántas personas se avisa.
- Si el SMS de «estoy bien» entra en la fase 1.
- Si los anfitriones humanos hacen llamadas de seguimiento.
- Si las zonas de evento son la ciudad o la comuna.
