// @vitest-environment node
import { beforeAll, afterAll, beforeEach, afterEach, it, expect } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import { VERSION_MEMORIA } from '../src/lib/brisa-intenciones';
import { borrarBrisaVencido } from './brisa-intenciones';
import { crearCifrador } from './cifrado';

let db: Db, app: Awaited<ReturnType<typeof crearApp>>;
let reloj: Date;
let codigos: Record<string, string>;
const preferencia = { tipos: ['caminar'], dias: [6], soloGratis: true, anticipar: false, duracion: 30, autorizo: true, version: VERSION_MEMORIA };
const sabado = '2026-10-24T15:00:00.000Z';
beforeAll(async () => { db = await abrirDb(); }, 60_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  reloj = new Date('2026-10-20T15:00:00Z'); codigos = {};
  await db.query('truncate cuentas, verificaciones restart identity cascade');
  app = await crearApp({ db, secreto: 'prueba', ahora: () => reloj, vias: { correo: { tipo: 'propio', async enviar(d, c) { codigos[d] = c; } } } });
});
afterEach(async () => { await app.close(); });
async function persona(nombre: string, ciudad = '05001') {
  const destino = `${nombre.toLowerCase()}@ejemplo.co`;
  await app.inject({ method: 'POST', url: '/api/registro', payload: { nombre, canal: 'correo', destino, aceptaDatos: true, aceptaTerminos: true } });
  const r = await app.inject({ method: 'POST', url: '/api/verificar', payload: { canal: 'correo', destino, codigo: codigos[destino] } });
  const cookie = `${COOKIE_SESION}=${r.cookies.find(c => c.name === COOKIE_SESION)!.value}`;
  const pedir = (method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) => app.inject({ method, url, payload, headers: { cookie } });
  await pedir('POST', '/api/perfil/nacimiento', { fechaNacimiento: '1960-05-02' });
  const [lugar] = (await pedir('POST', '/api/lugares', { nombre: 'Casa', ciudad })).json();
  const [{ id }] = await db.query<{ id: string }>('select id from cuentas where destino = $1', [destino]);
  return { pedir, id, lugar, buscar: (texto = 'Busca caminar el sábado', extra = {}) => pedir('POST', '/api/brisa/buscar', { texto, lugarId: lugar.id, usarMemoria: false, anticipar: false, ...extra }) };
}
type P = Awaited<ReturnType<typeof persona>>;
async function plan(p: P, extra = {}) {
  const r = await p.pedir('POST', '/api/planes', { titulo: 'Caminar por el parque', cuando: sabado, lugarPublico: 'Parque del barrio', ciudad: p.lugar.ciudad, alcance: 'ciudad', tipo: 'caminar', costo: 'gratis', ...extra });
  expect(r.statusCode).toBe(200); return r.json().find((p: { titulo: string }) => p.titulo === ((extra as { titulo?: string }).titulo ?? 'Caminar por el parque'));
}

