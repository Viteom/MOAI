// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { ConfiguracionGeminiIncompleta, FalloGemini, geminiDesdeEntorno, type TransporteModelo } from './gemini';
import { normalizarExtraccion } from './lenguaje-brisa';

const env = { BRISA_GEMINI_BETA: 'true', GEMINI_API_KEY: 'clave-solo-de-prueba', GEMINI_MODEL: 'gemini-prueba' };
export const extraccion = { estado: 'buscar', tipos: ['caminar'], dias: [6], periodo: 'libre', recurrente: false, gratis: null, fragmentos: ['estirar las piernas', 'sábado'] };
const frase = 'Tengo libre el sábado y quisiera estirar las piernas con alguien';
const respuesta = (dato: unknown, extra = {}) => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(dato) }] }, ...extra }] }));
it('se apaga por defecto; exige configuración explícita y no instala ni expone credenciales', () => {
  expect(geminiDesdeEntorno({})).toBeNull();
  expect(geminiDesdeEntorno({ ...env, BRISA_GEMINI_BETA: 'false' })).toBeNull();
  expect(() => geminiDesdeEntorno({ ...env, GEMINI_API_KEY: '' })).toThrow(/requiere/);
  expect(() => geminiDesdeEntorno({ ...env, GEMINI_MODEL: '../otro-host' })).toThrow(/válido/);
});
it('identifica la variable incorrecta sin incluir sus valores en el diagnóstico', () => {
  for (const [cambio, variables] of [
    [{ GEMINI_API_KEY: '' }, ['GEMINI_API_KEY']],
    [{ GEMINI_MODEL: 'valor-ficticio-invalido' }, ['GEMINI_MODEL']],
    [{ GEMINI_MODEL: '', GEMINI_API_KEY: '' }, ['GEMINI_API_KEY', 'GEMINI_MODEL']],
  ] as const) {
    try { geminiDesdeEntorno({ ...env, ...cambio }); throw new Error('Debía rechazar esta configuración.'); }
    catch (e) {
      expect(e).toBeInstanceOf(ConfiguracionGeminiIncompleta);
      expect((e as ConfiguracionGeminiIncompleta).variables).toEqual(variables);
      expect((e as Error).message).not.toContain('valor-ficticio-invalido');
      expect((e as Error).message).not.toContain(env.GEMINI_API_KEY);
    }
  }
});
it('cumple el contrato REST de Gemini; manda una frase y esquema, sin herramientas ni contexto personal', async () => {
  const transporte = vi.fn<TransporteModelo>(async () => respuesta(extraccion));
  const modelo = geminiDesdeEntorno(env, transporte)!;
  const datos = await modelo.interpretar(frase);
  expect(transporte).toHaveBeenCalledTimes(1);
  const [url, opciones] = transporte.mock.calls[0];
  expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-prueba:generateContent');
  expect(url).not.toContain(env.GEMINI_API_KEY);
  expect(opciones.headers).toMatchObject({ 'x-goog-api-key': env.GEMINI_API_KEY });
  expect(opciones.redirect).toBe('error'); expect(opciones.signal).toBeInstanceOf(AbortSignal);
  const cuerpo = JSON.parse(opciones.body as string);
  expect(Object.keys(cuerpo)).toEqual(['systemInstruction', 'contents', 'generationConfig']);
  expect(cuerpo.contents).toEqual([{ role: 'user', parts: [{ text: frase }] }]);
  expect(cuerpo.generationConfig).toMatchObject({ candidateCount: 1, responseMimeType: 'application/json', maxOutputTokens: 600 });
  expect(cuerpo.tools).toBeUndefined();
  expect(normalizarExtraccion(datos, frase)).toEqual({ ok: true, consulta: 'caminar el sábado' });
});
it('rechaza respuestas incompletas, JSON inválido, herramientas, exceso de tamaño y errores sin reflejar texto del proveedor', async () => {
  const casos = [
    new Response('clave-solo-de-prueba y contenido privado', { status: 429 }),
    new Response('no es JSON'), respuesta(extraccion, { finishReason: 'MAX_TOKENS' }),
    new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'sumar' } }] } }] })),
    new Response('x'.repeat(40_000)),
  ];
  for (const r of casos) {
    const transporte = vi.fn<TransporteModelo>(async () => r);
    await expect(geminiDesdeEntorno(env, transporte)!.interpretar(frase)).rejects.toThrow('Gemini no pudo interpretar');
    expect(transporte).toHaveBeenCalledTimes(1);
  }
  const fallo = vi.fn<TransporteModelo>(async () => { throw new Error('clave-solo-de-prueba'); });
  await expect(geminiDesdeEntorno(env, fallo)!.interpretar(frase)).rejects.not.toThrow('clave-solo-de-prueba');
});
it('solo acepta campos del dominio sustentados en la frase; no ejecuta ni devuelve instrucciones libres', () => {
  for (const dato of [
    { ...extraccion, planId: 'inventado' }, { ...extraccion, tipos: ['diagnostico'] },
    { ...extraccion, fragmentos: ['algo que no escribió'] }, { ...extraccion, dias: [8] },
    { ...extraccion, periodo: 'hoy' },
  ]) expect(normalizarExtraccion(dato, frase).ok).toBe(false);
  expect(normalizarExtraccion({ ...extraccion, dias: [] }, 'No quiero estirar las piernas').ok).toBe(false);
});

it('distingue rechazos HTTP, tiempo agotado y salidas incompletas sin conservar errores de Google', async () => {
  for (const estadoHttp of [400, 403, 404, 429, 503]) {
    const modelo = geminiDesdeEntorno(env, async () => new Response('secreto-ficticio y texto privado', { status: estadoHttp }))!;
    try { await modelo.interpretar(frase); throw new Error('Debía fallar.'); }
    catch (error) {
      expect(error).toBeInstanceOf(FalloGemini);
      expect(error).toMatchObject({ motivo: 'http', estadoHttp });
      expect(JSON.stringify(error)).not.toMatch(/secreto-ficticio|texto privado/);
    }
  }
  const lento = geminiDesdeEntorno(env, async () => { throw new DOMException('texto privado', 'TimeoutError'); })!;
  await expect(lento.interpretar(frase)).rejects.toMatchObject({ motivo: 'tiempo_agotado' });
  const cortado = geminiDesdeEntorno(env, async () => respuesta(extraccion, { finishReason: 'MAX_TOKENS' }))!;
  await expect(cortado.interpretar(frase)).rejects.toMatchObject({ motivo: 'limite_salida' });
});
