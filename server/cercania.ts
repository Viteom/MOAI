// Cercanía sin exponerse: perfil conversado, Mi zona, saludos de lejos, invierno y puerta abierta (src/lib/perfil.ts).
// REVISIÓN HUMANA: estado de ánimo declarado (invierno) y a quién se le cuenta.
// - Mi zona muestra solo perfiles que la persona aprobó, de su zona (hasta dos anillos de celdas), nunca la ubicación.
// - La puerta abierta y el invierno solo los ven personas con las que ya se vieron (y el invierno, solo a quienes se elija).
// - El invierno se guarda cifrado. Mientras dura, Brisa baja el ritmo: sin sugerencias de planes ni correo semanal.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { gridDistance } from 'h3-js';
import { DIAS_ENTRE_SALUDOS, DIAS_PUERTA, saludos, textoSaludo, validarPerfil, type EntradaPerfil, type Saludo } from '../src/lib/perfil';
import type { Tipo } from '../src/lib/lugares';
import type { Carta, Estado, Vecino } from '../src/lib/api';
import type { Cifrador } from './cifrado';
import type { Db } from './db';
import { conocidosDe } from './moais';
import { enPausa, hayBloqueo, type Refs } from './personas';

const ANILLOS_ZONA = 2;

export async function perfilPublicoDe(db: Db, cuenta: string): Promise<EntradaPerfil> {
  const [p] = await db.query<{ frase: string; gustos: Tipo[]; comparte: string; aprender: string; visible: boolean }>(
    'select frase, gustos, comparte, aprender, visible from perfiles where cuenta_id = $1', [cuenta]);
  return p ?? { frase: '', gustos: [], comparte: '', aprender: '', visible: false };
}

export async function enInvierno(db: Db, cifrador: Cifrador, cuenta: string): Promise<boolean> {
  const [e] = await db.query<{ invierno: string }>('select invierno from estados where cuenta_id = $1', [cuenta]);
  return e ? JSON.parse(cifrador.descifrar(e.invierno) ?? '{}').activo === true : false;
}

const puertaAbierta = async (db: Db, cuenta: string, ahora: Date) =>
  !!(await db.query('select 1 from estados where cuenta_id = $1 and puerta_hasta > $2', [cuenta, ahora]))[0];

// A quién le contaste tu invierno (revisión de Codex): la fila no dice ni de quién es ni para quién. Se busca por
// identificadores ciegos y lo demás va cifrado, así una copia de la base no delata quién está en invierno.
type Contado = { de: string; a: string; creado: string };
const ciegoDe = (cifrador: Cifrador, cuenta: string) => cifrador.ciego(`invierno-de:${cuenta}`);
const ciegoA = (cifrador: Cifrador, cuenta: string) => cifrador.ciego(`invierno-a:${cuenta}`);
const leerContados = (cifrador: Cifrador, filas: { datos: string }[]) =>
  filas.flatMap(f => { const t = cifrador.descifrar(f.datos); return t ? [JSON.parse(t) as Contado] : []; });
export const olvidarInvierno = (db: Db, cifrador: Cifrador, cuenta: string) =>
  db.query('delete from inviernos_contados where de_ciego = $1', [ciegoDe(cifrador, cuenta)]);

async function estadoDe(db: Db, cifrador: Cifrador, cuenta: string, ahora: Date): Promise<Estado> {
  const contados = leerContados(cifrador, await db.query<{ datos: string }>('select datos from inviernos_contados where de_ciego = $1', [ciegoDe(cifrador, cuenta)]))
    .filter(c => c.de === cuenta).sort((x, y) => x.creado.localeCompare(y.creado));
  const nombres = contados.length ? await db.query<{ id: string; nombre: string }>(`select id, split_part(nombre, ' ', 1) as nombre from cuentas where id = any($1)`, [contados.map(c => c.a)]) : [];
  const contadoA = contados.flatMap(c => nombres.filter(n => n.id === c.a).map(n => n.nombre));
  return { invierno: await enInvierno(db, cifrador, cuenta), puertaAbierta: await puertaAbierta(db, cuenta, ahora), contadoA };
}