it('no recuerda sin consentimiento; valida versión y tipos, cifra, aísla, exporta y permite borrar', async () => {
  const rosa = await persona('Rosa'), luis = await persona('Luis');
  expect((await rosa.pedir('GET', '/api/brisa/memoria')).json()).toEqual({ memoria: null });
  for (const b of [{ ...preferencia, autorizo: false }, { ...preferencia, version: 'vieja' }, { ...preferencia, dias: [8] }, { ...preferencia, tipos: ['salud'] }, { ...preferencia, tipos: [] }])
    expect((await rosa.pedir('POST', '/api/brisa/memoria', b)).statusCode).toBe(400);
  expect(await db.query('select * from brisa_memoria')).toEqual([]);
  const guardada = (await rosa.pedir('POST', '/api/brisa/memoria', preferencia)).json().memoria;
  expect(guardada).toMatchObject({ anticipar: false, version: VERSION_MEMORIA, autorizadaEn: reloj.toISOString(), venceEn: '2026-11-19T15:00:00.000Z' });
  expect(JSON.stringify(await db.query('select datos from brisa_memoria'))).not.toContain('caminar');
  expect((await luis.pedir('GET', '/api/brisa/memoria')).json()).toEqual({ memoria: null });
  expect((await rosa.pedir('GET', '/api/cuenta/datos')).json().memoriaDeBrisa).toEqual(guardada);
  expect((await luis.pedir('GET', '/api/cuenta/datos')).json().memoriaDeBrisa).toBeNull();
  await db.query('update brisa_memoria set datos = $1 where cuenta_id = $2', [crearCifrador('prueba').cifrar(JSON.stringify({ ...guardada, version: 'anterior' })), rosa.id]);
  expect((await rosa.pedir('GET', '/api/brisa/memoria')).json().memoria.version).toBe('anterior'); // sigue pudiendo conocer y borrar sus datos
  expect((await rosa.buscar('', { usarMemoria: true })).statusCode).toBe(409);
  await rosa.pedir('DELETE', '/api/brisa/memoria');
  expect((await rosa.pedir('GET', '/api/brisa/memoria')).json().memoria).toBeNull();
  for (const url of ['/api/brisa/memoria', '/api/brisa/acciones']) expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401);
  expect((await app.inject({ method: 'POST', url: '/api/brisa/buscar', payload: {} })).statusCode).toBe(401);
});

it('consulta solo planes reales permitidos y no usa historial, fichas ni perfil para adivinar preferencias', async () => {
  const rosa = await persona('Rosa'), luis = await persona('Luis'), ana = await persona('Ana', '11001');
  const caminata = await plan(rosa);
  await plan(ana);
  await plan(rosa, { cuando: '2026-10-25T15:00:00Z', titulo: 'Domingo' });
  await plan(rosa, { costo: 'cada_quien', titulo: 'De pago' });
  await luis.pedir('POST', '/api/brisa/historial', { mensajes: [{ de: 'yo', texto: 'Me gusta caminar el sábado' }] });
  await luis.pedir('POST', '/api/perfil-publico', { frase: 'Camino los sábados', gustos: ['caminar'], comparte: '', aprender: '', visible: false });
  await db.query('insert into fichas_vinculo (cuenta_id, persona_clave, datos) values ($1, $2, $3)', [luis.id, 'prueba', crearCifrador('prueba').cifrar(JSON.stringify({ nota: 'Me gustaría caminar con esta persona' }))]);
  expect((await luis.buscar('')).statusCode).toBe(422);
  expect((await luis.buscar('Busco caminar en Bogotá')).statusCode).toBe(422);
  const r = await luis.buscar('Busca caminar el sábado gratis');
  expect(r.statusCode).toBe(200);
  expect(r.json().propuestas.map((p: any) => p.plan.id)).toEqual([caminata.id]);
  expect(r.json().propuestas[0].motivo).toMatch(/indicada en esta búsqueda/);
  expect(await db.query('select * from asistencias')).toEqual([]);
  expect(JSON.stringify(await db.query('select datos from brisa_propuestas'))).not.toContain('Caminar');
  await db.query('insert into bloqueos (de, a) values ($1, $2)', [rosa.id, luis.id]);
  expect((await luis.buscar()).json().propuestas).toEqual([]);
  expect((await ana.buscar()).json().propuestas.every((p: any) => p.plan.zona.includes('Bogotá'))).toBe(true);
});

it('anticipa solo con permiso vigente y nunca en invierno; la búsqueda explícita sigue accesible', async () => {
  const rosa = await persona('Rosa'), luis = await persona('Luis'); await plan(rosa);
  expect((await luis.buscar('', { usarMemoria: true, anticipar: true })).statusCode).toBe(409);
  await luis.pedir('POST', '/api/brisa/memoria', { ...preferencia, anticipar: true });
  expect((await luis.buscar('Busca un tinto', { usarMemoria: true, anticipar: true })).statusCode).toBe(400);
  const r = await luis.buscar('', { usarMemoria: true, anticipar: true });
  expect(r.statusCode).toBe(200); expect(r.json().propuestas).toHaveLength(1);
  expect(r.json().propuestas[0].motivo).toMatch(/memoria autorizada/);
  await luis.pedir('POST', '/api/estado/invierno', { activo: true });
  expect((await luis.buscar('', { usarMemoria: true, anticipar: true })).statusCode).toBe(409);
  expect((await luis.buscar()).statusCode).toBe(200);
  reloj = new Date('2026-11-20T15:00:00Z');
  expect((await luis.pedir('GET', '/api/brisa/memoria')).json().memoria).toBeNull();
  expect((await luis.buscar('', { usarMemoria: true, anticipar: true })).statusCode).toBe(409);
  await borrarBrisaVencido(db, reloj);
  expect(await db.query('select * from brisa_memoria')).toEqual([]);
});

