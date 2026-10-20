// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import { estadoLazo } from '../src/lib/lazos';
import type { FichaVinculo, Lazos } from '../src/lib/api';
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
  const pedir = (method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) => app.inject({ method, url, payload, headers: { cookie } });
  await pedir('POST', '/api/perfil/nacimiento', { fechaNacimiento: '1960-05-02' }); // cuenta adulta validada (regla 8)
  await pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
  return { pedir, json: async (method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) => (await pedir(method, url, payload)).json() };
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

const privada = { comoNosConocemos: 'En la biblioteca', algoCompartimos: 'Lecturas del barrio', nota: 'Solo yo debo ver esta nota' };
const rutaFicha = (id: string) => `/api/lazos/${encodeURIComponent(id)}/ficha`;
const redDe = (q: Quien) => q.json('GET', '/api/lazos') as Promise<Lazos>;
async function formar(a: Quien, b: Quien, nombre: string) {
  const ref = (await a.json('GET', '/api/gente')).conocidos.find((c: { nombre: string }) => c.nombre === 'Juan').ref;
  const r = await a.pedir('POST', '/api/moais', { ref, nombre }); expect(r.statusCode).toBe(200);
  const inv = (await b.json('GET', '/api/gente')).invitaciones.find((i: { nombre: string }) => i.nombre === nombre);
  expect((await b.pedir('POST', `/api/invitaciones/${inv.id}`, { acepta: true })).statusCode).toBe(200);
}

describe('Categoría independiente y pertenencia múltiple', () => {
  it('una cuenta aparece una vez con todos los Moais realmente compartidos, sin cambiar su categoría', async () => {
    const rosa = await persona('Rosa'), juan = await persona('Juan');
    await seVieron(rosa, juan);
    const antes = (await redDe(rosa)).personas[0];
    expect(antes.categoria).toBe('rama');
    await formar(rosa, juan, 'Los del parque');
    await formar(rosa, juan, 'Tinto de los jueves');
    const despues = (await redDe(rosa)).personas;
    expect(despues).toHaveLength(1);
    expect(despues[0]).toMatchObject({ id: antes.id, categoria: 'rama', origen: 'moai' });
    expect(despues[0].moais?.map(m => m.nombre)).toEqual(['Los del parque', 'Tinto de los jueves']);
    expect((await rosa.pedir('POST', `/api/lazos/${encodeURIComponent(antes.id)}/categoria`, { categoria: 'tronco' })).statusCode).toBe(409);
    expect((await redDe(rosa)).personas[0].categoria).toBe('rama');
  });

  it('una invitación no es pertenencia y no revela grupos ajenos', async () => {
    const rosa = await persona('Rosa'), juan = await persona('Juan');
    await seVieron(rosa, juan);
    const ref = (await redDe(rosa)).personas[0].referencia;
    await rosa.pedir('POST', '/api/moais', { ref, nombre: 'Solo cuando aceptes' });
    expect((await redDe(rosa)).personas[0].moais).toEqual([]);
    const [r] = await db.query<{ id: string }>('select id from cuentas where destino = $1', ['juan@ejemplo.co']);
    const [m] = await db.query<{ id: string }>(`insert into moais (nombre, creado_en) values ('Grupo privado ajeno', $1) returning id`, [hoy]);
    await db.query('insert into moai_miembros (moai_id, cuenta_id, unido_en) values ($1, $2, $3)', [m.id, r.id, hoy]);
    expect(JSON.stringify(await redDe(rosa))).not.toContain('Grupo privado ajeno');
  });
});

