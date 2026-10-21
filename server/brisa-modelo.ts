// REVISIÓN HUMANA: consentimiento por frase ficticia y prueba de su envío. No conserva frase ni respuesta.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Db } from './db.js';
import { VERSION_LENGUAJE, type CapacidadLenguaje } from '../src/lib/lenguaje-brisa.js';
import { normalizarExtraccion, revisarFraseModelo, type ProveedorBrisa } from './lenguaje-brisa.js';

export const LIMITE_CUENTA_MODELO = 10;
export const LIMITE_GLOBAL_MODELO = 100;
export function registrarModeloBrisa(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date, proveedor: ProveedorBrisa | null) {
  app.get('/api/brisa/modelo', async (r, reply) => {
    const id = await cuentaDeSesion(r); if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    return { disponible: !!proveedor, conversa: !!proveedor?.conversar, proveedor: 'Gemini', soloPruebas: true, version: VERSION_LENGUAJE } satisfies CapacidadLenguaje;
  });
  app.post('/api/brisa/interpretar', async (r, reply) => {
    const id = await cuentaDeSesion(r); if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    const b = r.body as Record<string, unknown> | null;
    if (!b || typeof b.frase !== 'string' || !b.frase.trim() || b.frase.length > 300) return reply.code(400).send({ error: 'Escribe una frase de hasta 300 caracteres.' });
    if (b.autorizo !== VERSION_LENGUAJE || b.datosFicticios !== true) return reply.code(400).send({ error: 'Confirma que usas una frase ficticia y autorizas este envío a Google (Gemini).' });
    if (!proveedor) return reply.code(503).send({ error: 'Gemini aún no está activado. Puedes buscar directamente con las reglas de MOAI.' });
    const aviso = revisarFraseModelo(b.frase);
    if (aviso) return reply.code(422).send({ error: aviso });
    // El candado solo protege la reserva de cuota. Ninguna transacción queda abierta esperando al proveedor.
    const uso = await db.transaccion(async tx => {
      await tx.query("select pg_advisory_xact_lock(hashtext('brisa-cuota-modelo'))");
      const [c] = await tx.query<{ propios: number; globales: number; pendiente: boolean }>(
        `select count(*) filter (where cuenta_id = $1)::int as propios, count(*)::int as globales,
          coalesce(bool_or(cuenta_id = $1 and terminado_en is null and creado_en > $2::timestamptz - interval '20 seconds'), false) as pendiente
         from brisa_interpretaciones where version = $3 and creado_en > $2::timestamptz - interval '24 hours'`, [id, ahora(), VERSION_LENGUAJE]);
      if (c.propios >= LIMITE_CUENTA_MODELO || c.globales >= LIMITE_GLOBAL_MODELO || c.pendiente) return null;
      const [fila] = await tx.query<{ id: string }>(`insert into brisa_interpretaciones (cuenta_id, modelo, version, creado_en) values ($1, $2, $3, $4) returning id`, [id, proveedor.modelo, VERSION_LENGUAJE, ahora()]);
      return fila.id;
    });
    if (!uso) return reply.code(429).send({ error: 'Ya hay una interpretación pendiente o se alcanzó el límite de pruebas. La búsqueda directa sigue disponible.' });
    let salida: ReturnType<typeof normalizarExtraccion>;
    try { salida = normalizarExtraccion(await proveedor.interpretar(b.frase), b.frase); }
    catch {
      await db.query("update brisa_interpretaciones set terminado_en = $2, resultado = 'error' where id = $1", [uso, ahora()]);
      return reply.code(503).send({ error: 'Gemini no pudo interpretar la frase. Puedes reintentar o buscar directamente con las reglas de MOAI.' });
    }
    await db.query('update brisa_interpretaciones set terminado_en = $2, resultado = $3 where id = $1', [uso, ahora(), salida.ok ? 'correcto' : 'rechazado']);
    if (await cuentaDeSesion(r) !== id) return reply.code(401).send({ error: 'Tu sesión cambió. Vuelve a entrar para continuar.' });
    if (!salida.ok) return reply.code(422).send({ error: salida.error });
    return { consulta: salida.consulta, proveedor: 'Gemini', soloPruebas: true };
  });
}
