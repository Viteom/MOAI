// @vitest-environment node
// Pruebas de los hallazgos de la revisión de Codex en el pull request 2 (15 de octubre de 2026): cada una reproduce
// el caso que señaló y comprueba que ya no ocurre.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import { borrarConversacionesViejas } from './mantenimiento';
import type { Propio } from './envios';

const hoy = new Date('2026-10-15T12:00:00Z');
let reloj = hoy;
let db: Db;
let app: Awaited<ReturnType<typeof crearApp>>;
let codigos: Record<string, string>;
let fallar = false;
const correo: Propio = { tipo: 'propio', async enviar(destino, codigo) { if (fallar) throw new Error('proveedor caído'); codigos[destino] = codigo; } };

beforeAll(async () => { db = await abrirDb(); }, 60_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.query('truncate cuentas, verificaciones, moais restart identity cascade');
  codigos = {};
  reloj = hoy;
  fallar = false;
  app = await crearApp({ db, vias: { correo }, secreto: 'prueba', ahora: () => reloj });
});
afterEach(async () => { await app.close(); });

const pedirSin = (url: string, payload: object) => app.inject({ method: 'POST', url, payload });
const registrar = (nombre: string, destino: string) => pedirSin('/api/registro', { nombre, canal: 'correo', destino, aceptaTerminos: true, aceptaDatos: true });
const verificar = (destino: string, codigo: string) => pedirSin('/api/verificar', { canal: 'correo', destino, codigo });

type Quien = Awaited<ReturnType<typeof persona>>;
async function persona(nombre: string, { adulta = true } = {}) {
  const destino = `${nombre.toLowerCase()}@ejemplo.co`;
  await registrar(nombre, destino);
  const r = await verificar(destino, codigos[destino]);
  const cookie = `${COOKIE_SESION}=${r.cookies.find(x => x.name === COOKIE_SESION)!.value}`;
  const pedir = (method: 'GET' | 'POST', url: string, payload?: object) => app.inject({ method, url, payload, headers: { cookie } });
  if (adulta) {
    await pedir('POST', '/api/perfil/nacimiento', { fechaNacimiento: '1960-05-02' });
    await pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' });
  }
  return { pedir, json: async (method: 'GET' | 'POST', url: string, payload?: object) => (await pedir(method, url, payload)).json() };
}
const plan = (titulo: string, extra: object = {}) => ({ titulo, cuando: '2026-10-16T15:00:00.000Z', lugarPublico: 'Parque', ciudad: '05001', alcance: 'ciudad', ...extra });
const crearPlan = async (q: Quien, titulo: string, extra: object = {}) =>
  (await q.json('POST', '/api/planes', plan(titulo, extra))).find((p: { titulo: string }) => p.titulo === titulo);

describe('Códigos de acceso', () => {
  it('el límite por hora es igual exista o no la cuenta: no revela quién está registrado', async () => {
    await persona('Rosa', { adulta: false });
    await db.query('delete from verificaciones'); // las dos parten sin envíos en la última hora
    const conteo = async (destino: string) => { const s = []; for (let i = 0; i < 6; i++) s.push((await pedirSin('/api/acceso', { canal: 'correo', destino })).statusCode); return s; };
    const existe = await conteo('rosa@ejemplo.co');
    const noExiste = await conteo('nadie@ejemplo.co');
    expect(existe.at(-1)).toBe(429);
    expect(noExiste).toEqual(existe); // mismo patrón de respuestas: el límite no delata si la cuenta existe
  });

  it('una cuenta pendiente no se activa desde «Iniciar sesión»: hay que completar el registro', async () => {
    await registrar('Intruso', 'dueña@ejemplo.co'); // alguien crea una cuenta pendiente con un correo ajeno
    delete codigos['dueña@ejemplo.co'];
    await pedirSin('/api/acceso', { canal: 'correo', destino: 'dueña@ejemplo.co' });
    expect(codigos['dueña@ejemplo.co']).toBeUndefined(); // no se envía código de acceso
    // La dueña completa el registro con sus propios datos y consentimientos.
    await registrar('Dueña', 'dueña@ejemplo.co');
    expect((await verificar('dueña@ejemplo.co', codigos['dueña@ejemplo.co'])).statusCode).toBe(200);
  });

  it('los intentos en paralelo no superan el límite de cinco', async () => {
    await registrar('Rosa', 'rosa@ejemplo.co');
    const bueno = codigos['rosa@ejemplo.co'];
    const malo = bueno === '000000' ? '111111' : '000000';
    await Promise.all(Array.from({ length: 8 }, () => verificar('rosa@ejemplo.co', malo)));
    expect((await verificar('rosa@ejemplo.co', bueno)).statusCode).toBe(429);
  });

  it('si el proveedor falla, el código anterior sigue sirviendo', async () => {
    await registrar('Rosa', 'rosa@ejemplo.co');
    const anterior = codigos['rosa@ejemplo.co'];
    fallar = true;
    expect((await registrar('Rosa', 'rosa@ejemplo.co')).statusCode).toBe(502);
    fallar = false;
    expect((await verificar('rosa@ejemplo.co', anterior)).statusCode).toBe(200);
  });
});

