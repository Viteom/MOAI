// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import { crearCifrador } from './cifrado';
import { resultadoCuidado } from '../src/lib/cuidado';
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
  await db.query('truncate cuentas, verificaciones restart identity cascade');
  codigos = {};
  reloj = hoy;
  app = await crearApp({ db, vias: { correo }, secreto: 'prueba', ahora: () => reloj });
});
afterEach(async () => { await app.close(); });

async function persona(nombre: string) {
  const destino = `${nombre.toLowerCase()}@ejemplo.co`;
  await app.inject({ method: 'POST', url: '/api/registro', payload: { nombre, canal: 'correo', destino, aceptaTerminos: true, aceptaDatos: true } });
  const r = await app.inject({ method: 'POST', url: '/api/verificar', payload: { canal: 'correo', destino, codigo: codigos[destino] } });
  const cookie = `${COOKIE_SESION}=${r.cookies.find(x => x.name === COOKIE_SESION)!.value}`;
  const pedir = (method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) => app.inject({ method, url, payload, headers: { cookie } });
  return { pedir, json: async (method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) => (await pedir(method, url, payload)).json() };
}

describe('Cifrado', () => {
  it('lo cifrado no se lee en la base y no se puede alterar', () => {
    const c = crearCifrador('secreto');
    const guardado = c.cifrar('Mamá');
    expect(guardado).not.toContain('Mam');
    expect(c.descifrar(guardado)).toBe('Mamá');
    expect(crearCifrador('otro').descifrar(guardado)).toBeNull();
    expect(c.descifrar(guardado.slice(0, -4) + 'AAAA')).toBeNull();
  });
});

describe('¿Cómo cuidas y cómo te cuidas?', () => {
  it('predomina una letra o hay empate; respuestas incompletas no cuentan', () => {
    expect(resultadoCuidado(['A', 'A', 'A', 'B', 'C', 'A'])).toEqual(['A']);
    expect(resultadoCuidado(['A', 'A', 'B', 'B', 'C', 'C'])).toEqual(['A', 'B', 'C']);
    expect(resultadoCuidado(['A', 'B'])).toBeNull();
    expect(resultadoCuidado(['A', 'B', 'C', 'D', 'A', 'B'])).toBeNull();
  });

  it('sin autorización se muestra y se olvida; con autorización se guarda cifrado y se puede borrar', async () => {
    const rosa = await persona('Rosa');
    const respuestas = ['A', 'A', 'A', 'B', 'A', 'C'];
    expect(await rosa.json('POST', '/api/cuidado', { respuestas, guardar: false })).toEqual({ letras: ['A'], guardado: false });
    expect(await rosa.json('GET', '/api/cuidado')).toEqual({ letras: null, guardado: false });

    expect(await rosa.json('POST', '/api/cuidado', { respuestas, guardar: true })).toMatchObject({ letras: ['A'], guardado: true });
    const [fila] = await db.query<{ respuestas: string }>('select respuestas from cuidado');
    expect(fila.respuestas).not.toMatch(/"A"/);
    expect((await rosa.json('GET', '/api/cuidado')).letras).toEqual(['A']);
    expect(await rosa.json('DELETE', '/api/cuidado')).toEqual({ letras: null, guardado: false });
    expect(await db.query('select 1 from cuidado')).toEqual([]);
  });
});

describe('Moai interno', () => {
  it('hasta 8 personas (con la familia), cifradas y solo para ti', async () => {
    const rosa = await persona('Rosa'), luis = await persona('Luis');
    const lista = await rosa.json('POST', '/api/interno', { nombre: 'Laura', relacion: 'Mi amiga del colegio' });
    expect(lista).toEqual([expect.objectContaining({ nombre: 'Laura', relacion: 'Mi amiga del colegio', pendiente: false })]);
    const [fila] = await db.query<{ nombre: string }>('select nombre from moai_interno');
    expect(fila.nombre).not.toContain('Laura');
    expect(await luis.json('GET', '/api/interno')).toEqual([]);
    expect((await luis.pedir('POST', `/api/interno/${lista[0].id}/hablamos`)).statusCode).toBe(404);
    for (const n of ['Mamá', 'Pedro', 'Sofía', 'Tía Gloria', 'Papá', 'Abuela', 'Hermano']) await rosa.pedir('POST', '/api/interno', { nombre: n, relacion: '', familia: true });
    expect((await rosa.pedir('POST', '/api/interno', { nombre: 'Otra', relacion: '' })).statusCode).toBe(400);
  });

  it('Brisa recuerda a quien hace un tiempo no ves, como mucho una vez por semana', async () => {
    const rosa = await persona('Rosa');
    const [laura] = await rosa.json('POST', '/api/interno', { nombre: 'Laura', relacion: '' });
    expect((await rosa.json('GET', '/api/brisa')).filter((c: { tipo: string }) => c.tipo === 'interno')).toEqual([]);
    reloj = new Date(hoy.getTime() + 15 * 864e5);
    const [carta] = (await rosa.json('GET', '/api/brisa')).filter((c: { tipo: string }) => c.tipo === 'interno');
    expect(carta).toMatchObject({ personaId: laura.id, texto: expect.stringMatching(/no hablas con Laura/) });
    expect(carta.texto).not.toMatch(/\d/); // nunca cuántos días
    await rosa.pedir('POST', '/api/brisa/visto', { clave: carta.clave });
    expect((await rosa.json('GET', '/api/brisa')).filter((c: { tipo: string }) => c.tipo === 'interno')).toEqual([]);
    // «Ya le escribí» la saca de pendientes.
    expect((await rosa.json('POST', `/api/interno/${laura.id}/hablamos`))[0].pendiente).toBe(false);
  });
});

describe('Las personas cambian', () => {
  it('a los 90 días de guardado, Brisa propone repetir el test una vez', async () => {
    const rosa = await persona('Rosa');
    await rosa.pedir('POST', '/api/cuidado', { respuestas: ['B', 'B', 'B', 'B', 'B', 'B'], guardar: true });
    const repetir = async () => (await rosa.json('GET', '/api/brisa')).filter((c: { tipo: string }) => c.tipo === 'cuidado');
    expect(await repetir()).toEqual([]);
    reloj = new Date(hoy.getTime() + 91 * 864e5);
    const [carta] = await repetir();
    expect(carta.texto).toMatch(/Las personas cambian/);
    await rosa.pedir('POST', '/api/brisa/visto', { clave: carta.clave });
    expect(await repetir()).toEqual([]);
  });
});
