// =====================================================================
// MOAI Ciudades del Cuidado: Anillos de Crecimiento + Polinización
// Neo4j 5.x (sin APOC). Versión 0.1, para revisión.
//
// PRINCIPIOS DE ESTE ESQUEMA
//  1. El grafo guarda SOLO vínculos aceptados por ambas partes.
//     Las redes "declaradas" (personas aún no registradas) viven cifradas
//     en el dispositivo y nunca suben al servidor.
//  2. NO se guarda ubicación ni presencia. El Radar Micelial se resuelve
//     en el dispositivo con identificadores efímeros.
//  3. NO se guarda el Modo Invierno ni datos de salud en el grafo.
//  4. El peso se marchita solo en lo visual: un vínculo nunca se borra,
//     pasa a DORMIDO. RAIZ no se marchita.
//  5. La intención emocional se guarda como texto cifrado (opaco).
// =====================================================================


// ---------------------------------------------------------------------
// 1. RESTRICCIONES E ÍNDICES
// ---------------------------------------------------------------------
CREATE CONSTRAINT persona_id  IF NOT EXISTS FOR (p:Persona)     REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT ancestro_id IF NOT EXISTS FOR (a:Ancestro)    REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT moai_id     IF NOT EXISTS FOR (m:Moai)        REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT punto_id    IF NOT EXISTS FOR (n:PuntoNeutro) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT espora_id   IF NOT EXISTS FOR (e:Espora)      REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT espora_tok  IF NOT EXISTS FOR (e:Espora)      REQUIRE e.token IS UNIQUE;

CREATE INDEX tronco_estado IF NOT EXISTS FOR ()-[r:TRONCO]-() ON (r.estado);
CREATE INDEX rama_estado   IF NOT EXISTS FOR ()-[r:RAMA]-()   ON (r.estado);


// ---------------------------------------------------------------------
// 2. NODOS (referencia de propiedades)
// ---------------------------------------------------------------------
// (:Persona  {id, alias, creadaEn, verificada, zonaGruesa})
//      zonaGruesa = barrio o ciudad (nunca coordenadas).
// (:Persona:Brote {tutorId})   hijos o familiares jóvenes. Exige tutor.
// (:Ancestro {id, nombreConmemorativo, registradoPor, consentidoPorFamilia})
// (:Moai {id, nombre, creadoPor, creadoEn})   círculo íntimo elegido, 3 a 5
// (:PuntoNeutro {id, nombre, tipo, zonaGruesa})   parques, bibliotecas
// (:Espora {id, token, intencionCifrada, anilloPropuesto, creadaEn,
//           expiraEn, estado})   estado: ENVIADA | ACEPTADA | EXPIRADA
//
// RELACIONES DE ANILLO: :RAIZ  :TRONCO  :RAMA
// Se guardan en un solo sentido, pero se consultan SIN dirección.
// Propiedades comunes:
//   id, estado (ACTIVO | DORMIDO), origen (POLINIZACION | ACEPTADO | MOAI),
//   creadoEn, aceptadoEn, esporaId,
//   confianzaBase   peso (0 a 1) en el momento de la última interacción
//   piso            valor mínimo al que se marchita
//   vidaMediaDias   días en que el exceso sobre el piso se reduce a la mitad
//                   (null en RAIZ: no se marchita)
//   ultimaInteraccion
// Valores por defecto: RAIZ (sin marchitar), TRONCO piso 0.10 / vida 45,
//                      RAMA piso 0.05 / vida 21.
// Otras: (:Persona)-[:LANZO]->(:Espora), (:Persona)-[:INTEGRA]->(:Moai),
//        (:Moai)-[:SE_REUNE_EN]->(:PuntoNeutro)


