// Herramientas del equipo de MOAI: revisar reportes y dar de alta entidades que convocan.
// Solo para los correos de EQUIPO_CORREOS. REVISIÓN HUMANA: acceso a reportes y a correos de personas reportadas.
// - Cerrar un caso «sin medidas» marca sus reportes como revisados: la pausa se levanta.
// - Suspender impide entrar, cierra las sesiones y oculta sus planes. Reactivar lo deshace.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { CasoReporte, OrganizacionEquipo, OrganizacionPropia } from '../src/lib/api.js';
import { validarOrganizacion, type TipoOrganizacion } from '../src/lib/organizaciones.js';
import type { Db } from './db.js';
import { enPausa } from './personas.js';

export const organizacionesDe = (db: Db, cuenta: string) => db.query<OrganizacionPropia>(
  `select o.id, o.nombre, o.tipo from organizaciones o join organizacion_responsables r on r.organizacion_id = o.id
   where r.cuenta_id = $1 and o.activa order by o.nombre`, [cuenta]);

export function registrarEquipo(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date, esEquipo: (cuenta: string) => Promise<boolean>) {
  const delEquipo = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = await cuentaDeSesion(request);
    if (!id) { void reply.code(401).send({ error: 'Sin sesión.' }); return null; }
    if (!(await esEquipo(id))) { void reply.code(403).send({ error: 'Esta sección es solo para el equipo de MOAI.' }); return null; }
    return id;
  };

  // Casos: una persona reportada con sus reportes. Primero los que tienen reportes sin revisar.
  const casos = async (): Promise<CasoReporte[]> => {
    const filas = await db.query<{ id: number; a: string; nombre_a: string; correo_a: string; suspendida_en: string | null; nombre_de: string; motivo: string; detalle: string; mensaje: string | null; creado_en: string; revisado_en: string | null; decision: string | null }>(
      `select r.id, r.a, ca.nombre as nombre_a, ca.destino as correo_a, ca.suspendida_en, split_part(cd.nombre, ' ', 1) as nombre_de,
              r.motivo, r.detalle, r.mensaje, r.creado_en, r.revisado_en, r.decision
       from reportes r join cuentas ca on ca.id = r.a join cuentas cd on cd.id = r.de
       where r.revisado_en is null or r.revisado_en > $1::timestamptz - interval '30 days'
       order by r.creado_en desc`, [ahora()]);
    const porPersona = new Map<string, CasoReporte>();
    for (const f of filas) {
      let caso = porPersona.get(f.a);
      if (!caso) porPersona.set(f.a, caso = { cuenta: f.a, nombre: f.nombre_a, correo: f.correo_a, suspendida: !!f.suspendida_en, pausa: false, pendientes: 0, reportes: [] });
      if (!f.revisado_en) caso.pendientes++;
      caso.reportes.push({ id: String(f.id), de: f.nombre_de, motivo: f.motivo, detalle: f.detalle, mensaje: f.mensaje, fecha: new Date(f.creado_en).toISOString(), revisado: !!f.revisado_en, decision: f.decision });
    }
    for (const caso of porPersona.values()) caso.pausa = await enPausa(db, caso.cuenta, ahora());
    return [...porPersona.values()].sort((a, b) => b.pendientes - a.pendientes);
  };

  app.get('/api/equipo/casos', async (request, reply) => {
    if (!(await delEquipo(request, reply))) return reply;
    return casos();
  });

  app.post<{ Params: { cuenta: string } }>('/api/equipo/casos/:cuenta', async (request, reply) => {
    if (!(await delEquipo(request, reply))) return reply;
    const decision = (request.body as { decision?: string } | undefined)?.decision;
    const { cuenta } = request.params;
    const [existe] = await db.query('select 1 from reportes where a = $1', [cuenta]);
    if (!existe) return reply.code(404).send({ error: 'No encontramos ese caso.' });
    if (decision === 'sin_medidas' || decision === 'suspender') {
      await db.query('update reportes set revisado_en = $2, decision = $3 where a = $1 and revisado_en is null', [cuenta, ahora(), decision]);
    }
    if (decision === 'suspender') {
      await db.query('update cuentas set suspendida_en = $2 where id = $1', [cuenta, ahora()]);
      await db.query('delete from sesiones where cuenta_id = $1', [cuenta]);
    } else if (decision === 'reactivar') {
      await db.query('update cuentas set suspendida_en = null where id = $1', [cuenta]);
    } else if (decision !== 'sin_medidas') {
      return reply.code(400).send({ error: 'Decisión no válida.' });
    }
    return casos();
  });

  // ---- Entidades que convocan ----
  const organizaciones = async (): Promise<OrganizacionEquipo[]> => {
    const filas = await db.query<{ id: string; nombre: string; tipo: TipoOrganizacion; activa: boolean; responsables: string[] | null }>(
      `select o.id, o.nombre, o.tipo, o.activa, array_remove(array_agg(c.destino order by c.destino), null) as responsables
       from organizaciones o left join organizacion_responsables r on r.organizacion_id = o.id left join cuentas c on c.id = r.cuenta_id
       group by o.id order by o.activa desc, o.nombre`);
    return filas.map(f => ({ id: f.id, nombre: f.nombre, tipo: f.tipo, activa: f.activa, responsables: f.responsables ?? [] }));
  };

  app.get('/api/equipo/organizaciones', async (request, reply) => {
    if (!(await delEquipo(request, reply))) return reply;
    return organizaciones();
  });

  app.post('/api/equipo/organizaciones', async (request, reply) => {
    if (!(await delEquipo(request, reply))) return reply;
    const r = validarOrganizacion((request.body ?? {}) as Record<string, unknown>);
    if (!r.ok) return reply.code(400).send({ errores: r.errores });
    const [persona] = await db.query<{ id: string }>('select id from cuentas where destino = $1 and verificada_en is not null', [r.responsable]);
    if (!persona) return reply.code(400).send({ errores: { responsable: 'Ese correo no tiene una cuenta en MOAI. Pídele a la persona que se registre primero.' } });
    const [org] = await db.query<{ id: string }>('insert into organizaciones (nombre, tipo, creada_en) values ($1, $2, $3) returning id', [r.nombre, r.tipo, ahora()]);
    await db.query('insert into organizacion_responsables (organizacion_id, cuenta_id) values ($1, $2)', [org.id, persona.id]);
    return organizaciones();
  });

  // Pausar una entidad oculta sus convocatorias y le quita la opción de publicar.
  app.post<{ Params: { organizacion: string } }>('/api/equipo/organizaciones/:organizacion/activa', async (request, reply) => {
    if (!(await delEquipo(request, reply))) return reply;
    const activa = (request.body as { activa?: boolean } | undefined)?.activa === true;
    await db.query('update organizaciones set activa = $2 where id = $1', [request.params.organizacion, activa]);
    return organizaciones();
  });
}
