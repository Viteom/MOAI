// @vitest-environment node
// Funciones nuevas del rediseño de las internas (Mateo, 19 de octubre de 2026): costo del plan, encuentros solo para
// un Moai, reportar un plan y la frase del Moai.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import type { Propio } from './envios';

let db: Db;
let app: Awaited<ReturnType<typeof crearApp>>;
let codigos: Record<string, string>;
const correo: Propio = { tipo: 'propio', async enviar(destino, codigo) { codigos[destino] = codigo; } };

beforeAll(async () => { db = await abrirDb(); }, 60_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.query('truncate cuentas, verificaciones, moais restart identity cascade');
  codigos = {};
  app = await crearApp({ db, vias: { correo }, secreto: 'prueba', ahora: () => new Date('2026-10-19T12:00:00Z') });
});
afterEach(async () => { await app.close(); });

async function persona(nombre: string) {
  const destino = `${nombre.toLowerCase()}@ejemplo.co`;
  await app.inject({ method: 'POST', url: '/api/registro', payload: { nombre, canal: 'correo', destino, aceptaTerminos: true, aceptaDatos: true } });
  const r = await app.inject({ method: 'POST', url: '/api/verificar', payload: { canal: 'correo', destino, codigo: codigos[destino] } });
  const cookie = `${COOKIE_SESION}=${r.cookies.find(x => x.name === COOKIE_SESION)!.value}`;
  const pedir = (method: 'GET' | 'POST', url: string, payload?: object) => app.inject({ method, url, payload, headers: { cookie } });
  await pedir('POST', '/api/perfil/nacimiento', { fechaNacimiento: '1960-05-02' });
  await pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
  const [{ id }] = await db.query<{ id: string }>('select id from cuentas where destino = $1', [destino]);
  return { id, pedir, json: async (method: 'GET' | 'POST', url: string, payload?: object) => (await pedir(method, url, payload)).json() };
}
const plan = (titulo: string, extra: object = {}) => ({ titulo, cuando: '2026-10-25T13:00:00.000Z', lugarPublico: 'Parque de Laureles', ciudad: '05001', alcance: 'ciudad', ...extra });
async function moaiDe(...ids: string[]) {
  const [m] = await db.query<{ id: string }>(`insert into moais (nombre) values ('Tinto de los jueves') returning id`);
  for (const id of ids) await db.query('insert into moai_miembros (moai_id, cuenta_id) values ($1, $2)', [m.id, id]);
  return m.id;
}

describe('Costo del plan', () => {
  it('se guarda y se muestra; si no se dice, es gratis', async () => {
    const juan = await persona('Juan');
    await juan.pedir('POST', '/api/planes', plan('Tinto', { costo: 'cada_quien' }));
    await juan.pedir('POST', '/api/planes', plan('Caminata'));
    const planes = await juan.json('GET', '/api/planes');
    expect(planes.find((p: { titulo: string }) => p.titulo === 'Tinto').costo).toBe('cada_quien');
    expect(planes.find((p: { titulo: string }) => p.titulo === 'Caminata').costo).toBe('gratis');
  });
});

describe('Proponer un encuentro en el Moai', () => {
  it('solo lo ven los miembros del Moai, y solo un miembro lo puede proponer', async () => {
    const juan = await persona('Juan'), lucia = await persona('Lucia'), ana = await persona('Ana');
    const moai = await moaiDe(juan.id, lucia.id);
    expect((await ana.pedir('POST', '/api/planes', plan('Colado', { moai }))).statusCode).toBe(403);
    expect((await juan.pedir('POST', '/api/planes', plan('Nos vemos el jueves', { moai }))).statusCode).toBe(200);
    const deLucia = await lucia.json('GET', '/api/planes');
    expect(deLucia.find((p: { titulo: string }) => p.titulo === 'Nos vemos el jueves').moai).toEqual({ id: moai, nombre: 'Tinto de los jueves' });
    expect((await ana.json('GET', '/api/planes')).map((p: { titulo: string }) => p.titulo)).not.toContain('Nos vemos el jueves');
  });
});

describe('Reportar un plan', () => {
  it('llega al equipo con el plan copiado; no se reporta un plan propio ni uno que no se ve', async () => {
    const juan = await persona('Juan'), lucia = await persona('Lucia'), ana = await persona('Ana');
    await juan.pedir('POST', '/api/planes', plan('Plan raro', { descripcion: 'Traigan plata' }));
    const p = (await lucia.json('GET', '/api/planes'))[0];
    expect((await lucia.pedir('POST', `/api/planes/${p.id}/reportar`, { motivo: 'nada' })).statusCode).toBe(400);
    expect((await lucia.pedir('POST', `/api/planes/${p.id}/reportar`, { motivo: 'trato', detalle: 'Pide dinero', bloquear: true })).statusCode).toBe(200);
    const [r] = await db.query<{ a: string; mensaje: string; plan_id: string }>('select a, mensaje, plan_id from reportes');
    expect(r).toEqual({ a: juan.id, mensaje: 'Plan: «Plan raro» en Parque de Laureles. Traigan plata', plan_id: p.id });
    expect(await db.query('select 1 from bloqueos where de = $1 and a = $2', [lucia.id, juan.id])).toHaveLength(1);
    expect((await juan.pedir('POST', `/api/planes/${p.id}/reportar`, { motivo: 'trato' })).statusCode).toBe(404);
    // Ana bloqueó a Juan: ya no ve su plan, así que no lo puede reportar.
    await db.query('insert into bloqueos (de, a) values ($1, $2)', [ana.id, juan.id]);
    expect((await ana.pedir('POST', `/api/planes/${p.id}/reportar`, { motivo: 'trato' })).statusCode).toBe(404);
  });
});

describe('Frase del Moai', () => {
  it('se guarda con el nombre, es corta y pasa por la revisión de mensajes', async () => {
    const juan = await persona('Juan');
    const moai = await moaiDe(juan.id);
    const gente = await juan.json('POST', `/api/moais/${moai}/nombre`, { nombre: 'Tinto de los jueves', frase: 'Nuestro café de siempre' });
    expect(gente.moais[0].frase).toBe('Nuestro café de siempre');
    expect((await juan.pedir('POST', `/api/moais/${moai}/nombre`, { nombre: 'Tinto', frase: 'Te voy a matar' })).statusCode).toBe(400);
    expect((await juan.json('POST', `/api/moais/${moai}/nombre`, { nombre: 'Tinto' })).moais[0].frase).toBe('Nuestro café de siempre'); // cambiar solo el nombre no borra la frase
  });
});