describe('Comunidad', () => {
  it('sin fecha de nacimiento declarada no se puede usar la comunidad (regla 8)', async () => {
    const menor = await persona('Teo', { adulta: false });
    expect((await menor.pedir('GET', '/api/planes')).statusCode).toBe(401);
    expect((await menor.pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad: '05001' })).statusCode).toBe(401);
  });

  it('el último cupo no se lo llevan dos personas a la vez', async () => {
    const autor = await persona('Juan');
    const [ana, luis, rosa] = [await persona('Ana'), await persona('Luis'), await persona('Rosa')];
    const p = await crearPlan(autor, 'Tinto para dos', { cupo: 2 });
    await Promise.all([ana, luis, rosa].map(q => q.pedir('POST', `/api/planes/${p.id}/ir`)));
    const [{ total }] = await db.query<{ total: number }>('select count(*)::int as total from asistencias where plan_id = $1', [p.id]);
    expect(total).toBe(2);
  });

  it('al empezar el plan, quienes participan no pierden el plan ni su conversación; los demás no lo ven', async () => {
    const juan = await persona('Juan'), ana = await persona('Ana'), luis = await persona('Luis');
    const p = await crearPlan(juan, 'Caminata');
    await ana.pedir('POST', `/api/planes/${p.id}/ir`);
    reloj = new Date('2026-10-16T15:30:00Z'); // ya empezó
    expect((await ana.pedir('GET', `/api/planes/${p.id}`)).statusCode).toBe(200);
    expect((await ana.pedir('POST', `/api/planes/${p.id}/mensajes`, { texto: 'Ya llegué' })).statusCode).toBe(200);
    expect((await luis.pedir('GET', `/api/planes/${p.id}`)).statusCode).toBe(404);
    expect((await luis.json('GET', '/api/planes')).map((x: { titulo: string }) => x.titulo)).not.toContain('Caminata');
  });

  it('en un plan semanal, haber ido una vez no da acceso a la conversación de las semanas siguientes', async () => {
    const juan = await persona('Juan'), ana = await persona('Ana');
    const p = await crearPlan(juan, 'Caminata de los viernes', { repite: 'semanal' });
    await ana.pedir('POST', `/api/planes/${p.id}/ir`);
    expect((await ana.pedir('GET', `/api/planes/${p.id}/mensajes`)).statusCode).toBe(200);
    reloj = new Date('2026-10-20T12:00:00Z'); // pasó esa semana y no se sumó a la siguiente
    expect((await ana.pedir('GET', `/api/planes/${p.id}/mensajes`)).statusCode).toBe(403);
  });

  it('en los planes semanales, cada mensaje se borra a sus 30 días', async () => {
    const juan = await persona('Juan');
    const p = await crearPlan(juan, 'Huerta de los sábados', { repite: 'semanal' });
    await juan.pedir('POST', `/api/planes/${p.id}/mensajes`, { texto: 'Traigo semillas' });
    await borrarConversacionesViejas(db, new Date(hoy.getTime() + 10 * 864e5));
    expect(await db.query('select 1 from plan_mensajes')).toHaveLength(1);
    await borrarConversacionesViejas(db, new Date(hoy.getTime() + 31 * 864e5));
    expect(await db.query('select 1 from plan_mensajes')).toEqual([]);
  });
});

