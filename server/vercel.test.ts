// @vitest-environment node
import { createServer, request as httpRequest, type Server } from 'node:http';
import { once } from 'node:events';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { abrirDb, prepararEsquema, type Db } from './db';
import { ConfiguracionVercelIncompleta, crearManejadorVercel, iniciarVercel, validarEntornoVercel } from './vercel';
import { VERSION_LENGUAJE } from '../src/lib/lenguaje-brisa';

const entorno: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgresql://prueba:clave-ficticia@base.invalid/moai?sslmode=require',
  CODIGO_SECRETO: 'secreto-ficticio-de-32-caracteres-minimo',
  CRON_SECRET: 'otro-secreto-ficticio-para-la-tarea-interna',
  RESEND_API_KEY: 'clave-ficticia-resend', CORREO_REMITENTE: 'MOAI <moai@example.test>', APP_URL: 'https://moai.example.test',
  BRISA_GEMINI_BETA: 'true', GEMINI_API_KEY: 'clave-ficticia-gemini', GEMINI_MODEL: 'gemini-prueba',
};

describe('Configuración de Vercel', () => {
  it('exige base persistente, cifrado, correo y autorización de tareas incluso en Preview', () => {
    expect(() => validarEntornoVercel({ NODE_ENV: 'development', VERCEL_ENV: 'preview' })).toThrow(ConfiguracionVercelIncompleta);
    try { validarEntornoVercel({}); } catch (e) {
      expect((e as ConfiguracionVercelIncompleta).variables).toContain('DATABASE_URL');
      expect((e as Error).message).not.toContain(entorno.DATABASE_URL);
    }
    expect(() => validarEntornoVercel(entorno)).not.toThrow();
  });
  it('rechaza secretos cortos y URLs con protocolo o credenciales inapropiados sin reflejar valores', () => {
    for (const cambio of [{ CODIGO_SECRETO: 'corto' }, { CRON_SECRET: 'corto' }, { DATABASE_URL: 'file://tmp/base' },
      { APP_URL: 'http://moai.example.test' }, { APP_URL: 'https://usuario:clave@moai.example.test/' }]) {
      expect(() => validarEntornoVercel({ ...entorno, ...cambio })).toThrow(ConfiguracionVercelIncompleta);
    }
  });
});

