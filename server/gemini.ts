// Transporte exclusivo del servidor. Credenciales fuera de URL y del frontend. Sin SDK ni reintentos automáticos.
import { esquemaConversa, esquemaExtraccion, instruccionesConversa, instruccionesLenguaje, type ProveedorBrisa, type TurnoBrisa } from './lenguaje-brisa.js';

export type TransporteModelo = (url: string, opciones: RequestInit) => Promise<Response>;
const MAX_RESPUESTA = 32_768;
export class ConfiguracionGeminiIncompleta extends Error {
  constructor(readonly variables: ('GEMINI_API_KEY' | 'GEMINI_MODEL')[]) {
    super('La beta de Gemini requiere GEMINI_API_KEY y un GEMINI_MODEL válido en el servidor.');
  }
}
export class FalloGemini extends Error {
  constructor(readonly motivo: 'http' | 'tiempo_agotado' | 'transporte' | 'respuesta_invalida' | 'respuesta_grande' | 'limite_salida' | 'salida_incompleta' = 'respuesta_invalida', readonly estadoHttp?: number) {
    super('Gemini no pudo interpretar la frase. Puedes reintentar o buscar directamente con las reglas de MOAI.');
  }
}
async function leerLimitado(r: Response) {
  if (!r.body) throw new FalloGemini();
  const reader = r.body.getReader(); const partes: Uint8Array[] = []; let total = 0;
  try {
    for (;;) {
      const p = await reader.read(); if (p.done) break;
      total += p.value.length;
      if (total > MAX_RESPUESTA) { await reader.cancel(); throw new FalloGemini('respuesta_grande'); }
      partes.push(p.value);
    }
    return JSON.parse(Buffer.concat(partes).toString('utf8')) as Record<string, unknown>;
  } finally { reader.releaseLock(); }
}
const pensarPoco = (modelo: string) => /^gemini-[12]\./.test(modelo) ? { thinkingBudget: 0 } : { thinkingLevel: 'low' };
export function geminiDesdeEntorno(env: Record<string, string | undefined>, transporte: TransporteModelo = fetch): ProveedorBrisa | null {
  if (env.BRISA_GEMINI_BETA !== 'true') return null;
  const clave = env.GEMINI_API_KEY?.trim(), modelo = env.GEMINI_MODEL?.trim();
  if (!clave || !modelo || !/^gemini-[a-zA-Z0-9._-]{1,70}$/.test(modelo)) {
    const variables: ('GEMINI_API_KEY' | 'GEMINI_MODEL')[] = [];
    if (!clave) variables.push('GEMINI_API_KEY');
    if (!modelo || !/^gemini-[a-zA-Z0-9._-]{1,70}$/.test(modelo)) variables.push('GEMINI_MODEL');
    throw new ConfiguracionGeminiIncompleta(variables);
  }
  const llamar = async (sistema: string, contents: unknown[], esquema: unknown, maxOutputTokens: number, temperature: number) => {
    try {
      const respuesta = await transporte(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sistema }] }, contents,
          // Pensar lo menos posible: si no, el razonamiento consume los tokens de salida y corta la respuesta (MAX_TOKENS),
          // visto en la primera prueba real (20 de octubre). La familia 2.x usa un presupuesto; las siguientes, un nivel.
          generationConfig: { candidateCount: 1, maxOutputTokens, temperature, responseMimeType: 'application/json', responseJsonSchema: esquema, thinkingConfig: pensarPoco(modelo) },
        }),
      });
      if (!respuesta.ok) { await respuesta.body?.cancel(); throw new FalloGemini('http', respuesta.status); }
      const cuerpo = await leerLimitado(respuesta);
      const candidatos = cuerpo.candidates as { finishReason?: string; content?: { parts?: { text?: unknown; thought?: boolean; functionCall?: unknown }[] } }[] | undefined;
      if (Array.isArray(candidatos) && candidatos[0]?.finishReason === 'MAX_TOKENS') throw new FalloGemini('limite_salida');
      if (!Array.isArray(candidatos) || candidatos.length !== 1 || candidatos[0]?.finishReason !== 'STOP') throw new FalloGemini('salida_incompleta');
      const partes = candidatos[0]?.content?.parts;
      if (!Array.isArray(partes) || !partes.length || partes.some(p => !p || typeof p.text !== 'string' || Object.hasOwn(p, 'functionCall'))) throw new FalloGemini();
      return JSON.parse(partes.filter(p => p.thought !== true).map(p => p.text).join('')) as unknown;
    } catch (error) {
      if (error instanceof FalloGemini) throw error;
      if (error instanceof SyntaxError) throw new FalloGemini('respuesta_invalida');
      if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) throw new FalloGemini('tiempo_agotado');
      throw new FalloGemini('transporte');
    } // Solo categorías propias y estado HTTP; nunca contenido de errores, claves ni texto enviado.
  };
  const conversar = env.BRISA_GEMINI_CONVERSA === 'true'
    ? (turnos: TurnoBrisa[], pregunta: string | null) => llamar(
      instruccionesConversa + (pregunta ? `\nPregunta que Brisa acababa de hacer: «${pregunta}»` : ''),
      turnos.map(t => ({ role: t.de === 'yo' ? 'user' : 'model', parts: [{ text: t.texto }] })), esquemaConversa, 400, .7)
    : undefined;
  return {
    nombre: 'Gemini', modelo, conversar,
    interpretar: frase => llamar(instruccionesLenguaje, [{ role: 'user', parts: [{ text: frase }] }], esquemaExtraccion, 600, 0),
  };
}
