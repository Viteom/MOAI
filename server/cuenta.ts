// Mi cuenta: descargar mis datos y borrar la cuenta (Ley 1581: conocer y suprimir, sin costo y sin intermediarios).
// REVISIÓN HUMANA: toca todos los datos personales de la cuenta.
// - La descarga trae lo que la persona dio o hizo en MOAI, con lo cifrado ya descifrado. De otras personas solo va su
//   primer nombre; nunca quién la reportó a ella (eso protege a quien reporta).
// - Borrar es inmediato y no se puede deshacer: se van la cuenta y todo lo que cuelga de ella (planes, mensajes,
//   Moais de los que era la última persona, lugares, reportes hechos y recibidos, lo cifrado y los códigos).
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from './db.js';
import type { Cifrador } from './cifrado.js';
import { cuidadoDe, internoDe } from './cuidado.js';
import { enInvierno, olvidarInviernoCompleto } from './cercania.js';
import { historialDe } from './historial.js';
import { accionesBrisaDe, memoriaBrisaDe } from './brisa-intenciones.js';

const fechaISO = (f: string | Date | null) => (f ? new Date(f).toISOString() : null);

export async function datosDe(db: Db, cifrador: Cifrador, cuenta: string, ahora: Date) {
  const [c] = await db.query<{ nombre: string; canal: string; destino: string; ciudad: string | null; barrio: string | null; fecha_nacimiento: string | null; creada_en: string; verificada_en: string | null; sugerencias: boolean; gustos: string[]; resumen_semanal: boolean }>(
    `select nombre, canal, destino, ciudad, barrio, to_char(fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento, creada_en, verificada_en, sugerencias, gustos, resumen_semanal
     from cuentas where id = $1`, [cuenta]);
  const q = <T>(sql: string) => db.query<T>(sql, [cuenta]);
  const [estado] = await q<{ puerta_hasta: string | null }>('select puerta_hasta from estados where cuenta_id = $1');
  const [perfil] = await q<{ frase: string; gustos: string[]; comparte: string; aprender: string; visible: boolean }>('select frase, gustos, comparte, aprender, visible, nombre_preferido as "nombrePreferido", visible_red as "visibleEnRed" from perfiles where cuenta_id = $1');
  const cuidado = await cuidadoDe(db, cifrador, cuenta);
  return {
    descargado: ahora.toISOString(),
    nota: 'Estos son los datos que MOAI tiene de ti. De otras personas solo aparece su primer nombre.',
    cuenta: { nombre: c.nombre, canal: c.canal, contacto: c.destino, fechaNacimiento: c.fecha_nacimiento, ciudad: c.ciudad, barrio: c.barrio, creada: fechaISO(c.creada_en), verificada: fechaISO(c.verificada_en) },
    autorizaciones: (await q<{ tipo: string; version: string; aceptado_en: string }>('select tipo, version, aceptado_en from consentimientos where cuenta_id = $1 order by aceptado_en'))
      .map(a => ({ tipo: a.tipo === 'terminos' ? 'Términos y condiciones' : 'Tratamiento de datos', version: a.version, fecha: fechaISO(a.aceptado_en) })),
    avisos: { recomendaciones: c.sugerencias, tiposDePlan: c.gustos, correoSemanal: c.resumen_semanal },
    lugares: await q('select nombre, ciudad, barrio, celda, activo from lugares where cuenta_id = $1 order by creado_en'),
    planesPropuestos: await q(`select titulo, descripcion, cuando, lugar_publico as "lugarPublico", alcance, repite, cancelado_en as cancelado from planes where autor_id = $1 order by creado_en`),
    planesALosQueTeSumaste: await q(`select p.titulo, a.ocurrencia from asistencias a join planes p on p.id = a.plan_id where a.cuenta_id = $1 order by a.ocurrencia`),
    mensajesEnPlanes: await q(`select p.titulo as plan, m.texto, m.creado_en as fecha from plan_mensajes m join planes p on p.id = m.plan_id where m.autor_id = $1 order by m.creado_en`),
    moais: await q(`select o.nombre, mm.unido_en as desde from moai_miembros mm join moais o on o.id = mm.moai_id where mm.cuenta_id = $1 order by mm.unido_en`),
    mensajesEnMoais: await q(`select o.nombre as moai, m.texto, m.creado_en as fecha from moai_mensajes m join moais o on o.id = m.moai_id where m.autor_id = $1 order by m.creado_en`),
    conQuienTeViste: await q(`select split_part(c.nombre, ' ', 1) as persona, n.ocurrencia as fecha, n.si as "teVieron" from nos_vimos n join cuentas c on c.id = n.a where n.de = $1 order by n.ocurrencia`),
    saludosEnviados: await q(`select split_part(c.nombre, ' ', 1) as persona, s.saludo, s.creado_en as fecha from saludos s join cuentas c on c.id = s.a where s.de = $1 order by s.creado_en`),
    personasBloqueadas: await q(`select split_part(c.nombre, ' ', 1) as persona, b.creado_en as fecha from bloqueos b join cuentas c on c.id = b.a where b.de = $1`),
    reportesQueHiciste: await q(`select split_part(c.nombre, ' ', 1) as persona, r.motivo, r.detalle, r.mensaje, r.creado_en as fecha from reportes r join cuentas c on c.id = r.a where r.de = $1 order by r.creado_en`),
    tuTarjeta: perfil ?? null,
    estado: { invierno: await enInvierno(db, cifrador, cuenta), puertaAbiertaHasta: fechaISO(estado?.puerta_hasta ?? null) },
    testDeCuidado: cuidado.letras ? { resultado: cuidado.letras, guardado: cuidado.guardado, fecha: cuidado.fecha ?? null } : null,
    moaiInterno: (await internoDe(db, cifrador, cuenta, ahora)).map(p => ({ nombre: p.nombre, relacion: p.relacion, familia: p.familia })),
    fichasPersonales: (await q<{ persona_clave: string; datos: string }>('select persona_clave, datos from fichas_vinculo where cuenta_id = $1'))
      .map(f => ({ vinculo: f.persona_clave, ficha: JSON.parse(cifrador.descifrar(f.datos) ?? 'null') })),
    conversacionConBrisa: await historialDe(db, cifrador, cuenta, ahora, 100_000), // los últimos DIAS_HISTORIAL (90) días
    memoriaDeBrisa: await memoriaBrisaDe(db, cifrador, cuenta, ahora),
    accionesConfirmadasConBrisa: await accionesBrisaDe(db, cifrador, cuenta, ahora),
    propuestasPendientesDeBrisa: (await db.query<{ datos: string; vence_en: string }>('select datos, vence_en from brisa_propuestas where cuenta_id = $1 and confirmada_en is null and vence_en > $2', [cuenta, ahora]))
      .map(f => ({ propuesta: JSON.parse(cifrador.descifrar(f.datos) ?? 'null'), venceEn: fechaISO(f.vence_en) })),
    descartesDeBrisa: await q('select clave, vence_en as "venceEn" from brisa_descartes where cuenta_id = $1'),
    autorizacionesGeminiBeta: await db.query(`select 'Gemini' as proveedor, modelo, version, creado_en as "autorizadoEn", terminado_en as "terminadoEn", resultado
      from brisa_interpretaciones where cuenta_id = $1 and creado_en > $2::timestamptz - interval '90 days' order by creado_en`, [cuenta, ahora]),
  };
}