describe('Entrada HTTP real de la función con base aislada y proveedores simulados', () => {
  let db: Db, app: FastifyInstance, servidor: Server, puerto: number;
  const abrir = vi.fn<typeof abrirDb>();
  const iniciar = vi.fn<() => Promise<FastifyInstance>>();
  let codigo = '';
  const frases: string[] = [];
  const correos: string[] = [];

  const pedir = (ruta: string, opciones: { method?: string; payload?: unknown; cookie?: string; autorizacion?: string } = {}) =>
    new Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders; json: Record<string, unknown> }>((resolve, reject) => {
      const cuerpo = opciones.payload === undefined ? undefined : JSON.stringify(opciones.payload);
      const solicitud = httpRequest({ hostname: '127.0.0.1', port: puerto, path: ruta, method: opciones.method ?? 'GET', headers: {
        ...(cuerpo ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(cuerpo) } : {}),
        ...(opciones.cookie ? { Cookie: opciones.cookie } : {}), ...(opciones.autorizacion ? { Authorization: opciones.autorizacion } : {}),
      } }, respuesta => {
        const partes: Buffer[] = [];
        respuesta.on('data', b => partes.push(b)); respuesta.on('end', () => resolve({ status: respuesta.statusCode!, headers: respuesta.headers,
          json: JSON.parse(Buffer.concat(partes).toString()) as Record<string, unknown> }));
      });
      solicitud.on('error', reject); solicitud.end(cuerpo);
    });

  beforeAll(async () => {
    db = await abrirDb();
    abrir.mockResolvedValue(db);
    vi.stubGlobal('fetch', vi.fn(async (url: string, opciones: RequestInit) => {
      if (url === 'https://api.resend.com/emails') {
        const cuerpo = JSON.parse(String(opciones.body)); correos.push(cuerpo.text); codigo = cuerpo.text.match(/\b\d{6}\b/)[0];
        return new Response('{}', { status: 200 });
      }
      if (url === 'https://generativelanguage.googleapis.com/v1beta/models/gemini-prueba:generateContent') {
        const cuerpo = JSON.parse(String(opciones.body));
        expect(Object.keys(cuerpo).sort()).toEqual(['contents', 'generationConfig', 'systemInstruction']);
        frases.push(cuerpo.contents[0].parts[0].text);
        return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({
          estado: 'buscar', tipos: ['caminar'], dias: [6], periodo: 'libre', recurrente: false, gratis: null, fragmentos: ['caminar', 'sábado'],
        }) }] } }] });
      }
      throw new Error('No se permiten otras llamadas externas en esta prueba.');
    }));
    iniciar.mockImplementation(async () => { app = await iniciarVercel(entorno, abrir); return app; });
    servidor = createServer(crearManejadorVercel(iniciar)); servidor.listen(0, '127.0.0.1'); await once(servidor, 'listening');
    puerto = (servidor.address() as import('node:net').AddressInfo).port;
  }, 60_000);
  afterAll(async () => { await new Promise<void>(resolve => servidor.close(() => resolve())); await app?.close(); vi.unstubAllGlobals(); });

  it('comparte el arranque y el pool entre solicitudes; no crea tablas ni abre un puerto de Fastify', async () => {
    const respuestas = await Promise.all([pedir('/api/health'), pedir('/api/health'), pedir('/api/health')]);
    expect(respuestas.every(r => r.status === 200 && r.json.ok === true)).toBe(true);
    expect(iniciar).toHaveBeenCalledTimes(1); expect(abrir).toHaveBeenCalledExactlyOnceWith({
      url: entorno.DATABASE_URL, inicializar: false, maxConexiones: 3,
    });
    expect(app.server.listening).toBe(false);
    expect(respuestas[0].headers['cache-control']).toBe('private, no-store');
    expect(respuestas[0].json).toEqual({ ok: true });
  });

  it('acepta POST con cuerpo, envía el código por el proveedor y abre una sesión segura', async () => {
    const registro = await pedir('/api/registro', { method: 'POST', payload: {
      nombre: 'Rosa Ficticia', canal: 'correo', destino: 'rosa@example.test', aceptaTerminos: true, aceptaDatos: true,
    } });
    expect(registro.status).toBe(200); expect(correos).toHaveLength(1); expect(codigo).toMatch(/^\d{6}$/);
    const sesion = await pedir('/api/verificar', { method: 'POST', payload: { canal: 'correo', destino: 'rosa@example.test', codigo } });
    expect(sesion.status).toBe(200);
    const galleta = sesion.headers['set-cookie']![0];
    expect(galleta).toContain('HttpOnly'); expect(galleta).toContain('Secure'); expect(galleta).toContain('SameSite=Lax');
    const cookie = galleta.split(';')[0];
    expect((await pedir('/api/perfil/nacimiento', { method: 'POST', cookie, payload: { fechaNacimiento: '1965-03-02' } })).status).toBe(200);
    expect((await pedir('/api/sesion', { cookie })).status).toBe(200);
    const capacidad = await pedir('/api/brisa/modelo', { cookie });
    expect(capacidad.json.disponible).toBe(true);
    const interpretacion = await pedir('/api/brisa/interpretar', { method: 'POST', cookie, payload: {
      frase: 'Quiero caminar el sábado', autorizo: VERSION_LENGUAJE, datosFicticios: true,
    } });
    expect(interpretacion.status).toBe(200); expect(interpretacion.json.consulta).toContain('sábado');
    expect(frases).toEqual(['Quiero caminar el sábado']);
    expect(await db.query('select * from brisa_propuestas')).toHaveLength(0);
    expect(await db.query('select * from asistencias')).toHaveLength(0);
    expect(JSON.stringify(interpretacion.json)).not.toContain(entorno.GEMINI_API_KEY);
  });

  it('conserva la base al preparar otra vez el esquema y sirve errores JSON sin devolver secretos', async () => {
    await prepararEsquema(db);
    expect(await db.query('select * from cuentas')).toHaveLength(1);
    expect(await db.query('select * from brisa_interpretaciones')).toHaveLength(1);
    const desconocida = await pedir('/api/no-existe?x=1'); expect(desconocida.status).toBe(404);
    expect(desconocida.headers['content-type']).toContain('application/json');
    const sinSesion = await pedir('/api/brisa/modelo'); expect(sinSesion.status).toBe(401);
    expect(JSON.stringify(sinSesion.json)).not.toContain(entorno.CODIGO_SECRETO);
  });

  it('rechaza el mantenimiento público y limpia vencidos solo con autorización', async () => {
    await db.query("insert into brisa_mensajes (cuenta_id, de, texto, creado_en) select id, 'yo', 'contenido-ficticio-vencido', now() - interval '100 days' from cuentas");
    expect((await pedir('/api/interno/mantenimiento')).status).toBe(401);
    expect((await pedir('/api/interno/mantenimiento', { autorizacion: 'Bearer incorrecto' })).status).toBe(401);
    expect(await db.query('select * from brisa_mensajes')).toHaveLength(1);
    const resultado = await pedir('/api/interno/mantenimiento', { autorizacion: `Bearer ${entorno.CRON_SECRET}` });
    expect(resultado.status).toBe(200); expect(resultado.json).toEqual({ ok: true });
    expect(await db.query('select * from brisa_mensajes')).toHaveLength(0);
    expect(correos).toHaveLength(1); // La cuenta ficticia ya está verificada y no pidió resumen semanal.
  });

  it('sanitiza fallos de la base sin devolver su mensaje ni registrarlo', async () => {
    const consultar = vi.spyOn(db, 'query').mockRejectedValueOnce(new Error(`fallo ${entorno.DATABASE_URL}`));
    const respuesta = await pedir('/api/health');
    expect(respuesta.status).toBe(503); expect(JSON.stringify(respuesta.json)).not.toContain(entorno.DATABASE_URL);
    consultar.mockRestore();
  });

  it('reintenta el arranque tras un fallo y no entrega detalles internos', async () => {
    const comenzar = vi.fn().mockRejectedValueOnce(new Error(entorno.DATABASE_URL)).mockResolvedValue(app);
    const temporal = createServer(crearManejadorVercel(comenzar)); temporal.listen(0, '127.0.0.1'); await once(temporal, 'listening');
    const anterior = puerto; puerto = (temporal.address() as import('node:net').AddressInfo).port;
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const primera = await pedir('/api/health'); expect(primera.status).toBe(503);
      expect(JSON.stringify(primera.json)).not.toContain(entorno.DATABASE_URL);
      expect(JSON.stringify(log.mock.calls)).not.toContain(entorno.DATABASE_URL);
      expect((await pedir('/api/health')).status).toBe(200); expect(comenzar).toHaveBeenCalledTimes(2);
    } finally { puerto = anterior; await new Promise<void>(resolve => temporal.close(() => resolve())); log.mockRestore(); }
  });
});