// Vecinos con perfil visible en tu zona. Sin dirección ni distancia exacta: «cerca» o «en tu zona».
async function vecinosDe(db: Db, cuenta: string, ahora: Date, refs: Refs): Promise<(Vecino & { id: string })[]> {
  const [yo] = await db.query<{ ciudad: string; celda: string | null }>('select ciudad, celda from lugares where cuenta_id = $1 and activo', [cuenta]);
  if (!yo?.celda) return [];
  const mios = (await perfilPublicoDe(db, cuenta)).gustos;
  const conocidos = new Set((await conocidosDe(db, cuenta)).map(c => c.id));
  const filas = await db.query<{ id: string; nombre: string; celda: string; frase: string; comparte: string; gustos: Tipo[]; puerta: boolean; saludado: boolean }>(
    `select c.id, split_part(c.nombre, ' ', 1) as nombre, l.celda, p.frase, p.comparte, p.gustos,
            coalesce(e.puerta_hasta > $3, false) as puerta,
            exists (select 1 from saludos s where s.de = $1 and s.a = c.id and s.creado_en > $3::timestamptz - make_interval(days => $4)) as saludado
     from perfiles p join cuentas c on c.id = p.cuenta_id join lugares l on l.cuenta_id = c.id and l.activo
     left join estados e on e.cuenta_id = c.id
     where p.visible and c.id <> $1 and c.suspendida_en is null and l.ciudad = $2 and l.celda is not null
       and not exists (select 1 from bloqueos b where (b.de = $1 and b.a = c.id) or (b.de = c.id and b.a = $1))
     order by c.nombre`, [cuenta, yo.ciudad, ahora, DIAS_ENTRE_SALUDOS]);
  return filas.flatMap(f => {
    let d: number;
    try { d = gridDistance(yo.celda!, f.celda); } catch { return []; }
    if (d > ANILLOS_ZONA) return [];
    return [{ id: f.id, ref: refs.ref(cuenta, f.id), nombre: f.nombre, frase: f.frase, comparte: f.comparte, gustos: f.gustos, enComun: f.gustos.filter(g => mios.includes(g)),
      franja: d <= 1 ? 'Cerca' : 'En tu zona', puertaAbierta: f.puerta && conocidos.has(f.id), saludado: f.saludado }];
  });
}

// Lo que Brisa cuenta sobre cercanía: saludos recibidos, alguien que te contó su invierno, puertas abiertas de tu gente.
export async function cartasDeCercania(db: Db, cuenta: string, ahora: Date, refs: Refs, cifrador: Cifrador, vistos: Set<string>): Promise<Carta[]> {
  const cartas: Carta[] = [];
  const recibidos = await db.query<{ id: string; de: string; nombre: string; saludo: string; mutuo: boolean }>(
    `select s.id::text, s.de, split_part(c.nombre, ' ', 1) as nombre, s.saludo,
            exists (select 1 from saludos r where r.de = $1 and r.a = s.de and r.creado_en > $2::timestamptz - interval '14 days') as mutuo
     from saludos s join cuentas c on c.id = s.de
     where s.a = $1 and s.creado_en > $2::timestamptz - interval '14 days' and c.suspendida_en is null
       and not exists (select 1 from bloqueos b where (b.de = $1 and b.a = s.de) or (b.de = s.de and b.a = $1))
     order by s.creado_en desc`, [cuenta, ahora]);
  for (const s of recibidos) {
    const clave = `saludo:${s.id}`;
    if (vistos.has(clave)) continue;
    cartas.push({ clave, tipo: 'saludo', ref: refs.ref(cuenta, s.de), nombre: s.nombre, plan: s.mutuo, opciones: ['buenos-dias', 'pienso', 'tinto'],
      texto: s.mutuo ? `${s.nombre} también te saludó: «${textoSaludo(s.saludo)}». ¿Y si coinciden en algo?` : `${s.nombre} te manda un saludo de lejos: «${textoSaludo(s.saludo)}».` });
  }
  const semana = Math.floor(ahora.getTime() / (7 * 864e5));
  const meContaron = leerContados(cifrador, await db.query<{ datos: string }>('select datos from inviernos_contados where a_ciego = $1', [ciegoA(cifrador, cuenta)]))
    .filter(c => c.a === cuenta);
  const enInviernoMeContaron = meContaron.length ? await db.query<{ de: string; nombre: string }>(
    `select id as de, split_part(nombre, ' ', 1) as nombre from cuentas where id = any($1) and suspendida_en is null`, [meContaron.map(c => c.de)]) : [];
  for (const i of enInviernoMeContaron) {
    const clave = `invierno:${i.de}:${semana}`;
    if (vistos.has(clave) || !(await enInvierno(db, cifrador, i.de)) || await hayBloqueo(db, cuenta, i.de)) continue;
    cartas.push({ clave, tipo: 'saludo', ref: refs.ref(cuenta, i.de), nombre: i.nombre, plan: false, opciones: ['pienso', 'aqui-estoy', 'tinto'],
      texto: `${i.nombre} te contó que está pasando un invierno. No hace falta decir mucho: un saludo acompaña.` });
  }
  for (const c of await conocidosDe(db, cuenta)) {
    const [e] = await db.query<{ hasta: string }>('select puerta_hasta as hasta from estados where cuenta_id = $1 and puerta_hasta > $2', [c.id, ahora]);
    if (!e) continue;
    const clave = `puerta:${c.id}:${new Date(e.hasta).toISOString()}`;
    if (vistos.has(clave)) continue;
    cartas.push({ clave, tipo: 'saludo', ref: refs.ref(cuenta, c.id), nombre: c.nombre, plan: true, opciones: ['buenos-dias', 'tinto'],
      texto: `${c.nombre} dejó su puerta abierta esta semana: le caería bien compañía.` });
  }
  return cartas;
}

