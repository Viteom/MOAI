// Memoria declarada, nunca extraída del historial ni de los vínculos privados.
import { nombreTipo, tipos, type Tipo } from './lugares.js';
import type { Plan } from './api.js';

export const VERSION_MEMORIA = '2026-10-20-v1';
export const diasBrisa = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export type PreferenciasBrisa = { tipos: Tipo[]; dias: number[]; soloGratis: boolean; anticipar: boolean; duracion: 30 | 90 };
export type MemoriaBrisa = PreferenciasBrisa & { autorizadaEn: string; venceEn: string; version: string };
export type CriteriosBrisa = { tipos: Tipo[]; dias: number[]; soloGratis: boolean; fecha?: string; hasta?: string; fuentes: string[] };
export type PropuestaBrisa = { id: string; plan: Plan; motivo: string; venceEn: string };
export type ResultadoBrisa = { lugarId: string; zona: string; criterios: CriteriosBrisa; propuestas: PropuestaBrisa[]; mensaje: string };
export const normalizarBrisa = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function validarMemoriaBrisa(b: unknown): b is PreferenciasBrisa & { autorizo: true; version: string } {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return false;
  const p = b as Record<string, unknown>;
  return p.autorizo === true && p.version === VERSION_MEMORIA && Array.isArray(p.tipos) && p.tipos.length > 0 && p.tipos.length <= tipos.length
    && p.tipos.every(t => tipos.includes(t)) && new Set(p.tipos).size === p.tipos.length
    && Array.isArray(p.dias) && p.dias.length <= 7 && p.dias.every(d => Number.isInteger(d) && d >= 0 && d < 7) && new Set(p.dias).size === p.dias.length
    && typeof p.soloGratis === 'boolean' && typeof p.anticipar === 'boolean' && [30, 90].includes(p.duracion as number);
}

const actividades: [RegExp, Tipo][] = [
  [/\b(camin\w*|pase\w*|senderismo)\b/, 'caminar'], [/\b(tinto|cafe)\b/, 'tinto'], [/\b(huerta|sembr\w*|jardiner\w*)\b/, 'huerta'],
  [/\b(ajedrez|parques|domino)\b/, 'ajedrez'], [/\b(tej\w*|crochet)\b/, 'tejer'], [/\b(mandados|mercado)\b/, 'mandados'],
  [/\b(voluntariado|colaborar|ayudar)\b/, 'voluntariado'],
];
const fechaBogota = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
export function interpretarIntencion(texto: string, memoria: MemoriaBrisa | null, ahora: Date): { ok: true; criterios: CriteriosBrisa } | { ok: false; mensaje: string } {
  const t = normalizarBrisa(texto);
  if (/suicid|matarme|morir|quitarme la vida|no quiero vivir|hacerme dano|no aguanto mas/.test(t)) return { ok: false, mensaje: 'Si estás en peligro ahora, llama al 123 y busca a una persona de confianza. Brisa no es un servicio de emergencias.' };
  // Se pide aclarar en vez de convertir negaciones, emociones, horarios o fechas no soportadas en preferencias.
  if (/\b(no|nunca|excepto|menos|sin|ni)\b/.test(t)) return { ok: false, mensaje: 'Para buscar con precisión, dime qué actividad y qué día sí te sirven. También puedes ajustar tus preferencias.' };
  const actividad = actividades.filter(([re]) => re.test(t)).map(([, tipo]) => tipo);
  const dias = diasBrisa.flatMap((d, i) => new RegExp(`\\b${normalizarBrisa(d)}s?\\b`).test(t) ? [i] : []);
  if (/fin de semana/.test(t)) dias.push(6, 0);
  if (/\d|\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|tarde|noche|temprano|hora|proxim[oa]|tranquil\w*|despacio)\b/.test(t))
    return { ok: false, mensaje: 'Por ahora filtro por actividad, día y planes gratis. No puedo garantizar horarios, fechas escritas con números ni el ritmo del plan. Reformula la búsqueda y revisa sus detalles.' };
  const elegidos = actividad.length ? actividad : memoria?.tipos ?? [];
  if (!elegidos.length) return { ok: false, mensaje: '¿Qué te provoca? Puedo buscar caminatas, un tinto, huerta, ajedrez, tejido, mandados o voluntariado.' };
  const relativos = /pasado manana/.test(t) ? 2 : /\bmanana\b/.test(t) ? 1 : /\bhoy\b/.test(t) ? 0 : null;
  let fecha = relativos === null ? undefined : fechaBogota(new Date(ahora.getTime() + relativos * 864e5));
  const diaHoy = new Date(`${fechaBogota(ahora)}T12:00:00Z`).getUTCDay();
  // «el sábado» es la próxima fecha de ese día; «los sábados» y la memoria son disponibilidad recurrente.
  const recurrente = dias.some(i => new RegExp(`\\b${normalizarBrisa(diasBrisa[i])}${diasBrisa[i].endsWith('s') ? '' : 's'}\\b`).test(t) && /\b(los|cada)\b/.test(t));
  if (!fecha && dias.length === 1 && !recurrente) fecha = fechaBogota(new Date(ahora.getTime() + ((dias[0] - diaHoy + 7) % 7) * 864e5));
  const hasta = /esta semana|fin de semana/.test(t) ? fechaBogota(new Date(ahora.getTime() + ((7 - diaHoy) % 7) * 864e5)) : undefined;
  const elegidosDias = fecha ? [] : dias.length ? [...new Set(dias)] : memoria?.dias ?? [];
  return { ok: true, criterios: { tipos: elegidos, dias: elegidosDias, soloGratis: /\b(gratis|gratuitos?)\b/.test(t) || !!memoria?.soloGratis, fecha, hasta,
    fuentes: [actividad.length ? 'Actividad indicada en esta búsqueda.' : 'Actividad de tu memoria autorizada.',
      fecha || dias.length ? 'Día indicado en esta búsqueda.' : memoria?.dias.length ? 'Días de tu memoria autorizada.' : 'Cualquier día.',
      memoria?.soloGratis && !/gratis|gratuito/.test(t) ? 'Solo gratis, como autorizaste recordar.' : ''] .filter(Boolean) } };
}

export function coincideConIntencion(plan: Plan, c: CriteriosBrisa, ahora: Date) {
  const fecha = new Date(plan.cuando);
  const dia = new Date(`${fechaBogota(fecha)}T12:00:00Z`).getUTCDay();
  return !plan.mio && !plan.voy && !plan.lleno && fecha > ahora && fecha.getTime() <= ahora.getTime() + 30 * 864e5
    && c.tipos.includes(plan.tipo) && (!c.dias.length || c.dias.includes(dia)) && (!c.fecha || fechaBogota(fecha) === c.fecha) && (!c.hasta || fechaBogota(fecha) <= c.hasta)
    && (!c.soloGratis || plan.costo === 'gratis');
}
export const describirCriterios = (c: CriteriosBrisa) => `${c.tipos.map(nombreTipo).join(', ')} · ${c.fecha ?? (c.dias.length ? c.dias.map(d => diasBrisa[d]).join(', ') : 'cualquier día')}${c.soloGratis ? ' · gratis' : ''}`;
// Esta detección abre la preparación. La ejecución tiene su propia ruta y confirmación.
export const esBusquedaBrisa = (t: string) => /\b(busca\w*|encuentra\w*)\b|hay (algun|un) plan|(?:caminar|tinto|huerta|tejer).*acompanad/i.test(normalizarBrisa(t));
