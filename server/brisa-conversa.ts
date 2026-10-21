// Brisa conversa con un modelo de lenguaje (Mateo, 20 de octubre de 2026: «estamos en etapa de prueba… que esté resuelto»).
// Solo en pruebas y apagado por defecto (BRISA_GEMINI_CONVERSA=true). Al modelo llegan los últimos turnos de texto de la
// conversación y, si la hay, la pregunta que Brisa acababa de hacer: nunca nombre, correo, ciudad, lugares, memoria,
// fichas, Moais ni planes. Las acciones (planes, red de apoyo, tarjeta) siguen con el guion y su confirmación.
// MOAI no guarda la respuesta aparte: queda en el historial cifrado como cualquier mensaje de Brisa.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Db } from './db.js';
import type { ProveedorBrisa, TurnoBrisa } from './lenguaje-brisa.js';

export const VERSION_CONVERSA = 'conversa-v1';
export const LIMITE_CUENTA_CONVERSA = 80;
export const LIMITE_GLOBAL_CONVERSA = 800;
const MAX_TURNOS = 12;
const RIESGO = /suicid|matarme|quitarme la vida|no quiero vivir|me quiero morir|hacerme da[ñn]o|no aguanto m[aá]s/i;

export function registrarConversaBrisa(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date, proveedor: ProveedorBrisa | null) {
  app.post('/api/brisa/conversar', async (r, reply) => {
    const id = await cuentaDeSesion(r); if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    if (!proveedor?.conversar) return reply.code(503).send({ error: 'La conversación con el modelo no está activa.' });
    const b = r.body as { turnos?: unknown; pregunta?: unknown } | null;
    const turnos = Array.isArray(b?.turnos) ? b.turnos : [];
    const validos = turnos.length >= 1 && turnos.length <= MAX_TURNOS && turnos.every((t): t is TurnoBrisa =>
      !!t && typeof t === 'object' && ((t as TurnoBrisa).de === 'yo' || (t as TurnoBrisa).de === 'brisa')
      && typeof (t as TurnoBrisa).texto === 'string' && (t as TurnoBrisa).texto.trim().length > 0 && (t as TurnoBrisa).texto.length <= 600);
    const pregunta = typeof b?.pregunta === 'string' && b.pregunta.length <= 200 ? b.pregunta : null;
    if (!validos || (turnos.at(-1) as TurnoBrisa).de !== 'yo') return reply.code(400).send({ error: 'Conversación inválida.' });
    // El riesgo se atiende siempre con el mensaje humano verificado, sin pasar por el modelo (regla 11).
    if (RIESGO.test((turnos.at(-1) as TurnoBrisa).texto)) return { respuesta: 'Gracias por contármelo. Si estás en peligro ahora, llama a la línea de emergencias 123, y si puedes, busca ya a una persona de confianza. Aquí sigo contigo.', local: true };

    const uso = await db.transaccion(async tx => {
      await tx.query("select pg_advisory_xact_lock(hashtext('brisa-cuota-conversa'))");
      const [c] = await tx.query<{ propios: number; globales: number }>(
        `select count(*) filter (where cuenta_id = $1)::int as propios, count(*)::int as globales
         from brisa_interpretaciones where version = $3 and creado_en > $2::timestamptz - interval '24 hours'`, [id, ahora(), VERSION_CONVERSA]);
      if (c.propios >= LIMITE_CUENTA_CONVERSA || c.globales >= LIMITE_GLOBAL_CONVERSA) return null;
      const [fila] = await tx.query<{ id: string }>('insert into brisa_interpretaciones (cuenta_id, modelo, version, creado_en) values ($1, $2, $3, $4) returning id', [id, proveedor.modelo, VERSION_CONVERSA, ahora()]);
      return fila.id;
    });
    if (!uso) return reply.code(429).send({ error: 'Por hoy Brisa ya conversó mucho con el modelo de pruebas.' });
    try {
      const salida = await proveedor.conversar(turnos as TurnoBrisa[], pregunta) as { respuesta?: unknown } | null;
      const respuesta = typeof salida?.respuesta === 'string' ? salida.respuesta.replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim() : '';
      if (!respuesta || respuesta.length > 600) throw new Error('respuesta inválida');
      await db.query("update brisa_interpretaciones set terminado_en = $2, resultado = 'correcto' where id = $1", [uso, ahora()]);
      return { respuesta };
    } catch {
      await db.query("update brisa_interpretaciones set terminado_en = $2, resultado = 'error' where id = $1", [uso, ahora()]);
      return reply.code(503).send({ error: 'El modelo no respondió.' });
    }
  });
}
