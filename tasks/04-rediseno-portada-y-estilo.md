# Tarea 04 · Rediseño: portada, acceso y estilo ciberpunk botánico

> Este archivo es el punto de entrada para seguir el trabajo en Claude Code.
> Lee primero `CLAUDE.md`, `AGENTS.md` y `docs/08-prototipo-cero.md`. Antes de escribir código, resume el plan en pocas líneas y espera confirmación.

## Dónde estamos
- Prototipo cero en `src/`: primer día (P1–P13), Inicio, árbol (H2), Radar simulado (H3), Moai de ejemplo (H4), lluvia fuerte (H5), panel de demostración (H6, se abre desde Ajustes) y Modo Ahorro (H7). 51 pruebas pasando.
- Verificado en navegador a 390 px: cero solicitudes a terceros, sin números visibles (salvo el 123 de la ayuda urgente) y sin desplazamiento horizontal.
- Pendiente de antes: fondos de Higgsfield (`public/backgrounds/{ciudad}-{hora}.jpg`), pruebas de los Cypher (tarea 01), revisión legal (Ley 1581), verificar el número de ayuda urgente de cada país, rediseño de tarjetas como vidrio esmerilado.

## Lo que pidió Mateo (CEO de Vasees)
A Mateo no le gusta cómo está quedando el diseño, ni la UI ni la UX. Pide:
1. **Pantalla de inicio** que explique qué es MOAI en pocas palabras, con **dos botones**: «Crear mi cuenta» e «Iniciar sesión».
2. Después de eso, **empieza todo el onboarding** (los pasos actuales).
3. **Estilo «cypher / punk»**. Interpretación de trabajo: ciberpunk botánico, base oscura con líneas de luz lima y cian. Confirmar con él.
4. La imagen de referencia está en `docs/referencias/portada-referencia.png`: ciudad soñada con cúpulas geodésicas, cascadas y vegetación; logo MOAI con una hoja en la «A»; lema «Ciudades que cuidan, personas que florecen»; tres ideas (Personas en el centro, Entornos sostenibles, Tecnología para el bienestar).

### Referencias visuales (términos de búsqueda)
- Árbol como grafo: RPG skill tree UI design, organic data visualization tree, neural network roots aesthetic, abstract node network dark mode.
- Radar micelial: bioluminescent tree of life concept art, cyber botanical illustration, glowing mycelium network art, neo solarpunk environment design.
- Avatar somático (perfil): continuous line art portrait botanical, wireframe flower anatomy, X-ray botanical glowing.

## Plan propuesto (pendiente de confirmar con Mateo)
1. **Portada y acceso**: imagen de la ciudad como fondo con degradado oscuro, logo, frase corta, «Crear mi cuenta» e «Iniciar sesión». Ambos botones llevan al onboarding y avisan: «Esto es un prototipo. Lo que escribas no se guarda.». No hay servidor: no simules que una cuenta existe (regla 10: lo que la interfaz promete debe coincidir con lo que hace el código).
2. **Sistema visual nuevo**: tokens oscuros con lima y cian. Actualizar `CLAUDE.md` y `AGENTS.md` si Mateo aprueba el cambio de paleta y tono (hoy mandan Fraunces e Inter y la paleta actual).
3. **Árbol (H2)** como grafo de nodos unidos por líneas de luz, y **Radar (H3)** como destello en el borde. **Perfil** con retrato en línea continua botánica (en una segunda fase).
4. Mantener las pruebas, la regla de cero números/contadores y `src/test/privacy.test.ts`.

## Decisiones que deben venir de Mateo
1. ¿La portada es oscura o clara como la imagen? ¿Solo el interior oscuro?
2. ¿Se usa la imagen de referencia como fondo hasta que esté el video?
3. ¿Orden de trabajo: portada y onboarding primero, árbol después?

## Video de la portada (para Higgsfield)
El prompt está en `prompts/video-ciudad-micelio.md`. La cuenta de Higgsfield (`@moai_vasees`) aparecía como plan gratuito en el conector; confirmar antes de generar.

## Reglas
- Las 13 reglas de `CLAUDE.md` siguen vigentes. Nada de contadores, puntos ni niveles. Brisa siempre se presenta como IA.
- Todo lo que toque datos personales, ubicación o consentimiento necesita revisión humana: márcalo.
- Commits pequeños, con `Co-Authored-By` al final.
