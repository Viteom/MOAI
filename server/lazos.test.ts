// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import { estadoLazo } from '../src/lib/lazos';
import type { Lazos } from '../src/lib/api';
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
async function persona(nombre: string) {
  const destino = `${nombre.toLowerCase()}@ejemplo.co`;
  await app.inject({ method: 'POST', url: '/api/registro', payload: { nombre, canal: 'correo', destino, aceptaTerminos: true, aceptaDatos: true } });
  const r = await app.inject({ method: 'POST', url: '/api/verificar', payload: { canal: 'correo', destino, codigo: codigos[destino] } });
  const cookie = `${COOKIE_SESION}=${r.cookies.find(x => x.name === COOKIE_SESION)!.value}`;
  const pedir = (method: 'GET' | 'POST', url: string, payload?: object) => app.inject({ method, url, payload, headers: { cookie } });
  await pedir('POST', '/api/perfil/nacimiento', { fechaNacimiento: '1960-05-02' }); // cuenta adulta validada (regla 8)
  await pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
  return { pedir, json: async (method: 'GET' | 'POST', url: string, payload?: object) => (await pedir(method, url, payload)).json() };
}
async function seVieron(a: Quien, b: Quien) {
  reloj = hoy;
  const titulo = `Tinto ${Math.random()}`;
  const p = (await a.json('POST', '/api/planes', { titulo, cuando: '2026-10-16T15:00:00.000Z', lugarPublico: 'Panadería', ciudad: '05001', alcance: 'ciudad' })).find((x: { titulo: string }) => x.titulo === titulo);
  await b.pedir('POST', `/api/planes/${p.id}/ir`);
  reloj = new Date('2026-10-16T18:00:00Z');
  for (const q of [a, b]) {
    const e = (await q.json('GET', '/api/gente')).encuentros.find((x: { planId: string }) => x.planId === p.id);
    await q.pedir('POST', '/api/gente/encuentro', { planId: e.planId, ocurrencia: e.ocurrencia, ref: e.personas[0].ref, si: true });
  }
}

describe('Estado de un lazo', () => {
  it('vivo, tibio o dormido según el último contacto', () => {
    expect(estadoLazo(new Date('2026-10-10'), hoy)).toBe('vivo');
    expect(estadoLazo(new Date('2026-09-15'), hoy)).toBe('tibio');
    expect(estadoLazo(new Date('2026-07-01'), hoy)).toBe('dormido');
    expect(estadoLazo(null, hoy)).toBe('dormido');
  });
});

describe('Mis lazos', () => {
  it('reúne familia, quien me nutre, cada Moai y las personas con las que me vi, sin números ni fechas', async () => {
    const rosa = await persona('Rosa'), juan = await persona('Juan'), ana = await persona('Ana');
    await rosa.pedir('POST', '/api/interno', { nombre: 'Mamá', relacion: 'Vive en Cali', familia: true });
    await rosa.pedir('POST', '/api/interno', { nombre: 'Laura', relacion: 'Amiga del colegio' });
    await seVieron(rosa, juan);
    await seVieron(rosa, ana);
    const juanRef = (await rosa.json('GET', '/api/gente')).conocidos.find((c: { nombre: string }) => c.nombre === 'Juan').ref;
    await rosa.pedir('POST', '/api/moais', { ref: juanRef, nombre: 'Tinto de los jueves' });
    const [inv] = (await juan.json('GET', '/api/gente')).invitaciones;
    await juan.pedir('POST', `/api/invitaciones/${inv.id}`, { acepta: true });

    const lazos: Lazos = await rosa.json('GET', '/api/lazos');
    expect(lazos.grupos.map(g => [g.tipo, g.nombre])).toEqual([['raiz', 'Familia'], ['interno', 'Quien me nutre'], ['moai', 'Tinto de los jueves'], ['rama', 'Personas con las que me vi']]);
    const por = (n: string) => lazos.personas.find(p => p.nombre === n)!;
    expect(por('Mamá')).toMatchObject({ grupo: 'raiz', detalle: 'Vive en Cali', estado: 'vivo' });
    expect(por('Juan').grupo).toMatch(/^moai:/); // en el Moai, no repetido en la rama
    expect(lazos.personas.filter(p => p.nombre === 'Juan')).toHaveLength(1);
    expect(por('Ana')).toMatchObject({ grupo: 'rama', estado: 'vivo', accion: { tipo: 'saludo' } });
    expect(JSON.stringify(lazos)).not.toMatch(/\d{4}-\d{2}-\d{2}|"dias"|"veces"/);

    // Con el tiempo, los lazos se duermen (nunca se borran).
    reloj = new Date(hoy.getTime() + 60 * 864e5);
    const despues: Lazos = await rosa.json('GET', '/api/lazos');
    expect(despues.personas.find(p => p.nombre === 'Ana')!.estado).toBe('dormido');
    expect(despues.personas).toHaveLength(lazos.personas.length);
  });
});
