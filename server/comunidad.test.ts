// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cellToLatLng, gridDisk, gridRingUnsafe, latLngToCell } from 'h3-js';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import { alcanzaA } from './comunidad';
import { franja } from '../src/lib/lugares';
import type { Propio } from './envios';

const hoy = new Date('2026-10-12T12:00:00Z');
const manana = '2026-10-13T15:00:00.000Z';
let db: Db;
let app: Awaited<ReturnType<typeof crearApp>>;
let codigos: Record<string, string>;
const correo: Propio = { tipo: 'propio', async enviar(destino, codigo) { codigos[destino] = codigo; } };

beforeAll(async () => { db = await abrirDb(); }, 60_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.query('truncate cuentas, consentimientos, verificaciones, sesiones, lugares, planes, plan_asistentes restart identity cascade');
  codigos = {};
  app = await crearApp({ db, vias: { correo }, secreto: 'prueba', ahora: () => hoy });
});
afterEach(async () => { await app.close(); });

async function persona(nombre: string) {
  const destino = `${nombre.toLowerCase().split(' ')[0]}@ejemplo.co`;
  await app.inject({ method: 'POST', url: '/api/registro', payload: { nombre, canal: 'correo', destino, aceptaTerminos: true, aceptaDatos: true } });
  const r = await app.inject({ method: 'POST', url: '/api/verificar', payload: { canal: 'correo', destino, codigo: codigos[destino] } });
  const c = r.cookies.find(x => x.name === COOKIE_SESION)!;
  const cookie = `${COOKIE_SESION}=${c.value}`;
  const pedir = (method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) => app.inject({ method, url, payload, headers: { cookie } });
  return { pedir, json: async (method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) => (await pedir(method, url, payload)).json() };
}
const planCiudad = { titulo: 'Caminata por el parque', cuando: manana, lugarPublico: 'Parque de los Deseos', ciudad: '05001', alcance: 'ciudad' };

describe('Lugares guardados', () => {
  it('el primero queda activo; se puede cambiar de lugar y borrar', async () => {
    const rosa = await persona('Rosa');
    const [casa] = await rosa.json('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
    expect(casa).toMatchObject({ nombre: 'Casa', zona: 'Medellín', activo: true });
    const lista = await rosa.json('POST', '/api/lugares', { nombre: 'Donde mis papás', ciudad: '11001' });
    const papas = lista.find((l: { nombre: string }) => l.nombre === 'Donde mis papás');
    expect(papas.activo).toBe(false);
    const activos = await rosa.json('POST', `/api/lugares/${papas.id}/activar`);
    expect(activos.filter((l: { activo: boolean }) => l.activo).map((l: { nombre: string }) => l.nombre)).toEqual(['Donde mis papás']);
    expect((await rosa.json('GET', '/api/sesion')).lugar.nombre).toBe('Donde mis papás');
    const quedan = await rosa.json('DELETE', `/api/lugares/${papas.id}`);
    expect(quedan).toEqual([expect.objectContaining({ nombre: 'Casa', activo: true })]);
  });

  it('hasta 5 lugares, con nombre y ciudad válidos', async () => {
    const rosa = await persona('Rosa');
    expect((await rosa.json('POST', '/api/lugares', { nombre: '', ciudad: '99999' })).errores).toMatchObject({ nombre: expect.any(String), ciudad: expect.any(String) });
    for (let i = 0; i < 5; i++) await rosa.pedir('POST', '/api/lugares', { nombre: `Lugar ${i}`, ciudad: '05001' });
    const sexto = await rosa.pedir('POST', '/api/lugares', { nombre: 'Otro', ciudad: '05001' });
    expect(sexto.statusCode).toBe(400);
    expect(sexto.json().error).toMatch(/hasta 5/);
  });

  it('nadie puede ver ni tocar los lugares de otra persona', async () => {
    const rosa = await persona('Rosa');
    const [casa] = await rosa.json('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
    const luis = await persona('Luis');
    expect(await luis.json('GET', '/api/lugares')).toEqual([]);
    expect((await luis.pedir('POST', `/api/lugares/${casa.id}/activar`)).statusCode).toBe(404);
    expect((await luis.pedir('DELETE', `/api/lugares/${casa.id}`)).statusCode).toBe(404);
  });

  it('«Tu comunidad» guarda el lugar «Casa» y nunca coordenadas', async () => {
    const rosa = await persona('Rosa');
    const perfil = await rosa.json('POST', '/api/perfil/comunidad', { ciudad: '05001' });
    expect(perfil).toMatchObject({ comunidad: 'completed', lugar: { nombre: 'Casa', zona: 'Medellín', activo: true } });
    expect(Object.keys(perfil.lugar)).not.toContain('celda');
  });
});

describe('Planes', () => {
  it('se ven en la misma ciudad, no en otra, y nunca con distancia exacta', async () => {
    const rosa = await persona('Rosa Prueba');
    await rosa.pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
    const luis = await persona('Luis');
    await luis.pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
    const ana = await persona('Ana');
    await ana.pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '11001' });

    const creados = await rosa.json('POST', '/api/planes', planCiudad);
    expect(creados).toEqual([expect.objectContaining({ titulo: 'Caminata por el parque', autor: 'Tú', mio: true, asistentes: [] })]);
    const deLuis = await luis.json('GET', '/api/planes');
    expect(deLuis).toEqual([expect.objectContaining({ autor: 'Rosa', franja: 'En tu ciudad', mio: false, voy: false })]);
    expect(deLuis[0].asistentes).toBeUndefined();
    expect(await ana.json('GET', '/api/planes')).toEqual([]);
  });

  it('apuntarse, desapuntarse y cupo completo; quien propone ve solo primeros nombres', async () => {
    const rosa = await persona('Rosa');
    await rosa.pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
    const [plan] = await rosa.json('POST', '/api/planes', { ...planCiudad, cupo: 2 });
    const luis = await persona('Luis Gómez');
    await luis.pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
    const marta = await persona('Marta');
    await marta.pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
    const carlos = await persona('Carlos');
    await carlos.pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });

    expect((await luis.json('POST', `/api/planes/${plan.id}/ir`))[0].voy).toBe(true);
    await marta.pedir('POST', `/api/planes/${plan.id}/ir`);
    expect((await carlos.json('GET', '/api/planes'))[0].lleno).toBe(true);
    expect((await carlos.pedir('POST', `/api/planes/${plan.id}/ir`)).statusCode).toBe(409);
    expect((await rosa.json('GET', '/api/planes'))[0].asistentes).toEqual(['Luis', 'Marta']);
    expect((await luis.json('POST', `/api/planes/${plan.id}/no-ir`))[0].voy).toBe(false);
  });

  it('solo quien lo propuso puede cancelarlo, y desaparece', async () => {
    const rosa = await persona('Rosa');
    await rosa.pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
    const [plan] = await rosa.json('POST', '/api/planes', planCiudad);
    const luis = await persona('Luis');
    await luis.pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
    expect((await luis.pedir('POST', `/api/planes/${plan.id}/cancelar`)).statusCode).toBe(404);
    await rosa.pedir('POST', `/api/planes/${plan.id}/cancelar`);
    expect(await luis.json('GET', '/api/planes')).toEqual([]);
  });

  it('valida el plan: lugar público, fecha futura y alcance posible sin barrio', async () => {
    const rosa = await persona('Rosa');
    await rosa.pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
    const r = await rosa.json('POST', '/api/planes', { ...planCiudad, lugarPublico: '', cuando: '2026-10-01T10:00:00Z', alcance: 'cerca' });
    expect(Object.keys(r.errores).sort()).toEqual(['alcance', 'cuando', 'lugarPublico']);
  });

  it('sin lugar elegido, pide elegir uno', async () => {
    const rosa = await persona('Rosa');
    const r = await rosa.pedir('GET', '/api/planes');
    expect(r.statusCode).toBe(409);
    expect(r.json().sinLugar).toBe(true);
  });
});