export async function borrarCuenta(db: Db, cifrador: Cifrador, cuenta: string) {
  await db.transaccion(async tx => {
    const moais = await tx.query<{ moai_id: string }>('select moai_id from moai_miembros where cuenta_id = $1', [cuenta]);
    await tx.query('delete from moai_miembros where cuenta_id = $1', [cuenta]);
    for (const { moai_id } of moais) await tx.query('delete from moais o where o.id = $1 and not exists (select 1 from moai_miembros m where m.moai_id = o.id)', [moai_id]);
    const [{ destino }] = await tx.query<{ destino: string }>('select destino from cuentas where id = $1', [cuenta]);
    await tx.query('delete from verificaciones where destino = $1', [destino]);
    await tx.query('delete from cuentas where id = $1', [cuenta]); // lo demás se borra en cascada
  });
  await olvidarInviernoCompleto(db, cifrador, cuenta);
}

export function registrarCuenta(app: FastifyInstance, db: Db, cuentaDeSesion: (r: FastifyRequest) => Promise<string | null>, ahora: () => Date, cifrador: Cifrador, cookieSesion: string) {
  const conSesion = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = await cuentaDeSesion(request);
    if (!id) reply.code(401).send({ error: 'Sin sesión.' });
    return id;
  };
  app.get('/api/cuenta/datos', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    return datosDe(db, cifrador, id, ahora());
  });
  app.post('/api/cuenta/borrar', async (request, reply) => {
    const id = await conSesion(request, reply); if (!id) return reply;
    if ((request.body as { confirmo?: boolean } | undefined)?.confirmo !== true) return reply.code(400).send({ error: 'Confirma que quieres borrar tu cuenta.' });
    await borrarCuenta(db, cifrador, id);
    reply.clearCookie(cookieSesion, { path: '/' });
    return { ok: true };
  });
}