describe('Fichas privadas y presentación compartida', () => {
  it('cifra las notas, exige propiedad y nunca las mezcla con un perfil o la lista de vínculos', async () => {
    const rosa = await persona('Rosa'), juan = await persona('Juan');
    await seVieron(rosa, juan);
    const juanParaRosa = (await redDe(rosa)).personas[0];
    const rosaParaJuan = (await redDe(juan)).personas[0];
    expect(juanParaRosa.id).not.toBe(rosaParaJuan.id);
    expect((await rosa.pedir('POST', rutaFicha(juanParaRosa.id), privada)).statusCode).toBe(200);
    const f: FichaVinculo = await rosa.json('GET', rutaFicha(juanParaRosa.id));
    expect(f.privada).toEqual(privada);
    const [fila] = await db.query<{ datos: string }>('select datos from fichas_vinculo');
    expect(fila.datos).not.toContain(privada.nota);
    expect(fila.datos).not.toContain(privada.comoNosConocemos);
    expect((await juan.pedir('GET', rutaFicha(juanParaRosa.id))).statusCode).toBe(404);
    expect((await juan.pedir('POST', rutaFicha(juanParaRosa.id), privada)).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: rutaFicha(juanParaRosa.id) })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: rutaFicha(juanParaRosa.id), payload: privada })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: `/api/lazos/${encodeURIComponent(juanParaRosa.id)}/categoria`, payload: { categoria: 'raiz' } })).statusCode).toBe(401);
    expect((await juan.json('GET', rutaFicha(rosaParaJuan.id))).privada.nota).toBe('');
    for (const ruta of ['/api/lazos', '/api/perfil-publico', '/api/zona']) expect(JSON.stringify(await rosa.json('GET', ruta))).not.toContain(privada.nota);
    const datos = await rosa.json('GET', '/api/cuenta/datos');
    expect(datos.fichasPersonales[0].ficha).toEqual(privada);
    expect((await juan.json('GET', '/api/cuenta/datos')).fichasPersonales).toEqual([]);
    expect((await rosa.pedir('POST', rutaFicha(juanParaRosa.id), { ...privada, nota: 'x'.repeat(501) })).statusCode).toBe(400);
    expect((await rosa.pedir('POST', rutaFicha(juanParaRosa.id), { ...privada, nota: { texto: 'no' } })).statusCode).toBe(400);
  });

  it('el permiso de Vecinos no se amplía: compartir con la red se elige aparte y se puede revocar', async () => {
    const rosa = await persona('Rosa'), juan = await persona('Juan');
    await seVieron(rosa, juan);
    const id = (await redDe(rosa)).personas[0].id;
    const p = { frase: 'Me gusta la huerta', gustos: ['huerta'], comparte: '', aprender: '', visible: true };
    await juan.pedir('POST', '/api/perfil-publico', p);
    expect((await rosa.json('GET', rutaFicha(id))).compartida).toBeNull();
    await juan.pedir('POST', '/api/perfil-publico', { ...p, nombrePreferido: 'Juan del parque', visibleEnRed: true });
    const f: FichaVinculo = await rosa.json('GET', rutaFicha(id));
    expect(f.compartida).toMatchObject({ frase: p.frase, nombrePreferido: 'Juan del parque' });
    expect(f.compartida).not.toHaveProperty('privada');
    expect((await redDe(rosa)).personas[0].nombre).toBe('Juan del parque');
    // Un cliente anterior que solo edita Vecinos no borra el permiso independiente.
    await juan.pedir('POST', '/api/perfil-publico', p);
    expect((await juan.json('GET', '/api/perfil-publico')).visibleEnRed).toBe(true);
    await juan.pedir('POST', '/api/perfil-publico', { ...p, visibleEnRed: false });
    expect((await rosa.json('GET', rutaFicha(id))).compartida).toBeNull();
    expect((await redDe(rosa)).personas[0].nombre).toBe('Juan');
  });

  it('gestiona una ficha personal sin cuenta, cambia su categoría y borra sus notas al quitarla', async () => {
    const rosa = await persona('Rosa'), juan = await persona('Juan');
    const [p] = await rosa.json('POST', '/api/interno', { nombre: 'Mi tía', familia: true });
    const id = `interno:${p.id}`;
    await rosa.pedir('POST', rutaFicha(id), privada);
    expect((await rosa.json('GET', rutaFicha(id))).persona).toMatchObject({ origen: 'personal', moais: [], categoria: 'raiz' });
    const cat = `/api/lazos/${encodeURIComponent(id)}/categoria`;
    expect((await rosa.pedir('POST', cat, { categoria: 'tronco' })).statusCode).toBe(200);
    expect((await rosa.json('GET', rutaFicha(id))).persona.categoria).toBe('tronco');
    expect((await rosa.json('GET', rutaFicha(id))).privada).toEqual(privada);
    expect((await juan.pedir('POST', cat, { categoria: 'raiz' })).statusCode).toBe(404);
    expect((await rosa.pedir('POST', cat, { categoria: 'rama' })).statusCode).toBe(400);
    await rosa.pedir('DELETE', `/api/interno/${p.id}`);
    expect((await rosa.pedir('GET', rutaFicha(id))).statusCode).toBe(404);
    expect(await db.query('select * from fichas_vinculo')).toEqual([]);
  });

  it('un bloqueo revoca el acceso a la ficha y la eliminación de la cuenta borra las notas', async () => {
    const rosa = await persona('Rosa'), juan = await persona('Juan');
    await seVieron(rosa, juan);
    await formar(rosa, juan, 'Un rato juntos');
    const p = (await redDe(rosa)).personas[0];
    await rosa.pedir('POST', rutaFicha(p.id), privada);
    expect((await rosa.pedir('POST', '/api/personas/bloquear', { ref: p.referencia })).statusCode).toBe(200);
    expect((await rosa.pedir('GET', rutaFicha(p.id))).statusCode).toBe(404);
    expect((await rosa.pedir('POST', '/api/cuenta/borrar', { confirmo: true })).statusCode).toBe(200);
    expect(await db.query('select * from fichas_vinculo')).toEqual([]);
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
    expect(lazos.grupos.map(g => [g.tipo, g.nombre])).toEqual([['raiz', 'Familia'], ['interno', 'Quien me nutre'], ['moai', 'Tinto de los jueves'], ['rama', 'Personas de mi red']]);
    const por = (n: string) => lazos.personas.find(p => p.nombre === n)!;
    expect(por('Mamá')).toMatchObject({ grupo: 'raiz', detalle: 'Vive en Cali', estado: 'vivo' });
    expect(por('Juan')).toMatchObject({ grupo: 'rama', categoria: 'rama', moais: [{ nombre: 'Tinto de los jueves' }] });
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
