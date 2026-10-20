// Diagnóstico de la beta de Gemini: muestra el modelo, el estado HTTP y por qué terminó la respuesta.
// Nunca imprime la clave ni el texto de la respuesta. Uso: npx tsx --env-file=.env scripts/diagnostico-gemini.ts
import { geminiDesdeEntorno } from '../server/gemini';

const frase = process.argv[2] ?? 'Tengo libre el sábado y quisiera estirar las piernas con alguien';
console.log('modelo:', process.env.GEMINI_MODEL, '· beta:', process.env.BRISA_GEMINI_BETA, '· clave presente:', !!process.env.GEMINI_API_KEY);
const proveedor = geminiDesdeEntorno(process.env, async (url, opciones) => {
  const r = await fetch(url, opciones).catch(e => { console.log('fallo de red:', (e as Error).name, (e as Error).message.slice(0, 80)); throw e; });
  const copia = r.clone();
  try {
    const cuerpo = await copia.json() as { candidates?: { finishReason?: string }[]; usageMetadata?: Record<string, number>; error?: { status?: string; code?: number; message?: string } };
    if (cuerpo.error?.message) console.log('mensaje de Google:', cuerpo.error.message.slice(0, 200));
    console.log('estado HTTP:', r.status, '· finishReason:', cuerpo.candidates?.[0]?.finishReason ?? '—', '· error:', cuerpo.error ? `${cuerpo.error.code} ${cuerpo.error.status}` : '—');
    if (cuerpo.usageMetadata) console.log('tokens:', JSON.stringify(cuerpo.usageMetadata));
  } catch { console.log('estado HTTP:', r.status, '(cuerpo no JSON)'); }
  return r;
});
if (!proveedor) { console.log('La beta está apagada (BRISA_GEMINI_BETA no es true).'); process.exit(0); }
try { await proveedor.interpretar(frase); console.log('resultado: interpretó la frase'); }
catch { console.log('resultado: falló (ver arriba)'); }
