// Mi gente: «Ya nos vimos», Moais (de 2 a 5 personas), invitaciones, bloqueos y reportes (src/lib/moai.ts).
// REVISIÓN HUMANA: vínculos entre personas, reportes y pausas de cuentas.
// - Un Moai solo nace entre personas que confirmaron, las dos, que se vieron en un mismo plan.
// - Para sumar a alguien, votan todos los miembros. Quien es invitado solo se entera cuando todos dijeron que sí,
//   y un «no» cierra la invitación en silencio: nadie sabe quién dijo qué.
// - Bloquear oculta los planes en las dos direcciones y no se avisa. Reportar nunca muestra quién reportó.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  DIAS_ENCUENTRO, DIAS_MENSAJES_MOAI, ENCUENTROS_PARA_SUGERIR, MAX_DETALLE_REPORTE, MAX_MOAI, mensajePausa, motivosReporte, validarNombreMoai,
} from '../src/lib/moai';
import { revisarMensaje } from '../src/lib/moderacion';
import type { Carta, Conocido, Encuentro, Gente, Invitacion, Mensaje, MoaiResumen } from '../src/lib/api';
import type { Consulta, Db } from './db';
import { enPausa, hayBloqueo, type Refs } from './personas';

const MAX_MENSAJE = 500;
const noBloqueados = (yo: string, otro: string) =>
  `not exists (select 1 from bloqueos b where (b.de = ${yo} and b.a = ${otro}) or (b.de = ${otro} and b.a = ${yo}))`;

type FilaEncuentro = { plan_id: string; ocurrencia: string; titulo: string; persona: string; nombre: string };

// Personas con las que estuviste en un plan de los últimos días y a las que aún no respondiste «¿te viste con…?».
async function encuentrosPendientes(db: Db, cuenta: string, ahora: Date): Promise<FilaEncuentro[]> {
  return db.query<FilaEncuentro>(
    `with mias as (
       select a.plan_id, a.ocurrencia from asistencias a where a.cuenta_id = $1
       union select a.plan_id, a.ocurrencia from asistencias a join planes p on p.id = a.plan_id where p.autor_id = $1
     )
     select m.plan_id, m.ocurrencia, p.titulo, x.persona, split_part(c.nombre, ' ', 1) as nombre
     from mias m
     join planes p on p.id = m.plan_id
     join lateral (select p.autor_id as persona where p.organizacion_id is null union select a.cuenta_id from asistencias a where a.plan_id = m.plan_id and a.ocurrencia = m.ocurrencia) x on true
     join cuentas c on c.id = x.persona
     where m.ocurrencia <= $2 and c.suspendida_en is null and m.ocurrencia > $2::timestamptz - make_interval(days => $3)
       and (p.cancelado_en is null or p.cancelado_en > m.ocurrencia)
       and x.persona <> $1
       and not exists (select 1 from nos_vimos n where n.de = $1 and n.a = x.persona and n.plan_id = m.plan_id and n.ocurrencia = m.ocurrencia)
       and ${noBloqueados('$1', 'x.persona')}
     order by m.ocurrencia desc, nombre`, [cuenta, ahora, DIAS_ENCUENTRO]);
}

// Las dos confirmaron que se vieron en un mismo plan. `veces`: cuántos encuentros confirmados (solo para Brisa, nunca se muestra).
export async function conocidosDe(db: Db, cuenta: string, ahora = new Date()) {
  return db.query<{ id: string; nombre: string; veces: number; moai_comun: boolean; propuesta: boolean; puerta: boolean }>(
    `select n1.a as id, split_part(c.nombre, ' ', 1) as nombre, count(*)::int as veces,
            exists (select 1 from estados e where e.cuenta_id = n1.a and e.puerta_hasta > $2) as puerta,
            exists (select 1 from moai_miembros x join moai_miembros y on x.moai_id = y.moai_id where x.cuenta_id = $1 and y.cuenta_id = n1.a) as moai_comun,
            exists (select 1 from moai_invitaciones i where i.estado = 'abierta' and i.moai_id is null and ((i.de = $1 and i.a = n1.a) or (i.de = n1.a and i.a = $1))) as propuesta
     from nos_vimos n1
     join nos_vimos n2 on n2.de = n1.a and n2.a = n1.de and n2.plan_id = n1.plan_id and n2.ocurrencia = n1.ocurrencia and n2.si
     join cuentas c on c.id = n1.a
     where n1.de = $1 and n1.si and ${noBloqueados('$1', 'n1.a')}
     group by n1.a, c.nombre
     order by nombre`, [cuenta, ahora]);
}

