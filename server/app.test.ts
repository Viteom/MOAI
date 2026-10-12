// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import type { Externo, Propio } from './envios';
import { VERSION_TEXTOS } from '../src/lib/registro';

const hoy = new Date('2026-10-11T12:00:00Z');
const base = { nombre: 'Rosa', canal: 'correo', destino: 'Rosa@Ejemplo.co', ciudad: '05001', fechaNacimiento: '1950-03-02', aceptaTerminos: true, aceptaDatos: true };

let db: Db;
let enviados: { destino: string; codigo: string }[];
let app: Awaited<ReturnType<typeof crearApp>>;
const correo: Propio = { tipo: 'propio', async enviar(destino, codigo) { enviados.push({ destino, codigo }); } };

// Una sola base en memoria por archivo (arrancar PGlite tarda); se vacía antes de cada prueba.
beforeAll(async () => { db = await abrirDb(); }, 60_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.query('truncate cuentas, consentimientos, verificaciones, sesiones restart identity cascade');
  enviados = [];
  app = await crearApp({ db, vias: { correo, whatsapp: correo }, secreto: 'prueba', ahora: () => hoy });
});
afterEach(async () => { await app.close(); });

const post = (url: string, payload: object, cookie?: string) => app.inject({ method: 'POST', url, payload, headers: cookie ? { cookie } : {} });
const galleta = (respuesta: { cookies: { name: string; value: string }[] }) => {
  const c = respuesta.cookies.find(x => x.name === COOKIE_SESION);
  return c ? `${COOKIE_SESION}=${c.value}` : '';
};

