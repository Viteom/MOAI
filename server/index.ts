// Arranque del servidor. Variables en .env (ver .env.example).
import { randomBytes } from 'node:crypto';
import { abrirDb } from './db';
import { viasDesdeEntorno } from './envios';
import { crearApp } from './app';
import { mantener } from './mantenimiento';

const produccion = process.env.NODE_ENV === 'production';
if (produccion && !process.env.CODIGO_SECRETO) throw new Error('Falta CODIGO_SECRETO en producción.');
if (produccion && !process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en producción.');

const db = await abrirDb({ url: process.env.DATABASE_URL, carpeta: process.env.DATABASE_URL ? undefined : '.data/pglite' });
const { vias, recordar } = viasDesdeEntorno(process.env);
const app = await crearApp({
  db,
  vias,
  secreto: process.env.CODIGO_SECRETO ?? randomBytes(32).toString('hex'),
  produccion,
});
const port = Number(process.env.PORT ?? 8787);
await app.listen({ port, host: produccion ? '0.0.0.0' : '127.0.0.1' });
console.log(`API de MOAI en http://localhost:${port} (${process.env.DATABASE_URL ? 'PostgreSQL' : 'PGlite local'}; correo: ${process.env.RESEND_API_KEY ? 'Resend' : 'consola'}; WhatsApp: ${vias.whatsapp ? 'activo' : 'apagado'})`);

// Recordatorios y borrado de cuentas sin verificar: al arrancar y cada 6 horas.
const vuelta = () => mantener(db, recordar).catch(() => console.error('falló el mantenimiento de cuentas'));
void vuelta();
setInterval(vuelta, 6 * 3600 * 1000).unref();
