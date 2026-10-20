// Mi gente: categoría y pertenencia a un Moai son dimensiones independientes.
// Las cuentas usan referencias distintas por observador; no se unen contactos por su nombre.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { estadoLazo } from '../src/lib/lazos';
import { fichaVacia, validarFicha, type FichaPrivada } from '../src/lib/vinculos';
import type { FichaVinculo, Lazos } from '../src/lib/api';
import type { Cifrador } from './cifrado';
import type { Db } from './db';
import { internoDe } from './cuidado';
import { conocidosDe } from './moais';
import { perfilPublicoDe } from './cercania';
import type { Refs } from './personas';

const masReciente = (...fechas: (string | Date | null | undefined)[]) =>
  fechas.filter(Boolean).map(f => new Date(f!)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

export async function lazosDe(db: Db, cifrador: Cifrador, cuenta: string, ahora: Date, refs: Refs): Promise<Lazos> {
  const lazos: Lazos = { grupos: [], personas: [] };
  const interno = await internoDe(db, cifrador, cuenta, ahora);
  const filas = await db.query<{ id: string; ultimo_contacto: string | null; creado_en: string }>('select id, ultimo_contacto, creado_en from moai_interno where cuenta_id = $1', [cuenta]);
  for (const grupo of ['raiz', 'interno'] as const) {
    const personas = interno.filter(p => p.familia === (grupo === 'raiz'));
    if (!personas.length) continue;
    lazos.grupos.push({ id: grupo, tipo: grupo, nombre: grupo === 'raiz' ? 'Familia' : 'Quien me nutre' });
    for (const p of personas) {
      const f = filas.find(x => x.id === p.id)!;
      lazos.personas.push({ id: `interno:${p.id}`, grupo, categoria: grupo === 'raiz' ? 'raiz' : 'tronco', origen: 'personal', moais: [],
        nombre: p.nombre, detalle: p.relacion, estado: estadoLazo(new Date(f.ultimo_contacto ?? f.creado_en), ahora), puerta: false, accion: { tipo: 'interno', id: p.id } });
    }
  }
  const conocidos = await conocidosDe(db, cuenta, ahora);
  const porCuenta = new Map<string, { id: string; mensaje?: string | null; moais: { id: string; nombre: string }[] }>();
  for (const c of conocidos) porCuenta.set(c.id, { id: c.id, moais: [] });
  // Solo grupos de los que ya es miembro el observador; una invitación no da pertenencia.
  const moais = await db.query<{ id: string; nombre: string }>(
    `select o.id, o.nombre from moais o join moai_miembros mm on mm.moai_id = o.id where mm.cuenta_id = $1 order by mm.unido_en`, [cuenta]);
  for (const m of moais) {
    lazos.grupos.push({ id: `moai:${m.id}`, tipo: 'moai', nombre: m.nombre, moaiId: m.id });
    const miembros = await db.query<{ id: string; mensaje: string | null }>(
      `select c.id, (select max(creado_en) from moai_mensajes x where x.moai_id = $1 and x.autor_id = c.id) as mensaje
       from moai_miembros mm join cuentas c on c.id = mm.cuenta_id
       where mm.moai_id = $1 and mm.cuenta_id <> $2 and c.suspendida_en is null
       and not exists (select 1 from bloqueos b where (b.de = $2 and b.a = c.id) or (b.de = c.id and b.a = $2))
       order by mm.unido_en`, [m.id, cuenta]);
    for (const x of miembros) {
      const p = porCuenta.get(x.id) ?? { id: x.id, moais: [] };
      p.moais.push(m);
      p.mensaje = masReciente(p.mensaje, x.mensaje)?.toISOString();
      porCuenta.set(x.id, p);
    }
  }
  if (porCuenta.size) lazos.grupos.push({ id: 'rama', tipo: 'rama', nombre: 'Personas de mi red' });
  for (const p of porCuenta.values()) {
    const [c] = await db.query<{ nombre: string; encuentro: string | null; saludo: string | null; puerta: boolean }>(
      `select case when pr.visible_red and pr.nombre_preferido <> '' then pr.nombre_preferido else split_part(c.nombre, ' ', 1) end as nombre,
       (select max(n1.ocurrencia) from nos_vimos n1 join nos_vimos n2 on n2.de = n1.a and n2.a = n1.de and n2.plan_id = n1.plan_id and n2.ocurrencia = n1.ocurrencia and n2.si
        where n1.de = $1 and n1.a = $2 and n1.si) as encuentro,
       (select max(creado_en) from saludos where (de = $1 and a = $2) or (de = $2 and a = $1)) as saludo,
       exists (select 1 from estados e where e.cuenta_id = $2 and e.puerta_hasta > $3) as puerta
       from cuentas c left join perfiles pr on pr.cuenta_id = c.id where c.id = $2 and c.suspendida_en is null
       and not exists (select 1 from bloqueos b where (b.de = $1 and b.a = $2) or (b.de = $2 and b.a = $1))`, [cuenta, p.id, ahora]);
    if (!c) continue;
    const ref = refs.ref(cuenta, p.id);
    // Ser miembro de un grupo no asciende un vínculo a Tronco. La promoción entre cuentas
    // necesita confirmación mutua; hasta que exista ese flujo se mantiene la categoría Rama.
    lazos.personas.push({ id: `persona:${ref}`, referencia: ref, grupo: 'rama', categoria: 'rama', origen: 'moai', moais: p.moais,
      nombre: c.nombre, detalle: '', estado: estadoLazo(masReciente(p.mensaje, c.encuentro, c.saludo), ahora),
      puerta: c.puerta && conocidos.some(x => x.id === p.id), accion: { tipo: 'saludo', ref } });
  }
  return lazos;
}

export function registrarLazos(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date, refs: Refs, cifrador: Cifrador) {
  const buscar = async (cuenta: string, clave: string) => (await lazosDe(db, cifrador, cuenta, ahora(), refs)).personas.find(p => p.id === clave);
  const privadaDe = async (cuenta: string, clave: string): Promise<FichaPrivada> => {
    const [f] = await db.query<{ datos: string }>('select datos from fichas_vinculo where cuenta_id = $1 and persona_clave = $2', [cuenta, clave]);
    const texto = f && cifrador.descifrar(f.datos);
    if (!texto) return { ...fichaVacia };
    const r = validarFicha(JSON.parse(texto));
    return r.ok ? r.ficha : { ...fichaVacia };
  };
  app.get('/api/lazos', async (request, reply) => {
    const id = await cuentaDeSesion(request);
    if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    return lazosDe(db, cifrador, id, ahora(), refs);
  });
  app.get<{ Params: { persona: string } }>('/api/lazos/:persona/ficha', async (request, reply) => {
    const id = await cuentaDeSesion(request);
    if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    const persona = await buscar(id, request.params.persona);
    if (!persona) return reply.code(404).send({ error: 'No encontramos ese vínculo en tu red.' });
    let compartida: FichaVinculo['compartida'] = null;
    if (persona.referencia) {
      const otra = await refs.resolver(db, id, persona.referencia);
      if (otra) {
        const p = await perfilPublicoDe(db, otra);
        if (p.visibleEnRed) compartida = { frase: p.frase, gustos: p.gustos, comparte: p.comparte, aprender: p.aprender, visible: false,
          nombrePreferido: p.nombrePreferido, visibleEnRed: true };
      }
    }
    return { persona, compartida, privada: await privadaDe(id, persona.id) } satisfies FichaVinculo;
  });
  app.post<{ Params: { persona: string } }>('/api/lazos/:persona/ficha', async (request, reply) => {
    const id = await cuentaDeSesion(request);
    if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    const persona = await buscar(id, request.params.persona);
    if (!persona) return reply.code(404).send({ error: 'No encontramos ese vínculo en tu red.' });
    const r = validarFicha(request.body);
    if (!r.ok) return reply.code(400).send({ errores: r.errores });
    if (Object.values(r.ficha).every(t => !t)) await db.query('delete from fichas_vinculo where cuenta_id = $1 and persona_clave = $2', [id, persona.id]);
    else await db.query(`insert into fichas_vinculo (cuenta_id, persona_clave, datos) values ($1, $2, $3)
      on conflict (cuenta_id, persona_clave) do update set datos = excluded.datos`, [id, persona.id, cifrador.cifrar(JSON.stringify(r.ficha))]);
    return r.ficha;
  });
  app.post<{ Params: { persona: string } }>('/api/lazos/:persona/categoria', async (request, reply) => {
    const id = await cuentaDeSesion(request);
    if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    const persona = await buscar(id, request.params.persona);
    if (!persona) return reply.code(404).send({ error: 'No encontramos ese vínculo en tu red.' });
    const categoria = (request.body as { categoria?: unknown } | null)?.categoria;
    if (!['raiz', 'tronco', 'rama'].includes(categoria as string)) return reply.code(400).send({ error: 'Elige una categoría válida.' });
    if (persona.accion.tipo !== 'interno') return reply.code(409).send({ error: 'Cambiar la categoría entre cuentas requiere confirmación mutua. Ese flujo todavía no está disponible.' });
    if (categoria === 'rama') return reply.code(400).send({ error: 'Los contactos personales pueden ser de tu familia o de quienes te nutren.' });
    await db.query('update moai_interno set familia = $3 where id = $1 and cuenta_id = $2', [persona.accion.id, id, categoria === 'raiz']);
    return lazosDe(db, cifrador, id, ahora(), refs);
  });
}
