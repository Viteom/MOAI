# MOAI Ciudades del Cuidado

Plataforma de cuidado social contra la soledad (One Health: personas, animales y entorno). Incluye la aplicación web, la API de cuentas y comunidad y la documentación de diseño. El despliegue beta está en preparación; no está publicado en producción desde este entorno.

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:api    # otra terminal: API local, http://127.0.0.1:8787
npm run test
npm run build
```

- `CLAUDE.md`: guía y reglas del proyecto (léela primero).
- `docs/`: documentos del proyecto y borradores Cypher (sin probar).
- `tasks/`: tareas en orden. `prompts/`: primer mensaje para Claude Code.
- `LEEME-KIT.md`: notas del kit inicial.
- Servidor para Vercel, base PostgreSQL y variables privadas: [guía de la beta](docs/17-vercel-beta.md).
