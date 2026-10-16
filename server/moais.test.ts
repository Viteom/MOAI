// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import type { Propio } from './envios';
import type { Gente } from '../src/lib/api';

const hoy = new Date('2026-10-12T12:00:00Z');
let reloj = hoy;
const manana = '2026-10-13T15:00:00.000Z';
const pasado = new Date('2026-10-13T18:00:00Z'); // después del plan de mañana
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
  return { nombre, pedir, json: async (method: 'GET' | 'POST', url: string, payload?: object) => (await pedir(method, url, payload)).json(), gente: async (): Promise<Gente> => (await pedir('GET', '/api/gente')).json() };
}
const plan = (titulo = 'Caminata por el parque') => ({ titulo, cuando: manana, lugarPublico: 'Parque de los Deseos', ciudad: '05001', alcance: 'ciudad' });

// Quien propone un plan y quienes se suman; después del plan, todas confirman que se vieron.
async function seVieron(autor: Quien, ...otras: Quien[]) {
  reloj = hoy;
  const planes = await autor.json('POST', '/api/planes', plan(`Plan de ${autor.nombre} ${Math.random()}`));
  const id = planes.at(-1).id;
  for (const o of otras) await o.pedir('POST', `/api/planes/${id}/ir`);
  reloj = pasado;
  for (const q of [autor, ...otras]) {
    const g = await q.gente();
    const e = g.encuentros.find(x => x.planId === id)!;
    for (const p of e.personas) await q.pedir('POST', '/api/gente/encuentro', { planId: id, ocurrencia: e.ocurrencia, ref: p.ref, si: true });
  }
  return id;
}
const refDe = async (q: Quien, nombre: string) => (await q.gente()).conocidos.find(c => c.nombre === nombre)!.ref;

describe('Ya nos vimos', () => {
  it('después del plan se pregunta con quién te viste; solo es mutuo si las dos lo confirman', async () => {
    const juan = await persona('Juan'), ana = await persona('Ana');
    const [p] = await juan.json('POST', '/api/planes', plan());
    await ana.pedir('POST', `/api/planes/${p.id}/ir`);
    expect((await ana.gente()).encuentros).toEqual([]); // el plan aún no pasa
    reloj = pasado;
    const [e] = (await ana.gente()).encuentros;
    expect(e).toMatchObject({ planId: p.id, titulo: 'Caminata por el parque', personas: [{ nombre: 'Juan' }] });
    await ana.pedir('POST', '/api/gente/encuentro', { planId: p.id, ocurrencia: e.ocurrencia, ref: e.personas[0].ref, si: true });
    expect((await ana.gente()).encuentros).toEqual([]);
    expect((await ana.gente()).conocidos).toEqual([]); // falta que Juan lo confirme
    const [ej] = (await juan.gente()).encuentros;
    await juan.pedir('POST', '/api/gente/encuentro', { planId: p.id, ocurrencia: ej.ocurrencia, ref: ej.personas[0].ref, si: true });
    expect((await ana.gente()).conocidos).toEqual([expect.objectContaining({ nombre: 'Juan', moaiComun: false })]);
  });

  it('«No pudimos» no crea el vínculo; ocho días después ya no se pregunta', async () => {
    const juan = await persona('Juan'), ana = await persona('Ana');
    const [p] = await juan.json('POST', '/api/planes', plan());
    await ana.pedir('POST', `/api/planes/${p.id}/ir`);
    reloj = pasado;
    const [e] = (await ana.gente()).encuentros;
    await ana.pedir('POST', '/api/gente/encuentro', { planId: p.id, ocurrencia: e.ocurrencia, ref: e.personas[0].ref, si: false });
    reloj = new Date(pasado.getTime() + 8 * 864e5);
    expect((await juan.gente()).encuentros).toEqual([]);
    expect((await ana.gente()).conocidos).toEqual([]);
  });
});

