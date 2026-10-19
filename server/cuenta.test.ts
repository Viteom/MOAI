// @vitest-environment node
// Mi cuenta: descargar mis datos y borrar la cuenta (Ley 1581).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import type { Propio } from './envios';
import { borrarHistorialViejo } from './historial';

let db: Db;
let app: Awaited<ReturnType<typeof crearApp>>;
let codigos: Record<string, string>;
const correo: Propio = { tipo: 'propio', async enviar(destino, codigo) { codigos[destino] = codigo; } };

beforeAll(async () => { db = await abrirDb(); }, 60_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.query('truncate cuentas, verificaciones, moais, inviernos_contados, brisa_mensajes restart identity cascade');
  codigos = {};
  app = await crearApp({ db, vias: { correo }, secreto: 'prueba', ahora: () => new Date('2026-10-16T12:00:00Z') });
});
afterEach(async () => { await app.close(); });

async function persona(nombre: string) {
  const destino = `${nombre.toLowerCase()}@ejemplo.co`;
  await app.inject({ method: 'POST', url: '/api/registro', payload: { nombre, canal: 'correo', destino, aceptaTerminos: true, aceptaDatos: true } });
  const r = await app.inject({ method: 'POST', url: '/api/verificar', payload: { canal: 'correo', destino, codigo: codigos[destino] } });
  const cookie = `${COOKIE_SESION}=${r.cookies.find(x => x.name === COOKIE_SESION)!.value}`;
  const pedir = (method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) => app.inject({ method, url, payload, headers: { cookie } });
  await pedir('POST', '/api/perfil/nacimiento', { fechaNacimiento: '1960-05-02' });
  await pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
  const [{ id }] = await db.query<{ id: string }>('select id from cuentas where destino = $1', [destino]);
  return { id, pedir };
}

describe('Descargar mis datos', () => {
  it('trae lo mío, con lo cifrado legible, y nada de quién me reportó', async () => {
    const rosa = await persona('Rosa'), luis = await persona('Luis');
    await rosa.pedir('POST', '/api/interno', { nombre: 'Laura', relacion: 'Mi hermana', familia: true });
    await rosa.pedir('POST', '/api/planes', { titulo: 'Caminata', cuando: '2026-10-17T15:00:00.000Z', lugarPublico: 'Parque', ciudad: '05001', alcance: 'ciudad' });
    await db.query(`insert into reportes (de, a, motivo) values ($1, $2, 'trato')`, [luis.id, rosa.id]);
    const r = await rosa.pedir('GET', '/api/cuenta/datos');
    expect(r.statusCode).toBe(200);
    const datos = r.json();
    expect(datos.cuenta).toMatchObject({ nombre: 'Rosa', contacto: 'rosa@ejemplo.co', fechaNacimiento: '1960-05-02' });
    expect(datos.moaiInterno).toEqual([{ nombre: 'Laura', relacion: 'Mi hermana', familia: true }]);
    expect(datos.planesPropuestos[0].titulo).toBe('Caminata');
    expect(datos.autorizaciones).toHaveLength(2);
    expect(JSON.stringify(datos)).not.toContain('luis@ejemplo.co');
    expect(JSON.stringify(datos)).not.toContain('Luis'); // no se le dice quién la reportó
  });

  it('sin sesión no hay datos', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/cuenta/datos' })).statusCode).toBe(401);
  });
});

