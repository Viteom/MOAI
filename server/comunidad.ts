// Lugares guardados y planes de la comunidad (docs/09, apartado 9).
// REVISIÓN HUMANA: ubicación aproximada guardada (celdas de ~1 km) y lugares de familiares.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { gridDistance } from 'h3-js';
import { alcances, franja, MAX_LUGARES, nombreDeZona, validarLugar, validarPlan, type EntradaLugar, type EntradaPlan } from '../src/lib/lugares';
import type { Lugar, Plan } from '../src/lib/api';
import type { Db } from './db';

type FilaLugar = { id: string; nombre: string; ciudad: string; barrio: string | null; celda: string | null; activo: boolean };
type FilaPlan = { id: string; autor_id: string; autor: string; titulo: string; descripcion: string; cuando: string; lugar_publico: string; ciudad: string; barrio: string | null; celda: string | null; alcance: string; cupo: number | null; voy: boolean; lleno: boolean };

export const aLugar = (l: FilaLugar): Lugar => ({ id: l.id, nombre: l.nombre, ciudad: l.ciudad, barrio: l.barrio, zona: nombreDeZona(l.ciudad, l.barrio), activo: l.activo });

// Anillos H3 entre dos celdas, o null si alguna falta o la distancia no se puede calcular.
function anillos(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  try { return gridDistance(a, b); } catch { return null; }
}

// ¿Puede ver este plan quien está en este lugar? El plan decide su alcance.
export function alcanzaA(plan: { ciudad: string; celda: string | null; alcance: string }, lugar: { ciudad: string; celda: string | null }): { ve: boolean; distancia: number | null } {
  if (plan.ciudad !== lugar.ciudad) return { ve: false, distancia: null };
  const distancia = anillos(plan.celda, lugar.celda);
  const limite = alcances.find(a => a.id === plan.alcance)?.anillos ?? null;
  if (limite === null) return { ve: true, distancia };
  return { ve: distancia !== null && distancia <= limite, distancia };
}

