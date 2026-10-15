# Tarea 06 · Pruebas de los casos difíciles del servidor (para Codex)

Lee primero `AGENTS.md` y `CLAUDE.md`.

## Qué hacer

Agregar pruebas con Vitest en `server/*.test.ts` (siguiendo el estilo de `server/app.test.ts` y `server/comunidad.test.ts`, con PGlite en memoria) para:

1. **Códigos de acceso:** código vencido (más de 10 minutos), sexto intento fallido, sexto envío en una hora, código ya usado, código de otro destino.
2. **Sesiones:** sesión vencida (30 días), cookie alterada, `/api/salir` invalida la sesión en el servidor.
3. **Mantenimiento (`server/mantenimiento.ts`):** cuenta sin verificar borrada a los 20 días con sus consentimientos y verificaciones; recordatorio cada 3,5 días y no más; resumen semanal solo si hay planes y máximo uno por semana; conversaciones borradas 30 días después del plan o de su cancelación, y nunca las de un plan semanal activo.
4. **Planes semanales:** próxima y última ocurrencia al cruzar fin de mes, fin de año y el cambio de mes con 31 días; sumarse vale solo para la próxima ocurrencia.
5. **Alcance:** un plan «cerca» no aparece a dos anillos; «zona» sí; «ciudad» aparece en toda la ciudad y nunca en otra.
6. **Privacidad (regla 1 y 7):** ninguna respuesta de la API incluye correo, fecha de nacimiento ni celdas de otras personas; los mensajes de un plan solo los ve quien va.

Si una prueba revela un error, **no lo corrijas en el código de la app**: deja la prueba marcada con `it.fails` y descríbelo en el pull request.

## Reglas

- Solo toca archivos `server/*.test.ts` y, si hace falta, ayudas de prueba nuevas en `server/`.
- Sin dependencias nuevas. Usa tiempos simulados (fechas pasadas por parámetro o `vi.setSystemTime`), nunca esperas reales.
- Rama propia `codex/pruebas-servidor` desde `fase-1/cuentas-y-comunidad`; pull request hacia esa rama.
- Antes de terminar: `npm run typecheck` y `npm run test` sin errores.
