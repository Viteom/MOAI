// =====================================================================
// MOAI Ciudades del Cuidado: Extensión One Health (v0.2)
// Neo4j 5.x. Se AÑADE al esquema de Anillos de Crecimiento (v0.1).
// Borrador para revisión: no se ejecutó contra una base de datos real.
//
// IDEA
//  One Health integra la salud de las personas, los animales y el
//  entorno. En el grafo, eso significa que una persona no solo se
//  vincula con otras personas: también cuida animales, cultiva plantas
//  y participa en encuentros que cuidan un lugar.
//
// PRINCIPIOS DE ESTA EXTENSIÓN
//  1. Los animales y las plantas son nodos mínimos: alias y especie o
//     tipo. NO se guardan datos de salud ni veterinarios.
//  2. Nada se ubica. Los lugares íntimos ("el parque que visito") viven
//     solo en el dispositivo. Al grafo solo entran Puntos Neutros
//     comunitarios, que la plataforma cura y que ya son públicos.
//  3. Cuidar algo es privado por defecto: visibilidad = 'NADIE'.
//     La persona decide si lo ve su Moai ('MOAI') o su red ('RED').
//  4. Un animal compartido (de una familia) exige que cada cuidador
//     acepte su lugar. Nadie queda como cuidador sin saberlo.
//  5. NO hay contadores de vanidad: no se cuentan mascotas, matas ni
//     encuentros, ni se muestra un "puntaje" de cuidado.
//  6. Los Perfiles Brote (menores) no organizan encuentros ni reciben
//     sugerencias; esto se valida en la aplicación.
// =====================================================================


// ---------------------------------------------------------------------
// 1. RESTRICCIONES E ÍNDICES
// ---------------------------------------------------------------------
CREATE CONSTRAINT animal_id    IF NOT EXISTS FOR (a:Animal)    REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT planta_id    IF NOT EXISTS FOR (m:Planta)    REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT encuentro_id IF NOT EXISTS FOR (e:Encuentro) REQUIRE e.id IS UNIQUE;

CREATE INDEX encuentro_cuando IF NOT EXISTS FOR (e:Encuentro) ON (e.cuando);
CREATE INDEX encuentro_pilar  IF NOT EXISTS FOR (e:Encuentro) ON (e.pilar);


// ---------------------------------------------------------------------
// 2. NODOS Y RELACIONES NUEVOS (referencia de propiedades)
// ---------------------------------------------------------------------
// (:Animal    {id, alias, especie, creadoEn})
//      especie: PERRO | GATO | AVE | CABALLO | OTRO ... (lista abierta)
// (:Planta    {id, alias, tipo, creadaEn})
//      tipo: MATA | HUERTA | ARBOL | JARDIN
// (:Encuentro {id, nombre, pilar, cuando, estado})
//      pilar:  PERSONAS | ANIMALES | ENTORNO
//      (un Tiempo Festivo es un Encuentro con pilar PERSONAS)
//      estado: ABIERTO | CERRADO | CANCELADO
// (:PuntoNeutro) ya existe en v0.1; se añade la propiedad:
//      tipo: PARQUE | BIBLIOTECA | HUERTA_COMUNITARIA | HUMEDAL | RIO | OTRO
//
// (:Persona)-[:CUIDA   {id, rol, estado, desde, aceptadoEn, visibilidad}]->(:Animal)
//      rol: PRINCIPAL | COMPARTIDO      estado: PROPUESTO | ACTIVO | RETIRADO
// (:Persona)-[:CULTIVA {id, estado, desde, visibilidad}]->(:Planta)
// (:Persona)-[:ORGANIZA]->(:Encuentro)
// (:Persona)-[:ASISTE  {desde}]->(:Encuentro)
// (:Encuentro)-[:OCURRE_EN]->(:PuntoNeutro)
//
// visibilidad: NADIE (por defecto) | MOAI | RED


// ---------------------------------------------------------------------
// 3. REGISTRAR UN ANIMAL DE COMPAÑÍA
// ---------------------------------------------------------------------
// Parámetros: $personaId, $alias, $especie
MATCH (p:Persona {id: $personaId})
CREATE (a:Animal {id: randomUUID(), alias: $alias, especie: $especie, creadoEn: datetime()})
CREATE (p)-[:CUIDA {
  id: randomUUID(), rol: 'PRINCIPAL', estado: 'ACTIVO',
  desde: datetime(), visibilidad: 'NADIE'
}]->(a)
RETURN a.id AS animalId;


// ---------------------------------------------------------------------
// 4. COMPARTIR EL CUIDADO DE UN ANIMAL (con alguien de tu red)
// ---------------------------------------------------------------------
// 4a. Invitar. Solo a personas con un vínculo ya aceptado.
// Parámetros: $de, $a, $animalId
MATCH (:Persona {id: $de})-[:CUIDA {estado: 'ACTIVO'}]->(an:Animal {id: $animalId})
MATCH (b:Persona {id: $a})
WHERE EXISTS { (:Persona {id: $de})-[:RAIZ|TRONCO|RAMA]-(b) }
MERGE (b)-[r:CUIDA]->(an)
  ON CREATE SET r.id = randomUUID(), r.rol = 'COMPARTIDO', r.estado = 'PROPUESTO',
                r.desde = datetime(), r.visibilidad = 'NADIE'
RETURN r.estado AS estado;

