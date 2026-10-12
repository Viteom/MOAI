// API de cuentas: registro y acceso sin contraseña, con un código de 6 dígitos por correo o WhatsApp.
// REVISIÓN HUMANA: datos personales, consentimiento y sesiones.
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { codigoValido, enmascarar, normalizarDestino, validarRegistro, VERSION_TEXTOS, type Canal, type EntradaRegistro } from '../src/lib/registro';
import { MINUTOS_VIGENCIA, type Proposito, type Vias } from './envios';
import type { Db } from './db';

export const COOKIE_SESION = 'moai_sesion';
const DIAS_SESION = 30;
const ENVIOS_POR_HORA = 5;
const INTENTOS_POR_CODIGO = 5;

type Opciones = { db: Db; vias: Vias; secreto: string; produccion?: boolean; ahora?: () => Date };
type Cuenta = { id: string; nombre: string; ciudad: string; verificada_en: string | null };
class Limite extends Error {}

const mensajes = {
  limite: 'Pediste varios códigos seguidos. Espera unos minutos y vuelve a intentarlo.',
  envio: 'No pudimos enviar el código. Intenta de nuevo en un momento.',
  codigo: 'Ese código no coincide o ya venció. Revísalo o pide uno nuevo.',
  bloqueado: 'Hubo demasiados intentos con este código. Pide uno nuevo.',
  destino: 'Revisa tu correo o tu número.',
  sinWhatsapp: 'WhatsApp todavía no está disponible. Por ahora, usa tu correo.',
};

export async function crearApp({ db, vias, secreto, produccion = false, ahora = () => new Date() }: Opciones) {
  const app = Fastify({ logger: false, bodyLimit: 16 * 1024 });
  await app.register(cookie);
  const hmac = (valor: string) => createHmac('sha256', secreto).update(valor).digest('hex');
  const sha = (valor: string) => createHash('sha256').update(valor).digest('hex');

  async function enviarCodigo(canal: Canal, destino: string, proposito: Proposito) {
    const [{ total }] = await db.query<{ total: number }>(
      `select count(*)::int as total from verificaciones where destino = $1 and creada_en > now() - interval '1 hour'`, [destino]);
    if (total >= ENVIOS_POR_HORA) throw new Limite();
    const via = vias[canal]!;
    const codigo = via.tipo === 'propio' ? String(randomInt(0, 1_000_000)).padStart(6, '0') : null;
    await db.query(
      `insert into verificaciones (destino, proposito, codigo_hash, vence_en) values ($1, $2, $3, now() + make_interval(mins => $4))`,
      [destino, proposito, codigo && hmac(codigo), MINUTOS_VIGENCIA]);
    if (via.tipo === 'propio') await via.enviar(destino, codigo!, proposito);
    else await via.iniciar(destino);
  }

  async function comprobarCodigo(canal: Canal, destino: string, codigo: string): Promise<'ok' | 'invalido' | 'bloqueado'> {
    const [fila] = await db.query<{ id: number; codigo_hash: string | null; intentos: number }>(
      `select id, codigo_hash, intentos from verificaciones
       where destino = $1 and usada_en is null and vence_en > now() order by creada_en desc limit 1`, [destino]);
    if (!fila) return 'invalido';
    if (fila.intentos >= INTENTOS_POR_CODIGO) return 'bloqueado';
    await db.query('update verificaciones set intentos = intentos + 1 where id = $1', [fila.id]);
    const via = vias[canal]!;
    const ok = via.tipo === 'propio'
      ? !!fila.codigo_hash && timingSafeEqual(Buffer.from(hmac(codigo)), Buffer.from(fila.codigo_hash))
      : await via.comprobar(destino, codigo);
    if (!ok) return 'invalido';
    await db.query('update verificaciones set usada_en = now() where id = $1', [fila.id]);
    return 'ok';
  }

  // Responde igual exista o no la cuenta, para no revelar quién está registrado.
  async function responderEnvio(reply: { code(n: number): { send(b: unknown): unknown } }, canal: Canal, destino: string, proposito: Proposito | null) {
    try {
      if (proposito) await enviarCodigo(canal, destino, proposito);
    } catch (error) {
      if (error instanceof Limite) return reply.code(429).send({ error: mensajes.limite });
      app.log.error({ canal }, 'falló el envío del código');
      return reply.code(502).send({ error: mensajes.envio });
    }
    return reply.code(200).send({ canal, destinoVisible: enmascarar(canal, destino) });
  }

  const cuentaPorDestino = async (destino: string) =>
    (await db.query<Cuenta>('select id, nombre, ciudad, verificada_en from cuentas where destino = $1', [destino]))[0];

  app.post('/api/registro', async (request, reply) => {
    const resultado = validarRegistro((request.body ?? {}) as Partial<EntradaRegistro>, ahora());
    if (resultado.ok && !vias[resultado.registro.canal]) return reply.code(400).send({ error: mensajes.sinWhatsapp });
    if (!resultado.ok) return reply.code(400).send({ errores: resultado.errores });
    const { nombre, canal, destino, ciudad, fechaNacimiento } = resultado.registro;
    const existente = await cuentaPorDestino(destino);
    if (existente?.verificada_en) return responderEnvio(reply, canal, destino, 'acceso');
    const [cuenta] = existente
      ? await db.query<{ id: string }>('update cuentas set nombre = $2, ciudad = $3, fecha_nacimiento = $4 where id = $1 returning id', [existente.id, nombre, ciudad, fechaNacimiento])
      : await db.query<{ id: string }>('insert into cuentas (nombre, canal, destino, ciudad, fecha_nacimiento) values ($1, $2, $3, $4, $5) returning id', [nombre, canal, destino, ciudad, fechaNacimiento]);
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
    return responderEnvio(reply, canal, destino, cuenta ? 'acceso' : null);
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
    const resultado = await comprobarCodigo(canal, destino, codigo);
    if (resultado === 'bloqueado') return reply.code(429).send({ error: mensajes.bloqueado });
    if (resultado === 'invalido') return reply.code(400).send({ error: mensajes.codigo });
    await db.query('update cuentas set verificada_en = coalesce(verificada_en, now()) where id = $1', [cuenta.id]);
    const token = randomBytes(32).toString('base64url');
    await db.query(`insert into sesiones (token_hash, cuenta_id, vence_en) values ($1, $2, now() + make_interval(days => $3))`, [sha(token), cuenta.id, DIAS_SESION]);
    reply.setCookie(COOKIE_SESION, token, { httpOnly: true, sameSite: 'lax', secure: produccion, path: '/', maxAge: DIAS_SESION * 24 * 3600 });
    return { nombre: cuenta.nombre, ciudad: cuenta.ciudad };
  });

  app.get('/api/sesion', async (request, reply) => {
    const token = request.cookies[COOKIE_SESION];
    const [cuenta] = token ? await db.query<Cuenta>(
      `select c.nombre, c.ciudad from sesiones s join cuentas c on c.id = s.cuenta_id where s.token_hash = $1 and s.vence_en > now()`, [sha(token)]) : [];
    if (!cuenta) return reply.code(401).send({ error: 'Sin sesión.' });
    return { nombre: cuenta.nombre, ciudad: cuenta.ciudad };
  });

  app.post('/api/salir', async (request, reply) => {
    const token = request.cookies[COOKIE_SESION];
    if (token) await db.query('delete from sesiones where token_hash = $1', [sha(token)]);
    reply.clearCookie(COOKIE_SESION, { path: '/' });
    return { ok: true };
  });

  return app;
}
