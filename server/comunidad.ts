// Lugares guardados, planes de barrio, conversación del plan y cartas de Brisa (docs/09, apartado 9).
// REVISIÓN HUMANA: ubicación aproximada guardada (celdas de ~1 km), lugares de familiares y mensajes entre vecinos.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { gridDistance } from 'h3-js';
import {
  alcances, franja, MAX_LUGARES, nombreDeZona, nombreTipo, proximaOcurrencia, tipos, ultimaOcurrencia, validarLugar, validarPlan,
  type EntradaLugar, type EntradaPlan, type Repite, type Tipo,
} from '../src/lib/lugares';
import type { Carta, Lugar, Mensaje, Plan, Preferencias } from '../src/lib/api';
import type { Db } from './db';

type FilaLugar = { id: string; nombre: string; ciudad: string; barrio: string | null; celda: string | null; activo: boolean };
type FilaPlan = {
  id: string; autor_id: string; autor: string; titulo: string; descripcion: string; cuando: string; lugar_publico: string; ciudad: string;
  barrio: string | null; celda: string | null; alcance: string; cupo: number | null; tipo: Tipo; repite: Repite;
};
const ZONA_HORARIA = 'America/Bogota';
const MAX_MENSAJE = 500;

export const aLugar = (l: FilaLugar): Lugar => ({ id: l.id, nombre: l.nombre, ciudad: l.ciudad, barrio: l.barrio, zona: nombreDeZona(l.ciudad, l.barrio), activo: l.activo });

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

const hora = (fecha: Date) => new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: ZONA_HORARIA }).format(fecha);
const dia = (fecha: Date) => new Intl.DateTimeFormat('es-CO', { weekday: 'long', timeZone: ZONA_HORARIA }).format(fecha);
export const cuandoLegible = (fecha: Date) => new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: ZONA_HORARIA }).format(fecha);

// Planes que ve una persona desde su lugar activo, con la próxima ocurrencia de cada uno.
export async function planesVisibles(db: Db, cuenta: string, ahora: Date): Promise<{ lugar: Lugar; planes: Plan[] } | null> {
  const [lugar] = await db.query<FilaLugar>('select id, nombre, ciudad, barrio, celda, activo from lugares where cuenta_id = $1 and activo', [cuenta]);
  if (!lugar) return null;
  const filas = await db.query<FilaPlan>(
    `select p.id, p.autor_id, split_part(c.nombre, ' ', 1) as autor, p.titulo, p.descripcion, p.cuando, p.lugar_publico, p.ciudad, p.barrio, p.celda,
            p.alcance, p.cupo, p.tipo, p.repite
     from planes p join cuentas c on c.id = p.autor_id
     where p.ciudad = $1 and p.cancelado_en is null and (p.repite is not null or p.cuando > $2)`, [lugar.ciudad, ahora]);
  const planes: Plan[] = [];
  for (const p of filas) {
    const proxima = proximaOcurrencia(new Date(p.cuando), p.repite, ahora);
    if (!proxima) continue;
    const mio = p.autor_id === cuenta;
    const van = await db.query<{ cuenta_id: string; nombre: string }>(
      `select a.cuenta_id, split_part(c.nombre, ' ', 1) as nombre from asistencias a join cuentas c on c.id = a.cuenta_id
       where a.plan_id = $1 and a.ocurrencia = $2 order by a.unido_en`, [p.id, proxima]);
    const voy = van.some(v => v.cuenta_id === cuenta);
    const { ve, distancia } = alcanzaA(p, lugar);
    if (!ve && !mio && !voy) continue;
    planes.push({
      id: p.id, titulo: p.titulo, descripcion: p.descripcion, cuando: proxima.toISOString(), lugarPublico: p.lugar_publico,
      zona: nombreDeZona(p.ciudad, p.barrio), franja: franja(distancia), alcance: p.alcance as Plan['alcance'], tipo: p.tipo,
      repite: p.repite, diaRepite: p.repite ? dia(proxima) : null, autor: mio ? 'Tú' : p.autor, mio, voy,
      lleno: p.cupo !== null && van.length >= p.cupo,
      // Quién va: solo lo ve quien propuso el plan, y solo los primeros nombres (sin contadores, regla 5).
      asistentes: mio ? van.map(v => v.nombre) : undefined,
    });
  }
  planes.sort((a, b) => a.cuando.localeCompare(b.cuando));
  return { lugar: aLugar(lugar), planes };
}