it('confirmación propia, explícita e idempotente; no duplica ni vuelve a sumar tras salir', async () => {
  const rosa = await persona('Rosa'), luis = await persona('Luis'), ana = await persona('Ana');
  const p = await plan(rosa);
  const propuesta = (await luis.buscar()).json().propuestas[0];
  const url = `/api/brisa/propuestas/${propuesta.id}/confirmar`;
  expect((await ana.pedir('POST', url, { confirmo: true })).statusCode).toBe(404);
  expect((await luis.pedir('POST', url, {})).statusCode).toBe(400);
  expect((await luis.pedir('POST', url, { confirmo: 'true' })).statusCode).toBe(400);
  const respuestas = await Promise.all([luis.pedir('POST', url, { confirmo: true }), luis.pedir('POST', url, { confirmo: true })]);
  expect(respuestas.map(r => r.statusCode)).toEqual([200, 200]);
  expect(await db.query('select * from asistencias where cuenta_id = $1', [luis.id])).toHaveLength(1);
  expect((await luis.pedir('GET', '/api/brisa/acciones')).json()).toHaveLength(1);
  const [comprobante] = await db.query<{ datos: string }>('select datos from brisa_propuestas where cuenta_id = $1 and confirmada_en is not null', [luis.id]);
  const contenido = JSON.parse(crearCifrador('prueba').descifrar(comprobante.datos)!);
  expect(contenido).toMatchObject({ planId: p.id, cuando: sabado });
  expect(contenido.lugarId).toBeUndefined();
  expect(contenido.huella).toBeUndefined();
  expect(contenido.motivo).not.toContain('Medellín');
  expect((await ana.pedir('GET', '/api/brisa/acciones')).json()).toEqual([]);
  expect((await luis.pedir('GET', '/api/cuenta/datos')).json().accionesConfirmadasConBrisa).toHaveLength(1);
  await luis.pedir('POST', `/api/planes/${p.id}/no-ir`);
  expect((await luis.pedir('POST', url, { confirmo: true })).statusCode).toBe(200);
  expect(await db.query('select * from asistencias where cuenta_id = $1', [luis.id])).toHaveLength(0);
  reloj = new Date(reloj.getTime() + 91 * 864e5);
  await borrarBrisaVencido(db, reloj);
  expect(await db.query('select * from brisa_propuestas where cuenta_id = $1', [luis.id])).toEqual([]);
});