describe('Test de cuidado', () => {
  it('«Solo quería verlo» al repetirlo no borra el resultado guardado antes', async () => {
    const rosa = await persona('Rosa');
    await rosa.pedir('POST', '/api/cuidado', { respuestas: ['A', 'A', 'A', 'A', 'A', 'A'], guardar: true });
    expect(await rosa.json('POST', '/api/cuidado', { respuestas: ['C', 'C', 'C', 'C', 'C', 'C'], guardar: false })).toEqual({ letras: ['C'], guardado: false });
    expect((await rosa.json('GET', '/api/cuidado')).letras).toEqual(['A']);
  });
});

describe('Mensajes: revisión antes de enviar y reportar uno concreto (decisión de Mateo)', () => {
  it('lo grave no se envía; lo riesgoso se avisa y se puede confirmar', async () => {
    const juan = await persona('Juan');
    const p = await crearPlan(juan, 'Tinto');
    const bloqueado = await juan.pedir('POST', `/api/planes/${p.id}/mensajes`, { texto: 'Te voy a matar' });
    expect(bloqueado.statusCode).toBe(422);
    const aviso = await juan.pedir('POST', `/api/planes/${p.id}/mensajes`, { texto: 'Mi Nequi es 300 555 0101' });
    expect(aviso.statusCode).toBe(409);
    expect(aviso.json()).toMatchObject({ aviso: true });
    expect(await db.query('select 1 from plan_mensajes')).toEqual([]);
    expect((await juan.pedir('POST', `/api/planes/${p.id}/mensajes`, { texto: 'Mi Nequi es 300 555 0101', confirmado: true })).statusCode).toBe(200);
  });

  it('al reportar un mensaje, el equipo ve el texto real; no se puede reportar uno de una conversación ajena', async () => {
    const juan = await persona('Juan'), ana = await persona('Ana'), luis = await persona('Luis');
    const p = await crearPlan(juan, 'Caminata');
    await ana.pedir('POST', `/api/planes/${p.id}/ir`);
    await juan.pedir('POST', `/api/planes/${p.id}/mensajes`, { texto: 'No seas idiota, llega puntual', confirmado: true });
    const [m] = await ana.json('GET', `/api/planes/${p.id}/mensajes`);
    expect(m.autorRef).toEqual(expect.any(String));
    expect((await ana.pedir('POST', '/api/personas/reportar', { ref: m.autorRef, motivo: 'trato', mensaje: { tipo: 'plan', id: m.id } })).statusCode).toBe(200);
    const [r] = await db.query<{ mensaje: string }>('select mensaje from reportes');
    expect(r.mensaje).toBe('No seas idiota, llega puntual');
    // Luis no está en ese plan: aunque conozca el autor por el plan público, no puede reportar ese mensaje.
    const ref = (await luis.json('GET', '/api/planes'))[0].autorRef;
    expect((await luis.pedir('POST', '/api/personas/reportar', { ref, motivo: 'trato', mensaje: { tipo: 'plan', id: m.id } })).statusCode).toBe(404);
  });
});

// Segunda revisión de Codex (commits 8a17e4f y fa139ed).
const idDe = async (nombre: string) => (await db.query<{ id: string }>('select id from cuentas where destino = $1', [`${nombre.toLowerCase()}@ejemplo.co`]))[0].id;
async function seVieron(a: Quien, b: string, c: string) {
  const p = await crearPlan(a, `Encuentro ${b} ${c}`);
  for (const [x, y] of [[b, c], [c, b]]) await db.query('insert into nos_vimos (de, a, plan_id, ocurrencia, si) values ($1, $2, $3, $4, true)', [await idDe(x), await idDe(y), p.id, p.cuando]);
}

