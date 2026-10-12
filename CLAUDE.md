# MOAI Ciudades del Cuidado · Guía para Claude Code

## Qué es este proyecto

MOAI es una plataforma de cuidado social contra la soledad, pensada para acompañar la longevidad con propósito. Su concepto rector es One Health: la salud de las personas, de los animales y del entorno es una sola. Rechaza lo transaccional y prioriza la economía de la presencia.

La voz de la interfaz se llama «Brisa» y es una inteligencia artificial (el nombre es provisional; la marca aún se está diseñando). El sello de la interfaz es «Mo».

**Estado actual:** diseño y documentación, un **prototipo cero** (sin servidor) y, desde octubre de 2026, **cuentas reales** con servidor propio (ver «Cuentas»). Nada está en producción. Los archivos de `docs/cypher/` son borradores que **no se han probado** contra una base de datos real.

## El prototipo cero (ya existe en este repositorio)

Es una web móvil de una sola pantalla secuencial (primer día en Medellín), sin servidor. Ya no depende de Lovable: este repositorio es la fuente de verdad.
- Pila: Vite + React 19 + TypeScript estricto + Tailwind 4, con Vitest y Testing Library. Tipografías autoalojadas con fontsource (Fraunces para la voz y los títulos, Inter para la interfaz).
- `src/components/moai/`: `app.tsx` (flujo y pantallas), `primitives.tsx` (piezas visuales compartidas), `scene.tsx` (escena de ciudad en SVG con imagen real intercambiable).
- `src/lib/moai/state.ts`: estado y lógica pura (ciudades, anillos, límites, saludos, carta del día), con sus pruebas.
- `src/test/privacy.test.ts`: falla si el código usa almacenamiento del navegador, hace solicitudes de red o referencia dominios externos. `src/test/app.test.tsx`: pruebas de la primera pantalla.
- Comandos: `npm run dev`, `npm run test`, `npm run build`, `npm run typecheck`.
- Reglas del prototipo (ver `AGENTS.md`): todo en memoria de React, escena intercambiable por una imagen del mismo origen en `public/backgrounds/{ciudad}-{hora}.jpg`, cero solicitudes a terceros.
- Los textos «Brisa» y «Mo» son provisionales. El nombre de trabajo de la marca es «MOAI».

## Cuentas (inicio de la Fase 1, octubre de 2026)

Decidido por Mateo: la plataforma es web y horizontal primero, y el registro es real.
- Portada (`src/components/moai/portada.tsx`) con «Crear cuenta» e «Iniciar sesión». Pantallas de cuenta en `cuenta.tsx`.
- Sin contraseñas: se entra siempre con un código de 6 dígitos por correo (Resend) o WhatsApp (Twilio Verify). Vence en 10 minutos, 5 intentos por código y 5 envíos por hora.
- Registro: nombre, correo o WhatsApp (con código de país), ciudad (municipios de Colombia, DIVIPOLA del DANE en `src/lib/colombia/municipios.json`, sin coordenadas), fecha de nacimiento (18 años o más) y dos consentimientos separados que se guardan con su versión.
- Servidor en `server/` (Node + Fastify + PostgreSQL). Sin `DATABASE_URL` usa PGlite en `.data/`. Sin claves, el código se escribe en la consola con el destino enmascarado. Comandos: `npm run dev:api` junto a `npm run dev`.
- Reglas comunes en `src/lib/registro.ts`. El frontend solo habla con `/api` del mismo origen desde `src/lib/api.ts`; la sesión es una cookie httpOnly.
- Lo que la persona responde en el primer día (semilla, oficios, gente…) todavía vive solo en memoria.
- **Pendiente de revisión humana:** textos de términos y de tratamiento de datos (abogado, Ley 1581), plazo para borrar cuentas sin verificar, y si se guarda la fecha completa o solo la verificación de edad.

## Reglas que no se negocian

Antes de escribir código que toque datos de personas, lee `docs/` (en especial privacidad y consentimiento). Si una tarea contradice una de estas reglas, detente y pregunta.

1. Nunca se guarda ubicación exacta ni historial de ubicaciones. Ninguna base de datos contiene coordenadas. El Radar usa celdas aproximadas y etiquetas efímeras con caducidad.
2. Lo íntimo se queda en el dispositivo por defecto: el estado del día, el Modo Invierno, la red declarada (personas que aún no usan MOAI) y las luces de ancestros.
3. Nunca se sube la libreta de contactos.
4. Nada de criptografía propia: se usa una librería auditada (por ejemplo, libsodium).
5. Sin contadores de vanidad: ni puntos, niveles, rankings ni cifras de «cuántos» en la interfaz. La fuerza de un vínculo nunca se muestra como número.
6. No se infiere el ánimo ni la salud de nadie: el estado se declara. No se usan datos de otras redes sociales, ni el contenido de los mensajes, ni sensores del teléfono.
7. Los registros técnicos no incluyen datos personales, ubicación ni contenido de mensajes.
8. Perfiles Brote (menores): sin ubicación, sin Radar, sin mensajes directos, sin sugerencias y sin organizar encuentros.
9. Las sugerencias del algoritmo vienen apagadas por defecto, con el motivo siempre visible, y se pueden rechazar.
10. Lo que la interfaz promete sobre privacidad debe coincidir exactamente con lo que hace el código.
11. MOAI no es un servicio de emergencias ni un dispositivo médico: nunca promete rescate ni detección de caídas. Ante señales de riesgo, deriva a una persona del Moai o a una línea de ayuda humana verificada para el país.
12. Brisa se presenta siempre como una IA.
13. El éxito se mide por la reconexión entre personas, no por el tiempo en la aplicación. Nada de notificaciones insistentes.