export function registrarComunidad(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date) {
  const conSesion = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = await cuentaDeSesion(request);
    if (!id) void reply.code(401).send({ error: 'Sin sesión.' });
    return id;
  };
  const lugaresDe = async (cuenta: string) => (await db.query<FilaLugar>(
    'select id, nombre, ciudad, barrio, celda, activo from lugares where cuenta_id = $1 order by creado_en', [cuenta])).map(aLugar);

  // ---- Lugares ----
  app.get('/api/lugares', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    return lugaresDe(id);
  });

  app.post('/api/lugares', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const resultado = validarLugar((request.body ?? {}) as Partial<EntradaLugar>);
    if (!resultado.ok) return reply.code(400).send({ errores: resultado.errores });
    const [{ total }] = await db.query<{ total: number }>('select count(*)::int as total from lugares where cuenta_id = $1', [id]);
    if (total >= MAX_LUGARES) return reply.code(400).send({ error: `Puedes guardar hasta ${MAX_LUGARES} lugares. Borra uno para agregar otro.` });
    const { nombre, ciudad, barrio, celda } = resultado.lugar;
    await db.query('insert into lugares (cuenta_id, nombre, ciudad, barrio, celda, activo) values ($1, $2, $3, $4, $5, $6)', [id, nombre, ciudad, barrio, celda, total === 0]);
    return lugaresDe(id);
  });

  app.post<{ Params: { lugar: string } }>('/api/lugares/:lugar/activar', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const [existe] = await db.query('select id from lugares where id = $1 and cuenta_id = $2', [request.params.lugar, id]);
    if (!existe) return reply.code(404).send({ error: 'No encontramos ese lugar.' });
    await db.query('update lugares set activo = false where cuenta_id = $1 and activo', [id]);
    await db.query('update lugares set activo = true where id = $1', [request.params.lugar]);
    return lugaresDe(id);
  });

  app.delete<{ Params: { lugar: string } }>('/api/lugares/:lugar', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const [borrado] = await db.query<{ activo: boolean }>('delete from lugares where id = $1 and cuenta_id = $2 returning activo', [request.params.lugar, id]);
    if (!borrado) return reply.code(404).send({ error: 'No encontramos ese lugar.' });
    if (borrado.activo) await db.query('update lugares set activo = true where id = (select id from lugares where cuenta_id = $1 order by creado_en limit 1)', [id]);
    return lugaresDe(id);
  });

  // ---- Planes ----
  const planesVisibles = async (cuenta: string): Promise<Plan[] | null> => {
    const [lugar] = await db.query<FilaLugar>('select id, nombre, ciudad, barrio, celda, activo from lugares where cuenta_id = $1 and activo', [cuenta]);
    if (!lugar) return null;
    const filas = await db.query<FilaPlan>(
      `select p.id, p.autor_id, split_part(c.nombre, ' ', 1) as autor, p.titulo, p.descripcion, p.cuando, p.lugar_publico, p.ciudad, p.barrio, p.celda, p.alcance, p.cupo,
              exists (select 1 from plan_asistentes a where a.plan_id = p.id and a.cuenta_id = $1) as voy,
              p.cupo is not null and (select count(*) from plan_asistentes a where a.plan_id = p.id) >= p.cupo as lleno
       from planes p join cuentas c on c.id = p.autor_id
       where p.ciudad = $2 and p.cancelado_en is null and p.cuando > $3
       order by p.cuando`, [cuenta, lugar.ciudad, ahora()]);
    const visibles: Plan[] = [];
    for (const p of filas) {
      const mio = p.autor_id === cuenta;
      const { ve, distancia } = alcanzaA(p, lugar);
      if (!ve && !mio && !p.voy) continue;
      visibles.push({
        id: p.id, titulo: p.titulo, descripcion: p.descripcion, cuando: new Date(p.cuando).toISOString(), lugarPublico: p.lugar_publico,
        zona: nombreDeZona(p.ciudad, p.barrio), franja: franja(distancia), alcance: p.alcance as Plan['alcance'],
        autor: mio ? 'Tú' : p.autor, mio, voy: p.voy, lleno: p.lleno,
        // Quién va: solo lo ve quien propuso el plan, y solo los primeros nombres (sin contadores, regla 5).
        asistentes: mio ? (await db.query<{ nombre: string }>(`select split_part(c.nombre, ' ', 1) as nombre from plan_asistentes a join cuentas c on c.id = a.cuenta_id where a.plan_id = $1 order by a.unido_en`, [p.id])).map(a => a.nombre) : undefined,
      });
    }
    return visibles;
  };

  app.get('/api/planes', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const planes = await planesVisibles(id);
    if (!planes) return reply.code(409).send({ error: 'Primero elige un lugar para ver planes cerca de ti.', sinLugar: true });
    return planes;
  });

  app.post('/api/planes', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const resultado = validarPlan((request.body ?? {}) as Partial<EntradaPlan>, ahora());
    if (!resultado.ok) return reply.code(400).send({ errores: resultado.errores });
    const p = resultado.plan;
    await db.query(
      `insert into planes (autor_id, titulo, descripcion, cuando, lugar_publico, ciudad, barrio, celda, alcance, cupo) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, p.titulo, p.descripcion, p.cuando, p.lugarPublico, p.ciudad, p.barrio, p.celda, p.alcance, p.cupo]);
    return (await planesVisibles(id)) ?? [];
  });

  const planDe = async (plan: string) => (await db.query<{ autor_id: string; cupo: number | null; ciudad: string; celda: string | null; alcance: string; cuando: string; cancelado_en: string | null }>(
    'select autor_id, cupo, ciudad, celda, alcance, cuando, cancelado_en from planes where id = $1', [plan]))[0];

  app.post<{ Params: { plan: string } }>('/api/planes/:plan/ir', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const plan = await planDe(request.params.plan);
    const [lugar] = await db.query<FilaLugar>('select ciudad, celda from lugares where cuenta_id = $1 and activo', [id]);
    if (!plan || plan.cancelado_en || new Date(plan.cuando) <= ahora() || !lugar || !alcanzaA(plan, lugar).ve) return reply.code(404).send({ error: 'Este plan ya no está disponible.' });
    if (plan.cupo !== null) {
      const [{ total }] = await db.query<{ total: number }>('select count(*)::int as total from plan_asistentes where plan_id = $1', [request.params.plan]);
      if (total >= plan.cupo) return reply.code(409).send({ error: 'Este plan ya está completo.' });
    }
    await db.query('insert into plan_asistentes (plan_id, cuenta_id) values ($1, $2) on conflict do nothing', [request.params.plan, id]);
    return (await planesVisibles(id)) ?? [];
  });

  app.post<{ Params: { plan: string } }>('/api/planes/:plan/no-ir', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    await db.query('delete from plan_asistentes where plan_id = $1 and cuenta_id = $2', [request.params.plan, id]);
    return (await planesVisibles(id)) ?? [];
  });

  app.post<{ Params: { plan: string } }>('/api/planes/:plan/cancelar', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const plan = await planDe(request.params.plan);
    if (!plan || plan.autor_id !== id) return reply.code(404).send({ error: 'No encontramos ese plan.' });
    await db.query('update planes set cancelado_en = now() where id = $1', [request.params.plan]);
    return (await planesVisibles(id)) ?? [];
  });
}
