// Lugares guardados, planes de barrio, conversación del plan y cartas de Brisa (docs/09, apartado 9).
// REVISIÓN HUMANA: ubicación aproximada guardada (celdas de ~1 km), lugares de familiares y mensajes entre vecinos.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { cellToBoundary, cellToLatLng, gridDisk, gridDistance } from 'h3-js';
import {
  alcances, barriosMedellin, franja, MAX_LUGARES, nombreDeZona, nombreTipo, proximaOcurrencia, tipos, ultimaOcurrencia, validarLugar, validarPlan,
  type Costo, type EntradaLugar, type EntradaPlan, type Repite, type Tipo,
} from '../src/lib/lugares';
import type { Carta, Lugar, Mapa, Mensaje, Plan, Preferencias } from '../src/lib/api';
import type { Db } from './db';
import { enPausa, type Refs } from './personas';
import { cartasDeGente } from './moais';
import { MAX_DETALLE_REPORTE, mensajePausa, motivosReporte } from '../src/lib/moai';
import { revisarMensaje } from '../src/lib/moderacion';
import { MAX_CUPO_CONVOCATORIA, MAX_CUPO_PLAN, type TipoOrganizacion } from '../src/lib/organizaciones';
import { organizacionesDe } from './equipo';
import { cartaInterna, cartaRepetirCuidado } from './cuidado';
import { cartasDeCercania, enInvierno } from './cercania';
import type { Cifrador } from './cifrado';

type FilaLugar = { id: string; nombre: string; ciudad: string; barrio: string | null; celda: string | null; activo: boolean };
type FilaPlan = {
  id: string; autor_id: string; autor: string; titulo: string; descripcion: string; cuando: string; lugar_publico: string; ciudad: string;
  barrio: string | null; celda: string | null; alcance: string; cupo: number | null; tipo: Tipo; repite: Repite;
  org_nombre?: string | null; org_tipo?: TipoOrganizacion | null; costo: Costo; moai_id: string | null; moai_nombre: string | null;
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
// «domingo» → «domingos»; «martes» se queda igual.
const enPlural = (dia: string) => dia.endsWith('s') ? dia : `${dia}s`;
const dia = (fecha: Date) =>new Intl.DateTimeFormat('es-CO', { weekday: 'long', timeZone: ZONA_HORARIA }).format(fecha);
export const cuandoLegible = (fecha: Date) => new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: ZONA_HORARIA }).format(fecha);

