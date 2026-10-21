// Prueba la conversación de Brisa con Gemini sin pasar por la app. No imprime la clave.
// Uso: BRISA_GEMINI_CONVERSA=true npx tsx --env-file=.env scripts/probar-conversa.ts
import { geminiDesdeEntorno } from '../server/gemini';
import type { TurnoBrisa } from '../server/lenguaje-brisa';

const proveedor = geminiDesdeEntorno(process.env, async (url, o) => {
  const t0 = Date.now();
  const r = await fetch(url, o).catch(e => { console.log('  red:', (e as Error).name, Date.now() - t0, 'ms'); throw e; });
  const c = await r.clone().json().catch(() => null) as { error?: { code?: number; status?: string; message?: string }; candidates?: { finishReason?: string }[]; usageMetadata?: unknown } | null;
  console.log('  HTTP', r.status, c?.error ? (c.error.status + ' ' + (c.error.message ?? '').slice(0, 160)) : 'fin: ' + c?.candidates?.[0]?.finishReason, Date.now() - t0, 'ms', JSON.stringify(c?.usageMetadata ?? ''));
  return r;
});
if (!proveedor?.conversar) { console.log('La conversación está apagada (BRISA_GEMINI_BETA y BRISA_GEMINI_CONVERSA deben ser true).'); process.exit(0); }
const casos: [string | null, TurnoBrisa[]][] = [
  ['¿Qué haces normalmente un domingo en la tarde?', [{ de: 'brisa', texto: '¿Qué haces normalmente un domingo en la tarde?' }, { de: 'yo', texto: 'Voy a misa y después almuerzo con mis nietos, que vienen de Envigado' }]],
  [null, [{ de: 'yo', texto: 'hoy llovió todo el día y no pude salir a caminar' }]],
  [null, [{ de: 'yo', texto: '¿tú eres una persona de verdad?' }]],
  [null, [{ de: 'yo', texto: 'me gustaría conocer gente que le guste el ajedrez' }]],
];
for (const [pregunta, turnos] of casos) {
  const t0 = Date.now();
  try {
    const r = await proveedor.conversar(turnos, pregunta) as { respuesta: string };
    console.log(`\n«${turnos.at(-1)!.texto}»\n→ ${r.respuesta}  (${Date.now() - t0} ms)`);
  } catch { console.log(`\n«${turnos.at(-1)!.texto}»\n→ falló (${Date.now() - t0} ms)`); }
}