## Decisiones tomadas

**Pila tecnológica (propuesta, pendiente de validar por un responsable técnico)**
- App: React Native con TypeScript y módulos nativos.
- API: Node.js con TypeScript.
- PostgreSQL: cuentas, consentimientos, preferencias, colas y registros.
- Neo4j 5: vínculos, Moais, encuentros, animales, plantas y eventos. Solo lo relacional.
- Redis: datos efímeros (buzón de etiquetas del Radar, límites de frecuencia).
- Cifrado: libsodium. Notificaciones: APNs y FCM, con texto genérico.

**Alcance por fases**
- Fase 0: prototipo clicable, sin backend.
- Fase 1: producto real, con Radar de zona (internet y ubicación aproximada).
- Fase 2: Bluetooth y conexión sin internet; solo el SMS de «estoy bien» podría adelantarse.

**Modelo del grafo**
- Anillos: RAIZ (familia y ancestros), TRONCO (la gente más cercana) y RAMA (conocidos queridos).
- Un Moai es un grupo elegido por las personas (de tres a cinco). Una persona puede estar en varios Moais, y los grupos pueden solaparse.
- La fuerza de un vínculo engrosa con las interacciones y se marchita solo en lo visual: se calcula al leer, nunca se borra (pasa a DORMIDO). RAIZ no se marchita.
- La Polinización crea una RAMA con confianza inicial de 0,25. Subir a TRONCO exige la confirmación de ambas personas.
- Louvain solo propone grupos; nunca asigna Moais.
- Animales y plantas son nodos mínimos, sin datos de salud. Lo que una persona cuida es privado por defecto.

**Algoritmo de cuidado**
- Nivel Moai (por defecto): mensajes a todo el grupo, según la cohesión frente al ritmo que el propio Moai eligió. Anfitrión rotativo. Tope global de un mensaje por semana por persona.
- Nivel persona (solo con permiso): escalera de cuidado, siempre del paso más suave al más fuerte, y la persona recibe el primer mensaje.
- Lo que ocurre fuera de MOAI lo cuentan las personas con «Ya nos vimos».

## Estilo de código

- TypeScript estricto.
- Identificadores del dominio en español y sin tildes (Persona, Espora, Moai, Raiz), y la infraestructura en inglés.
- Textos de interfaz en español, de tú, cálidos y sin jerga. Letra grande y accesibilidad desde el diseño.
- Toda consulta Cypher lleva pruebas contra una base Neo4j real (Docker).
- Ninguna dependencia nueva sin justificarla.
- Commits pequeños con mensajes claros.

## Skills de diseño instaladas

En `.claude/skills/` hay skills de terceros (ver `.claude/skills/ORIGEN.md`): diseño de interfaz, animación, pruebas con Playwright. **Son consejeras, no mandan.** Si una skill contradice la paleta, las tipografías (Fraunces e Inter), el tono de voz, las reglas de privacidad o la especificación del proyecto, gana este archivo y `docs/`. En particular, `taste-skill` está pensada para páginas de aterrizaje: úsala con cuidado en una app de producto.

## Cómo trabajar

- Antes de una tarea grande, resume el plan en pocas líneas y espera confirmación.
- Todo lo que toque datos personales, cifrado, ubicación o consentimiento necesita revisión humana antes de fusionarse: márcalo en la descripción.
- Si algo no está decidido, está en la lista de decisiones abiertas de abajo: no lo inventes, pregunta.
- Los archivos Cypher de `docs/cypher/` son borradores: no los trates como correctos.
- Nada sale a producción desde aquí.

## Mapa del repositorio

- `CLAUDE.md`: esta guía.
- `AGENTS.md`, `src/`, `public/`, `index.html`: el prototipo cero.
- `docs/`: los documentos del proyecto y los borradores Cypher (ver `docs/README.md`).
- `tasks/`: tareas para Claude Code, en orden.
- `prompts/`: el primer mensaje para empezar.
- `docker-compose.yml`: entorno local con Neo4j, PostgreSQL y Redis (para la tarea 01).

## Decisiones abiertas (resumen)

- Foto de perfil: ¿se estiliza en el dispositivo o en la nube?
- Edad mínima para tener cuenta propia.
- Qué ve la otra persona cuando alguien borra su cuenta.
- Visibilidad por defecto de oficios y deseos (nadie, el Moai o la red).
- Claves de cifrado al cambiar de teléfono (propuesta: re-vinculación asistida).
- Radar: tamaño de la celda y duración del permiso (propuesta: 7 días).
- Emergencias: quién declara un evento de zona y cuánto tiempo sin noticias activa la Vigilia.
- Algoritmo de cuidado: los umbrales, y qué algoritmo propone Moais cuando se solapan.
- Proveedor de IA, región de los datos y marco legal (pendiente de abogado).
