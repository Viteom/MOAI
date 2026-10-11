# Tarea 01 · Probar los borradores Cypher contra Neo4j

## Objetivo

Comprobar que los tres archivos de `docs/cypher/` son válidos en Neo4j 5 y que cada consulta hace lo que describe. Corregir lo que falle sin cambiar su intención ni las reglas de `CLAUDE.md`.

## Pasos

1. Copia `.env.example` a `.env`, levanta el entorno con `docker compose up -d neo4j` y espera a que responda. Louvain (Graph Data Science) es opcional; si el plugin no carga, sigue sin él y anótalo.
2. Crea una carpeta `tests/cypher/` con un arnés de pruebas (con el lenguaje y el ejecutor de pruebas que propongas en tu plan) que:
   - cargue las restricciones y los índices;
   - cree datos de ejemplo: personas (Ana, Luis, Carolina, Mamá), un Moai de tres personas y otro que se solape, vínculos RAIZ/TRONCO/RAMA con fechas distintas, un animal con dos cuidadores y un Punto Neutro;
   - ejecute cada consulta con parámetros y compruebe el resultado.
3. Casos mínimos a verificar:
   - Lanzar una Espora y aceptarla crea una RAMA con confianzaBase 0,25, y la Espora queda ACEPTADA.
   - Subir de RAMA a TRONCO conserva las propiedades y elimina la RAMA.
   - Registrar una interacción engrosa el vínculo y reinicia ultimaInteraccion.
   - La lectura «mi calle» aplica el marchitar según los días (simula fechas), no toca RAIZ y deja los vínculos muy viejos en DORMIDO sin borrarlos.
   - La sugerencia por cierre triádico solo devuelve personas con al menos dos conexiones en común y excluye a quien ya está vinculado o fue rechazado.
   - Cuidar un animal: invitar a un co-cuidador exige un vínculo y queda PROPUESTO hasta que acepta; retirar al último cuidador borra el animal.
   - La sugerencia de paseos respeta la visibilidad (NADIE, MOAI, RED).
   - Evento de zona: las confirmaciones caducan con el evento; «a quién avisar» solo devuelve a quien tiene la Vigilia vigente, está en la zona y no confirmó.
   - Cohesión de un Moai y tope global de un mensaje semanal por persona.
   - Anfitrión rotativo: nadie es anfitrión en dos Moais a la vez.
4. Revisa con atención estos puntos de riesgo:
   - Las subconsultas `EXISTS { ... }` (incluidas las que llevan MATCH y WHERE dentro).
   - `duration.inDays(...)` con datetime.
   - `SET n = properties(old)` seguido de `DELETE old`.
   - La comparación `a.id < b.id` entre UUID para evitar parejas duplicadas.
   - La lista `[x IN lista WHERE ...] + [$a]` y el uso de `coalesce` con datetime.
   - La sintaxis de los índices sobre propiedades de relaciones.
   - `DETACH DELETE` al limpiar eventos y animales sin cuidadores.
   - La fórmula del marchitar: debe ser idempotente al leer, y registrar una interacción no debe «revivir» un valor viejo.
5. Corrige los archivos Cypher donde haga falta y deja un `CHANGELOG.md` en `docs/cypher/` con cada cambio y su motivo.

## Criterios de aceptación

- Un solo comando ejecuta todas las pruebas y todas pasan.
- Los tres archivos Cypher se ejecutan sin errores de sintaxis en Neo4j 5.
- No se añadió ninguna propiedad que guarde ubicación, coordenadas o contenido de mensajes.
- Un informe corto en español, para alguien que no es desarrollador: qué funcionó, qué falló, qué corregiste y qué decisiones necesita tomar el equipo.

## Fuera de alcance

- Construir la API o la aplicación.
- Cambiar las reglas de privacidad o los principios de `CLAUDE.md`.
