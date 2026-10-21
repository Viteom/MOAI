// REVISIÓN HUMANA: nueva memoria privada autorizada, caducidad y acciones confirmadas.
// No lee historial, fichas, mensajes, perfiles de terceros ni estados para inferir preferencias.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Consulta, Db } from './db.js';
import type { Cifrador } from './cifrado.js';
import { planesVisibles } from './comunidad.js';
import { reservarAsistencia, huellaPlan } from './asistencia.js';
import { enInvierno } from './cercania.js';
import { municipios } from '../src/lib/registro.js';
import { coincideConIntencion, interpretarIntencion, normalizarBrisa, validarMemoriaBrisa, VERSION_MEMORIA, type MemoriaBrisa, type ResultadoBrisa } from '../src/lib/brisa-intenciones.js';

type Preparada = { planId: string; lugarId?: string; huella?: string; cuando: string; motivo: string; motivoAccion?: string };
const leer = <T>(c: Cifrador, texto: string): T | null => { try { return JSON.parse(c.descifrar(texto) ?? 'null') as T | null; } catch { return null; } };
export async function memoriaBrisaDe(db: Consulta, c: Cifrador, cuenta: string, ahora: Date): Promise<MemoriaBrisa | null> {
  const [fila] = await db.query<{ datos: string }>('select datos from brisa_memoria where cuenta_id = $1 and vence_en > $2', [cuenta, ahora]);
  return fila ? leer<MemoriaBrisa>(c, fila.datos) : null;
}
export async function borrarBrisaVencido(db: Consulta, ahora: Date) {
  await db.query('delete from brisa_memoria where vence_en <= $1', [ahora]);
  await db.query(`delete from brisa_propuestas where (confirmada_en is null and vence_en <= $1) or confirmada_en <= $1::timestamptz - interval '90 days'`, [ahora]);
  await db.query('delete from brisa_descartes where vence_en <= $1', [ahora]);
}
export async function accionesBrisaDe(db: Consulta, c: Cifrador, cuenta: string, ahora: Date) {
  const filas = await db.query<{ datos: string; confirmada_en: string }>(`select datos, confirmada_en from brisa_propuestas where cuenta_id = $1 and confirmada_en > $2::timestamptz - interval '90 days' order by confirmada_en desc`, [cuenta, ahora]);
  return filas.flatMap(f => { const d = leer<Preparada>(c, f.datos); return d ? [{ accion: 'Sumarte a un plan', planId: d.planId, cuando: d.cuando, motivo: d.motivo, confirmadaEn: new Date(f.confirmada_en).toISOString() }] : []; });
}
export function registrarIntencionesBrisa(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date, c: Cifrador) {
  app.get('/api/brisa/memoria', async (r, reply) => {
    const id = await cuentaDeSesion(r); if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    return { memoria: await memoriaBrisaDe(db, c, id, ahora()) };
  });
  app.post('/api/brisa/memoria', async (r, reply) => {
    const id = await cuentaDeSesion(r); if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    if (!validarMemoriaBrisa(r.body)) return reply.code(400).send({ error: 'Elige actividades y autoriza recordar estas preferencias con el texto vigente.' });
    const b = r.body;
    const fecha = ahora();
    const memoria: MemoriaBrisa = { tipos: b.tipos, dias: b.dias, soloGratis: b.soloGratis, anticipar: b.anticipar, duracion: b.duracion,
      autorizadaEn: fecha.toISOString(), venceEn: new Date(fecha.getTime() + b.duracion * 864e5).toISOString(), version: b.version };
    await db.transaccion(async tx => {
      await tx.query('select id from cuentas where id = $1 for update', [id]);
      await tx.query('insert into brisa_memoria (cuenta_id, datos, vence_en) values ($1, $2, $3) on conflict (cuenta_id) do update set datos = excluded.datos, vence_en = excluded.vence_en', [id, c.cifrar(JSON.stringify(memoria)), memoria.venceEn]);
      await tx.query('delete from brisa_propuestas where cuenta_id = $1 and confirmada_en is null', [id]);
    });
    return { memoria };
  });
  app.delete('/api/brisa/memoria', async (r, reply) => {
    const id = await cuentaDeSesion(r); if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    await db.transaccion(async tx => {
      await tx.query('select id from cuentas where id = $1 for update', [id]);
      await tx.query('delete from brisa_memoria where cuenta_id = $1', [id]);
      await tx.query('delete from brisa_propuestas where cuenta_id = $1 and confirmada_en is null', [id]);
      await tx.query('delete from brisa_descartes where cuenta_id = $1', [id]);
    });
    return { memoria: null };
  });
  app.get('/api/brisa/acciones', async (r, reply) => {
    const id = await cuentaDeSesion(r); if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    return accionesBrisaDe(db, c, id, ahora());
  });
  app.post('/api/brisa/buscar', async (r, reply) => {
    const id = await cuentaDeSesion(r); if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    const b = r.body as Record<string, unknown> | null;
    if (!b || typeof b.texto !== 'string' || b.texto.length > 300 || typeof b.lugarId !== 'string' || typeof b.usarMemoria !== 'boolean' || typeof b.anticipar !== 'boolean')
      return reply.code(400).send({ error: 'Revisa la búsqueda.' });
    if (b.anticipar && b.texto.trim()) return reply.code(400).send({ error: 'Las propuestas al abrir solo usan tus preferencias autorizadas.' });
    // Se serializa con borrar/editar memoria, cambiar ciudad y confirmar. Ninguna solicitud vieja prepara con un permiso revocado.
    return db.transaccion(async tx => {
      await tx.query('select id from cuentas where id = $1 for update', [id]);
      const fecha = ahora();
      const memoria = b.usarMemoria ? await memoriaBrisaDe(tx, c, id, fecha) : null;
      if (memoria && memoria.version !== VERSION_MEMORIA) return reply.code(409).send({ error: 'Revisa y actualiza tu autorización de memoria antes de usar estas preferencias. También puedes buscar sin memoria.' });
      if (b.anticipar && (!memoria?.anticipar || await enInvierno(tx, c, id)))
        return reply.code(409).send({ error: 'Las propuestas al abrir están apagadas o pausadas. Puedes buscar cuando quieras.' });
      const visibles = await planesVisibles(tx, id, fecha);
      if (!visibles || visibles.lugar.id !== b.lugarId) return reply.code(409).send({ error: 'Cambió tu lugar activo. Vuelve a abrir Brisa desde la ciudad elegida.' });
      const t = normalizarBrisa(b.texto as string);
      // Una ciudad escrita nunca cambia el lugar silenciosamente. Nombres ambiguos también requieren el selector.
      const ciudades = municipios.filter(m => m.nombre.length >= 4 && new RegExp(`\\b${normalizarBrisa(m.nombre.split(',')[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t));
      if (ciudades.length && !ciudades.some(m => m.codigo === visibles.lugar.ciudad)) return reply.code(422).send({ error: 'Mencionaste otra ciudad. Elígela en el selector de lugar antes de buscar; no la cambiaré por ti.' });
      const interpretada = interpretarIntencion(b.texto as string, memoria, fecha);
      if (!interpretada.ok) return reply.code(422).send({ error: interpretada.mensaje });
      const descartes = new Set((await tx.query<{ clave: string }>('select clave from brisa_descartes where cuenta_id = $1 and vence_en > $2', [id, fecha])).map(f => f.clave));
      const clave = (plan: { id: string; cuando: string }) => c.ciego(`brisa-descartar:${id}:${plan.id}:${plan.cuando}`);
      const seleccion = visibles.planes.filter(p => coincideConIntencion(p, interpretada.criterios, fecha) && !descartes.has(clave(p))).slice(0, 3);
      // Limita borradores por cuenta. Nunca toca comprobantes de acciones ya confirmadas.
      await tx.query('delete from brisa_propuestas where cuenta_id = $1 and confirmada_en is null', [id]);
      const venceEn = new Date(Math.min(fecha.getTime() + 15 * 60e3, memoria ? new Date(memoria.venceEn).getTime() : Infinity)).toISOString();
      const propuestas: ResultadoBrisa['propuestas'] = [];
      for (const plan of seleccion) {
        const motivo = `Coincide con la actividad y el día elegidos y está disponible desde ${visibles.lugar.zona}. ${interpretada.criterios.fuentes.join(' ')}${interpretada.criterios.soloGratis ? ' El plan está publicado como gratis.' : ''}`;
        const preparada: Preparada = { planId: plan.id, lugarId: visibles.lugar.id, cuando: plan.cuando, huella: huellaPlan(plan), motivo, motivoAccion: interpretada.criterios.fuentes.join(' ') };
        const [fila] = await tx.query<{ id: string }>('insert into brisa_propuestas (cuenta_id, datos, vence_en) values ($1, $2, $3) returning id', [id, c.cifrar(JSON.stringify(preparada)), venceEn]);
        propuestas.push({ id: fila.id, plan, motivo, venceEn });
      }
      return { lugarId: visibles.lugar.id, zona: visibles.lugar.zona, criterios: interpretada.criterios, propuestas,
        mensaje: propuestas.length ? 'Encontré estos planes publicados. Revisa sus detalles; solo te sumas si confirmas.' : 'No encontré coincidencias disponibles en los próximos 30 días. Puedes cambiar la búsqueda o proponer un plan en Mi barrio.' } satisfies ResultadoBrisa;
    });
  });
  app.post<{ Params: { id: string } }>('/api/brisa/propuestas/:id/confirmar', async (r, reply) => {
    const id = await cuentaDeSesion(r); if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    if ((r.body as { confirmo?: unknown } | null)?.confirmo !== true) return reply.code(400).send({ error: 'Confirma que quieres sumarte a este plan.' });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(r.params.id)) return reply.code(404).send({ error: 'Propuesta no disponible.' });
    return db.transaccion(async tx => {
      await tx.query('select id from cuentas where id = $1 for update', [id]);
      const [fila] = await tx.query<{ datos: string; vence_en: string; confirmada_en: string | null }>('select datos, vence_en, confirmada_en from brisa_propuestas where id = $1 and cuenta_id = $2 for update', [r.params.id, id]);
      const preparada = fila && leer<Preparada>(c, fila.datos);
      if (!preparada) return reply.code(404).send({ error: 'Propuesta no disponible.' });
      if (fila.confirmada_en) return { hecha: true, planId: preparada.planId }; // reintento de red, nunca una segunda asistencia
      if (new Date(fila.vence_en) <= ahora()) return reply.code(409).send({ error: 'La propuesta venció. Busca de nuevo antes de confirmar.' });
      if (!preparada.lugarId || !preparada.huella) return reply.code(409).send({ error: 'Busca de nuevo antes de confirmar.' });
      const resultado = await reservarAsistencia(tx, id, ahora(), preparada);
      if (!resultado.ok) return reply.code(409).send({ error: resultado.error });
      // El comprobante solo conserva la acción: no guarda el contexto del lugar activo como historial de ciudades.
      const comprobante = { planId: preparada.planId, cuando: preparada.cuando, motivo: preparada.motivoAccion ?? 'Plan elegido y confirmado por ti.' };
      await tx.query('update brisa_propuestas set confirmada_en = $2, datos = $3 where id = $1', [r.params.id, ahora(), c.cifrar(JSON.stringify(comprobante))]);
      return { hecha: true, planId: resultado.planId };
    });
  });
  app.post<{ Params: { id: string } }>('/api/brisa/propuestas/:id/descartar', async (r, reply) => {
    const id = await cuentaDeSesion(r); if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(r.params.id)) return reply.code(404).send({ error: 'Propuesta no disponible.' });
    return db.transaccion(async tx => {
      await tx.query('select id from cuentas where id = $1 for update', [id]);
      const [fila] = await tx.query<{ datos: string }>('delete from brisa_propuestas where id = $1 and cuenta_id = $2 and confirmada_en is null returning datos', [r.params.id, id]);
      const preparada = fila && leer<Preparada>(c, fila.datos);
      if (!preparada) return reply.code(404).send({ error: 'Propuesta no disponible.' });
      await tx.query('insert into brisa_descartes (cuenta_id, clave, vence_en) values ($1, $2, $3) on conflict (cuenta_id, clave) do update set vence_en = excluded.vence_en',
        [id, c.ciego(`brisa-descartar:${id}:${preparada.planId}:${preparada.cuando}`), new Date(ahora().getTime() + 90 * 864e5)]);
      return { ok: true };
    });
  });
}