// ---------------------------------------------------------------------
// 3. POLINIZACIÓN: lanzar una Espora de Conexión
// ---------------------------------------------------------------------
// Parámetros: $invitadorId, $token, $intencionCifrada, $anillo
MATCH (a:Persona {id: $invitadorId})
CREATE (e:Espora {
  id: randomUUID(),
  token: $token,
  intencionCifrada: $intencionCifrada,
  anilloPropuesto: $anillo,
  creadaEn: datetime(),
  expiraEn: datetime() + duration('P30D'),
  estado: 'ENVIADA'
})
CREATE (a)-[:LANZO]->(e)
RETURN e.id AS esporaId;


// ---------------------------------------------------------------------
// 4. POLINIZACIÓN: la persona invitada se registra con la Espora
// ---------------------------------------------------------------------
// Siempre nace como RAMA con confianza modesta (0.25), no heredada del
// invitador. Subir a TRONCO exige confirmación de ambas personas (sección 5).
// Parámetros: $token, $nuevaPersonaId
MATCH (e:Espora {token: $token, estado: 'ENVIADA'})<-[:LANZO]-(a:Persona)
WHERE e.expiraEn > datetime()
MATCH (b:Persona {id: $nuevaPersonaId})
MERGE (a)-[r:RAMA]->(b)
  ON CREATE SET
    r.id = randomUUID(),
    r.estado = 'ACTIVO',
    r.origen = 'POLINIZACION',
    r.creadoEn = datetime(),
    r.aceptadoEn = datetime(),
    r.esporaId = e.id,
    r.confianzaBase = 0.25,
    r.piso = 0.05,
    r.vidaMediaDias = 21,
    r.ultimaInteraccion = datetime()
SET e.estado = 'ACEPTADA', e.aceptadaEn = datetime()
RETURN a.alias AS invitador, b.alias AS invitada, r.confianzaBase AS confianza;


// ---------------------------------------------------------------------
// 5. SUBIR DE ANILLO: RAMA a TRONCO (ambas personas confirmaron en la app)
// ---------------------------------------------------------------------
// Parámetros: $a, $b
MATCH (:Persona {id: $a})-[old:RAMA]-(:Persona {id: $b})
WITH old, startNode(old) AS s, endNode(old) AS t
CREATE (s)-[n:TRONCO]->(t)
SET n = properties(old)
SET n.confianzaBase = CASE WHEN old.confianzaBase < 0.40 THEN 0.40 ELSE old.confianzaBase END,
    n.piso = 0.10,
    n.vidaMediaDias = 45,
    n.ascendidoEn = datetime(),
    n.ultimaInteraccion = datetime(),
    n.estado = 'ACTIVO'
DELETE old
RETURN n.id AS vinculoId;


// ---------------------------------------------------------------------
// 6. REGISTRAR UNA INTERACCIÓN (engrosa el vínculo)
// ---------------------------------------------------------------------
// Solo se guarda que ocurrió, nunca su contenido.
// Parámetros: $a, $b, $paso (sugerido 0.05 a 0.10; es el ritmo de engrosado)
MATCH (:Persona {id: $a})-[r:RAIZ|TRONCO|RAMA]-(:Persona {id: $b})
WHERE r.estado IN ['ACTIVO', 'DORMIDO']
WITH r,
     CASE WHEN r.vidaMediaDias IS NULL THEN 0
          ELSE duration.inDays(r.ultimaInteraccion, datetime()).days END AS dias
WITH r,
     CASE WHEN r.vidaMediaDias IS NULL THEN r.confianzaBase
          ELSE r.piso + (r.confianzaBase - r.piso) * exp(-0.6931 * dias / r.vidaMediaDias)
     END AS actual
SET r.confianzaBase = CASE WHEN actual + $paso > 1.0 THEN 1.0 ELSE actual + $paso END,
    r.ultimaInteraccion = datetime(),
    r.estado = 'ACTIVO'
RETURN r.confianzaBase AS nuevaConfianza;


