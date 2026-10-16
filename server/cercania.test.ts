// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import type { Propio } from './envios';

const hoy = new Date('2026-10-15T12:00:00Z');
let reloj = hoy;
let db: Db;
let app: Awaited<ReturnType<typeof crearApp>>;
let codigos: Record<string, string>;
const correo: Propio = { tipo: 'propio', async enviar(destino, codigo) { codigos[destino] = codigo; } };

beforeAll(async () => { db = await abrirDb(); }, 60_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.query('truncate cuentas, verificaciones, moais restart identity cascade');
  codigos = {};
  reloj = hoy;
  app = await crearApp({ db, vias: { correo }, secreto: 'prueba', ahora: () => reloj });
});
afterEach(async () => { await app.close(); });

type Quien = Awaited<ReturnType<typeof persona>>;
// Laureles (1108) y, para alguien lejos, un barrio del otro lado de la ciudad.
async function persona(nombre: string, barrio = '1108') {
  const destino = `${nombre.toLowerCase()}@ejemplo.co`;
  await app.inject({ method: 'POST', url: '/api/registro', payload: { nombre, canal: 'correo', destino, aceptaTerminos: true, aceptaDatos: true } });
  const r = await app.inject({ method: 'POST', url: '/api/verificar', payload: { canal: 'correo', destino, codigo: codigos[destino] } });
  const cookie = `${COOKIE_SESION}=${r.cookies.find(x => x.name === COOKIE_SESION)!.value}`;
  const pedir = (method: 'GET' | 'POST', url: string, payload?: object) => app.inject({ method, url, payload, headers: { cookie } });
  await pedir('POST', '/api/perfil/nacimiento', { fechaNacimiento: '1960-05-02' }); // cuenta adulta validada (regla 8)
  await pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001', barrio });
  return { nombre, pedir, json: async (method: 'GET' | 'POST', url: string, payload?: object) => (await pedir(method, url, payload)).json() };
}
const perfil = (extra: object = {}) => ({ frase: 'Me gusta madrugar a regar mis matas', gustos: ['huerta', 'tejer'], comparte: 'Enseño a tejer', aprender: '', visible: true, ...extra });

async function seVieron(a: Quien, b: Quien) {
  reloj = hoy;
  const [p] = await a.json('POST', '/api/planes', { titulo: 'Tinto en la panadería', cuando: '2026-10-16T15:00:00.000Z', lugarPublico: 'Panadería', ciudad: '05001', alcance: 'ciudad' });
  await b.pedir('POST', `/api/planes/${p.id}/ir`);
  reloj = new Date('2026-10-16T18:00:00Z');
  for (const q of [a, b]) {
    const [e] = (await q.json('GET', '/api/gente')).encuentros;
    await q.pedir('POST', '/api/gente/encuentro', { planId: e.planId, ocurrencia: e.ocurrencia, ref: e.personas[0].ref, si: true });
  }
}
const cartasDe = async (q: Quien, tipo: string) => (await q.json('GET', '/api/brisa')).filter((c: { tipo: string }) => c.tipo === tipo);