// 4b. Aceptar. Hasta que la persona acepta, no figura como cuidadora.
// Parámetros: $b, $animalId
MATCH (:Persona {id: $b})-[r:CUIDA {estado: 'PROPUESTO'}]->(an:Animal {id: $animalId})
SET r.estado = 'ACTIVO', r.aceptadoEn = datetime()
RETURN r.id AS vinculoId;


// ---------------------------------------------------------------------
// 5. REGISTRAR UNA MATA, UNA HUERTA, UN ÁRBOL O UN JARDÍN
// ---------------------------------------------------------------------
// Parámetros: $personaId, $alias, $tipo
MATCH (p:Persona {id: $personaId})
CREATE (m:Planta {id: randomUUID(), alias: $alias, tipo: $tipo, creadaEn: datetime()})
CREATE (p)-[:CULTIVA {
  id: randomUUID(), estado: 'ACTIVO', desde: datetime(), visibilidad: 'NADIE'
}]->(m)
RETURN m.id AS plantaId;


// ---------------------------------------------------------------------
// 6. LEER "MI PATIO" PARA LA INTERFAZ
// ---------------------------------------------------------------------
// Alimenta lo que aparece en el patio de tu casa: tus animales y plantas.
// Parámetros: $yo
MATCH (yo:Persona {id: $yo})-[r:CUIDA|CULTIVA {estado: 'ACTIVO'}]->(x)
RETURN type(r) AS tipoDeCuidado,
       labels(x)[0] AS clase,
       x.alias AS alias,
       coalesce(x.especie, x.tipo) AS especieOTipo,
       r.rol AS rol
ORDER BY clase, alias;


// ---------------------------------------------------------------------
// 7. ENCUENTROS POR PILAR (incluye el Tiempo Festivo)
// ---------------------------------------------------------------------
// 7a. Crear un encuentro en un Punto Neutro.
// Parámetros: $organizadorId, $puntoId, $nombre, $pilar, $cuando (ISO 8601)
MATCH (pn:PuntoNeutro {id: $puntoId}), (org:Persona {id: $organizadorId})
CREATE (e:Encuentro {
  id: randomUUID(), nombre: $nombre, pilar: $pilar,
  cuando: datetime($cuando), estado: 'ABIERTO'
})
CREATE (e)-[:OCURRE_EN]->(pn)
CREATE (org)-[:ORGANIZA]->(e)
CREATE (org)-[:ASISTE {desde: datetime()}]->(e)
RETURN e.id AS encuentroId;

// 7b. Próximos encuentros de mi zona, opcionalmente filtrados por pilar.
// Parámetros: $zona (zona gruesa), $pilar (puede ser null)
MATCH (e:Encuentro {estado: 'ABIERTO'})-[:OCURRE_EN]->(pn:PuntoNeutro)
WHERE pn.zonaGruesa = $zona
  AND e.cuando > datetime()
  AND ($pilar IS NULL OR e.pilar = $pilar)
RETURN e.id AS encuentroId, e.nombre AS nombre, e.pilar AS pilar,
       e.cuando AS cuando, pn.nombre AS lugar
ORDER BY e.cuando
LIMIT 10;


// ---------------------------------------------------------------------
// 8. SUGERENCIA TRANSPARENTE: PASEOS ENTRE PERSONAS CON LA MISMA ESPECIE
// ---------------------------------------------------------------------
// Solo considera a quien dejó visible su animal para su Moai o su red.
// Se muestra siempre con el motivo ("ambos cuidan un perro") y la
// persona puede rechazarla. Parámetros: $yo
MATCH (yo:Persona {id: $yo})-[:CUIDA {estado: 'ACTIVO'}]->(mio:Animal)
MATCH (yo)-[v:TRONCO|RAMA {estado: 'ACTIVO'}]-(otra:Persona)
      -[c:CUIDA {estado: 'ACTIVO'}]->(suyo:Animal)
WHERE suyo.especie = mio.especie
  AND (c.visibilidad = 'RED' OR (c.visibilidad = 'MOAI' AND type(v) = 'TRONCO'))
  AND NOT (yo)-[:DECLINO]->(otra)
RETURN DISTINCT otra.id AS personaId, otra.alias AS alias, suyo.especie AS especie
LIMIT 5;


// ---------------------------------------------------------------------
// 9. CAMBIAR LA VISIBILIDAD DE LO QUE CUIDAS
// ---------------------------------------------------------------------
// Parámetros: $yo, $animalId, $visibilidad ('NADIE' | 'MOAI' | 'RED')
MATCH (:Persona {id: $yo})-[r:CUIDA {estado: 'ACTIVO'}]->(:Animal {id: $animalId})
SET r.visibilidad = $visibilidad
RETURN r.visibilidad AS visibilidad;


// ---------------------------------------------------------------------
// 10. RETIRAR LO QUE CUIDAS (borrado de tu lado)
// ---------------------------------------------------------------------
// Si un animal queda sin cuidadores activos, se borra su nodo.
// Parámetros: $yo, $animalId
MATCH (:Persona {id: $yo})-[r:CUIDA]->(an:Animal {id: $animalId})
SET r.estado = 'RETIRADO', r.retiradoEn = datetime()
WITH an
WHERE NOT EXISTS { (:Persona)-[:CUIDA {estado: 'ACTIVO'}]->(an) }
DETACH DELETE an;