// ---------------------------------------------------------------------
// 7. LECTURA PARA LA INTERFAZ (el marchitar se calcula al leer)
// ---------------------------------------------------------------------
// Idempotente: no hace falta un job que modifique datos. El resultado
// alimenta el grosor y el color del hilo; NO se muestra como número.
// Parámetros: $yo
MATCH (yo:Persona {id: $yo})-[r:RAIZ|TRONCO|RAMA]-(otro)
WITH type(r) AS anillo, otro, r,
     CASE WHEN r.vidaMediaDias IS NULL THEN 0
          ELSE duration.inDays(r.ultimaInteraccion, datetime()).days END AS dias
WITH anillo, otro, r,
     CASE WHEN r.vidaMediaDias IS NULL THEN r.confianzaBase
          ELSE r.piso + (r.confianzaBase - r.piso) * exp(-0.6931 * dias / r.vidaMediaDias)
     END AS grosor
RETURN anillo,
       coalesce(otro.alias, otro.nombreConmemorativo) AS nombre,
       grosor,
       CASE WHEN r.vidaMediaDias IS NOT NULL AND grosor < r.piso + 0.05
            THEN 'DORMIDO' ELSE 'ACTIVO' END AS estado
ORDER BY CASE anillo WHEN 'RAIZ' THEN 0 WHEN 'TRONCO' THEN 1 ELSE 2 END, grosor DESC;


// ---------------------------------------------------------------------
// 8. SUGERENCIAS TRANSPARENTES (cierre triádico, doble aceptación)
// ---------------------------------------------------------------------
// Solo usa vínculos ya aceptados. La persona ve por qué se le sugiere
// ("tienes 2 personas en común") y puede apagar las sugerencias.
// Parámetros: $yo
MATCH (yo:Persona {id: $yo})-[:TRONCO|RAMA {estado: 'ACTIVO'}]-(puente:Persona)
      -[:TRONCO|RAMA {estado: 'ACTIVO'}]-(candidata:Persona)
WHERE candidata <> yo
  AND NOT (yo)-[:RAIZ|TRONCO|RAMA]-(candidata)
  AND NOT (yo)-[:DECLINO]->(candidata)
WITH candidata, count(DISTINCT puente) AS enComun
WHERE enComun >= 2
RETURN candidata.id AS candidataId, candidata.alias AS alias, enComun
ORDER BY enComun DESC
LIMIT 5;

// Si la persona rechaza una sugerencia, se recuerda para no insistir:
// MATCH (yo:Persona {id: $yo}), (c:Persona {id: $candidataId})
// MERGE (yo)-[:DECLINO]->(c);


// ---------------------------------------------------------------------
// 9. MOAI: círculo elegido por la persona (3 a 5 integrantes)
// ---------------------------------------------------------------------
// El límite de 5 se valida en la aplicación antes de crear el vínculo.
// Parámetros: $creadorId, $nombre
MATCH (c:Persona {id: $creadorId})
CREATE (m:Moai {id: randomUUID(), nombre: $nombre, creadoPor: c.id, creadoEn: datetime()})
CREATE (c)-[:INTEGRA {desde: datetime()}]->(m)
RETURN m.id AS moaiId;


// ---------------------------------------------------------------------
// 10. LOUVAIN (Graph Data Science): solo PROPONE, nunca asigna
// ---------------------------------------------------------------------
// Corre sobre vínculos TRONCO/RAMA activos y ya aceptados. Sus resultados
// alimentan sugerencias ("este grupo ya se cuida entre sí, ¿lo nombran
// Moai?"), nunca crean un Moai solos.
//
// CALL gds.graph.project(
//   'tejido', 'Persona',
//   {
//     TRONCO: {orientation: 'UNDIRECTED', properties: 'confianzaBase'},
//     RAMA:   {orientation: 'UNDIRECTED', properties: 'confianzaBase'}
//   }
// );
// CALL gds.louvain.stream('tejido', {relationshipWeightProperty: 'confianzaBase'})
// YIELD nodeId, communityId
// RETURN communityId, collect(gds.util.asNode(nodeId).id) AS integrantes;
