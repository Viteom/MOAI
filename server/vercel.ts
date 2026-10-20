// Entrada de servidor reutilizable por instancia de Vercel. No abre puertos, archivos locales ni temporizadores.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { FastifyInstance } from 'fastify';
import { abrirDb } from './db';
import { crearApp } from './app';
import { crearCifrador } from './cifrado';
import { viasDesdeEntorno } from './envios';
import { geminiDesdeEntorno } from './gemini';
import { registrarTareasVercel } from './tareas-vercel';
import { urlDbDesdeEntorno } from './entorno-db';

export class ConfiguracionVercelIncompleta extends Error {
  constructor(readonly variables: string[]) { super('Falta configuración del servidor de MOAI.'); }
}
export function validarEntornoVercel(entrada: NodeJS.ProcessEnv) {
  const env: NodeJS.ProcessEnv = { ...entrada, DATABASE_URL: urlDbDesdeEntorno(entrada) };
  const necesarias = ['DATABASE_URL', 'CODIGO_SECRETO', 'RESEND_API_KEY', 'CORREO_REMITENTE', 'APP_URL', 'CRON_SECRET'];
  const faltantes = necesarias.filter(nombre => !env[nombre]?.trim());
  if (faltantes.length) throw new ConfiguracionVercelIncompleta(faltantes);
  const invalidas: string[] = [];
  if (env.CODIGO_SECRETO!.trim().length < 32) invalidas.push('CODIGO_SECRETO');
  if (env.CRON_SECRET!.trim().length < 32) invalidas.push('CRON_SECRET');
  try {
    const url = new URL(env.APP_URL!);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') invalidas.push('APP_URL');
  } catch { invalidas.push('APP_URL'); }
  try {
    const url = new URL(env.DATABASE_URL!);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) invalidas.push('DATABASE_URL');
  } catch { invalidas.push('DATABASE_URL'); }
  if (invalidas.length) throw new ConfiguracionVercelIncompleta(invalidas);
  return env;
}

export async function iniciarVercel(env: NodeJS.ProcessEnv = process.env, abrir: typeof abrirDb = abrirDb) {
  // También las previews usan cookies seguras y correo real: nunca códigos en registros de Vercel.
  const entorno: NodeJS.ProcessEnv = { ...validarEntornoVercel(env), NODE_ENV: 'production' };
  const envios = viasDesdeEntorno(entorno);
  const modeloBrisa = geminiDesdeEntorno(entorno);
  const db = await abrir({ url: entorno.DATABASE_URL, inicializar: false, maxConexiones: 3 });
  try {
    const [{ preparada }] = await db.query<{ preparada: boolean }>("select to_regclass('public.brisa_interpretaciones') is not null as preparada");
    if (!preparada) throw new Error('La base requiere preparar el esquema.');
    const app = await crearApp({ db, vias: envios.vias, secreto: entorno.CODIGO_SECRETO!, produccion: true,
      equipo: (entorno.EQUIPO_CORREOS ?? '').split(','), modeloBrisa, configurar(app) {
        app.addHook('onRequest', async (_request, reply) => {
          reply.header('Cache-Control', 'private, no-store');
          reply.header('X-Content-Type-Options', 'nosniff');
        });
        app.setErrorHandler((error, _request, reply) => {
          const codigo = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : undefined;
          const estado = typeof codigo === 'number' && codigo >= 400 && codigo < 500 ? codigo : 503;
          reply.code(estado).send({ error: estado === 413 ? 'El contenido es demasiado grande.' : estado < 500 ? 'Revisa la solicitud.' : 'El servicio de MOAI no está disponible en este momento.' });
        });
        app.get('/api/health', async () => { await db.query('select 1'); return { ok: true }; });
        registrarTareasVercel(app, { db, ...envios, secreto: entorno.CRON_SECRET!, urlApp: entorno.APP_URL!, cifrador: crearCifrador(entorno.CODIGO_SECRETO!) });
        app.addHook('onClose', async () => { await db.close(); });
      } });
    await app.ready();
    return app;
  } catch (error) { await db.close(); throw error; }
}

export function crearManejadorVercel(iniciar: () => Promise<FastifyInstance> = iniciarVercel) {
  let pendiente: Promise<FastifyInstance> | null = null;
  return async (request: IncomingMessage, reply: ServerResponse) => {
    try {
      // Una sola inicialización para solicitudes simultáneas; el siguiente intento puede recuperarse de un fallo.
      pendiente ??= iniciar().catch(error => { pendiente = null; throw error; });
      const app = await pendiente;
      await new Promise<void>((resolve, reject) => {
        const limpiar = () => { reply.off('finish', terminar); reply.off('close', terminar); reply.off('error', fallar); };
        const terminar = () => { limpiar(); resolve(); };
        const fallar = (error: Error) => { limpiar(); reject(error); };
        reply.once('finish', terminar); reply.once('close', terminar); reply.once('error', fallar);
        if (reply.destroyed) terminar();
        else { try { app.server.emit('request', request, reply); } catch (error) { limpiar(); reject(error); } }
      });
    } catch (error) {
      if (error instanceof ConfiguracionVercelIncompleta) console.error('Revisa las variables del servidor de MOAI:', error.variables.join(', '));
      else console.error('No se pudo atender una solicitud del servidor de MOAI.');
      if (!reply.headersSent) {
        reply.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' });
        reply.end(JSON.stringify({ error: 'El servidor de MOAI todavía no está disponible. Reintenta en un momento.' }));
      } else if (!reply.writableEnded) reply.end();
    }
  };
}