describe('Alcance por celdas (~1 km)', () => {
  const centro = latLngToCell(6.2476, -75.5658, 8);
  const vecina = gridDisk(centro, 1).find(c => c !== centro)!;
  const lejana = gridRingUnsafe(centro, 3)[0];
  const plan = (alcance: string) => ({ ciudad: '05001', celda: centro, alcance });
  const lugar = (celda: string | null) => ({ ciudad: '05001', celda });

  it('«Muy cerca» llega a la celda y sus vecinas; «Mi zona», a dos anillos', () => {
    expect(alcanzaA(plan('cerca'), lugar(vecina))).toEqual({ ve: true, distancia: 1 });
    expect(alcanzaA(plan('cerca'), lugar(lejana)).ve).toBe(false);
    expect(alcanzaA(plan('zona'), lugar(gridRingUnsafe(centro, 2)[0])).ve).toBe(true);
    expect(alcanzaA(plan('zona'), lugar(lejana)).ve).toBe(false);
    expect(alcanzaA(plan('ciudad'), lugar(lejana)).ve).toBe(true);
  });

  it('otra ciudad nunca lo ve, y sin celda solo llegan los planes de toda la ciudad', () => {
    expect(alcanzaA(plan('ciudad'), { ciudad: '11001', celda: vecina }).ve).toBe(false);
    expect(alcanzaA(plan('cerca'), lugar(null)).ve).toBe(false);
    expect(alcanzaA(plan('ciudad'), lugar(null)).ve).toBe(true);
  });

  it('la distancia se muestra por franjas', () => {
    expect(franja(0)).toBe('A menos de 2 km');
    expect(franja(1)).toBe('A menos de 2 km');
    expect(franja(2)).toBe('A menos de 4 km');
    expect(franja(null)).toBe('En tu ciudad');
    // Una celda de resolución 8 mide ~1 km: el centro de una vecina está a menos de 2 km.
    const [la, lo] = cellToLatLng(centro), [lb, lob] = cellToLatLng(vecina);
    expect(Math.hypot((la - lb) * 111, (lo - lob) * 111)).toBeLessThan(2);
  });
});
