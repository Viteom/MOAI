# MOAI · Algoritmo de cuidado

Borrador 1 · Parte del conjunto de documentos de MOAI (Radar, Privacidad, One Health, Emergencias, Guion)

El algoritmo de cuidado ayuda a que los vínculos no se apaguen en silencio, sin vigilar a nadie. Mide el tejido de relaciones, no el ánimo de las personas. Su éxito no se mide por cuánto se abre la aplicación, sino por cuántas personas se reconectan con otras.

## Principios

- **Regla del espejo.** Si la persona se sentiría observada al enterarse de cómo lo sabemos, no lo hacemos.
- **Medir vínculos, no estados de ánimo.** No se infiere cómo se siente alguien.
- **Equivocarse debe ser barato.** El peor caso de un falso positivo es un mensaje amable que se puede ignorar. Así no hace falta saber más.
- **Nivel Moai por defecto; nivel persona solo con permiso.**
- **Sin optimizar el uso.** Nada de notificaciones insistentes para que vuelvan a la aplicación.
- **Transparencia.** Cada mensaje trae un «¿por qué veo esto?» y se puede apagar.
- **Humildad.** Brisa solo sabe lo que pasa dentro de MOAI, y lo dice.

## Qué mide y qué no

| Señal | ¿Se usa? | Dónde se calcula |
| --- | --- | --- |
| Días desde la última interacción entre integrantes de un Moai | Sí | Servidor (ya está en el grafo) |
| Fracción de parejas activas del Moai (cohesión) | Sí | Servidor |
| Hilos que pasan a dormidos | Sí | Servidor |
| Apoyo concentrado en una sola persona | Sí, solo para sugerirle ampliar su red a esa persona | Servidor |
| Ritmo propio de uso frente a su costumbre | Solo con permiso (nivel persona) | Dispositivo |
| Estado del día | No entra al algoritmo, salvo que la persona decida compartirlo | Dispositivo |
| Contenido de mensajes | Nunca | No aplica |
| Ubicación | Nunca | No aplica |
| Actividad en otras redes sociales | Nunca | No aplica |
| Sensores del teléfono | Nunca | No aplica |
| Estado de ánimo inferido | Nunca | No aplica |

## Moais múltiples

Una persona puede pertenecer a varios Moais (la familia, los vecinos, las amistades), y los grupos pueden compartir integrantes. No existe un único grupo donde todos converjan. Es un reto de complejidad que se acepta desde el diseño.

- **Ritmo propio.** Cada Moai elige al crearse cada cuánto quiere verse (semanal, quincenal o mensual) y puede cambiarlo.
- **Tope global por persona.** Como máximo un mensaje de Moai por semana, sumando todos sus Moais, para que nadie reciba cuatro recordatorios a la vez.
- **Anfitrión rotativo y justo.** Nadie es anfitrión sugerido en más de un Moai a la vez, ni dos veces seguidas en el mismo.
- **Moai principal.** Cada persona puede marcar los Moais que Brisa acompaña de cerca; los demás quedan en modo silencioso. También puede pausar uno solo o pausarlos todos.
- **Cohesión por Moai.** Se mide como la fracción de parejas del grupo con interacción reciente, y no con el último contacto del grupo, para que dos personas que hablan mucho entre sí no oculten a alguien que quedó al margen. Los mensajes nunca nombran a nadie.
- **Una pareja en varios Moais.** Sus interacciones cuentan para todos los Moais donde coinciden. Por revisar: también se podría contar solo en el contexto donde ocurrieron.
- **Algoritmo de comunidades.** Louvain asigna cada persona a una sola comunidad. Con grupos que se solapan hace falta otro enfoque, o seguir con Moais definidos por las personas y usar el algoritmo solo para sugerir. Por definir.
- **Empezar simple.** Cada Moai se evalúa por separado, con el tope global, y se afina en el piloto.

## Nivel Moai (por defecto)

- **Cuándo interviene:** cuando la cohesión del Moai está por debajo de un umbral (propuesta: menos de la mitad de las parejas activas) y el tiempo desde el último encuentro supera una vez y media el ritmo elegido.
- **Qué hace:** una carta de Brisa para todo el Moai, un anfitrión rotativo que propone el plan y gestos de un toque (un abrazo corto, un Tiempo Festivo con un Punto Neutro cercano y el clima del día).
- **Ejemplo:** «Hace un tiempo que tu Moai no se reúne. ¿Y si esta semana alguien propone un café sin agenda? Esta vez le toca proponer a Luis.»
- **Humildad incluida:** «No tengo noticias de un plan reciente aquí en MOAI. Si ya se vieron, ignora este mensaje.»
- **Límites:** como máximo un mensaje cada dos o tres semanas por Moai, más el tope global por persona. Si lo ignoran dos veces, Brisa se calla 60 días y pregunta una sola vez si quieren que los acompañe de otra forma.
- **Nunca** se nombra a quien menos participa.

### Cómo se cuenta lo que pasa fuera de MOAI

Brisa no mira otras redes: se lo cuentan los propios Moais.

1. **Botón «Ya nos vimos»**, de un toque, en el claro del Moai, con un «¿cómo estuvo?» opcional. Engruesa los hilos entre sus integrantes con la consulta «Registrar una interacción» del esquema de anillos.
2. **Después de cada Tiempo Festivo creado en MOAI**, al día siguiente: «nos vimos», «no se pudo» o «lo dejamos para después». Si no se pudo, Brisa propone otra fecha, sin juzgar.
3. **Pulso mensual opcional**, con una pregunta rotativa al grupo: «¿Cuándo fue la última vez que se vieron?», con opciones amplias.
4. **Pausas fáciles:** «Estamos de viaje» o «ya nos vemos seguido».

