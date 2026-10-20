// @vitest-environment node
import { beforeAll, afterAll, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import { geminiDesdeEntorno, type TransporteModelo } from './gemini';
import { VERSION_LENGUAJE } from '../src/lib/lenguaje-brisa';
import { LIMITE_CUENTA_MODELO, LIMITE_GLOBAL_MODELO } from './brisa-modelo';
import { borrarConversacionesViejas } from './mantenimiento';

const frase = 'Tengo libre el sábado y quisiera estirar las piernas con alguien';
const salida = { estado: 'buscar', tipos: ['caminar'], dias: [6], periodo: 'libre', recurrente: false, gratis: null, fragmentos: ['sábado', 'estirar las piernas'] };
const respuesta = () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(salida) }] } }] }));
let db: Db, app: Awaited<ReturnType<typeof crearApp>>, transporte: ReturnType<typeof vi.fn<TransporteModelo>>;
let codigos: Record<string, string>;
let reloj: Date;
const correo = { tipo: 'propio' as const, async enviar(d: string, c: string) { codigos[d] = c; } };
beforeAll(async () => { db = await abrirDb(); }, 60_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.query('truncate cuentas, verificaciones restart identity cascade'); codigos = {}; reloj = new Date('2026-10-20T15:00:00Z');
  transporte = vi.fn<TransporteModelo>(async () => respuesta());
  const modeloBrisa = geminiDesdeEntorno({ BRISA_GEMINI_BETA: 'true', GEMINI_API_KEY: 'secreto-ficticio', GEMINI_MODEL: 'gemini-prueba' }, transporte);
  app = await crearApp({ db, vias: { correo }, secreto: 'prueba', ahora: () => reloj, modeloBrisa });
});
afterEach(async () => { await app.close(); });
async function persona(nombre: string) {
  const destino = `${nombre.toLowerCase()}@ejemplo.co`;
  await app.inject({ method: 'POST', url: '/api/registro', payload: { nombre, canal: 'correo', destino, aceptaDatos: true, aceptaTerminos: true } });
  const r = await app.inject({ method: 'POST', url: '/api/verificar', payload: { canal: 'correo', destino, codigo: codigos[destino] } });
  const cookie = `${COOKIE_SESION}=${r.cookies.find(c => c.name === COOKIE_SESION)!.value}`;
  const pedir = (method: 'GET' | 'POST', url: string, payload?: object) => app.inject({ method, url, payload, headers: { cookie } });
  await pedir('POST', '/api/perfil/nacimiento', { fechaNacimiento: '1960-05-02' });
  const [{ id }] = await db.query<{ id: string }>('select id from cuentas where destino = $1', [destino]);
  return { id, pedir, interpretar: (extra = {}) => pedir('POST', '/api/brisa/interpretar', { frase, autorizo: VERSION_LENGUAJE, datosFicticios: true, ...extra }) };
}
it('exige sesión adulta y autorización vigente por frase ficticia; no llama ni consume cuota sin permiso', async () => {
  const rosa = await persona('Rosa');
  expect((await app.inject({ method: 'GET', url: '/api/brisa/modelo' })).statusCode).toBe(401);
  expect((await app.inject({ method: 'POST', url: '/api/brisa/interpretar', payload: {} })).statusCode).toBe(401);
  for (const extra of [{ autorizo: false }, { autorizo: 'anterior' }, { datosFicticios: false }, { frase: '' }, { frase: 23 }, { frase: 'x'.repeat(301) }]) expect((await rosa.interpretar(extra)).statusCode).toBe(400);
  for (const f of ['Mi correo es rosa@ejemplo.co y quiero caminar', 'Me siento triste y quiero caminar', 'No quiero vivir', 'Mi teléfono es 3111234567']) expect((await rosa.interpretar({ frase: f })).statusCode).toBe(422);
  expect(transporte).not.toHaveBeenCalled();
  expect(await db.query('select * from brisa_interpretaciones')).toEqual([]);
  await db.query('update cuentas set fecha_nacimiento = null where id = $1', [rosa.id]);
  expect((await rosa.interpretar()).statusCode).toBe(401);
});
it('interpreta sin enviar memoria, perfil o historial, y sin buscar planes ni ejecutar acciones; exporta solo metadatos propios', async () => {
  const rosa = await persona('Rosa'), luis = await persona('Luis');
  await rosa.pedir('POST', '/api/brisa/historial', { mensajes: [{ de: 'yo', texto: 'Detalle íntimo que no debe salir' }] });
  await rosa.pedir('POST', '/api/perfil-publico', { frase: 'Dato privado del perfil', gustos: [], comparte: '', aprender: '', visible: false });
  const r = await rosa.interpretar();
  expect(r.statusCode).toBe(200); expect(r.json()).toEqual({ consulta: 'caminar el sábado', proveedor: 'Gemini', soloPruebas: true });
  const cuerpo = JSON.parse(transporte.mock.calls[0][1].body as string);
  expect(cuerpo.contents).toEqual([{ role: 'user', parts: [{ text: frase }] }]);
  expect(JSON.stringify(cuerpo)).not.toMatch(/Detalle íntimo|Dato privado|Rosa|secreto-ficticio/);
  const filas = await db.query('select * from brisa_interpretaciones');
  expect(filas).toHaveLength(1); expect(JSON.stringify(filas)).not.toContain(frase); expect(JSON.stringify(filas)).not.toContain('caminar');
  for (const tabla of ['asistencias', 'brisa_propuestas', 'brisa_memoria']) expect(await db.query(`select * from ${tabla}`)).toEqual([]);
  expect((await rosa.pedir('GET', '/api/cuenta/datos')).json().autorizacionesGeminiBeta).toEqual([expect.objectContaining({ proveedor: 'Gemini', version: VERSION_LENGUAJE, resultado: 'correcto' })]);
  expect((await luis.pedir('GET', '/api/cuenta/datos')).json().autorizacionesGeminiBeta).toEqual([]);
  await rosa.pedir('POST', '/api/cuenta/borrar', { confirmo: true });
  expect(await db.query('select * from brisa_interpretaciones where cuenta_id = $1', [rosa.id])).toEqual([]);
});
it('reserva cuotas incluso ante fallos, rechaza otra interpretación simultánea y limita el gasto por cuenta', async () => {
  const rosa = await persona('Rosa'); let resolver!: (r: Response) => void;
  transporte.mockImplementationOnce(() => new Promise(r => { resolver = r; }));
  const pendiente = rosa.interpretar();
  await vi.waitFor(() => expect(transporte).toHaveBeenCalledTimes(1));
  expect((await rosa.interpretar()).statusCode).toBe(429);
  resolver(respuesta()); expect((await pendiente).statusCode).toBe(200);
  transporte.mockImplementation(async () => { throw new Error('No mostrar secreto-ficticio'); });
  for (let i = 1; i < LIMITE_CUENTA_MODELO; i++) { const r = await rosa.interpretar(); expect(r.statusCode).toBe(503); expect(r.body).not.toContain('secreto-ficticio'); }
  expect((await rosa.interpretar()).statusCode).toBe(429);
  expect(transporte).toHaveBeenCalledTimes(LIMITE_CUENTA_MODELO);
});
it('aplica un límite global compartido y elimina metadatos vencidos a los 90 días', async () => {
  const rosa = await persona('Rosa'), luis = await persona('Luis');
  await db.query(`insert into brisa_interpretaciones (cuenta_id, modelo, version, creado_en, terminado_en, resultado)
    select $1, 'gemini-prueba', $2, $3::timestamptz, $3::timestamptz, 'correcto' from generate_series(1, $4::int)`, [rosa.id, VERSION_LENGUAJE, reloj, LIMITE_GLOBAL_MODELO]);
  expect((await luis.interpretar()).statusCode).toBe(429); expect(transporte).not.toHaveBeenCalled();
  await borrarConversacionesViejas(db, new Date(reloj.getTime() + 91 * 864e5));
  expect(await db.query('select * from brisa_interpretaciones')).toEqual([]);
});
it('revalida la sesión tras esperar al proveedor y rechaza una salida que invente campos o evidencia', async () => {
  const rosa = await persona('Rosa'); let resolver!: (r: Response) => void;
  transporte.mockImplementationOnce(() => new Promise(r => { resolver = r; }));
  const pendiente = rosa.interpretar(); await vi.waitFor(() => expect(transporte).toHaveBeenCalledTimes(1));
  await db.query('delete from sesiones where cuenta_id = $1', [rosa.id]); resolver(respuesta());
  expect((await pendiente).statusCode).toBe(401);
  const luis = await persona('Luis');
  transporte.mockImplementation(async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ ...salida, planId: 'inventado' }) }] } }] })));
  expect((await luis.interpretar()).statusCode).toBe(422);
  expect(await db.query('select * from asistencias')).toEqual([]);
});
it('con Gemini apagado no llama al proveedor ni afecta la búsqueda anterior', async () => {
  await app.close(); app = await crearApp({ db, vias: { correo }, secreto: 'prueba' });
  const rosa = await persona('Rosa');
  expect((await rosa.pedir('GET', '/api/brisa/modelo')).json()).toMatchObject({ disponible: false, proveedor: 'Gemini', soloPruebas: true });
  expect((await rosa.interpretar()).statusCode).toBe(503); expect(transporte).not.toHaveBeenCalled();
});