it('revalida ciudad, caducidad, cambios, cancelación y bloqueo antes de ejecutar', async () => {
  const rosa = await persona('Rosa'), luis = await persona('Luis'); const p = await plan(rosa);
  const propuesta = async () => (await luis.buscar()).json().propuestas[0];
  const confirmar = (id: string) => luis.pedir('POST', `/api/brisa/propuestas/${id}/confirmar`, { confirmo: true });
  let b = await propuesta();
  expect((await luis.pedir('GET', '/api/cuenta/datos')).json().propuestasPendientesDeBrisa).toHaveLength(1);
  const lugares = (await luis.pedir('POST', '/api/lugares', { nombre: 'Viaje', ciudad: '11001' })).json();
  await luis.pedir('POST', `/api/lugares/${lugares.find((l: any) => l.ciudad === '11001').id}/activar`);
  expect((await confirmar(b.id)).statusCode).toBe(409);
  await luis.pedir('POST', `/api/lugares/${luis.lugar.id}/activar`);
  b = await propuesta(); reloj = new Date(reloj.getTime() + 16 * 60e3);
  expect((await confirmar(b.id)).json().error).toMatch(/venció/);
  expect((await luis.pedir('GET', '/api/cuenta/datos')).json().propuestasPendientesDeBrisa).toEqual([]);
  b = await propuesta(); await db.query("update planes set lugar_publico = 'Otro parque' where id = $1", [p.id]);
  expect((await confirmar(b.id)).json().error).toMatch(/Cambió/);
  b = await propuesta(); await db.query('insert into bloqueos (de, a) values ($1, $2)', [rosa.id, luis.id]);
  expect((await confirmar(b.id)).statusCode).toBe(409);
  await db.query('delete from bloqueos');
  const [moai] = await db.query<{ id: string }>("insert into moais (nombre) values ('Paseos') returning id");
  await db.query('insert into moai_miembros (moai_id, cuenta_id) values ($1, $2), ($1, $3)', [moai.id, rosa.id, luis.id]);
  const privado = await plan(rosa, { moai: moai.id, titulo: 'Paseo del Moai' });
  const privada = (await luis.buscar()).json().propuestas.find((x: any) => x.plan.id === privado.id);
  expect(privada).toBeTruthy();
  await db.query('delete from moai_miembros where moai_id = $1 and cuenta_id = $2', [moai.id, luis.id]);
  expect((await confirmar(privada.id)).statusCode).toBe(409);
  b = await propuesta(); await rosa.pedir('POST', `/api/planes/${p.id}/cancelar`);
  expect((await confirmar(b.id)).statusCode).toBe(409);
  expect(await db.query('select * from asistencias')).toEqual([]);
});

it('comparte el candado del último cupo con el flujo normal y no sobrevende', async () => {
  const rosa = await persona('Rosa'), luis = await persona('Luis'), ana = await persona('Ana'), eva = await persona('Eva');
  const p = await plan(rosa, { cupo: 2 }); await eva.pedir('POST', `/api/planes/${p.id}/ir`);
  const b = (await luis.buscar()).json().propuestas[0];
  const r = await Promise.all([luis.pedir('POST', `/api/brisa/propuestas/${b.id}/confirmar`, { confirmo: true }), ana.pedir('POST', `/api/planes/${p.id}/ir`)]);
  expect(r.map(x => x.statusCode).sort()).toEqual([200, 409]);
  expect(await db.query('select * from asistencias where plan_id = $1', [p.id])).toHaveLength(2);
});

it('editar o revocar memoria anula propuestas y descartar evita repetir esa ocurrencia; borrado en cascada', async () => {
  const rosa = await persona('Rosa'), luis = await persona('Luis'); await plan(rosa);
  await luis.pedir('POST', '/api/brisa/memoria', preferencia);
  let b = (await luis.buscar()).json().propuestas[0];
  await luis.pedir('POST', '/api/brisa/memoria', { ...preferencia, dias: [] });
  expect((await luis.pedir('POST', `/api/brisa/propuestas/${b.id}/confirmar`, { confirmo: true })).statusCode).toBe(404);
  b = (await luis.buscar()).json().propuestas[0];
  expect((await rosa.pedir('POST', `/api/brisa/propuestas/${b.id}/descartar`)).statusCode).toBe(404);
  await luis.pedir('POST', `/api/brisa/propuestas/${b.id}/descartar`);
  expect((await luis.buscar()).json().propuestas).toEqual([]);
  await luis.pedir('DELETE', '/api/brisa/memoria');
  b = (await luis.buscar()).json().propuestas[0];
  expect(b).toBeTruthy();
  await luis.pedir('POST', '/api/brisa/memoria', preferencia);
  await luis.pedir('POST', '/api/cuenta/borrar', { confirmo: true });
  for (const tabla of ['brisa_memoria', 'brisa_propuestas', 'brisa_descartes']) expect(await db.query(`select * from ${tabla} where cuenta_id = $1`, [luis.id])).toEqual([]);
});
