// @vitest-environment node
import { beforeAll, afterAll, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { abrirDb, type Db } from './db';
import { crearApp, COOKIE_SESION } from './app';
import { geminiDesdeEntorno, type TransporteModelo } from './gemini';
import { LIMITE_CUENTA_CONVERSA, VERSION_CONVERSA } from './brisa-conversa';

const respuesta = (texto = 'Qué bonito almorzar con los nietos. ¿Qué cocinan juntos?') =>
  new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ respuesta: texto }) }] } }] }));
let db: Db, app: Awaited<ReturnType<typeof crearApp>>, transporte: ReturnType<typeof vi.fn<TransporteModelo>>;
let codigos: Record<string, string>;
const correo = { tipo: 'propio' as const, async enviar(d: string, c: string) { codigos[d] = c; } };
const entorno = { BRISA_GEMINI_BETA: 'true', BRISA_GEMINI_CONVERSA: 'true', GEMINI_API_KEY: 'secreto-ficticio', GEMINI_MODEL: 'gemini-prueba' };
beforeAll(async () => { db = await abrirDb(); }, 60_000);
afterAll(async () => { await db.close(); });
async function iniciar(env: Record<string, string> = entorno) {
  transporte = vi.fn<TransporteModelo>(async () => respuesta());
  app = await crearApp({ db, vias: { correo }, secreto: 'prueba', ahora: () => new Date('2026-10-20T15:00:00Z'), modeloBrisa: geminiDesdeEntorno(env, transporte) });
}
beforeEach(async () => { await db.query('truncate cuentas, verificaciones restart identity cascade'); codigos = {}; await iniciar(); });
afterEach(async () => { await app.close(); });
async function persona(nombre: string) {
  const destino = `${nombre.toLowerCase()}@ejemplo.co`;
  await app.inject({ method: 'POST', url: '/api/registro', payload: { nombre, canal: 'correo', destino, aceptaDatos: true, aceptaTerminos: true } });
  const r = await app.inject({ method: 'POST', url: '/api/verificar', payload: { canal: 'correo', destino, codigo: codigos[destino] } });
  const cookie = `${COOKIE_SESION}=${r.cookies.find(c => c.name === COOKIE_SESION)!.value}`;
  const pedir = (method: 'GET' | 'POST', url: string, payload?: object) => app.inject({ method, url, payload, headers: { cookie } });
  await pedir('POST', '/api/perfil/nacimiento', { fechaNacimiento: '1960-05-02' });
  return { pedir, conversar: (turnos: object[], pregunta: string | null = null) => pedir('POST', '/api/brisa/conversar', { turnos, pregunta }) };
}
const domingo = '¿Qué haces normalmente un domingo en la tarde?';

it('responde con el modelo usando solo los turnos y la pregunta; nada de nombre, perfil ni historial guardado', async () => {
  const rosa = await persona('Rosa');
  await rosa.pedir('POST', '/api/perfil-publico', { frase: 'Dato privado del perfil', gustos: [], comparte: '', aprender: '', visible: false });
  expect((await rosa.pedir('GET', '/api/brisa/modelo')).json()).toMatchObject({ disponible: true, conversa: true });
  const r = await rosa.conversar([{ de: 'brisa', texto: domingo }, { de: 'yo', texto: 'Almuerzo con mis nietos' }], domingo);
  expect(r.statusCode).toBe(200);
  expect(r.json()).toEqual({ respuesta: 'Qué bonito almorzar con los nietos. ¿Qué cocinan juntos?' });
  const cuerpo = JSON.parse(transporte.mock.calls[0][1].body as string);
  expect(cuerpo.contents).toEqual([{ role: 'model', parts: [{ text: domingo }] }, { role: 'user', parts: [{ text: 'Almuerzo con mis nietos' }] }]);
  expect(cuerpo.systemInstruction.parts[0].text).toContain(`Pregunta que Brisa acababa de hacer: «${domingo}»`);
  expect(JSON.stringify(cuerpo)).not.toMatch(/Rosa|Dato privado|rosa@ejemplo|secreto-ficticio/);
  const filas = await db.query<{ version: string }>('select version from brisa_interpretaciones');
  expect(filas).toEqual([{ version: VERSION_CONVERSA }]);
});

it('el riesgo se atiende sin el modelo, y una respuesta rota o el modelo caído devuelven error para usar el guion', async () => {
  const rosa = await persona('Rosa');
  const riesgo = await rosa.conversar([{ de: 'yo', texto: 'ya no aguanto más' }]);
  expect(riesgo.json()).toMatchObject({ local: true, respuesta: expect.stringContaining('123') });
  expect(transporte).not.toHaveBeenCalled();
  transporte.mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 503 } }), { status: 503 }));
  expect((await rosa.conversar([{ de: 'yo', texto: 'hola' }])).statusCode).toBe(503);
  transporte.mockResolvedValueOnce(respuesta(''));
  expect((await rosa.conversar([{ de: 'yo', texto: 'hola' }])).statusCode).toBe(503);
  for (const malos of [[], [{ de: 'brisa', texto: 'solo Brisa' }], [{ de: 'otro', texto: 'x' }], [{ de: 'yo', texto: 'x'.repeat(601) }], Array.from({ length: 13 }, () => ({ de: 'yo', texto: 'hola' }))])
    expect((await rosa.conversar(malos)).statusCode).toBe(400);
});

it('tiene cuota diaria por cuenta, aparte de la interpretación de frases', async () => {
  const rosa = await persona('Rosa');
  const [{ id }] = await db.query<{ id: string }>("select id from cuentas where destino = 'rosa@ejemplo.co'");
  for (let i = 0; i < LIMITE_CUENTA_CONVERSA; i++) await db.query("insert into brisa_interpretaciones (cuenta_id, modelo, version, creado_en, resultado) values ($1, 'gemini-prueba', $2, '2026-10-20T14:00:00Z', 'correcto')", [id, VERSION_CONVERSA]);
  expect((await rosa.conversar([{ de: 'yo', texto: 'hola' }])).statusCode).toBe(429);
});

it('registra solo la categoría del fallo y el estado HTTP, sin la clave ni contenido privado', async () => {
  const rosa = await persona('Rosa');
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    transporte.mockResolvedValueOnce(new Response('secreto-ficticio, rosa@ejemplo.co y contenido privado', { status: 429 }));
    const r = await rosa.conversar([{ de: 'yo', texto: 'Un club imaginario para leer novelas' }]);
    expect(r.statusCode).toBe(503);
    expect(log).toHaveBeenCalledWith('Falló la conversación de pruebas con Gemini:', { motivo: 'http', estadoHttp: 429 });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/secreto-ficticio|rosa@ejemplo|contenido privado|leer novelas/);
    expect(r.body).not.toMatch(/secreto-ficticio|rosa@ejemplo|contenido privado/);
  } finally { log.mockRestore(); }
});

it('apagada por defecto: sin BRISA_GEMINI_CONVERSA no hay conversación con el modelo', async () => {
  await app.close();
  await iniciar({ ...entorno, BRISA_GEMINI_CONVERSA: 'false' });
  const rosa = await persona('Rosa');
  expect((await rosa.pedir('GET', '/api/brisa/modelo')).json()).toMatchObject({ disponible: true, conversa: false });
  expect((await rosa.conversar([{ de: 'yo', texto: 'hola' }])).statusCode).toBe(503);
  expect(transporte).not.toHaveBeenCalled();
});
