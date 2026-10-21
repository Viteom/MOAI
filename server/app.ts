// API de cuentas: registro y acceso sin contraseña, con un código de 6 dígitos por correo o WhatsApp.
// REVISIÓN HUMANA: datos personales, consentimiento y sesiones.
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { codigoValido, enmascarar, normalizarDestino, validarNacimiento, validarRegistro, VERSION_TEXTOS, type Canal, type EntradaRegistro } from '../src/lib/registro.js';
import type { Paso, Perfil } from '../src/lib/api.js';
import { MINUTOS_VIGENCIA, type Proposito, type Vias } from './envios.js';
import { aLugar, registrarComunidad } from './comunidad.js';
import { registrarMoais } from './moais.js';
import { crearRefs } from './personas.js';
import { organizacionesDe, registrarEquipo } from './equipo.js';
import { registrarCuidado } from './cuidado.js';
import { registrarCercania } from './cercania.js';
import { registrarLazos } from './lazos.js';
import { registrarCuenta } from './cuenta.js';
import { registrarHistorial } from './historial.js';
import { registrarIntencionesBrisa } from './brisa-intenciones.js';
import { registrarModeloBrisa } from './brisa-modelo.js';
import type { ProveedorBrisa } from './lenguaje-brisa.js';
import { crearCifrador } from './cifrado.js';
import { RESPONSABLE } from '../src/lib/legal.js';
import { validarLugar } from '../src/lib/lugares.js';
import type { Db } from './db.js';

export const COOKIE_SESION = 'moai_sesion';
const DIAS_SESION = 30;
const ENVIOS_POR_HORA = 5;
const INTENTOS_POR_CODIGO = 5;

// `equipo`: correos de las personas del equipo de MOAI que revisan reportes y dan de alta entidades (EQUIPO_CORREOS).
type Opciones = { db: Db; vias: Vias; secreto: string; produccion?: boolean; ahora?: () => Date; equipo?: string[]; modeloBrisa?: ProveedorBrisa | null;
  configurar?: (app: FastifyInstance) => void };
type Cuenta = { id: string; nombre: string; verificada_en: string | null; suspendida_en: string | null };
class Limite extends Error {}

const mensajes = {
  limite: 'Pediste varios códigos seguidos. Espera unos minutos y vuelve a intentarlo.',
  envio: 'No pudimos enviar el código. Intenta de nuevo en un momento.',
  codigo: 'Ese código no coincide o ya venció. Revísalo o pide uno nuevo.',
  bloqueado: 'Hubo demasiados intentos con este código. Pide uno nuevo.',
  destino: 'Revisa tu correo o tu número.',
  sinWhatsapp: 'WhatsApp todavía no está disponible. Por ahora, usa tu correo.',
  suspendida: `Tu cuenta está suspendida porque recibimos reportes sobre ella. Si crees que es un error, escríbenos a ${RESPONSABLE.correo}.`,
};