// Planes que ve una persona desde su lugar activo, con la próxima ocurrencia de cada uno.
// Con `refs`, cada plan ajeno lleva una referencia a su autor para poder reportarlo o bloquearlo.
// `participando` (revisión de Codex): incluye los planes que ya empezaron o pasaron (hasta 30 días) para quien los
// propuso o se sumó, para que no pierdan el plan ni su conversación justo cuando se encuentran. No sirve para descubrir planes.
export async function planesVisibles(db: Db, cuenta: string, ahora: Date, refs?: Refs, { participando = false } = {}): Promise<{ lugar: Lugar; planes: Plan[] } | null> {
  const [lugar] = await db.query<FilaLugar>('select id, nombre, ciudad, barrio, celda, activo from lugares where cuenta_id = $1 and activo', [cuenta]);
  if (!lugar) return null;
  const filas = await db.query<FilaPlan>(
    `select p.id, p.autor_id, split_part(c.nombre, ' ', 1) as autor, p.titulo, p.descripcion, p.cuando, p.lugar_publico, p.ciudad, p.barrio, p.celda,
            p.alcance, p.cupo, p.tipo, p.repite, p.costo, p.moai_id, mo.nombre as moai_nombre, o.nombre as org_nombre, o.tipo as org_tipo
     from planes p join cuentas c on c.id = p.autor_id left join organizaciones o on o.id = p.organizacion_id left join moais mo on mo.id = p.moai_id
     where (p.ciudad = $1 or p.moai_id is not null) and p.cancelado_en is null
       -- un encuentro de un Moai solo lo ven sus miembros, estén donde estén
       and (p.moai_id is null or exists (select 1 from moai_miembros mm where mm.moai_id = p.moai_id and mm.cuenta_id = $3))
       and (p.repite is not null or p.cuando > $2 or ($4 and p.cuando > $2::timestamptz - interval '30 days'
            and (p.autor_id = $3 or exists (select 1 from asistencias x where x.plan_id = p.id and x.cuenta_id = $3))))
       and c.suspendida_en is null and (p.organizacion_id is null or o.activa)
       and not exists (select 1 from bloqueos b where (b.de = $3 and b.a = p.autor_id) or (b.de = p.autor_id and b.a = $3))`, [lugar.ciudad, ahora, cuenta, participando]);
  const planes: Plan[] = [];
  for (const p of filas) {
    // La ocurrencia vigente: la próxima o, para quien participa, la que acaba de empezar (6 horas) o ya pasó (planes de una vez).
    const ultima = participando ? ultimaOcurrencia(new Date(p.cuando), p.repite, ahora) : null;
    const enCurso = ultima && (p.repite === null || ahora.getTime() - ultima.getTime() < 6 * 3600e3);
    const proxima = enCurso ? ultima : proximaOcurrencia(new Date(p.cuando), p.repite, ahora);
    if (!proxima) continue;
    const mio = p.autor_id === cuenta;
    const van = await db.query<{ cuenta_id: string; nombre: string }>(
      `select a.cuenta_id, split_part(c.nombre, ' ', 1) as nombre from asistencias a join cuentas c on c.id = a.cuenta_id
       where a.plan_id = $1 and a.ocurrencia = $2 order by a.unido_en`, [p.id, proxima]);
    const voy = van.some(v => v.cuenta_id === cuenta);
    const { ve, distancia } = alcanzaA(p, lugar);
    if (!ve && !mio && !voy && !p.moai_id) continue;
    if (enCurso && !mio && !voy) continue; // lo que ya empezó solo lo siguen viendo quienes participan
    planes.push({
      id: p.id, titulo: p.titulo, descripcion: p.descripcion, cuando: proxima.toISOString(), lugarPublico: p.lugar_publico,
      zona: nombreDeZona(p.ciudad, p.barrio), franja: franja(distancia), alcance: p.alcance as Plan['alcance'], tipo: p.tipo,
      repite: p.repite, diaRepite: p.repite ? enPlural(dia(proxima)) : null, autor: p.org_nombre ?? (mio ? 'Tú' : p.autor), organizacion: p.org_nombre && p.org_tipo ? { nombre: p.org_nombre, tipo: p.org_tipo } : undefined, autorRef: mio || !refs ? undefined : refs.ref(cuenta, p.autor_id), mio, voy,
      lleno: p.cupo !== null && van.length >= p.cupo,
      // Quién va: solo lo ve quien propuso el plan, y solo los primeros nombres (sin contadores, regla 5).
      asistentes: mio ? van.map(v => v.nombre) : undefined,
      costo: p.costo, moai: p.moai_id && p.moai_nombre ? { id: p.moai_id, nombre: p.moai_nombre } : undefined,
    });
  }
  planes.sort((a, b) => a.cuando.localeCompare(b.cuando));
  return { lugar: aLugar(lugar), planes };
}

// Lo que Brisa le cuenta a la persona en Mi comunidad. Nunca inventa asistentes ni deduce rutinas:
// solo habla de planes que alguien publicó y de lo que la persona eligió (regla 9).
export async function cartasDeBrisa(db: Db, cuenta: string, ahora: Date, refs?: Refs, cifrador?: Cifrador): Promise<Carta[]> {
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
  // En invierno Brisa baja el ritmo: no sugiere planes ni Moais.
  const invierno = cifrador ? await enInvierno(db, cifrador, cuenta) : false;
  const [pref] = await db.query<{ sugerencias: boolean; gustos: string[] }>('select sugerencias, gustos from cuentas where id = $1', [cuenta]);
  if (pref?.sugerencias && pref.gustos.length && !invierno) {
    const visibles = await planesVisibles(db, cuenta, ahora);
    const pronto = ahora.getTime() + 7 * 864e5;
    for (const plan of visibles?.planes ?? []) {
      if (cartas.filter(c => c.tipo === 'sugerencia').length >= 2) break;
      const clave = `sug:${plan.id}`;
      if (plan.mio || plan.voy || plan.lleno || vistos.has(clave) || !pref.gustos.includes(plan.tipo) || new Date(plan.cuando).getTime() > pronto) continue;
      const fecha = new Date(plan.cuando);
      const cuando = plan.repite ? `los ${enPlural(dia(fecha))} a las ${hora(fecha)}` : `el ${cuandoLegible(fecha)}`;
      cartas.push({
        clave, tipo: 'sugerencia', planId: plan.id, plan,
        texto: `${plan.autor} invita ${cuando} en ${plan.lugarPublico}: «${plan.titulo}». ¿Te sumas?`,
        motivo: `Porque me pediste que te contara de planes de ${nombreTipo(plan.tipo)} y este llega a ${visibles!.lugar.zona}. Puedes cambiarlo en «Avisos».`,
      });
    }
  }
  // 3. Mi gente: encuentros por confirmar, invitaciones y, si la persona activó sugerencias, proponer un Moai.
  if (refs) cartas.push(...await cartasDeGente(db, cuenta, ahora, refs, vistos, !!pref?.sugerencias && !invierno));
  // 5. Cercanía: saludos de lejos, un invierno que te contaron, puertas abiertas de tu gente.
  if (refs && cifrador) cartas.push(...await cartasDeCercania(db, cuenta, ahora, refs, cifrador, vistos));
  // 4. Moai interno: recordar a alguien que te nutre, como mucho una vez por semana.
  if (cifrador) cartas.push(...await cartaInterna(db, cifrador, cuenta, ahora, vistos));
  if (!invierno) cartas.push(...await cartaRepetirCuidado(db, cuenta, ahora, vistos));
  return cartas;
}

