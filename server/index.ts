// Arranque del servidor. Variables en .env (ver .env.example).
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { abrirDb } from './db';
import { crearCifrador } from './cifrado';
import { viasDesdeEntorno } from './envios';
import { crearApp } from './app';
import { borrarConversacionesViejas, mantener, resumenSemanal } from './mantenimiento';

const produccion = process.env.NODE_ENV === 'production';
if (produccion && !process.env.CODIGO_SECRETO) throw new Error('Falta CODIGO_SECRETO en producción.');
if (produccion && !process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en producción.');

// Sin CODIGO_SECRETO (solo en desarrollo), el secreto se guarda en .data/ para que sobreviva a los reinicios:
// con él se cifran el Moai interno, el invierno y el test de cuidado, y si cambia ya no se pueden leer.
function secretoLocal() {
  const archivo = '.data/secreto-local';
  if (existsSync(archivo)) return readFileSync(archivo, 'utf8').trim();
  const nuevo = randomBytes(32).toString('hex');
  mkdirSync('.data', { recursive: true });
  writeFileSync(archivo, nuevo, { mode: 0o600 });
  return nuevo;
}
const secreto = process.env.CODIGO_SECRETO ?? secretoLocal();
const cifrador = crearCifrador(secreto);
const db = await abrirDb({ url: process.env.DATABASE_URL, carpeta: process.env.DATABASE_URL ? undefined : '.data/pglite' });
const { vias, recordar, correo } = viasDesdeEntorno(process.env);
const app = await crearApp({
  db,
  vias,
  secreto,
  produccion,
  equipo: (process.env.EQUIPO_CORREOS ?? '').split(','),
});
const port = Number(process.env.PORT ?? 8787);
await app.listen({ port, host: produccion ? '0.0.0.0' : '127.0.0.1' });
console.log(`API de MOAI en http://localhost:${port} (${process.env.DATABASE_URL ? 'PostgreSQL' : 'PGlite local'}; correo: ${process.env.RESEND_API_KEY ? 'Resend' : 'consola'}; WhatsApp: ${vias.whatsapp ? 'activo' : 'apagado'})`);

// Recordatorios, borrado de cuentas sin verificar, resumen semanal y limpieza de conversaciones: al arrancar y cada 6 horas.
const vuelta = () => Promise.all([
  mantener(db, recordar),
  resumenSemanal(db, correo, new Date(), process.env.APP_URL, cifrador),
  borrarConversacionesViejas(db, new Date()),
]).catch(() => console.error('falló el mantenimiento'));
void vuelta();
setInterval(vuelta, 6 * 3600 * 1000).unref();
