// Arranque del servidor. Variables en .env (ver .env.example).
import { randomBytes } from 'node:crypto';
import { abrirDb } from './db';
import { viasDesdeEntorno } from './envios';
import { crearApp } from './app';

const produccion = process.env.NODE_ENV === 'production';
if (produccion && !process.env.CODIGO_SECRETO) throw new Error('Falta CODIGO_SECRETO en producción.');
if (produccion && !process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en producción.');

const db = await abrirDb({ url: process.env.DATABASE_URL, carpeta: process.env.DATABASE_URL ? undefined : '.data/pglite' });
const app = await crearApp({
  db,
  vias: viasDesdeEntorno(process.env),
  secreto: process.env.CODIGO_SECRETO ?? randomBytes(32).toString('hex'),
  produccion,
});
const port = Number(process.env.PORT ?? 8787);
await app.listen({ port, host: produccion ? '0.0.0.0' : '127.0.0.1' });
console.log(`API de MOAI en http://localhost:${port} (${process.env.DATABASE_URL ? 'PostgreSQL' : 'PGlite local'})`);
