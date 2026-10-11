# Tarea 03 · Continuar el prototipo cero

## Hecho (migración desde Lovable)
- El código del prototipo se trasladó a este repositorio como app independiente (Vite + React + TypeScript + Tailwind 4).
- Corregido: «Volver» ya no aparece en la primera pantalla; la luna ya no tapa la «I» de MOAI; el nombre es «MOAI».
- Pruebas: reglas del primer día, privacidad (sin almacenamiento persistente, sin red, sin dominios externos) y primera pantalla.

## Pendiente, en este orden
1. **Fondos reales** en `public/backgrounds/{ciudad}-{hora}.jpg` (ciudades: medellin, bogota, cdmx, nyc; horas: dawn, day, dusk, night). Ofrecer WebP o AVIF si pesan menos. Los aporta el equipo (Higgsfield); no generes imágenes. Si el archivo no existe, queda el SVG.
2. **Pantallas de la especificación que falten** (`docs/08-prototipo-cero.md`): H2 perfil y árbol completo, H3 Radar simulado, H4 Moai de ejemplo, H5 lluvia fuerte simulada, H6 panel de demostración, H7 Modo Ahorro. Antes de empezar, compara lo que existe (P1–P13, Home, árbol, calle, ajustes) con la especificación.
3. **Accesibilidad**: reducir movimiento (ya hay regla CSS), tamaños de letra del teléfono, contraste, foco visible, lectores de pantalla.
4. Rediseño de tarjetas como vidrio esmerilado según el Figma.

## Reglas específicas
- Todo en memoria; sin servidor ni almacenamiento persistente; sin analítica; sin permisos del teléfono.
- Aviso visible: «Esto es un prototipo. Lo que escribas no se guarda.».
- Ningún número, punto, nivel ni contador visible.

## Entrega
Informe corto en español, para alguien que no es desarrollador: qué se hizo, qué falta y qué decisiones necesita tomar el equipo.