// Lo que Brisa le cuenta a la persona en Mi comunidad. Nunca inventa asistentes ni deduce rutinas:
// solo habla de planes que alguien publicó y de lo que la persona eligió (regla 9).
export async function cartasDeBrisa(db: Db, cuenta: string, ahora: Date): Promise<Carta[]> {
  const vistos = new Set((await db.query<{ clave: string }>('select clave from avisos_vistos where cuenta_id = $1', [cuenta])).map(v => v.clave));
  const cartas: Carta[] = [];

  // 1. «Esta vez fuiste por tu cuenta»: planes propios que ya ocurrieron (últimos 3 días) sin que nadie se sumara.
  const propios = await db.query<FilaPlan>(`select id, titulo, cuando, repite from planes where autor_id = $1 and cancelado_en is null and cuando <= $2`, [cuenta, ahora]);
  for (const p of propios) {
    const ultima = ultimaOcurrencia(new Date(p.cuando), p.repite, ahora);
    if (!ultima || ahora.getTime() - ultima.getTime() > 3 * 864e5) continue;
    const clave = `solo:${p.id}:${ultima.toISOString()}`;
    if (vistos.has(clave)) continue;
    const [{ total }] = await db.query<{ total: number }>('select count(*)::int as total from asistencias where plan_id = $1 and ocurrencia = $2', [p.id, ultima]);
    if (total > 0) continue;
    cartas.push(p.repite
      ? { clave, tipo: 'solo', planId: p.id, texto: `Esta vez fuiste por tu cuenta a «${p.titulo}». Tu plan sigue el próximo ${dia(ultima)}: los planes que se repiten suelen encontrar compañía con el tiempo.`, repetir: false }
      : { clave, tipo: 'solo', planId: p.id, texto: `Esta vez fuiste por tu cuenta a «${p.titulo}». Los planes que se repiten suelen encontrar compañía con el tiempo. ¿Lo repetimos cada ${dia(ultima)}?`, repetir: true });
  }

  // 2. Recomendaciones: solo si la persona las activó, y solo de los tipos de plan que eligió.
  const [pref] = await db.query<{ sugerencias: boolean; gustos: string[] }>('select sugerencias, gustos from cuentas where id = $1', [cuenta]);
  if (pref?.sugerencias && pref.gustos.length) {
    const visibles = await planesVisibles(db, cuenta, ahora);
    const pronto = ahora.getTime() + 7 * 864e5;
    for (const plan of visibles?.planes ?? []) {
      if (cartas.filter(c => c.tipo === 'sugerencia').length >= 2) break;
      const clave = `sug:${plan.id}`;
      if (plan.mio || plan.voy || plan.lleno || vistos.has(clave) || !pref.gustos.includes(plan.tipo) || new Date(plan.cuando).getTime() > pronto) continue;
      const fecha = new Date(plan.cuando);
      const cuando = plan.repite ? `los ${dia(fecha)} a las ${hora(fecha)}` : `el ${cuandoLegible(fecha)}`;
      cartas.push({
        clave, tipo: 'sugerencia', planId: plan.id, plan,
        texto: `${plan.autor} invita ${cuando} en ${plan.lugarPublico}: «${plan.titulo}». ¿Te sumas?`,
        motivo: `Porque me pediste que te contara de planes de ${nombreTipo(plan.tipo)} y este llega a ${visibles!.lugar.zona}. Puedes cambiarlo en «Avisos».`,
      });
    }
  }
  return cartas;
}