export function registrarComunidad(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date, refs: Refs, cifrador: Cifrador) {
  const conSesion = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = await cuentaDeSesion(request);
    if (!id) void reply.code(401).send({ error: 'Sin sesión.' });
    return id;
  };
  const lugaresDe = async (cuenta: string) => (await db.query<FilaLugar>(
    'select id, nombre, ciudad, barrio, celda, activo from lugares where cuenta_id = $1 order by creado_en', [cuenta])).map(aLugar);
  const listaDePlanes = async (cuenta: string) => (await planesVisibles(db, cuenta, ahora(), refs))?.planes ?? [];
  const planesParticipando = async (cuenta: string) => (await planesVisibles(db, cuenta, ahora(), refs, { participando: true }))?.planes ?? [];

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
    const visibles = await planesVisibles(db, id, ahora(), refs);
    if (!visibles) return reply.code(409).send({ error: 'Primero elige un lugar para ver planes cerca de ti.', sinLugar: true });
    return visibles.planes;
  });

  app.get<{ Params: { plan: string } }>('/api/planes/:plan', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const plan = (await planesParticipando(id)).find(p => p.id === request.params.plan);
    return plan ?? reply.code(404).send({ error: 'Este plan ya no está disponible.' });
  });

  app.post('/api/planes', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    if (await enPausa(db, id, ahora())) return reply.code(403).send({ error: mensajePausa, pausa: true });
    // Convocatoria: solo quien es responsable de una entidad activa puede publicar a su nombre.
    const organizacion = (request.body as { organizacion?: string | null } | undefined)?.organizacion ?? null;
    if (organizacion && !(await organizacionesDe(db, id)).some(o => o.id === organizacion)) return reply.code(403).send({ error: 'No puedes publicar a nombre de esa entidad.' });
    // Un encuentro para un Moai: solo lo propone alguien del Moai, y solo lo verán sus miembros.
    const moai = (request.body as { moai?: string | null } | undefined)?.moai ?? null;
    if (moai && (organizacion || !(await db.query('select 1 from moai_miembros where moai_id = $1 and cuenta_id = $2', [moai, id]))[0])) return reply.code(403).send({ error: 'Solo puedes proponer encuentros en tus Moais.' });
    const resultado = validarPlan((request.body ?? {}) as Partial<EntradaPlan>, ahora(), { maxCupo: organizacion ? MAX_CUPO_CONVOCATORIA : MAX_CUPO_PLAN });
    if (!resultado.ok) return reply.code(400).send({ errores: resultado.errores });
    const p = resultado.plan;
    await db.query(
      `insert into planes (autor_id, titulo, descripcion, cuando, lugar_publico, ciudad, barrio, celda, alcance, cupo, tipo, repite, organizacion_id, costo, moai_id) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [id, p.titulo, p.descripcion, p.cuando, p.lugarPublico, p.ciudad, p.barrio, p.celda, p.alcance, p.cupo, p.tipo, p.repite, organizacion, p.costo, moai]);
    return listaDePlanes(id);
  });

  // Reportar un plan entero (rediseño del 19 de octubre). Va al mismo equipo y cuenta para la pausa de quien lo propuso;
  // el equipo ve el plan tal como lo publicó. Solo se puede reportar un plan que la persona ve y que no es suyo.
  app.post<{ Params: { plan: string } }>('/api/planes/:plan/reportar', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const b = (request.body ?? {}) as { motivo?: string; detalle?: string; bloquear?: boolean };
    if (!motivosReporte.some(m => m.id === b.motivo)) return reply.code(400).send({ errores: { motivo: 'Elige qué pasó.' } });
    const detalle = String(b.detalle ?? '').trim();
    if (detalle.length > MAX_DETALLE_REPORTE) return reply.code(400).send({ errores: { detalle: 'Cuéntalo en menos palabras.' } });
    const visible = (await planesParticipando(id)).find(p => p.id === request.params.plan);
    if (!visible || visible.mio) return reply.code(404).send({ error: 'No encontramos ese plan.' });
    const [fila] = await db.query<{ autor_id: string; titulo: string; descripcion: string; lugar_publico: string }>('select autor_id, titulo, descripcion, lugar_publico from planes where id = $1', [visible.id]);
    const texto = `Plan: «${fila.titulo}» en ${fila.lugar_publico}.${fila.descripcion ? ` ${fila.descripcion}` : ''}`;
    await db.query('insert into reportes (de, a, motivo, detalle, mensaje, plan_id, creado_en) values ($1, $2, $3, $4, $5, $6, $7)', [id, fila.autor_id, b.motivo, detalle, texto, visible.id, ahora()]);
    if (b.bloquear === true) await db.query('insert into bloqueos (de, a) values ($1, $2) on conflict do nothing', [id, fila.autor_id]);
    return { ok: true };
  });

  app.post<{ Params: { plan: string } }>('/api/planes/:plan/ir', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const plan = (await listaDePlanes(id)).find(p => p.id === request.params.plan);
    if (!plan || plan.mio) return reply.code(404).send({ error: 'Este plan ya no está disponible.' });
    // El último cupo se reserva de forma atómica (revisión de Codex): un candado por plan mientras se cuenta y se inserta.
    const lleno = await db.transaccion(async tx => {
      await tx.query('select pg_advisory_xact_lock(hashtext($1))', [plan.id]);
      const [{ cupo, van }] = await tx.query<{ cupo: number | null; van: number }>(
        'select p.cupo, (select count(*)::int from asistencias a where a.plan_id = p.id and a.ocurrencia = $2 and a.cuenta_id <> $3) as van from planes p where p.id = $1', [plan.id, plan.cuando, id]);
      if (cupo !== null && van >= cupo) return true;
      await tx.query('insert into asistencias (plan_id, cuenta_id, ocurrencia) values ($1, $2, $3) on conflict do nothing', [plan.id, id, plan.cuando]);
      return false;
    });
    if (lleno) return reply.code(409).send({ error: 'Este plan ya está completo.' });
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
    // Solo quien propuso el plan o quien va a la ocurrencia vigente (revisión de Codex): haber ido una vez a un plan
    // semanal no da acceso para siempre.
    const p = (await planesParticipando(cuenta)).find(x => x.id === plan);
    return !!p && (p.mio || p.voy);
  };
  const mensajesDe = async (cuenta: string, plan: string): Promise<Mensaje[]> => (await db.query<{ id: string; autor_id: string; autor: string; texto: string; creado_en: string }>(
    `select m.id::text, m.autor_id, split_part(c.nombre, ' ', 1) as autor, m.texto, m.creado_en from plan_mensajes m join cuentas c on c.id = m.autor_id
     where m.plan_id = $1 order by m.creado_en, m.id`, [plan])).map(m => ({ id: m.id, autor: m.autor_id === cuenta ? 'Tú' : m.autor, autorRef: m.autor_id === cuenta ? undefined : refs.ref(cuenta, m.autor_id), mio: m.autor_id === cuenta, texto: m.texto, creado: new Date(m.creado_en).toISOString() }));

  app.get<{ Params: { plan: string } }>('/api/planes/:plan/mensajes', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    if (!(await puedeConversar(id, request.params.plan))) return reply.code(403).send({ error: 'Cuando te sumes al plan, podrás hablar con quienes van.' });
    return mensajesDe(id, request.params.plan);
  });

  app.post<{ Params: { plan: string } }>('/api/planes/:plan/mensajes', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    if (!(await puedeConversar(id, request.params.plan))) return reply.code(403).send({ error: 'Cuando te sumes al plan, podrás hablar con quienes van.' });
    if (await enPausa(db, id, ahora())) return reply.code(403).send({ error: mensajePausa, pausa: true });
    const texto = String((request.body as { texto?: string } | undefined)?.texto ?? '').trim();
    if (!texto) return reply.code(400).send({ error: 'Escribe algo antes de enviar.' });
    if (texto.length > MAX_MENSAJE) return reply.code(400).send({ error: 'Ese mensaje es muy largo. Escríbelo en dos partes.' });
    // Revisión antes de enviar (sin IA, nada se guarda): lo grave no se envía; lo riesgoso se avisa y se puede confirmar.
    const revision = revisarMensaje(texto);
    if (revision.nivel === 'bloqueo') return reply.code(422).send({ error: revision.motivo });
    if (revision.nivel === 'aviso' && (request.body as { confirmado?: boolean } | undefined)?.confirmado !== true) return reply.code(409).send({ error: revision.motivo, aviso: true });
    await db.query('insert into plan_mensajes (plan_id, autor_id, texto, creado_en) values ($1, $2, $3, $4)', [request.params.plan, id, texto, ahora()]);
    return mensajesDe(id, request.params.plan);
  });

  // ---- Mapa de la comunidad (diseño de Mateo) ----
  // El tablero son los hexágonos a dos anillos de la zona activa. Todo va en metros relativos al centro
  // de tu zona: nunca salen coordenadas. Las luces son planes (en lugares públicos), nunca personas.
  // El nombre del barrio cuya celda es esa (catálogo público de GeoMedellín): rotula el mapa sin ubicar a nadie.
  const barrioDeCelda = new Map<string, string>();
  for (const b of barriosMedellin) if (b.celda && !barrioDeCelda.has(b.celda)) barrioDeCelda.set(b.celda, b.nombre);
  app.get('/api/mapa', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const visibles = await planesVisibles(db, id, ahora());
    const [lugar] = await db.query<{ celda: string | null }>('select celda from lugares where cuenta_id = $1 and activo', [id]);
    if (!visibles || !lugar?.celda) return { disponible: false } satisfies Mapa;
    const [lat0, lng0] = cellToLatLng(lugar.celda);
    const escalaX = 111_320 * Math.cos((lat0 * Math.PI) / 180);
    const proyectar = (lat: number, lng: number): [number, number] => [Math.round((lng - lng0) * escalaX), Math.round(-(lat - lat0) * 110_574)];
    const tablero = new Set(gridDisk(lugar.celda, 2));
    const celdas = [...tablero].map(c => {
      const [x, y] = proyectar(...cellToLatLng(c));
      return { id: c, x, y, anillo: gridDistance(lugar.celda!, c), puntos: cellToBoundary(c).map(([la, lo]) => proyectar(la, lo)), barrio: barrioDeCelda.get(c) };
    });
    const ids = visibles.planes.map(p => p.id);
    const celdasDePlanes = ids.length ? await db.query<{ id: string; celda: string | null }>('select id, celda from planes where id = any($1)', [ids]) : [];
    const planes = celdasDePlanes.flatMap(p => {
      if (!p.celda || !tablero.has(p.celda)) return [];
      // Varias luces en un mismo hexágono no se tapan: un desplazamiento fijo según el plan (hasta ~180 m).
      const semilla = [...p.id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
      const angulo = (semilla % 360) * Math.PI / 180, radio = 60 + (semilla % 120);
      const [x, y] = proyectar(...cellToLatLng(p.celda));
      return [{ id: p.id, x: Math.round(x + radio * Math.cos(angulo)), y: Math.round(y + radio * Math.sin(angulo)) }];
    });
    return { disponible: true, celdas, planes } satisfies Mapa;
  });

  // ---- Brisa y avisos ----
  app.get('/api/brisa', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    return cartasDeBrisa(db, id, ahora(), refs, cifrador);
  });

  app.post('/api/brisa/visto', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const clave = String((request.body as { clave?: string } | undefined)?.clave ?? '').slice(0, 200);
    if (clave) await db.query('insert into avisos_vistos (cuenta_id, clave) values ($1, $2) on conflict do nothing', [id, clave]);
    return cartasDeBrisa(db, id, ahora(), refs, cifrador);
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
  return { puedeConversar }; // Mi gente lo usa para reportar un mensaje de un plan
}