describe('Moais', () => {
  it('nace entre dos personas que se vieron, con el nombre que le pusieron', async () => {
    const juan = await persona('Juan'), ana = await persona('Ana'), luis = await persona('Luis');
    await seVieron(juan, ana);
    const g = await ana.json('POST', '/api/moais', { ref: await refDe(ana, 'Juan'), nombre: 'Los del parque' });
    expect(g.conocidos[0]).toMatchObject({ nombre: 'Juan', propuesta: true });
    const [inv] = (await juan.gente()).invitaciones;
    expect(inv).toMatchObject({ tipo: 'nuevo', de: 'Ana', nombre: 'Los del parque' });
    const despues: Gente = await juan.json('POST', `/api/invitaciones/${inv.id}`, { acepta: true });
    expect(despues.moais).toEqual([expect.objectContaining({ nombre: 'Los del parque', miembros: expect.arrayContaining([expect.objectContaining({ nombre: 'Ana' }), expect.objectContaining({ nombre: 'Tú', yo: true })]) })]);
    // Nadie puede proponerle un Moai a alguien con quien no se ha visto.
    const extraño = await luis.pedir('POST', '/api/moais', { ref: (await ana.gente()).moais[0].miembros[0].ref, nombre: 'Hola' });
    expect(extraño.statusCode).toBe(404);
  });

  it('para sumar a alguien votan todos; un «no» cierra la invitación y la persona invitada nunca se entera', async () => {
    const juan = await persona('Juan'), ana = await persona('Ana'), marta = await persona('Marta'), rosa = await persona('Rosa');
    await seVieron(juan, ana);
    await seVieron(juan, marta, rosa);
    await ana.pedir('POST', '/api/moais', { ref: await refDe(ana, 'Juan'), nombre: 'Los del parque' });
    const [nuevo] = (await juan.gente()).invitaciones;
    const { moais: [moai] } = await juan.json('POST', `/api/invitaciones/${nuevo.id}`, { acepta: true });

    await juan.pedir('POST', `/api/moais/${moai.id}/invitar`, { ref: await refDe(juan, 'Marta') });
    expect((await marta.gente()).invitaciones).toEqual([]); // falta el sí de Ana
    const [aprobar] = (await ana.gente()).invitaciones;
    expect(aprobar).toMatchObject({ tipo: 'aprobar', de: 'Juan', persona: 'Marta', nombre: 'Los del parque' });
    await ana.pedir('POST', `/api/invitaciones/${aprobar.id}`, { acepta: true });
    const [entrar] = (await marta.gente()).invitaciones;
    expect(entrar).toMatchObject({ tipo: 'entrar', nombre: 'Los del parque' });
    expect([...(entrar as { miembros: string[] }).miembros].sort()).toEqual(['Ana', 'Juan']);
    const conMarta: Gente = await marta.json('POST', `/api/invitaciones/${entrar.id}`, { acepta: true });
    expect(conMarta.moais[0].miembros.map(m => m.nombre).sort()).toEqual(['Ana', 'Juan', 'Tú']);

    await juan.pedir('POST', `/api/moais/${moai.id}/invitar`, { ref: await refDe(juan, 'Rosa') });
    const voto = (await ana.gente()).invitaciones.find(i => i.tipo === 'aprobar')!;
    await ana.pedir('POST', `/api/invitaciones/${voto.id}`, { acepta: false });
    expect((await marta.gente()).invitaciones).toEqual([]); // la invitación se cerró antes de que Marta votara
    expect((await rosa.gente()).invitaciones).toEqual([]);
    expect((await juan.gente()).moais[0].esperando).toEqual([]);
  });

  it('máximo 5 personas, contando las invitaciones abiertas', async () => {
    const todas: Quien[] = [];
    for (const n of ['Juan', 'Ana', 'Marta', 'Rosa', 'Luis', 'Sara']) todas.push(await persona(n));
    const [juan, ...otras] = todas;
    await seVieron(juan, ...otras);
    await juan.pedir('POST', '/api/moais', { ref: await refDe(juan, 'Ana'), nombre: 'Los del parque' });
    const ana = otras[0];
    const [inv] = (await ana.gente()).invitaciones;
    const { moais: [moai] } = await ana.json('POST', `/api/invitaciones/${inv.id}`, { acepta: true });
    for (const nombre of ['Marta', 'Rosa', 'Luis']) expect((await juan.pedir('POST', `/api/moais/${moai.id}/invitar`, { ref: await refDe(juan, nombre) })).statusCode).toBe(200);
    const sexta = await juan.pedir('POST', `/api/moais/${moai.id}/invitar`, { ref: await refDe(juan, 'Sara') });
    expect(sexta.statusCode).toBe(409);
    expect(sexta.json().error).toMatch(/máximo 5/);
  });

  it('salir es libre; la conversación es solo para quienes están', async () => {
    const juan = await persona('Juan'), ana = await persona('Ana'), luis = await persona('Luis');
    await seVieron(juan, ana);
    await ana.pedir('POST', '/api/moais', { ref: await refDe(ana, 'Juan'), nombre: 'Los del parque' });
    const [inv] = (await juan.gente()).invitaciones;
    const { moais: [moai] } = await juan.json('POST', `/api/invitaciones/${inv.id}`, { acepta: true });
    await ana.pedir('POST', `/api/moais/${moai.id}/mensajes`, { texto: '¿Caminamos el domingo?' });
    expect(await juan.json('GET', `/api/moais/${moai.id}/mensajes`)).toEqual([expect.objectContaining({ autor: 'Ana', texto: '¿Caminamos el domingo?' })]);
    expect((await luis.pedir('GET', `/api/moais/${moai.id}/mensajes`)).statusCode).toBe(404);
    expect((await ana.json('POST', `/api/moais/${moai.id}/salir`)).moais).toEqual([]);
    expect((await juan.gente()).moais[0].miembros.map(m => m.nombre)).toEqual(['Tú']);
    expect((await ana.pedir('GET', `/api/moais/${moai.id}/mensajes`)).statusCode).toBe(404);
  });
});

