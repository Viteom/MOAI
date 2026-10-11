// =====================================================================
// MOAI: Modo Cuidado en emergencias + Algoritmo de cuidado (borrador)
// Neo4j 5.x. Se AÑADE a los esquemas de anillos (v0.1) y One Health (v0.2).
// BORRADOR SIN PROBAR contra una base de datos real.
// Origen: documentos «Modo Cuidado en emergencias» y «Algoritmo de cuidado».
// =====================================================================

// ---------------------------------------------------------------------
// 1. EMERGENCIAS
// ---------------------------------------------------------------------
CREATE CONSTRAINT evento_id IF NOT EXISTS FOR (e:Evento) REQUIRE e.id IS UNIQUE;

// Evento de zona, creado por el equipo a partir de fuentes oficiales
// Parámetros: $tipo, $zona, $fuente
CREATE (e:Evento {
  id: randomUUID(), tipo: $tipo, zonaGruesa: $zona, fuente: $fuente,
  desde: datetime(), estado: 'ACTIVO', expiraEn: datetime() + duration('P2D')
})
RETURN e.id AS eventoId;

// Confirmación de cuidado (caduca con el evento)
// $estado: 'BIEN' | 'NECESITO_QUE_ME_ESCRIBAN' | 'PREFIERO_NO_DECIR'
// Parámetros: $yo, $eventoId, $estado
MATCH (p:Persona {id: $yo}), (e:Evento {id: $eventoId, estado: 'ACTIVO'})
MERGE (p)-[c:CONFIRMA]->(e)
SET c.estado = $estado, c.cuando = datetime()
RETURN c.estado AS estado;

// Activar la Vigilia: a quién se avisa y por cuánto tiempo
// Parámetros: $yo, $contacto
MATCH (yo:Persona {id: $yo}), (c:Persona {id: $contacto})
WHERE EXISTS { (yo)-[:RAIZ|TRONCO]-(c) }
MERGE (yo)-[v:VIGILA_CON]->(c)
SET v.hasta = datetime() + duration('P30D'), v.horasSinNoticias = 3
RETURN v.hasta AS vigenteHasta;

// A quién avisar: personas con Vigilia vigente, en la zona del evento, sin confirmar
// Parámetros: $eventoId
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


// ---------------------------------------------------------------------
// 2. ALGORITMO DE CUIDADO (nivel Moai)
// ---------------------------------------------------------------------
// Ritmo del Moai en días: 7, 14 o 30. Se elige al crearlo y se puede cambiar.
// Parámetros: $moaiId, $ritmoDias
MATCH (m:Moai {id: $moaiId})
SET m.ritmoDias = $ritmoDias
RETURN m.ritmoDias AS ritmoDias;

// Cohesión del Moai: fracción de parejas con interacción dentro de su ritmo
// Parámetros: $moaiId
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
// Parámetros: $personaId
MATCH (p:Persona {id: $personaId})
RETURN coalesce(p.ultimoMensajeMoai, datetime('1970-01-01T00:00:00Z'))
         < datetime() - duration('P7D') AS puede;

// Registrar que se envió un mensaje de Moai a esta persona
// Parámetros: $personaId
MATCH (p:Persona {id: $personaId})
SET p.ultimoMensajeMoai = datetime();

// Anfitrión rotativo: quien lleva más tiempo sin proponer en este Moai
// y no es anfitrión vigente en otro Moai
// Parámetros: $moaiId
MATCH (m:Moai {id: $moaiId})<-[i:INTEGRA]-(p:Persona)
WHERE NOT EXISTS {
  MATCH (p)-[i2:INTEGRA]->(otro:Moai)
  WHERE otro <> m AND i2.anfitrionHasta > datetime()
}
RETURN p.id AS personaId
ORDER BY coalesce(i.ultimaVezAnfitrion, datetime('1970-01-01T00:00:00Z')) ASC
LIMIT 1;