describe('Registro', () => {
  it('crea la cuenta, envía un código y al verificarlo abre sesión', async () => {
    const registro = await post('/api/registro', base);
    expect(registro.statusCode).toBe(200);
    expect(registro.json()).toEqual({ canal: 'correo', destinoVisible: 'r•••@ejemplo.co' });
    expect(enviados).toHaveLength(1);
    expect(enviados[0].destino).toBe('rosa@ejemplo.co');
    expect(enviados[0].codigo).toMatch(/^\d{6}$/);

    const verificar = await post('/api/verificar', { canal: 'correo', destino: 'rosa@ejemplo.co', codigo: enviados[0].codigo });
    expect(verificar.statusCode).toBe(200);
    expect(verificar.json()).toEqual({ nombre: 'Rosa', ciudad: '05001' });
    const sesion = await app.inject({ method: 'GET', url: '/api/sesion', headers: { cookie: galleta(verificar) } });
    expect(sesion.json()).toEqual({ nombre: 'Rosa', ciudad: '05001' });
  });

  it('guarda los dos consentimientos con la versión del texto', async () => {
    await post('/api/registro', base);
    const filas = await db.query<{ tipo: string; version: string }>('select tipo, version from consentimientos order by tipo');
    expect(filas).toEqual([{ tipo: 'datos', version: VERSION_TEXTOS }, { tipo: 'terminos', version: VERSION_TEXTOS }]);
  });

  it('rechaza a menores de 18 sin crear cuenta ni enviar código', async () => {
    const respuesta = await post('/api/registro', { ...base, fechaNacimiento: '2009-01-01' });
    expect(respuesta.statusCode).toBe(400);
    expect(respuesta.json().errores.fechaNacimiento).toMatch(/18 años/);
    expect(await db.query('select id from cuentas')).toEqual([]);
    expect(enviados).toEqual([]);
  });

  it('exige aceptar términos y tratamiento de datos, y una ciudad de la lista', async () => {
    const respuesta = await post('/api/registro', { ...base, aceptaDatos: false, aceptaTerminos: false, ciudad: '99999' });
    expect(Object.keys(respuesta.json().errores).sort()).toEqual(['aceptaDatos', 'aceptaTerminos', 'ciudad']);
  });

  it('normaliza un WhatsApp colombiano con su código de país', async () => {
    const respuesta = await post('/api/registro', { ...base, canal: 'whatsapp', pais: 'CO', destino: '300 123 4567' });
    expect(respuesta.statusCode).toBe(200);
    expect(enviados[0].destino).toBe('+573001234567');
    expect(respuesta.json().destinoVisible).toBe('+57 •••• 4567');
  });

  it('no guarda coordenadas en ninguna tabla (regla 1)', async () => {
    const columnas = await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_schema = 'public'`);
    expect(columnas.map(c => c.column_name).filter(c => /lat|lon|coord|ubicacion/i.test(c))).toEqual([]);
  });
});

describe('Acceso con código', () => {
  async function cuentaVerificada() {
    await post('/api/registro', base);
    await post('/api/verificar', { canal: 'correo', destino: 'rosa@ejemplo.co', codigo: enviados[0].codigo });
    enviados = [];
  }

  it('envía un código a una cuenta existente', async () => {
    await cuentaVerificada();
    const respuesta = await post('/api/acceso', { canal: 'correo', destino: 'rosa@ejemplo.co' });
    expect(respuesta.statusCode).toBe(200);
    expect(enviados).toHaveLength(1);
  });

  it('responde igual si la cuenta no existe, sin enviar nada', async () => {
    const respuesta = await post('/api/acceso', { canal: 'correo', destino: 'nadie@ejemplo.co' });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ canal: 'correo', destinoVisible: 'n•••@ejemplo.co' });
    expect(enviados).toEqual([]);
  });

  it('un registro repetido de una cuenta ya verificada envía código de acceso y no la duplica', async () => {
    await cuentaVerificada();
    await post('/api/registro', { ...base, nombre: 'Otra' });
    expect(enviados).toHaveLength(1);
    expect(await db.query('select nombre from cuentas')).toEqual([{ nombre: 'Rosa' }]);
  });

  it('bloquea el código después de cinco intentos fallidos', async () => {
    await cuentaVerificada();
    await post('/api/acceso', { canal: 'correo', destino: 'rosa@ejemplo.co' });
    const malo = enviados[0].codigo === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect((await post('/api/verificar', { canal: 'correo', destino: 'rosa@ejemplo.co', codigo: malo })).statusCode).toBe(400);
    const sexto = await post('/api/verificar', { canal: 'correo', destino: 'rosa@ejemplo.co', codigo: enviados[0].codigo });
    expect(sexto.statusCode).toBe(429);
  });

  it('un código sirve una sola vez', async () => {
    await post('/api/registro', base);
    const datos = { canal: 'correo', destino: 'rosa@ejemplo.co', codigo: enviados[0].codigo };
    expect((await post('/api/verificar', datos)).statusCode).toBe(200);
    expect((await post('/api/verificar', datos)).statusCode).toBe(400);
  });

  it('limita a cinco códigos por hora', async () => {
    await cuentaVerificada();
    await db.query('delete from verificaciones');
    for (let i = 0; i < 5; i++) expect((await post('/api/acceso', { canal: 'correo', destino: 'rosa@ejemplo.co' })).statusCode).toBe(200);
    expect((await post('/api/acceso', { canal: 'correo', destino: 'rosa@ejemplo.co' })).statusCode).toBe(429);
  });

  it('cerrar sesión invalida la cookie', async () => {
    await post('/api/registro', base);
    const cookie = galleta(await post('/api/verificar', { canal: 'correo', destino: 'rosa@ejemplo.co', codigo: enviados[0].codigo }));
    await post('/api/salir', {}, cookie);
    expect((await app.inject({ method: 'GET', url: '/api/sesion', headers: { cookie } })).statusCode).toBe(401);
  });
});

describe('Sin proveedor de WhatsApp', () => {
  it('rechaza WhatsApp con un mensaje claro y no crea la cuenta', async () => {
    await app.close();
    app = await crearApp({ db, vias: { correo }, secreto: 'prueba', ahora: () => hoy });
    const respuesta = await post('/api/registro', { ...base, canal: 'whatsapp', pais: 'CO', destino: '3001234567' });
    expect(respuesta.statusCode).toBe(400);
    expect(respuesta.json().error).toMatch(/WhatsApp todavía no está disponible/);
    expect(await db.query('select id from cuentas')).toEqual([]);
    expect((await post('/api/acceso', { canal: 'whatsapp', pais: 'CO', destino: '3001234567' })).statusCode).toBe(400);
  });
});

describe('WhatsApp con un verificador externo (Twilio Verify)', () => {
  it('delega el envío y la comprobación del código', async () => {
    const llamadas: string[] = [];
    const twilio: Externo = {
      tipo: 'externo',
      async iniciar(destino) { llamadas.push(`iniciar ${destino}`); },
      async comprobar(destino, codigo) { llamadas.push(`comprobar ${destino}`); return codigo === '424242'; },
    };
    await app.close();
    app = await crearApp({ db, vias: { correo, whatsapp: twilio }, secreto: 'prueba', ahora: () => hoy });
    await post('/api/registro', { ...base, canal: 'whatsapp', pais: 'CO', destino: '3001234567' });
    expect((await post('/api/verificar', { canal: 'whatsapp', pais: 'CO', destino: '3001234567', codigo: '123456' })).statusCode).toBe(400);
    expect((await post('/api/verificar', { canal: 'whatsapp', pais: 'CO', destino: '3001234567', codigo: '424242' })).statusCode).toBe(200);
    expect(llamadas).toEqual(['iniciar +573001234567', 'comprobar +573001234567', 'comprobar +573001234567']);
  });
});