describe('Bloquear y reportar', () => {
  it('bloquear oculta los planes en las dos direcciones, sin avisar', async () => {
    const juan = await persona('Juan'), ana = await persona('Ana');
    await juan.pedir('POST', '/api/planes', plan());
    const [visto] = await ana.json('GET', '/api/planes');
    expect(visto.autorRef).toEqual(expect.any(String));
    await ana.pedir('POST', '/api/personas/bloquear', { ref: visto.autorRef });
    expect(await ana.json('GET', '/api/planes')).toEqual([]);
    await ana.pedir('POST', '/api/planes', plan('Tinto en la panadería'));
    expect((await juan.json('GET', '/api/planes')).map((p: { titulo: string }) => p.titulo)).toEqual(['Caminata por el parque']);
  });

  it('un reporte no pausa a nadie; dos personas distintas sí, y la persona nunca sabe quién fue', async () => {
    const juan = await persona('Juan'), ana = await persona('Ana'), marta = await persona('Marta');
    await juan.pedir('POST', '/api/planes', plan());
    const refAna = (await ana.json('GET', '/api/planes'))[0].autorRef;
    expect((await ana.pedir('POST', '/api/personas/reportar', { ref: refAna, motivo: 'trato', detalle: 'Fue grosero.' })).statusCode).toBe(200);
    await ana.pedir('POST', '/api/personas/reportar', { ref: refAna, motivo: 'insistencia' }); // la misma persona otra vez no cuenta doble
    expect((await juan.gente()).pausa).toBe(false);
    const refMarta = (await marta.json('GET', '/api/planes'))[0].autorRef;
    expect(refMarta).not.toBe(refAna); // cada quien ve una referencia distinta
    await marta.pedir('POST', '/api/personas/reportar', { ref: refMarta, motivo: 'dinero' });
    const g = await juan.gente();
    expect(g.pausa).toBe(true);
    expect(JSON.stringify(g)).not.toMatch(/Ana|Marta/);
    const nuevo = await juan.pedir('POST', '/api/planes', plan('Otro plan'));
    expect(nuevo.statusCode).toBe(403);
    expect(nuevo.json().error).toMatch(/en pausa/);
    // Puede seguir viendo planes y sumarse.
    await ana.pedir('POST', '/api/planes', plan('Tinto'));
    const [tinto] = await juan.json('GET', '/api/planes').then((ps: { titulo: string; id: string }[]) => ps.filter(p => p.titulo === 'Tinto'));
    expect((await juan.pedir('POST', `/api/planes/${tinto.id}/ir`)).statusCode).toBe(200);
    // Pasados 90 días sin otra queja, la pausa se levanta.
    reloj = new Date(hoy.getTime() + 91 * 864e5);
    expect((await juan.gente()).pausa).toBe(false);
  });

  it('no se puede reportar con una referencia inventada ni con un motivo que no existe', async () => {
    const ana = await persona('Ana');
    expect((await ana.pedir('POST', '/api/personas/reportar', { ref: 'x'.repeat(22), motivo: 'trato' })).statusCode).toBe(404);
    expect((await ana.pedir('POST', '/api/personas/reportar', { ref: 'x'.repeat(22), motivo: 'cualquiera' })).statusCode).toBe(400);
  });
});