const miembrosDe = (db: Consulta, moai: string) => db.query<{ id: string; nombre: string }>(
  `select m.cuenta_id as id, split_part(c.nombre, ' ', 1) as nombre from moai_miembros m join cuentas c on c.id = m.cuenta_id where m.moai_id = $1 order by m.unido_en`, [moai]);

// Una invitación a un Moai existente llega a la persona solo cuando todos los miembros actuales dijeron que sí.
async function todosAprobaron(db: Db, invitacion: string, moai: string): Promise<boolean> {
  const [{ faltan }] = await db.query<{ faltan: number }>(
    `select count(*)::int as faltan from moai_miembros m
     where m.moai_id = $1 and not exists (select 1 from moai_votos v where v.invitacion_id = $2 and v.cuenta_id = m.cuenta_id and v.acepta)`, [moai, invitacion]);
  return faltan === 0;
}

async function ocupados(db: Db, moai: string): Promise<number> {
  const [{ total }] = await db.query<{ total: number }>(
    `select (select count(*) from moai_miembros where moai_id = $1) + (select count(*) from moai_invitaciones where moai_id = $1 and estado = 'abierta') as total`, [moai]);
  return Number(total);
}

export async function genteDe(db: Db, cuenta: string, ahora: Date, refs: Refs): Promise<Gente> {
  const filas = await encuentrosPendientes(db, cuenta, ahora);
  const encuentros: Encuentro[] = [];
  for (const f of filas) {
    const ocurrencia = new Date(f.ocurrencia).toISOString();
    let e = encuentros.find(x => x.planId === f.plan_id && x.ocurrencia === ocurrencia);
    if (!e) encuentros.push(e = { planId: f.plan_id, titulo: f.titulo, ocurrencia, personas: [] });
    e.personas.push({ ref: refs.ref(cuenta, f.persona), nombre: f.nombre });
  }
  const conocidos: Conocido[] = (await conocidosDe(db, cuenta, ahora)).map(c => ({ ref: refs.ref(cuenta, c.id), nombre: c.nombre, moaiComun: c.moai_comun, propuesta: c.propuesta, puertaAbierta: c.puerta }));

  const moais: MoaiResumen[] = [];
  for (const m of await db.query<{ id: string; nombre: string }>(
    `select o.id, o.nombre from moais o join moai_miembros m on m.moai_id = o.id where m.cuenta_id = $1 order by m.unido_en`, [cuenta])) {
    const miembros = await miembrosDe(db, m.id);
    const esperando = await db.query<{ nombre: string }>(
      `select split_part(c.nombre, ' ', 1) as nombre from moai_invitaciones i join cuentas c on c.id = i.a where i.moai_id = $1 and i.estado = 'abierta' order by i.creada_en`, [m.id]);
    moais.push({ id: m.id, nombre: m.nombre, miembros: miembros.map(x => ({ ref: refs.ref(cuenta, x.id), nombre: x.id === cuenta ? 'Tú' : x.nombre, yo: x.id === cuenta })), esperando: esperando.map(e => e.nombre) });
  }

  const invitaciones: Invitacion[] = [];
  const abiertas = await db.query<{ id: string; moai_id: string | null; de: string; a: string; nombre_de: string; nombre_a: string; nombre: string | null; moai: string | null }>(
    `select i.id, i.moai_id, i.de, i.a, split_part(cd.nombre, ' ', 1) as nombre_de, split_part(ca.nombre, ' ', 1) as nombre_a, i.nombre, o.nombre as moai
     from moai_invitaciones i join cuentas cd on cd.id = i.de join cuentas ca on ca.id = i.a left join moais o on o.id = i.moai_id
     where i.estado = 'abierta' and (i.a = $1 or i.moai_id in (select moai_id from moai_miembros where cuenta_id = $1))
     order by i.creada_en`, [cuenta]);
  for (const i of abiertas) {
    if (i.a === cuenta && !i.moai_id) invitaciones.push({ id: i.id, tipo: 'nuevo', de: i.nombre_de, nombre: i.nombre ?? '' });
    else if (i.a === cuenta && i.moai_id && await todosAprobaron(db, i.id, i.moai_id)) {
      invitaciones.push({ id: i.id, tipo: 'entrar', de: i.nombre_de, nombre: i.moai ?? '', miembros: (await miembrosDe(db, i.moai_id)).map(x => x.nombre) });
    } else if (i.moai_id && i.a !== cuenta && i.de !== cuenta) {
      const [voto] = await db.query('select 1 from moai_votos where invitacion_id = $1 and cuenta_id = $2', [i.id, cuenta]);
      if (!voto) invitaciones.push({ id: i.id, tipo: 'aprobar', de: i.nombre_de, nombre: i.moai ?? '', persona: i.nombre_a });
    }
  }
  return { encuentros, conocidos, moais, invitaciones, pausa: await enPausa(db, cuenta, ahora) };
}

