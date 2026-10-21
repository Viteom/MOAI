// Sin temporizadores en funciones efímeras. El programador externo debe invocar esta ruta cada seis horas.
import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Db } from './db.js';
import type { Cifrador } from './cifrado.js';
import type { Correo, Recordar } from './envios.js';
import { borrarConversacionesViejas, mantener, resumenSemanal } from './mantenimiento.js';

export const RUTA_MANTENIMIENTO = '/api/interno/mantenimiento';
export function registrarTareasVercel(app: FastifyInstance, opciones: {
  db: Db; secreto: string; recordar: Recordar; correo: Correo; urlApp: string; cifrador: Cifrador;
}) {
  app.get(RUTA_MANTENIMIENTO, async (request, reply) => {
    const recibido = Buffer.from(request.headers.authorization ?? '');
    const esperado = Buffer.from(`Bearer ${opciones.secreto}`);
    if (recibido.length !== esperado.length || !timingSafeEqual(recibido, esperado)) {
      return reply.code(401).send({ error: 'Sin autorización.' });
    }
    // Una sola tarea en toda la base, aunque lleguen dos invocaciones a distintas instancias.
    // Para la beta pequeña. Antes de crecer, separar envíos en una cola con reintentos e idempotencia.
    const ejecutada = await opciones.db.transaccion(async tx => {
      const [{ tomado }] = await tx.query<{ tomado: boolean }>("select pg_try_advisory_xact_lock(hashtext('moai:mantenimiento')) as tomado");
      if (!tomado) return false;
      const ahora = new Date();
      await borrarConversacionesViejas(tx, ahora);
      await mantener(tx, opciones.recordar);
      await resumenSemanal(tx, opciones.correo, ahora, opciones.urlApp, opciones.cifrador);
      return true;
    });
    return ejecutada ? { ok: true } : reply.code(409).send({ error: 'El mantenimiento ya está en curso.' });
  });
}
