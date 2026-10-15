// Cuidar a quien cuida: el test «¿Cómo cuidas y cómo te cuidas?» y el Moai interno (src/lib/cuidado.ts).
// REVISIÓN HUMANA: puede ser dato sensible (Ley 1581). Se guarda solo con autorización explícita y cifrado.
// Los nombres del Moai interno (gente que quizá no usa MOAI) también van cifrados. Nadie más los ve.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { DIAS_REPETIR_CUIDADO, DIAS_SIN_HABLAR, MAX_INTERNO, resultadoCuidado, validarPersonaInterna, type Letra } from '../src/lib/cuidado';
import type { Carta, Cuidado, PersonaInterna } from '../src/lib/api';
import type { Cifrador } from './cifrado';
import type { Db } from './db';

type FilaInterna = { id: string; nombre: string; relacion: string; familia: boolean; ultimo_contacto: string | null; creado_en: string };

const pendiente = (f: FilaInterna, ahora: Date) =>
  ahora.getTime() - new Date(f.ultimo_contacto ?? f.creado_en).getTime() > DIAS_SIN_HABLAR * 864e5;

export async function internoDe(db: Db, cifrador: Cifrador, cuenta: string, ahora: Date): Promise<PersonaInterna[]> {
  const filas = await db.query<FilaInterna>('select id, nombre, relacion, familia, ultimo_contacto, creado_en from moai_interno where cuenta_id = $1 order by creado_en', [cuenta]);
  return filas.map(f => ({ id: f.id, nombre: cifrador.descifrar(f.nombre) ?? '', relacion: cifrador.descifrar(f.relacion) ?? '', familia: f.familia, pendiente: pendiente(f, ahora) }));
}

export async function cuidadoDe(db: Db, cifrador: Cifrador, cuenta: string): Promise<Cuidado> {
  const [fila] = await db.query<{ respuestas: string; actualizado_en: string }>('select respuestas, actualizado_en from cuidado where cuenta_id = $1', [cuenta]);
  const letras = fila ? resultadoCuidado(JSON.parse(cifrador.descifrar(fila.respuestas) ?? 'null')) : null;
  return letras ? { letras, guardado: true, fecha: new Date(fila.actualizado_en).toISOString() } : { letras: null, guardado: false };
}

// Semana ISO (año-semana): Brisa recuerda el Moai interno como mucho una vez por semana (regla 13).
function semana(fecha: Date) {
  const d = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-${Math.ceil(((d.getTime() - inicio.getTime()) / 864e5 + 1) / 7)}`;
}

export async function cartaInterna(db: Db, cifrador: Cifrador, cuenta: string, ahora: Date, vistos: Set<string>): Promise<Carta[]> {
  const clave = `interno:${semana(ahora)}`;
  if (vistos.has(clave)) return [];
  const persona = (await internoDe(db, cifrador, cuenta, ahora)).find(p => p.pendiente);
  if (!persona) return [];
  const { letras } = await cuidadoDe(db, cifrador, cuenta);
  const intro = letras?.includes('A') ? 'Cuidar a otros también cansa, y tú conectas con mucha intensidad. ' : '';
  return [{ clave, tipo: 'interno', personaId: persona.id, texto: `${intro}Hace un tiempo no hablas con ${persona.nombre}. ¿Le escribes hoy?`,
    motivo: 'Porque está en tu Moai interno: las personas que te nutren. Te lo recuerdo como mucho una vez por semana.' }];
}

// Repetir el test cada tanto: una invitación por cada vez que el resultado guardado cumple 90 días.
export async function cartaRepetirCuidado(db: Db, cuenta: string, ahora: Date, vistos: Set<string>): Promise<Carta[]> {
  const [fila] = await db.query<{ actualizado_en: string }>('select actualizado_en from cuidado where cuenta_id = $1', [cuenta]);
  if (!fila || ahora.getTime() - new Date(fila.actualizado_en).getTime() < DIAS_REPETIR_CUIDADO * 864e5) return [];
  const clave = `cuidado:repetir:${new Date(fila.actualizado_en).toISOString()}`;
  if (vistos.has(clave)) return [];
  return [{ clave, tipo: 'cuidado', texto: 'Hace unos meses respondimos juntas «¿Cómo cuidas y cómo te cuidas?». Las personas cambian, y está bien. ¿Volvemos a mirarlo?' }];
}

export function registrarCuidado(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date, cifrador: Cifrador) {
  const conSesion = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = await cuentaDeSesion(request);
    if (!id) void reply.code(401).send({ error: 'Sin sesión.' });
    return id;
  };

  // ---- Test de cuidado ----
  app.get('/api/cuidado', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    return cuidadoDe(db, cifrador, id);
  });

  // Calcula el resultado. Solo se guarda si la persona lo autoriza (`guardar: true`); si no, se le muestra y se olvida.
  app.post('/api/cuidado', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const body = (request.body ?? {}) as { respuestas?: unknown; guardar?: boolean };
    const letras = resultadoCuidado(body.respuestas);
    if (!letras) return reply.code(400).send({ error: 'Responde las seis preguntas.' });
    if (body.guardar !== true) {
      await db.query('delete from cuidado where cuenta_id = $1', [id]);
      return { letras, guardado: false } satisfies Cuidado;
    }
    await db.query(
      `insert into cuidado (cuenta_id, respuestas, autorizado_en, actualizado_en) values ($1, $2, $3, $3)
       on conflict (cuenta_id) do update set respuestas = $2, autorizado_en = $3, actualizado_en = $3`,
      [id, cifrador.cifrar(JSON.stringify(body.respuestas as Letra[])), ahora()]);
    return cuidadoDe(db, cifrador, id);
  });

  app.delete('/api/cuidado', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    await db.query('delete from cuidado where cuenta_id = $1', [id]);
    return { letras: null, guardado: false } satisfies Cuidado;
  });

  // ---- Moai interno ----
  const lista = (cuenta: string) => internoDe(db, cifrador, cuenta, ahora());

  app.get('/api/interno', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    return lista(id);
  });

  app.post('/api/interno', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const r = validarPersonaInterna((request.body ?? {}) as Record<string, unknown>);
    if (!r.ok) return reply.code(400).send({ errores: r.errores });
    const [{ total }] = await db.query<{ total: number }>('select count(*)::int as total from moai_interno where cuenta_id = $1', [id]);
    if (total >= MAX_INTERNO) return reply.code(400).send({ error: `Tu Moai interno es de hasta ${MAX_INTERNO} personas: quienes más te sostienen.` });
    await db.query('insert into moai_interno (cuenta_id, nombre, relacion, familia, creado_en) values ($1, $2, $3, $4, $5)', [id, cifrador.cifrar(r.nombre), cifrador.cifrar(r.relacion), r.familia, ahora()]);
    return lista(id);
  });

  app.post<{ Params: { persona: string } }>('/api/interno/:persona/hablamos', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    const [fila] = await db.query('update moai_interno set ultimo_contacto = $3 where id = $1 and cuenta_id = $2 returning id', [request.params.persona, id, ahora()]);
    if (!fila) return reply.code(404).send({ error: 'No encontramos a esa persona.' });
    return lista(id);
  });

  app.delete<{ Params: { persona: string } }>('/api/interno/:persona', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    await db.query('delete from moai_interno where id = $1 and cuenta_id = $2', [request.params.persona, id]);
    return lista(id);
  });
}
