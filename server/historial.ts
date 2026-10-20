// La conversación con Brisa (decisión de Mateo, 19 de octubre de 2026): se guarda en el servidor, cifrada, solo para la
// persona y durante 90 días, para que Brisa la retome al volver. Solo texto: lo que la persona escribe y lo que Brisa
// dice; nunca audio (el dictado ocurre en el navegador). Se puede borrar en Mi cuenta y sale en «Descargar mis datos».
// REVISIÓN HUMANA: guarda lo que la persona le cuenta a Brisa.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Consulta, Db } from './db';
import type { Cifrador } from './cifrado';

export const DIAS_HISTORIAL = 90;
export const MAX_HISTORIAL = 80; // lo que se devuelve al abrir la conversación
const MAX_LOTE = 20;
const MAX_TEXTO = 1000;

export type LineaHistorial = { de: 'brisa' | 'yo'; texto: string; fecha: string };

export async function historialDe(db: Db, cifrador: Cifrador, cuenta: string, ahora: Date, limite = MAX_HISTORIAL): Promise<LineaHistorial[]> {
  const filas = await db.query<{ de: 'brisa' | 'yo'; texto: string; creado_en: string }>(
    `select de, texto, creado_en from brisa_mensajes where cuenta_id = $1 and creado_en > $2::timestamptz - make_interval(days => $3)
     order by id desc limit $4`, [cuenta, ahora, DIAS_HISTORIAL, limite]);
  return filas.reverse().flatMap(f => { const t = cifrador.descifrar(f.texto); return t === null ? [] : [{ de: f.de, texto: t, fecha: new Date(f.creado_en).toISOString() }]; });
}

export const borrarHistorialViejo = (db: Consulta, ahora: Date) =>
  db.query(`delete from brisa_mensajes where creado_en < $1::timestamptz - make_interval(days => $2)`, [ahora, DIAS_HISTORIAL]);

export function registrarHistorial(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date, cifrador: Cifrador) {
  const conSesion = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = await cuentaDeSesion(request);
    if (!id) reply.code(401).send({ error: 'Sin sesión.' });
    return id;
  };
  app.get('/api/brisa/historial', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    return historialDe(db, cifrador, id, ahora());
  });
  app.post('/api/brisa/historial', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const lote = (request.body as { mensajes?: unknown } | undefined)?.mensajes;
    if (!Array.isArray(lote) || lote.length > MAX_LOTE) return reply.code(400).send({ error: 'No pude guardar la conversación.' });
    const validos = lote.filter((m): m is { de: 'brisa' | 'yo'; texto: string } =>
      !!m && typeof m === 'object' && ['brisa', 'yo'].includes((m as { de: string }).de) && typeof (m as { texto: unknown }).texto === 'string'
      && (m as { texto: string }).texto.trim().length > 0 && (m as { texto: string }).texto.length <= MAX_TEXTO);
    for (const m of validos) await db.query('insert into brisa_mensajes (cuenta_id, de, texto, creado_en) values ($1, $2, $3, $4)', [id, m.de, cifrador.cifrar(m.texto), ahora()]);
    return { ok: true };
  });
  app.delete('/api/brisa/historial', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    await db.query('delete from brisa_mensajes where cuenta_id = $1', [id]);
    return { ok: true };
  });
}