export async function crearApp({ db, vias, secreto, produccion = false, ahora = () => new Date(), equipo = [], modeloBrisa = null, configurar }: Opciones) {
  const app = Fastify({ logger: false, bodyLimit: 16 * 1024 });
  configurar?.(app); // Adaptadores de despliegue: antes de registrar rutas y completar ready().
  await app.register(cookie);
  const hmac = (valor: string) => createHmac('sha256', secreto).update(valor).digest('hex');
  const sha = (valor: string) => createHash('sha256').update(valor).digest('hex');
  const correosEquipo = new Set(equipo.map(c => c.trim().toLowerCase()).filter(Boolean));
  const esEquipo = (destino: string) => correosEquipo.has(destino.toLowerCase());

  // Revisión de Codex (15 de octubre): el límite por hora se reserva de forma atómica (un candado por destino), y
  // también cuenta cuando no hay cuenta, para que el límite no revele quién está registrado. Sin cuenta no se envía
  // nada: la fila queda usada desde el principio y nunca sirve para entrar. Si el proveedor falla, la fila se borra.
  // `ocultarFallo` (acceso, revisión de Codex): si el proveedor falla, la respuesta es la misma que sin cuenta y la fila
  // queda usada, igual que en la ruta simulada; así ni el estado ni el límite por hora delatan quién está registrado.
  async function enviarCodigo(canal: Canal, destino: string, proposito: Proposito | null, ocultarFallo = false) {
    const via = vias[canal]!;
    const codigo = proposito && via.tipo === 'propio' ? String(randomInt(0, 1_000_000)).padStart(6, '0') : null;
    const fila = await db.transaccion(async tx => {
      await tx.query('select pg_advisory_xact_lock(hashtext($1))', [destino]);
      const [{ total }] = await tx.query<{ total: number }>(
        `select count(*)::int as total from verificaciones where destino = $1 and creada_en > now() - interval '1 hour'`, [destino]);
      if (total >= ENVIOS_POR_HORA) throw new Limite();
      const [nueva] = await tx.query<{ id: number }>(
        `insert into verificaciones (destino, proposito, codigo_hash, vence_en, usada_en) values ($1, $2, $3, now() + make_interval(mins => $4), $5) returning id`,
        [destino, proposito ?? 'acceso', codigo && hmac(codigo), MINUTOS_VIGENCIA, proposito ? null : new Date()]);
      return nueva;
    });
    if (!proposito) return;
    try {
      if (via.tipo === 'propio') await via.enviar(destino, codigo!, proposito);
      else await via.iniciar(destino);
    } catch (error) {
      if (ocultarFallo) {
        await db.query('update verificaciones set usada_en = now() where id = $1', [fila.id]);
        app.log.error({ canal }, 'falló el envío del código de acceso');
        return;
      }
      await db.query('delete from verificaciones where id = $1', [fila.id]);
      throw error;
    }
  }

  // Cada intento se reserva con una actualización condicional (no se pueden colar intentos en paralelo) y el código
  // se marca como usado una sola vez. `propositos`: una cuenta pendiente solo se activa con el código del registro.
  async function comprobarCodigo(canal: Canal, destino: string, codigo: string, propositos: Proposito[]): Promise<'ok' | 'invalido' | 'bloqueado'> {
    const [fila] = await db.query<{ id: number; codigo_hash: string | null; proposito: Proposito }>(
      `select id, codigo_hash, proposito from verificaciones
       where destino = $1 and usada_en is null and vence_en > now() order by creada_en desc limit 1`, [destino]);
    if (!fila || !propositos.includes(fila.proposito)) return 'invalido';
    const [intento] = await db.query('update verificaciones set intentos = intentos + 1 where id = $1 and intentos < $2 and usada_en is null returning id', [fila.id, INTENTOS_POR_CODIGO]);
    if (!intento) return 'bloqueado';
    const via = vias[canal]!;
    const ok = via.tipo === 'propio'
      ? !!fila.codigo_hash && timingSafeEqual(Buffer.from(hmac(codigo)), Buffer.from(fila.codigo_hash))
      : await via.comprobar(destino, codigo);
    if (!ok) return 'invalido';
    const [usada] = await db.query('update verificaciones set usada_en = now() where id = $1 and usada_en is null returning id', [fila.id]);
    return usada ? 'ok' : 'invalido';
  }

  // Responde igual exista o no la cuenta, para no revelar quién está registrado.
  async function responderEnvio(reply: { code(n: number): { send(b: unknown): unknown } }, canal: Canal, destino: string, proposito: Proposito | null, ocultarFallo = false) {
    try {
      await enviarCodigo(canal, destino, proposito, ocultarFallo);
    } catch (error) {
      if (error instanceof Limite) return reply.code(429).send({ error: mensajes.limite });
      app.log.error({ canal }, 'falló el envío del código');
      return reply.code(502).send({ error: mensajes.envio });
    }
    return reply.code(200).send({ canal, destinoVisible: enmascarar(canal, destino) });
  }

  const cuentaPorDestino = async (destino: string) =>
    (await db.query<Cuenta>('select id, nombre, verificada_en, suspendida_en from cuentas where destino = $1', [destino]))[0];

  // Lo que el frontend necesita para saber qué paso falta (docs/09, apartado 5).
  const perfilDe = async (id: string): Promise<Perfil> => {
    const [c] = await db.query<{ nombre: string; fecha_nacimiento: string | null; comunidad_estado: Paso; destino: string }>(
      'select nombre, fecha_nacimiento, comunidad_estado, destino from cuentas where id = $1', [id]);
    const organizaciones = await organizacionesDe(db, id);
    const [presentada] = await db.query(`select 1 from avisos_vistos where cuenta_id = $1 and clave = 'brisa:presentada'`, [id]);
    const [lugar] = await db.query<{ id: string; nombre: string; ciudad: string; barrio: string | null; celda: string | null; activo: boolean }>(
      'select id, nombre, ciudad, barrio, celda, activo from lugares where cuenta_id = $1 and activo', [id]);
    return { nombre: c.nombre, nacimientoPendiente: !c.fecha_nacimiento, comunidad: c.comunidad_estado, lugar: lugar ? aLugar(lugar) : null,
      ...(esEquipo(c.destino) ? { equipo: true } : {}), ...(organizaciones.length ? { organizaciones } : {}), ...(presentada ? { presentada: true } : {}) };
  };
  const cuentaDeSesion = async (request: FastifyRequest) => {
    const token = request.cookies[COOKIE_SESION];
    if (!token) return null;
    const [fila] = await db.query<{ id: string }>(
      'select c.id from sesiones s join cuentas c on c.id = s.cuenta_id where s.token_hash = $1 and s.vence_en > now() and c.suspendida_en is null', [sha(token)]);
    return fila?.id ?? null;
  };

  app.post('/api/registro', async (request, reply) => {
    const resultado = validarRegistro((request.body ?? {}) as Partial<EntradaRegistro>);
    if (resultado.ok && !vias[resultado.registro.canal]) return reply.code(400).send({ error: mensajes.sinWhatsapp });
    if (!resultado.ok) return reply.code(400).send({ errores: resultado.errores });
    const { nombre, canal, destino } = resultado.registro;
    const existente = await cuentaPorDestino(destino);
    // Una cuenta ya verificada no se sobrescribe: recibe un código de acceso, sin revelar que existe.
    if (existente?.verificada_en) return responderEnvio(reply, canal, destino, 'acceso');
    const [cuenta] = existente
      ? await db.query<{ id: string }>('update cuentas set nombre = $2 where id = $1 returning id', [existente.id, nombre])
      : await db.query<{ id: string }>('insert into cuentas (nombre, canal, destino) values ($1, $2, $3) returning id', [nombre, canal, destino]);
    await db.query(`insert into consentimientos (cuenta_id, tipo, version) values ($1, 'terminos', $2), ($1, 'datos', $2)`, [cuenta.id, VERSION_TEXTOS]);
    return responderEnvio(reply, canal, destino, 'registro');
  });

  app.post('/api/acceso', async (request, reply) => {
    const body = (request.body ?? {}) as { canal?: Canal; destino?: string; pais?: string };
    const canal: Canal = body.canal === 'whatsapp' ? 'whatsapp' : 'correo';
    if (!vias[canal]) return reply.code(400).send({ error: mensajes.sinWhatsapp });
    const destino = normalizarDestino(canal, body.destino ?? '', body.pais);
    if (!destino) return reply.code(400).send({ error: mensajes.destino });
    const cuenta = await cuentaPorDestino(destino);
    // Solo las cuentas ya verificadas reciben un código de acceso; una pendiente debe completar el registro.
    return responderEnvio(reply, canal, destino, cuenta?.verificada_en ? 'acceso' : null, true);
  });

  app.post('/api/verificar', async (request, reply) => {
    const body = (request.body ?? {}) as { canal?: Canal; destino?: string; pais?: string; codigo?: string };
    const canal: Canal = body.canal === 'whatsapp' ? 'whatsapp' : 'correo';
    const destino = normalizarDestino(canal, body.destino ?? '', body.pais);
    const codigo = (body.codigo ?? '').trim();
    if (!vias[canal]) return reply.code(400).send({ error: mensajes.sinWhatsapp });
    if (!destino || !codigoValido(codigo)) return reply.code(400).send({ error: mensajes.codigo });
    const cuenta = await cuentaPorDestino(destino);
    if (!cuenta) return reply.code(400).send({ error: mensajes.codigo });
    if (cuenta.suspendida_en) return reply.code(403).send({ error: mensajes.suspendida, suspendida: true });
    const resultado = await comprobarCodigo(canal, destino, codigo, cuenta.verificada_en ? ['acceso', 'registro'] : ['registro']);
    if (resultado === 'bloqueado') return reply.code(429).send({ error: mensajes.bloqueado });
    if (resultado === 'invalido') return reply.code(400).send({ error: mensajes.codigo });
    await db.query('update cuentas set verificada_en = coalesce(verificada_en, now()) where id = $1', [cuenta.id]);
    const token = randomBytes(32).toString('base64url');
    await db.query(`insert into sesiones (token_hash, cuenta_id, vence_en) values ($1, $2, now() + make_interval(days => $3))`, [sha(token), cuenta.id, DIAS_SESION]);
    reply.setCookie(COOKIE_SESION, token, { httpOnly: true, sameSite: 'lax', secure: produccion, path: '/', maxAge: DIAS_SESION * 24 * 3600 });
    return perfilDe(cuenta.id);
  });

  app.get('/api/sesion', async (request, reply) => {
    const id = await cuentaDeSesion(request);
    if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    return perfilDe(id);
  });

  // Fecha de nacimiento, después del código. Si es menor de edad, la cuenta se borra con todos sus datos.
  // REVISIÓN HUMANA: tratamiento de datos de menores.
  app.post('/api/perfil/nacimiento', async (request, reply) => {
    const id = await cuentaDeSesion(request);
    if (!id) return reply.code(401).send({ error: 'Sin sesión.' });
    const fecha = String((request.body as { fechaNacimiento?: string } | undefined)?.fechaNacimiento ?? '');
    const resultado = validarNacimiento(fecha, ahora());
    if (!resultado.ok && resultado.menor) {
      const [{ destino }] = await db.query<{ destino: string }>('delete from cuentas where id = $1 returning destino', [id]);
      await db.query('delete from verificaciones where destino = $1', [destino]);
      reply.clearCookie(COOKIE_SESION, { path: '/' });
      return reply.code(403).send({ error: resultado.error, menor: true });
    }
    if (!resultado.ok) return reply.code(400).send({ error: resultado.error });
    await db.query('update cuentas set fecha_nacimiento = $2 where id = $1', [id, fecha]);
    return perfilDe(id);
  });

  // Regla 8 (revisión de Codex): la comunidad exige una cuenta adulta ya validada. Con sesión pero sin fecha de
  // nacimiento declarada, nada de lugares, planes, mensajes ni Moais: primero el paso de la edad.
  const cuentaAdulta = async (request: FastifyRequest) => {
    const id = await cuentaDeSesion(request);
    if (!id) return null;
    const [c] = await db.query('select 1 from cuentas where id = $1 and fecha_nacimiento is not null', [id]);
    return c ? id : null;
  };

  // «Tu comunidad»: el primer lugar guardado, «Casa» (ciudad y, en Medellín, barrio), o «Lo haré después».
  // Regla 8 (revisión de Codex): sin una fecha de nacimiento adulta no se guarda ningún lugar.
  app.post('/api/perfil/comunidad', async (request, reply) => {
    const id = await cuentaAdulta(request);
    if (!id) return reply.code(401).send({ error: 'Primero cuéntanos tu fecha de nacimiento.' });
    const body = (request.body ?? {}) as { ciudad?: string; barrio?: string; omitir?: boolean };
    if (body.omitir === true) {
      await db.query(`update cuentas set comunidad_estado = 'skipped' where id = $1`, [id]);
      return perfilDe(id);
    }
    const resultado = validarLugar({ nombre: 'Casa', ciudad: body.ciudad ?? '', barrio: body.barrio || null });
    if (!resultado.ok) return reply.code(400).send({ errores: resultado.errores });
    const { ciudad, barrio, celda } = resultado.lugar;
    await db.query('delete from lugares where cuenta_id = $1 and nombre = $2', [id, 'Casa']);
    await db.query('update lugares set activo = false where cuenta_id = $1', [id]);
    await db.query('insert into lugares (cuenta_id, nombre, ciudad, barrio, celda, activo) values ($1, $2, $3, $4, $5, true)', [id, 'Casa', ciudad, barrio, celda]);
    await db.query(`update cuentas set comunidad_estado = 'completed' where id = $1`, [id]);
    return perfilDe(id);
  });

  const refs = crearRefs(secreto);
  const cifrador = crearCifrador(secreto);
  const { puedeConversar } = registrarComunidad(app, db, cuentaAdulta, ahora, refs, cifrador);
  registrarCuidado(app, db, cuentaAdulta, ahora, cifrador);
  registrarCercania(app, db, cuentaAdulta, ahora, refs, cifrador);
  registrarLazos(app, db, cuentaAdulta, ahora, refs, cifrador);
  registrarHistorial(app, db, cuentaAdulta, ahora, cifrador);
  registrarIntencionesBrisa(app, db, cuentaAdulta, ahora, cifrador);
  registrarModeloBrisa(app, db, cuentaAdulta, ahora, modeloBrisa);
  registrarCuenta(app, db, cuentaDeSesion, ahora, cifrador, COOKIE_SESION); // también sin edad declarada: borrar y descargar son derechos de todos
  registrarMoais(app, db, cuentaAdulta, ahora, refs, puedeConversar);
  registrarEquipo(app, db, cuentaAdulta, ahora, async id => esEquipo((await db.query<{ destino: string }>('select destino from cuentas where id = $1', [id]))[0]?.destino ?? ''));

  app.post('/api/salir', async (request, reply) => {
    const token = request.cookies[COOKIE_SESION];
    if (token) await db.query('delete from sesiones where token_hash = $1', [sha(token)]);
    reply.clearCookie(COOKIE_SESION, { path: '/' });
    return { ok: true };
  });

  return app;
}