describe('Borrar mi cuenta', () => {
  it('pide confirmación', async () => {
    const rosa = await persona('Rosa');
    expect((await rosa.pedir('POST', '/api/cuenta/borrar', {})).statusCode).toBe(400);
    expect(await db.query('select 1 from cuentas where id = $1', [rosa.id])).toHaveLength(1);
  });

  it('borra todo lo suyo, cierra la sesión y deja los Moais de los demás', async () => {
    const rosa = await persona('Rosa'), luis = await persona('Luis'), ana = await persona('Ana');
    const [solo] = await db.query<{ id: string }>(`insert into moais (nombre) values ('Solo Rosa y Luis') returning id`);
    const [tres] = await db.query<{ id: string }>(`insert into moais (nombre) values ('Los tres') returning id`);
    await db.query('insert into moai_miembros (moai_id, cuenta_id) values ($1, $2), ($1, $3), ($4, $2), ($4, $3), ($4, $5)', [solo.id, rosa.id, luis.id, tres.id, ana.id]);
    await db.query(`insert into moai_mensajes (moai_id, autor_id, texto) values ($1, $2, 'Hola')`, [tres.id, rosa.id]);
    await db.query(`insert into inviernos_contados (de_ciego, a_ciego, datos) values ('x', 'y', 'z')`);
    await rosa.pedir('POST', '/api/interno', { nombre: 'Laura', relacion: '' });
    const r = await rosa.pedir('POST', '/api/cuenta/borrar', { confirmo: true });
    expect(r.statusCode).toBe(200);
    expect(r.cookies.find(c => c.name === COOKIE_SESION)?.value).toBe('');
    expect(await db.query('select 1 from cuentas where id = $1', [rosa.id])).toEqual([]);
    expect(await db.query(`select 1 from verificaciones where destino = 'rosa@ejemplo.co'`)).toEqual([]);
    expect(await db.query('select 1 from moai_interno')).toEqual([]);
    expect(await db.query('select 1 from moai_mensajes')).toEqual([]);
    expect(await db.query('select 1 from lugares where cuenta_id = $1', [rosa.id])).toEqual([]);
    // Los Moais siguen para quienes quedan.
    expect((await db.query<{ total: number }>('select count(*)::int as total from moai_miembros where moai_id = $1', [tres.id]))[0].total).toBe(2);
    expect((await db.query<{ total: number }>('select count(*)::int as total from moai_miembros where moai_id = $1', [solo.id]))[0].total).toBe(1);
    expect((await rosa.pedir('GET', '/api/cuenta/datos')).statusCode).toBe(401);
    void luis;
  });
});

describe('Conversación con Brisa', () => {
  it('se guarda cifrada, solo la ve su dueña, sale en la descarga y se puede borrar', async () => {
    const rosa = await persona('Rosa'), luis = await persona('Luis');
    expect((await rosa.pedir('POST', '/api/brisa/historial', { mensajes: [{ de: 'brisa', texto: '¿Qué haces un domingo?' }, { de: 'yo', texto: 'Voy a misa con mis nietos' }] })).statusCode).toBe(200);
    expect((await rosa.pedir('GET', '/api/brisa/historial')).json().map((l: { texto: string }) => l.texto)).toEqual(['¿Qué haces un domingo?', 'Voy a misa con mis nietos']);
    expect(JSON.stringify(await db.query('select texto from brisa_mensajes'))).not.toContain('nietos'); // cifrada en la base
    expect((await luis.pedir('GET', '/api/brisa/historial')).json()).toEqual([]);
    expect((await rosa.pedir('GET', '/api/cuenta/datos')).json().conversacionConBrisa).toHaveLength(2);
    await rosa.pedir('POST', '/api/brisa/historial', { mensajes: [{ de: 'otra', texto: 'x' }, { de: 'yo', texto: '' }] }); // lo inválido no entra
    expect(await db.query('select 1 from brisa_mensajes')).toHaveLength(2);
    expect((await rosa.pedir('DELETE', '/api/brisa/historial')).statusCode).toBe(200);
    expect(await db.query('select 1 from brisa_mensajes')).toEqual([]);
  });

  it('se borra a los 90 días', async () => {
    const rosa = await persona('Rosa');
    await rosa.pedir('POST', '/api/brisa/historial', { mensajes: [{ de: 'yo', texto: 'Hola' }] });
    await borrarHistorialViejo(db, new Date('2027-01-10T12:00:00Z')); // 86 días después
    expect(await db.query('select 1 from brisa_mensajes')).toHaveLength(1);
    await borrarHistorialViejo(db, new Date('2027-01-20T12:00:00Z')); // 96 días después
    expect(await db.query('select 1 from brisa_mensajes')).toEqual([]);
  });
});