// Lo que Brisa cuenta sobre Mi gente. Las sugerencias de Moai solo si la persona activó las sugerencias (regla 9).
export async function cartasDeGente(db: Db, cuenta: string, ahora: Date, refs: Refs, vistos: Set<string>, sugerencias: boolean): Promise<Carta[]> {
  const cartas: Carta[] = [];
  const gente = await genteDe(db, cuenta, ahora, refs);
  for (const i of gente.invitaciones) {
    const clave = `gente:inv:${i.id}`;
    if (vistos.has(clave)) continue;
    cartas.push({ clave, tipo: 'gente', texto: i.tipo === 'nuevo' ? `${i.de} te propone formar un Moai: «${i.nombre}».`
      : i.tipo === 'entrar' ? `Te invitan a «${i.nombre}», el Moai de ${i.miembros.join(', ')}.`
      : `${i.de} quiere sumar a ${i.persona} a «${i.nombre}». ¿Estás de acuerdo?` });
  }
  const [encuentro] = gente.encuentros;
  if (encuentro) {
    const clave = `gente:vimos:${encuentro.planId}:${encuentro.ocurrencia}`;
    if (!vistos.has(clave)) cartas.push({ clave, tipo: 'gente', texto: `¿Te viste con ${encuentro.personas.map(p => p.nombre).join(', ')} en «${encuentro.titulo}»? Si las dos personas lo confirman, después podrán formar un Moai.` });
  }
  if (sugerencias) {
    const veces = new Map((await conocidosDe(db, cuenta)).map(c => [refs.ref(cuenta, c.id), c.veces]));
    for (const c of gente.conocidos) {
      const clave = `gente:sug:${c.ref}`;
      if (c.moaiComun || c.propuesta || vistos.has(clave) || (veces.get(c.ref) ?? 0) < ENCUENTROS_PARA_SUGERIR) continue;
      cartas.push({ clave, tipo: 'gente', texto: `Te has visto varias veces con ${c.nombre}. ¿Le propones formar un Moai?`,
        motivo: 'Porque activaste las sugerencias en «Avisos» y las dos confirmaron que se vieron en más de un plan. Nadie más lo sabe.' });
      break;
    }
  }
  return cartas;
}

