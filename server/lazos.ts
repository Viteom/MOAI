// Mis lazos: tu red en un solo lugar (src/lib/lazos.ts). Solo la ve la persona.
// RAÍZ: familia del Moai interno · TRONCO: el resto del Moai interno y cada Moai · RAMA: personas con las que te viste.
// El estado sale de cuándo fue el último contacto que MOAI conoce (encuentro confirmado, saludo, mensaje del Moai o
// «Ya hablamos»), y nunca se muestra como número: solo vivo, tibio o dormido.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { estadoLazo } from '../src/lib/lazos';
import type { Lazos } from '../src/lib/api';
import type { Cifrador } from './cifrado';
import type { Db } from './db';
import { internoDe } from './cuidado';
import { conocidosDe } from './moais';
import type { Refs } from './personas';

const masReciente = (...fechas: (string | Date | null | undefined)[]) =>
  fechas.filter(Boolean).map(f => new Date(f!)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

export async function lazosDe(db: Db, cifrador: Cifrador, cuenta: string, ahora: Date, refs: Refs): Promise<Lazos> {
  const lazos: Lazos = { grupos: [], personas: [] };

  // Contacto con otra cuenta: último encuentro confirmado por las dos y último saludo entre ambas.
  const contacto = async (otra: string) => {
    const [r] = await db.query<{ encuentro: string | null; saludo: string | null; puerta: boolean }>(
      `select (select max(n1.ocurrencia) from nos_vimos n1 join nos_vimos n2 on n2.de = n1.a and n2.a = n1.de and n2.plan_id = n1.plan_id and n2.ocurrencia = n1.ocurrencia and n2.si
               where n1.de = $1 and n1.a = $2 and n1.si) as encuentro,
              (select max(creado_en) from saludos where (de = $1 and a = $2) or (de = $2 and a = $1)) as saludo,
              exists (select 1 from estados e where e.cuenta_id = $2 and e.puerta_hasta > $3) as puerta`, [cuenta, otra, ahora]);
    return r;
  };

  // Raíz y Moai interno.
  const interno = await internoDe(db, cifrador, cuenta, ahora);
  const filasInterno = await db.query<{ id: string; ultimo_contacto: string | null; creado_en: string }>('select id, ultimo_contacto, creado_en from moai_interno where cuenta_id = $1', [cuenta]);
  for (const grupo of ['raiz', 'interno'] as const) {
    const personas = interno.filter(p => p.familia === (grupo === 'raiz'));
    if (!personas.length) continue;
    lazos.grupos.push({ id: grupo, tipo: grupo, nombre: grupo === 'raiz' ? 'Familia' : 'Quien me nutre' });
    for (const p of personas) {
      const f = filasInterno.find(x => x.id === p.id)!;
      lazos.personas.push({ id: `interno:${p.id}`, grupo, nombre: p.nombre, detalle: p.relacion, estado: estadoLazo(new Date(f.ultimo_contacto ?? f.creado_en), ahora), puerta: false, accion: { tipo: 'interno', id: p.id } });
    }
  }

  // Tronco: cada Moai con sus miembros. Último contacto: su último mensaje en el Moai, un encuentro o un saludo.
  const enMoai = new Set<string>();
  for (const m of await db.query<{ id: string; nombre: string }>(`select o.id, o.nombre from moais o join moai_miembros mm on mm.moai_id = o.id where mm.cuenta_id = $1 order by mm.unido_en`, [cuenta])) {
    const miembros = await db.query<{ id: string; nombre: string; mensaje: string | null }>(
      `select c.id, split_part(c.nombre, ' ', 1) as nombre, (select max(creado_en) from moai_mensajes x where x.moai_id = $1 and x.autor_id = c.id) as mensaje
       from moai_miembros mm join cuentas c on c.id = mm.cuenta_id where mm.moai_id = $1 and mm.cuenta_id <> $2 and c.suspendida_en is null order by mm.unido_en`, [m.id, cuenta]);
    const grupo = `moai:${m.id}`;
    lazos.grupos.push({ id: grupo, tipo: 'moai', nombre: m.nombre, moaiId: m.id });
    for (const x of miembros) {
      enMoai.add(x.id);
      const c = await contacto(x.id);
      lazos.personas.push({ id: `${grupo}:${refs.ref(cuenta, x.id)}`, grupo, nombre: x.nombre, detalle: '', estado: estadoLazo(masReciente(x.mensaje, c.encuentro, c.saludo), ahora), puerta: c.puerta, accion: { tipo: 'moai', moaiId: m.id } });
    }
  }

  // Rama: personas con las que te viste y que no están en tus Moais.
  const rama = (await conocidosDe(db, cuenta, ahora)).filter(c => !enMoai.has(c.id));
  if (rama.length) lazos.grupos.push({ id: 'rama', tipo: 'rama', nombre: 'Personas con las que me vi' });
  for (const x of rama) {
    const c = await contacto(x.id);
    const ref = refs.ref(cuenta, x.id);
    lazos.personas.push({ id: `rama:${ref}`, grupo: 'rama', nombre: x.nombre, detalle: '', estado: estadoLazo(masReciente(c.encuentro, c.saludo), ahora), puerta: c.puerta, accion: { tipo: 'saludo', ref } });
  }
  return lazos;
}

export function registrarLazos(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date, refs: Refs, cifrador: Cifrador) {
  app.get('/api/lazos', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = await cuentaDeSesion(request);
    if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    return lazosDe(db, cifrador, id, ahora(), refs);
  });
}