describe('Perfil y Mi zona', () => {
  it('solo aparece quien aprobó mostrarse, de tu zona, sin ubicación', async () => {
    const carmen = await persona('Carmen'), rosa = await persona('Rosa'), lejos = await persona('Pedro', '5005');
    expect((await carmen.pedir('POST', '/api/perfil-publico', { visible: true })).statusCode).toBe(400); // nada que mostrar
    await carmen.pedir('POST', '/api/perfil-publico', perfil());
    await lejos.pedir('POST', '/api/perfil-publico', perfil());
    await rosa.pedir('POST', '/api/perfil-publico', perfil({ gustos: ['huerta'], visible: false }));
    const [vecina, ...otros] = await rosa.json('GET', '/api/zona');
    expect(otros).toEqual([]); // ni Pedro (lejos) ni ella misma
    expect(vecina).toMatchObject({ nombre: 'Carmen', frase: 'Me gusta madrugar a regar mis matas', comparte: 'Enseño a tejer', enComun: ['huerta'], franja: 'Cerca', puertaAbierta: false });
    expect(JSON.stringify(vecina)).not.toMatch(/1108|celda|lat|lng/);
    expect(await carmen.json('GET', '/api/zona')).toEqual([]); // Rosa no aprobó mostrarse
  });

  it('el saludo de lejos llega como carta; si es mutuo, Brisa sugiere coincidir. Uno por semana', async () => {
    const carmen = await persona('Carmen'), rosa = await persona('Rosa');
    for (const q of [carmen, rosa]) await q.pedir('POST', '/api/perfil-publico', perfil());
    const [aCarmen] = await rosa.json('GET', '/api/zona');
    expect((await rosa.pedir('POST', '/api/saludos', { ref: aCarmen.ref, saludo: 'buenos-dias' })).statusCode).toBe(200);
    expect((await rosa.pedir('POST', '/api/saludos', { ref: aCarmen.ref, saludo: 'bonito' })).statusCode).toBe(409);
    const [carta] = await cartasDe(carmen, 'saludo');
    expect(carta).toMatchObject({ nombre: 'Rosa', plan: false, texto: expect.stringMatching(/Rosa te manda un saludo de lejos/) });
    await carmen.pedir('POST', '/api/saludos', { ref: carta.ref, saludo: 'tinto' });
    const [respuesta] = await cartasDe(rosa, 'saludo');
    expect(respuesta).toMatchObject({ nombre: 'Carmen', plan: true, texto: expect.stringMatching(/también te saludó.*coinciden/) });
  });
});

describe('Puerta abierta e invierno', () => {
  it('la puerta abierta la ven solo quienes ya se vieron contigo, y dura 7 días', async () => {
    const rosa = await persona('Rosa'), juan = await persona('Juan'), carmen = await persona('Carmen');
    await rosa.pedir('POST', '/api/perfil-publico', perfil());
    await seVieron(rosa, juan);
    expect((await rosa.json('POST', '/api/estado/puerta', { abierta: true })).puertaAbierta).toBe(true);
    expect((await juan.json('GET', '/api/gente')).conocidos[0]).toMatchObject({ nombre: 'Rosa', puertaAbierta: true });
    expect((await cartasDe(juan, 'saludo'))[0].texto).toMatch(/Rosa dejó su puerta abierta/);
    // Carmen es vecina pero no se ha visto con Rosa: ve su perfil, no su puerta.
    expect((await carmen.json('GET', '/api/zona'))[0]).toMatchObject({ nombre: 'Rosa', puertaAbierta: false });
    expect(await cartasDe(carmen, 'saludo')).toEqual([]);
    reloj = new Date(reloj.getTime() + 8 * 864e5);
    expect((await rosa.json('GET', '/api/estado')).puertaAbierta).toBe(false);
  });

  it('el invierno se guarda cifrado, se cuenta solo a quien elijas y Brisa baja el ritmo', async () => {
    const rosa = await persona('Rosa'), juan = await persona('Juan'), ana = await persona('Ana');
    await seVieron(rosa, juan);
    await seVieron(rosa, ana);
    expect((await rosa.json('POST', '/api/estado/invierno', { activo: true })).invierno).toBe(true);
    const [fila] = await db.query<{ invierno: string }>('select invierno from estados');
    expect(fila.invierno).not.toMatch(/activo|true/);
    const juanRef = (await rosa.json('GET', '/api/gente')).conocidos.find((c: { nombre: string }) => c.nombre === 'Juan').ref;
    expect((await rosa.json('POST', '/api/estado/invierno/contar', { refs: [juanRef] })).contadoA).toEqual(['Juan']);
    expect((await cartasDe(juan, 'saludo'))[0].texto).toMatch(/Rosa te contó que está pasando un invierno/);
    expect(await cartasDe(ana, 'saludo')).toEqual([]); // a Ana no se lo contó
    // Al salir del invierno, se olvida a quién se le contó.
    expect(await rosa.json('POST', '/api/estado/invierno', { activo: false })).toEqual({ invierno: false, puertaAbierta: false, contadoA: [] });
    expect(await cartasDe(juan, 'saludo')).toEqual([]);
  });
});
