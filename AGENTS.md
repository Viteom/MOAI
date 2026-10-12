# Reglas de arquitectura

## Prototipo cero (primer día)
- Lo que la persona responde en el primer día vive en la memoria de React. La lógica de límites y ramas del flujo va en funciones puras y seguras para el navegador.
- La escena de la ciudad es intercambiable: una imagen del mismo origen (`/backgrounds/{ciudad}-{hora}.jpg`) con respaldo SVG procedural. Las fotografías futuras no deben exigir cambios en el flujo.
- Las pantallas del prototipo viven dentro de la experiencia de inicio, con componentes visuales y tokens CSS compartidos.
- Las tipografías se autoalojan con fontsource y toda solicitud del código es del mismo origen: el frontend no usa servicios de terceros.

## Cuentas (servidor en `server/`)
- El frontend solo hace solicitudes desde `src/lib/api.ts`, y solo a `/api` del mismo origen. Nada se guarda en el navegador: la sesión es una cookie httpOnly. `src/test/privacy.test.ts` lo comprueba.
- Las reglas de validación viven una sola vez en `src/lib/registro.ts` y las usan el formulario y el servidor.
- Los servicios externos (Resend, Twilio) solo se llaman desde el servidor, con claves en `.env`.
- Los códigos y los tokens de sesión se guardan con hash; nunca en claro. Los registros técnicos no llevan correos, teléfonos ni códigos (salvo el código de desarrollo en consola, con el destino enmascarado).
- Ver también `CLAUDE.md` (reglas de privacidad y decisiones del proyecto).