export function registrarMoais(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date, refs: Refs, puedeConversar: (cuenta: string, plan: string) => Promise<boolean>) {
  const conSesion = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = await cuentaDeSesion(request);
    if (!id) void reply.code(401).send({ error: 'Sin sesión.' });
    return id;
  };
  const cuerpo = <T>(request: FastifyRequest) => (request.body ?? {}) as Partial<T>;
  const gente = (cuenta: string) => genteDe(db, cuenta, ahora(), refs);
  const esMiembro = async (moai: string, cuenta: string) => !!(await db.query('select 1 from moai_miembros where moai_id = $1 and cuenta_id = $2', [moai, cuenta]))[0];
  const conocidoPorRef = async (cuenta: string, ref: unknown) =>
    (await conocidosDe(db, cuenta)).find(c => refs.ref(cuenta, c.id) === ref) ?? null;
  const noSePudo = 'No se pudo enviar la invitación.';

  app.get('/api/gente', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    return gente(id);
  });

  app.post('/api/gente/encuentro', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const b = cuerpo<{ planId: string; ocurrencia: string; ref: string; si: boolean }>(request);
    const fila = (await encuentrosPendientes(db, id, ahora())).find(f =>
      f.plan_id === b.planId && new Date(f.ocurrencia).toISOString() === b.ocurrencia && refs.ref(id, f.persona) === b.ref);
    if (!fila) return reply.code(404).send({ error: 'Ese encuentro ya no está por confirmar.' });
    await db.query('insert into nos_vimos (de, a, plan_id, ocurrencia, si, creado_en) values ($1, $2, $3, $4, $5, $6) on conflict do nothing',
      [id, fila.persona, fila.plan_id, fila.ocurrencia, b.si === true, ahora()]);
    return gente(id);
  });

  // Proponer un Moai nuevo a alguien con quien ya se vieron.
  app.post('/api/moais', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    if (await enPausa(db, id, ahora())) return reply.code(403).send({ error: mensajePausa, pausa: true });
    const b = cuerpo<{ ref: string; nombre: string }>(request);
    const nombre = validarNombreMoai(b.nombre);
    if (!nombre.ok) return reply.code(400).send({ errores: { nombre: nombre.error } });
    const otro = await conocidoPorRef(id, b.ref);
    if (!otro) return reply.code(404).send({ error: 'Solo puedes proponer un Moai a alguien con quien ya te viste.' });
    if (otro.propuesta) return reply.code(409).send({ error: `Ya hay una propuesta de Moai entre tú y ${otro.nombre}.` });
    await db.query('insert into moai_invitaciones (de, a, nombre, creada_en) values ($1, $2, $3, $4)', [id, otro.id, nombre.nombre, ahora()]);
    return gente(id);
  });

  // Invitar a alguien que conoces a un Moai del que haces parte. Votan todos los miembros.
  app.post<{ Params: { moai: string } }>('/api/moais/:moai/invitar', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const { moai } = request.params;
    if (!(await esMiembro(moai, id))) return reply.code(404).send({ error: 'No encontramos ese Moai.' });
    if (await enPausa(db, id, ahora())) return reply.code(403).send({ error: mensajePausa, pausa: true });
    const otro = await conocidoPorRef(id, cuerpo<{ ref: string }>(request).ref);
    if (!otro) return reply.code(404).send({ error: 'Solo puedes invitar a alguien con quien ya te viste.' });
    if (await esMiembro(moai, otro.id)) return reply.code(409).send({ error: `${otro.nombre} ya está en este Moai.` });
    if ((await db.query(`select 1 from moai_invitaciones where moai_id = $1 and a = $2 and estado = 'abierta'`, [moai, otro.id]))[0]) {
      return reply.code(409).send({ error: `Ya invitaron a ${otro.nombre}.` });
    }
    if (await ocupados(db, moai) >= MAX_MOAI) return reply.code(409).send({ error: `Un Moai es de máximo ${MAX_MOAI} personas.` });
    for (const m of await miembrosDe(db, moai)) if (await hayBloqueo(db, m.id, otro.id)) return reply.code(409).send({ error: noSePudo });
    const [inv] = await db.query<{ id: string }>('insert into moai_invitaciones (moai_id, de, a, creada_en) values ($1, $2, $3, $4) returning id', [moai, id, otro.id, ahora()]);
    await db.query('insert into moai_votos (invitacion_id, cuenta_id, acepta) values ($1, $2, true)', [inv.id, id]);
    return gente(id);
  });

  app.post<{ Params: { invitacion: string } }>('/api/invitaciones/:invitacion', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const acepta = cuerpo<{ acepta: boolean }>(request).acepta === true;
    const [inv] = await db.query<{ id: string; moai_id: string | null; de: string; a: string; nombre: string | null }>(
      `select id, moai_id, de, a, nombre from moai_invitaciones where id = $1 and estado = 'abierta'`, [request.params.invitacion]);
    const noEsta = () => reply.code(404).send({ error: 'Esta invitación ya no está disponible.' });
    if (!inv) return noEsta();
    const cerrar = (estado: 'aceptada' | 'cerrada') => db.query('update moai_invitaciones set estado = $2 where id = $1', [inv.id, estado]);

    if (inv.a === id) {
      if (inv.moai_id && !(await todosAprobaron(db, inv.id, inv.moai_id))) return noEsta();
      if (!acepta) { await cerrar('cerrada'); return gente(id); }
      // Revisión de Codex: la invitación se reclama una sola vez (un doble toque no crea dos Moais) y, antes de entrar,
      // se revisan los bloqueos con todas las personas que están hoy en el grupo.
      const resultado = await db.transaccion(async tx => {
        const [reclamada] = await tx.query(`update moai_invitaciones set estado = 'aceptada' where id = $1 and estado = 'abierta' returning id`, [inv.id]);
        if (!reclamada) return 'no-esta' as const;
        const cerrarla = () => tx.query(`update moai_invitaciones set estado = 'cerrada' where id = $1`, [inv.id]);
        if (!inv.moai_id) {
          if (await hayBloqueo(tx, inv.de, id)) { await cerrarla(); return 'no-esta' as const; }
          const [nuevo] = await tx.query<{ id: string }>('insert into moais (nombre, creado_en) values ($1, $2) returning id', [inv.nombre ?? 'Nuestro Moai', ahora()]);
          await tx.query('insert into moai_miembros (moai_id, cuenta_id, unido_en) values ($1, $2, $4), ($1, $3, $4)', [nuevo.id, inv.de, id, ahora()]);
          return 'ok' as const;
        }
        await tx.query('select pg_advisory_xact_lock(hashtext($1))', [inv.moai_id]);
        const miembros = await miembrosDe(tx, inv.moai_id);
        for (const m of miembros) if (await hayBloqueo(tx, m.id, id)) { await cerrarla(); return 'no-esta' as const; }
        if (miembros.length >= MAX_MOAI) { await cerrarla(); return 'lleno' as const; }
        await tx.query('insert into moai_miembros (moai_id, cuenta_id, unido_en) values ($1, $2, $3) on conflict do nothing', [inv.moai_id, id, ahora()]);
        return 'ok' as const;
      });
      if (resultado === 'no-esta') return noEsta();
      if (resultado === 'lleno') return reply.code(409).send({ error: `Este Moai ya tiene ${MAX_MOAI} personas.` });
      return gente(id);
    }
    // Voto de un miembro: un «no» cierra la invitación y la persona invitada nunca se entera.
    if (!inv.moai_id || !(await esMiembro(inv.moai_id, id))) return noEsta();
    await db.query('insert into moai_votos (invitacion_id, cuenta_id, acepta) values ($1, $2, $3) on conflict (invitacion_id, cuenta_id) do update set acepta = $3', [inv.id, id, acepta]);
    if (!acepta) await cerrar('cerrada');
    return gente(id);
  });

  app.post<{ Params: { moai: string } }>('/api/moais/:moai/nombre', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    if (!(await esMiembro(request.params.moai, id))) return reply.code(404).send({ error: 'No encontramos ese Moai.' });
    const nombre = validarNombreMoai(cuerpo<{ nombre: string }>(request).nombre);
    if (!nombre.ok) return reply.code(400).send({ errores: { nombre: nombre.error } });
    await db.query('update moais set nombre = $2 where id = $1', [request.params.moai, nombre.nombre]);
    return gente(id);
  });

  // Salir es libre y sin explicaciones. Las invitaciones que hiciste a ese Moai se cierran; si nadie queda, el Moai se borra.
  app.post<{ Params: { moai: string } }>('/api/moais/:moai/salir', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const { moai } = request.params;
    if (!(await esMiembro(moai, id))) return reply.code(404).send({ error: 'No encontramos ese Moai.' });
    await db.query('delete from moai_miembros where moai_id = $1 and cuenta_id = $2', [moai, id]);
    await db.query(`update moai_invitaciones set estado = 'cerrada' where moai_id = $1 and de = $2 and estado = 'abierta'`, [moai, id]);
    await db.query('delete from moais o where o.id = $1 and not exists (select 1 from moai_miembros m where m.moai_id = o.id)', [moai]);
    return gente(id);
  });

  // Conversación del Moai: solo sus miembros. Brisa no la lee; antes de guardar se revisa (src/lib/moderacion.ts). Se guardan los últimos 90 días.
  const mensajesDe = async (cuenta: string, moai: string): Promise<Mensaje[]> => (await db.query<{ id: string; autor_id: string; autor: string; texto: string; creado_en: string }>(
    `select m.id::text, m.autor_id, split_part(c.nombre, ' ', 1) as autor, m.texto, m.creado_en from moai_mensajes m join cuentas c on c.id = m.autor_id
     where m.moai_id = $1 and m.creado_en > $2::timestamptz - make_interval(days => $3) order by m.creado_en, m.id`, [moai, ahora(), DIAS_MENSAJES_MOAI]))
    .map(m => ({ id: m.id, autor: m.autor_id === cuenta ? 'Tú' : m.autor, autorRef: m.autor_id === cuenta ? undefined : refs.ref(cuenta, m.autor_id), mio: m.autor_id === cuenta, texto: m.texto, creado: new Date(m.creado_en).toISOString() }));

  app.get<{ Params: { moai: string } }>('/api/moais/:moai/mensajes', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    if (!(await esMiembro(request.params.moai, id))) return reply.code(404).send({ error: 'No encontramos ese Moai.' });
    return mensajesDe(id, request.params.moai);
  });

  app.post<{ Params: { moai: string } }>('/api/moais/:moai/mensajes', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    if (!(await esMiembro(request.params.moai, id))) return reply.code(404).send({ error: 'No encontramos ese Moai.' });
    if (await enPausa(db, id, ahora())) return reply.code(403).send({ error: mensajePausa, pausa: true });
    const texto = String(cuerpo<{ texto: string }>(request).texto ?? '').trim();
    if (!texto) return reply.code(400).send({ error: 'Escribe algo antes de enviar.' });
    if (texto.length > MAX_MENSAJE) return reply.code(400).send({ error: 'Ese mensaje es muy largo. Escríbelo en dos partes.' });
    // Revisión antes de enviar (sin IA, nada se guarda): lo grave no se envía; lo riesgoso se avisa y se puede confirmar.
    const revision = revisarMensaje(texto);
    if (revision.nivel === 'bloqueo') return reply.code(422).send({ error: revision.motivo });
    if (revision.nivel === 'aviso' && (request.body as { confirmado?: boolean } | undefined)?.confirmado !== true) return reply.code(409).send({ error: revision.motivo, aviso: true });
    await db.query('insert into moai_mensajes (moai_id, autor_id, texto, creado_en) values ($1, $2, $3, $4)', [request.params.moai, id, texto, ahora()]);
    return mensajesDe(id, request.params.moai);
  });

  // ---- Bloquear y reportar ----
  const bloquear = async (de: string, a: string) => {
    await db.query('insert into bloqueos (de, a, creado_en) values ($1, $2, $3) on conflict do nothing', [de, a, ahora()]);
    await db.query(`update moai_invitaciones set estado = 'cerrada' where estado = 'abierta' and ((de = $1 and a = $2) or (de = $2 and a = $1))`, [de, a]);
  };

  app.post('/api/personas/bloquear', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const otro = await refs.resolver(db, id, String(cuerpo<{ ref: string }>(request).ref ?? ''));
    if (!otro) return reply.code(404).send({ error: 'No encontramos a esa persona.' });
    await bloquear(id, otro);
    return gente(id);
  });

  app.post('/api/personas/reportar', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const b = cuerpo<{ ref: string; motivo: string; detalle: string; bloquear: boolean; mensaje: { tipo: 'plan' | 'moai'; id: string } }>(request);
    if (!motivosReporte.some(m => m.id === b.motivo)) return reply.code(400).send({ errores: { motivo: 'Elige qué pasó.' } });
    const detalle = String(b.detalle ?? '').trim();
    if (detalle.length > MAX_DETALLE_REPORTE) return reply.code(400).send({ errores: { detalle: 'Cuéntalo en menos palabras.' } });
    const otro = await refs.resolver(db, id, String(b.ref ?? ''));
    if (!otro) return reply.code(404).send({ error: 'No encontramos a esa persona.' });
    // Si se reporta un mensaje concreto, se guarda su texto para el equipo, copiado del servidor y solo si quien
    // reporta participa en esa conversación y el mensaje es de la persona reportada.
    let mensaje: string | null = null;
    if (b.mensaje && /^\d+$/.test(String(b.mensaje.id))) {
      const [m] = b.mensaje.tipo === 'moai'
        ? await db.query<{ texto: string }>(`select m.texto from moai_mensajes m where m.id = $1 and m.autor_id = $2
            and exists (select 1 from moai_miembros x where x.moai_id = m.moai_id and x.cuenta_id = $3)`, [b.mensaje.id, otro, id])
        // Revisión de Codex: el mismo acceso que para leer la conversación del plan (quien va a la ocurrencia vigente).
        : await db.query<{ texto: string; plan_id: string }>('select m.texto, m.plan_id from plan_mensajes m where m.id = $1 and m.autor_id = $2', [b.mensaje.id, otro])
          .then(async ([x]) => x && await puedeConversar(id, x.plan_id) ? [x] : []);
      if (!m) return reply.code(404).send({ error: 'No encontramos ese mensaje.' });
      mensaje = m.texto;
    }
    await db.query('insert into reportes (de, a, motivo, detalle, mensaje, creado_en) values ($1, $2, $3, $4, $5, $6)', [id, otro, b.motivo, detalle, mensaje, ahora()]);
    if (b.bloquear === true) await bloquear(id, otro);
    return gente(id);
  });
}
