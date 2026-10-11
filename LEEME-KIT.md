# Kit de MOAI para Claude Code

Este kit se copia **dentro del repositorio que Lovable sincroniza con GitHub**. No lo reemplaza: se suma al prototipo ya existente.

## Pasos

1. (Ya no se usa Lovable.) Este repositorio es la fuente de verdad.
2. **Clonar** el repositorio en tu computador (o pide a alguien técnico que lo haga).
3. **Copiar el contenido de este kit** en la raíz del repositorio (`CLAUDE.md`, `docs/`, `tasks/`, `prompts/`, `docker-compose.yml`, `.env.example`). Si pregunta por archivos repetidos como `.gitignore`, conserva el del repositorio y añade las líneas que falten.
4. **Exportar los documentos** a `docs/` en Markdown (la lista está en `docs/README.md`). Claude Code no abre enlaces de claude.ai.
5. Copia `.env.example` como `.env` y cambia las contraseñas (solo para la tarea 01).
6. Haz un commit con el kit y súbelo a `main`.
7. Abre la carpeta con Claude Code y pega el contenido de `prompts/primer-prompt.md`.

## Tareas

- `tasks/03-continuar-prototipo.md`: comprobar, corregir y completar el prototipo cero.
- `tasks/01-probar-cypher.md`: probar los borradores de base de datos contra Neo4j (independiente).