export function registrarCercania(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date, refs: Refs, cifrador: Cifrador) {
  const conSesion = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = await cuentaDeSesion(request);
    if (!id) void reply.code(401).send({ error: 'Sin sesión.' });
    return id;
  };
  const guardarEstado = async (cuenta: string, cambio: { invierno?: boolean; puertaHasta?: Date | null }) => {
    const actual = await estadoDe(db, cifrador, cuenta, ahora());
    const invierno = cambio.invierno ?? actual.invierno;
    const [fila] = await db.query<{ puerta_hasta: string | null }>('select puerta_hasta from estados where cuenta_id = $1', [cuenta]);
    const puerta = cambio.puertaHasta !== undefined ? cambio.puertaHasta : fila?.puerta_hasta ?? null;
    // El invierno siempre va cifrado, esté o no activo: la base no revela quién está en invierno.
    await db.query(
      `insert into estados (cuenta_id, invierno, puerta_hasta, actualizado_en) values ($1, $2, $3, $4)
       on conflict (cuenta_id) do update set invierno = $2, puerta_hasta = $3, actualizado_en = $4`,
      [cuenta, cifrador.cifrar(JSON.stringify({ activo: invierno })), puerta, ahora()]);
  };

  // ---- Perfil conversado ----
  app.get('/api/perfil-publico', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    return perfilPublicoDe(db, id);
  });
  app.post('/api/perfil-publico', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const r = validarPerfil((request.body ?? {}) as Record<string, unknown>);
    if (!r.ok) return reply.code(400).send({ error: r.error });
    const p = r.perfil;
    await db.query(
      `insert into perfiles (cuenta_id, frase, gustos, comparte, aprender, visible, actualizado_en) values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (cuenta_id) do update set frase = $2, gustos = $3, comparte = $4, aprender = $5, visible = $6, actualizado_en = $7`,
      [id, p.frase, p.gustos, p.comparte, p.aprender, p.visible, ahora()]);
    return perfilPublicoDe(db, id);
  });

  // ---- Mi zona ----
  app.get('/api/zona', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    return (await vecinosDe(db, id, ahora(), refs)).map(({ id: _id, ...v }) => v);
  });

  // ---- Saludo de lejos: a un vecino de tu zona o a alguien con quien te viste. Uno por semana a la misma persona. ----
  app.post('/api/saludos', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    if (await enPausa(db, id, ahora())) return reply.code(403).send({ error: 'Tu cuenta está en pausa mientras revisamos un reporte.' });
    const b = (request.body ?? {}) as { ref?: string; saludo?: string };
    if (!saludos.some(s => s.id === b.saludo)) return reply.code(400).send({ error: 'Elige un saludo.' });
    const candidatos = [...(await vecinosDe(db, id, ahora(), refs)).map(v => v.id), ...(await conocidosDe(db, id)).map(c => c.id)];
    const otro = candidatos.find(c => refs.ref(id, c) === b.ref);
    if (!otro || await hayBloqueo(db, id, otro)) return reply.code(404).send({ error: 'No encontramos a esa persona.' });
    const [reciente] = await db.query(`select 1 from saludos where de = $1 and a = $2 and creado_en > $3::timestamptz - make_interval(days => $4)`, [id, otro, ahora(), DIAS_ENTRE_SALUDOS]);
    if (reciente) return reply.code(409).send({ error: 'Ya le mandaste un saludo esta semana. Los saludos llegan mejor sin prisa.' });
    await db.query('insert into saludos (de, a, saludo, creado_en) values ($1, $2, $3, $4)', [id, otro, b.saludo as Saludo, ahora()]);
    return { ok: true };
  });

  // ---- Estado: invierno y puerta abierta ----
  app.get('/api/estado', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    return estadoDe(db, cifrador, id, ahora());
  });
  app.post('/api/estado/invierno', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const activo = (request.body as { activo?: boolean } | undefined)?.activo === true;
    await guardarEstado(id, { invierno: activo });
    if (!activo) await olvidarInvierno(db, cifrador, id); // al salir del invierno, se olvida a quién se le contó
    return estadoDe(db, cifrador, id, ahora());
  });
  // Contar el invierno a personas con las que ya te viste, solo las que elijas.
  app.post('/api/estado/invierno/contar', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    if (!(await enInvierno(db, cifrador, id))) return reply.code(409).send({ error: 'Primero cuéntame que estás en invierno.' });
    const elegidas = (request.body as { refs?: string[] } | undefined)?.refs ?? [];
    for (const c of await conocidosDe(db, id)) {
      if (elegidas.includes(refs.ref(id, c.id))) await db.query('insert into inviernos_contados (de_ciego, a_ciego, datos) values ($1, $2, $3) on conflict do nothing',
        [ciegoDe(cifrador, id), ciegoA(cifrador, c.id), cifrador.cifrar(JSON.stringify({ de: id, a: c.id, creado: ahora().toISOString() } satisfies Contado))]);
    }
    return estadoDe(db, cifrador, id, ahora());
  });
  app.post('/api/estado/puerta', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const abierta = (request.body as { abierta?: boolean } | undefined)?.abierta === true;
    await guardarEstado(id, { puertaHasta: abierta ? new Date(ahora().getTime() + DIAS_PUERTA * 864e5) : null });
    return estadoDe(db, cifrador, id, ahora());
  });
}