export function registrarComunidad(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date) {
  const conSesion = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = await cuentaDeSesion(request);
    if (!id) void reply.code(401).send({ error: 'Sin sesión.' });
    return id;
  };
  const lugaresDe = async (cuenta: string) => (await db.query<FilaLugar>(
    'select id, nombre, ciudad, barrio, celda, activo from lugares where cuenta_id = $1 order by creado_en', [cuenta])).map(aLugar);
  const listaDePlanes = async (cuenta: string) => (await planesVisibles(db, cuenta, ahora()))?.planes ?? [];

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
  app.get('/api/planes', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const visibles = await planesVisibles(db, id, ahora());
    if (!visibles) return reply.code(409).send({ error: 'Primero elige un lugar para ver planes cerca de ti.', sinLugar: true });
    return visibles.planes;
  });

  app.get<{ Params: { plan: string } }>('/api/planes/:plan', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const plan = (await listaDePlanes(id)).find(p => p.id === request.params.plan);
    return plan ?? reply.code(404).send({ error: 'Este plan ya no está disponible.' });
  });

  app.post('/api/planes', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const resultado = validarPlan((request.body ?? {}) as Partial<EntradaPlan>, ahora());
    if (!resultado.ok) return reply.code(400).send({ errores: resultado.errores });
    const p = resultado.plan;
    await db.query(
      `insert into planes (autor_id, titulo, descripcion, cuando, lugar_publico, ciudad, barrio, celda, alcance, cupo, tipo, repite) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, p.titulo, p.descripcion, p.cuando, p.lugarPublico, p.ciudad, p.barrio, p.celda, p.alcance, p.cupo, p.tipo, p.repite]);
    return listaDePlanes(id);
  });

  app.post<{ Params: { plan: string } }>('/api/planes/:plan/ir', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const plan = (await listaDePlanes(id)).find(p => p.id === request.params.plan);
    if (!plan || plan.mio) return reply.code(404).send({ error: 'Este plan ya no está disponible.' });
    if (plan.lleno && !plan.voy) return reply.code(409).send({ error: 'Este plan ya está completo.' });
    await db.query('insert into asistencias (plan_id, cuenta_id, ocurrencia) values ($1, $2, $3) on conflict do nothing', [plan.id, id, plan.cuando]);
    return listaDePlanes(id);
  });

  app.post<{ Params: { plan: string } }>('/api/planes/:plan/no-ir', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    await db.query('delete from asistencias where plan_id = $1 and cuenta_id = $2 and ocurrencia > $3', [request.params.plan, id, ahora()]);
    return listaDePlanes(id);
  });

  app.post<{ Params: { plan: string } }>('/api/planes/:plan/cancelar', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const [plan] = await db.query('update planes set cancelado_en = now() where id = $1 and autor_id = $2 returning id', [request.params.plan, id]);
    if (!plan) return reply.code(404).send({ error: 'No encontramos ese plan.' });
    return listaDePlanes(id);
  });

  // Convierte un plan que ya pasó en uno semanal, a partir de la próxima semana.
  app.post<{ Params: { plan: string } }>('/api/planes/:plan/repetir', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const [plan] = await db.query<{ cuando: string }>('select cuando from planes where id = $1 and autor_id = $2 and repite is null', [request.params.plan, id]);
    if (!plan) return reply.code(404).send({ error: 'No encontramos ese plan.' });
    await db.query(`update planes set repite = 'semanal', cancelado_en = null where id = $1`, [request.params.plan]);
    return listaDePlanes(id);
  });

  // ---- Conversación del plan: solo para quien lo propuso y quienes se sumaron ----
  // Brisa nunca lee estos mensajes (regla 6); se borran 30 días después del plan (mantenimiento).
  const puedeConversar = async (cuenta: string, plan: string) => {
    const p = (await listaDePlanes(cuenta)).find(x => x.id === plan);
    if (p && (p.mio || p.voy)) return true;
    const [antes] = await db.query('select 1 from asistencias where plan_id = $1 and cuenta_id = $2', [plan, cuenta]);
    return !!antes;
  };
  const mensajesDe = async (cuenta: string, plan: string): Promise<Mensaje[]> => (await db.query<{ id: string; autor_id: string; autor: string; texto: string; creado_en: string }>(
    `select m.id::text, m.autor_id, split_part(c.nombre, ' ', 1) as autor, m.texto, m.creado_en from plan_mensajes m join cuentas c on c.id = m.autor_id
     where m.plan_id = $1 order by m.creado_en, m.id`, [plan])).map(m => ({ id: m.id, autor: m.autor_id === cuenta ? 'Tú' : m.autor, mio: m.autor_id === cuenta, texto: m.texto, creado: new Date(m.creado_en).toISOString() }));

  app.get<{ Params: { plan: string } }>('/api/planes/:plan/mensajes', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    if (!(await puedeConversar(id, request.params.plan))) return reply.code(403).send({ error: 'Cuando te sumes al plan, podrás hablar con quienes van.' });
    return mensajesDe(id, request.params.plan);
  });

  app.post<{ Params: { plan: string } }>('/api/planes/:plan/mensajes', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    if (!(await puedeConversar(id, request.params.plan))) return reply.code(403).send({ error: 'Cuando te sumes al plan, podrás hablar con quienes van.' });
    const texto = String((request.body as { texto?: string } | undefined)?.texto ?? '').trim();
    if (!texto) return reply.code(400).send({ error: 'Escribe algo antes de enviar.' });
    if (texto.length > MAX_MENSAJE) return reply.code(400).send({ error: 'Ese mensaje es muy largo. Escríbelo en dos partes.' });
    await db.query('insert into plan_mensajes (plan_id, autor_id, texto) values ($1, $2, $3)', [request.params.plan, id, texto]);
    return mensajesDe(id, request.params.plan);
  });

  // ---- Brisa y avisos ----
  app.get('/api/brisa', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    return cartasDeBrisa(db, id, ahora());
  });

  app.post('/api/brisa/visto', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const clave = String((request.body as { clave?: string } | undefined)?.clave ?? '').slice(0, 200);
    if (clave) await db.query('insert into avisos_vistos (cuenta_id, clave) values ($1, $2) on conflict do nothing', [id, clave]);
    return cartasDeBrisa(db, id, ahora());
  });

  const preferenciasDe = async (cuenta: string): Promise<Preferencias> => {
    const [p] = await db.query<{ sugerencias: boolean; gustos: string[]; resumen_semanal: boolean }>('select sugerencias, gustos, resumen_semanal from cuentas where id = $1', [cuenta]);
    return { sugerencias: p.sugerencias, gustos: p.gustos as Tipo[], resumenSemanal: p.resumen_semanal };
  };
  app.get('/api/preferencias', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    return preferenciasDe(id);
  });
  app.post('/api/preferencias', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const body = (request.body ?? {}) as Partial<Preferencias>;
    const gustos = (Array.isArray(body.gustos) ? body.gustos : []).filter((g): g is Tipo => tipos.includes(g as Tipo));
    await db.query('update cuentas set sugerencias = $2, gustos = $3, resumen_semanal = $4 where id = $1', [id, body.sugerencias === true, [...new Set(gustos)], body.resumenSemanal === true]);
    return preferenciasDe(id);
  });
}