describe('Segunda revisión de Codex', () => {
  it('sin fecha de nacimiento tampoco se guarda la comunidad (regla 8)', async () => {
    const teo = await persona('Teo', { adulta: false });
    expect((await teo.pedir('POST', '/api/perfil/comunidad', { ciudad: '05001' })).statusCode).toBe(401);
    expect(await db.query('select 1 from lugares')).toEqual([]);
  });

  it('si el proveedor falla, «Iniciar sesión» responde igual exista o no la cuenta', async () => {
    await persona('Rosa', { adulta: false });
    fallar = true;
    const existe = await pedirSin('/api/acceso', { canal: 'correo', destino: 'rosa@ejemplo.co' });
    const noExiste = await pedirSin('/api/acceso', { canal: 'correo', destino: 'nadie@ejemplo.co' });
    expect(existe.statusCode).toBe(200);
    expect(noExiste.statusCode).toBe(existe.statusCode);
  });

  it('un bloqueo después de aprobar la invitación impide entrar al Moai', async () => {
    const ana = await persona('Ana'); await persona('Beto'); const caro = await persona('Caro');
    const [a, b, c] = [await idDe('Ana'), await idDe('Beto'), await idDe('Caro')];
    const [m] = await db.query<{ id: string }>(`insert into moais (nombre) values ('Los del parque') returning id`);
    await db.query('insert into moai_miembros (moai_id, cuenta_id) values ($1, $2), ($1, $3)', [m.id, a, b]);
    const [inv] = await db.query<{ id: string }>('insert into moai_invitaciones (moai_id, de, a) values ($1, $2, $3) returning id', [m.id, a, c]);
    await db.query('insert into moai_votos (invitacion_id, cuenta_id, acepta) values ($1, $2, true), ($1, $3, true)', [inv.id, a, b]);
    await db.query('insert into bloqueos (de, a) values ($1, $2)', [b, c]); // Beto bloquea a Caro antes de que acepte
    expect((await caro.pedir('POST', `/api/invitaciones/${inv.id}`, { acepta: true })).statusCode).toBe(404);
    expect(await db.query('select 1 from moai_miembros where cuenta_id = $1', [c])).toEqual([]);
    void ana;
  });

  it('un doble toque en «Sí, me sumo» crea un solo Moai', async () => {
    await persona('Ana'); const beto = await persona('Beto');
    const [inv] = await db.query<{ id: string }>(`insert into moai_invitaciones (de, a, nombre) values ($1, $2, 'Tinto') returning id`, [await idDe('Ana'), await idDe('Beto')]);
    await Promise.all([1, 2, 3].map(() => beto.pedir('POST', `/api/invitaciones/${inv.id}`, { acepta: true })));
    expect(await db.query('select 1 from moais')).toHaveLength(1);
  });

  it('quien ya no va a la ocurrencia vigente no puede copiar mensajes al reporte', async () => {
    const juan = await persona('Juan'), ana = await persona('Ana');
    const p = await crearPlan(juan, 'Caminata de los viernes', { repite: 'semanal' });
    await ana.pedir('POST', `/api/planes/${p.id}/ir`);
    const ref = (await ana.json('GET', '/api/planes')).find((x: { id: string }) => x.id === p.id).autorRef;
    reloj = new Date('2026-10-20T12:00:00Z'); // ya no va a la semana siguiente
    await juan.pedir('POST', `/api/planes/${p.id}/mensajes`, { texto: 'La próxima vamos al cerro', confirmado: true });
    const [{ id }] = await db.query<{ id: string }>('select id::text from plan_mensajes');
    expect((await ana.pedir('POST', '/api/personas/reportar', { ref, motivo: 'trato', mensaje: { tipo: 'plan', id } })).statusCode).toBe(404);
  });

  it('a quién le contaste tu invierno no queda legible en la base', async () => {
    const ana = await persona('Ana'), beto = await persona('Beto');
    await seVieron(ana, 'Ana', 'Beto');
    await ana.pedir('POST', '/api/estado/invierno', { activo: true });
    const ref = (await ana.json('GET', '/api/gente')).conocidos[0].ref;
    expect((await ana.json('POST', '/api/estado/invierno/contar', { refs: [ref] })).contadoA).toEqual(['Beto']);
    const filas = JSON.stringify(await db.query('select * from inviernos_contados'));
    for (const id of [await idDe('Ana'), await idDe('Beto')]) expect(filas).not.toContain(id);
    expect((await beto.json('GET', '/api/brisa')).some((c: { texto: string }) => /invierno/.test(c.texto))).toBe(true);
    await ana.pedir('POST', '/api/estado/invierno', { activo: false });
    expect(await db.query('select 1 from inviernos_contados')).toEqual([]);
  });
});