## Nivel persona (solo con permiso)

Para el silencio prolongado de alguien. Es voluntario y Brisa habla primero con la persona.

**Escalera de cuidado**, siempre del peldaño más suave al más fuerte, y cada peldaño exige permiso previo:

1. Brisa le habla a la persona: «Hace unos días no nos veíamos. No pasa nada.»
2. Le propone un gesto concreto: escribirle a alguien o ir a un Tiempo Festivo.
3. Solo si activó antes la Vigilia, avisa a una o dos personas de su Moai que ella eligió, diciendo que puede ser falta de señal.
4. Solo si lo autorizó, un anfitrión humano de su comunidad la llama.

- **Umbral:** el ritmo propio de la persona, calculado en el dispositivo (por ejemplo, un múltiplo de su intervalo habitual de uso, con un mínimo de días). Se calibra en el piloto.
- **Consentimiento:** separado, explícito, revocable y con vencimiento, con una explicación en lenguaje sencillo de qué señales se usan.
- **Qué no ocurre:** no se avisa a desconocidos, ni a autoridades, ni a anfitriones sin permiso; no hay aviso si la persona vuelve a conectarse; no hay seguimiento después.

## Etapas de construcción

1. **Reglas simples y transparentes**, sin aprendizaje automático.
2. **Línea base personal** en el dispositivo, solo para quien lo permita.
3. **Modelo de grafo** para predecir enlaces y sugerir conexiones, apagado por defecto y siempre con el motivo a la vista.
4. **Piloto pequeño** con preguntas breves y opcionales («¿cómo va tu compañía últimamente?»), porque no hay datos etiquetados que digan quién estaba solo. Sin una verdad de referencia no se puede evaluar nada.

**Cómo se evalúa el éxito:**

- Sí: reconexión (¿hubo una interacción poco después del mensaje?), cuántos silencios piden las personas, cuántos apagan los mensajes y las quejas.
- No: tiempo en la aplicación ni número de aperturas.
- Sesgos: una persona mayor que usa poco el teléfono no debe parecer «aislada» por defecto; por eso la línea base es propia.

## Lo que el algoritmo no hace

- No promete detectar caídas ni urgencias de salud: para eso existen dispositivos específicos, y MOAI lo dice.
- No diagnostica ni etiqueta a nadie.
- No avisa a desconocidos.
- No nombra a la persona que menos participa.
- No usa otras redes sociales, no compra datos y no lee mensajes.
- No usa el estado emocional de la persona.
- No optimiza el tiempo de uso.

## Cypher (borrador)

No se ejecutó contra una base de datos real. Las consultas usan los nodos Moai y Persona del esquema de anillos.

```
// Ritmo del Moai en días: 7, 14 o 30. Se elige al crearlo y se puede cambiar.
MATCH (m:Moai {id: $moaiId})
SET m.ritmoDias = $ritmoDias
RETURN m.ritmoDias AS ritmoDias;

// Cohesión del Moai: fracción de parejas con interacción dentro de su ritmo
MATCH (m:Moai {id: $moaiId})<-[:INTEGRA]-(a:Persona)
MATCH (m)<-[:INTEGRA]-(b:Persona)
WHERE a.id < b.id
OPTIONAL MATCH (a)-[r:RAIZ|TRONCO|RAMA]-(b)
WITH m, a, b, max(r.ultimaInteraccion) AS ultima
WITH m,
     count(*) AS parejas,
     sum(CASE WHEN ultima IS NOT NULL
               AND duration.inDays(ultima, datetime()).days <= m.ritmoDias
              THEN 1 ELSE 0 END) AS activas
RETURN m.id AS moaiId, parejas, activas, toFloat(activas) / parejas AS cohesion;

// ¿Puede esta persona recibir un mensaje de Moai esta semana? (tope global)
MATCH (p:Persona {id: $personaId})
RETURN coalesce(p.ultimoMensajeMoai, datetime('1970-01-01T00:00:00Z'))
         < datetime() - duration('P7D') AS puede;

// Registrar que se envió un mensaje de Moai a esta persona
MATCH (p:Persona {id: $personaId})
SET p.ultimoMensajeMoai = datetime();

// Anfitrión rotativo: quien lleva más tiempo sin proponer en este Moai
// y no es anfitrión vigente en otro Moai
MATCH (m:Moai {id: $moaiId})<-[i:INTEGRA]-(p:Persona)
WHERE NOT EXISTS {
  MATCH (p)-[i2:INTEGRA]->(otro:Moai)
  WHERE otro <> m AND i2.anfitrionHasta > datetime()
}
RETURN p.id AS personaId
ORDER BY coalesce(i.ultimaVezAnfitrion, datetime('1970-01-01T00:00:00Z')) ASC
LIMIT 1;
```

## Preguntas para el abogado

1. ¿Calcular silencios y ritmos se considera elaboración de perfiles o inferencia sobre datos sensibles?
2. ¿Cómo debe ser el consentimiento del nivel persona y su vencimiento?
3. ¿Qué responsabilidad implica avisar a un tercero por el silencio de alguien?
4. ¿Qué se debe explicar al usuario sobre cómo funciona el algoritmo, y con qué detalle?
5. ¿Hay límites para decisiones automatizadas en las jurisdicciones donde se abrirán ciudades?

## Decisiones por tomar

- Los umbrales: cohesión mínima, múltiplo del ritmo y los 60 días de silencio.
- El tope global semanal por persona.
- Si las interacciones de una pareja cuentan en todos sus Moais o solo en el contexto donde ocurrieron.
- Qué algoritmo propone Moais cuando los grupos se solapan.
- Las métricas de éxito del piloto.
- En qué fase se activa el nivel persona.
