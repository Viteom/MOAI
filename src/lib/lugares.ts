// Lugares guardados y planes (docs/09, apartado 9). Compartido por el frontend y el servidor.
// Un lugar es un nombre («Casa», «Donde mis papás»…) + un municipio + (en Medellín) un barrio.
// La celda H3 de ~1 km sale del catálogo de barrios; nunca hay dirección ni coordenadas (regla 1).
import barriosJson from './colombia/barrios-medellin.json';
import { municipioPorCodigo } from './registro';

export const MEDELLIN = '05001';
export const MAX_LUGARES = 5;
export const nombresSugeridos = ['Casa', 'Donde mis papás', 'Trabajo', 'Donde mis hijos'];

export type Barrio = { codigo: string; nombre: string; comuna: string; celda: string };
export const barriosMedellin: Barrio[] = (barriosJson as [string, string, string, string][])
  .map(([codigo, nombre, comuna, celda]) => ({ codigo, nombre, comuna, celda }));
const barrioPorCodigoMapa = new Map(barriosMedellin.map(b => [b.codigo, b]));
export const barrioPorCodigo = (codigo: string) => barrioPorCodigoMapa.get(codigo);
// Mientras no esté el catálogo, Medellín funciona como las demás ciudades: solo el municipio.
export const hayBarrios = (ciudad: string) => ciudad === MEDELLIN && barriosMedellin.length > 0;

const sinTildes = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export function buscarBarrios(texto: string, limite = 8): Barrio[] {
  const q = sinTildes(texto.trim());
  if (!q) return [];
  return barriosMedellin.filter(b => sinTildes(b.nombre).includes(q) || sinTildes(b.comuna).startsWith(q)).slice(0, limite);
}

export type EntradaLugar = { nombre: string; ciudad: string; barrio?: string | null };
export type ErroresLugar = Partial<Record<'nombre' | 'ciudad' | 'barrio', string>>;

export function validarLugar(entrada: Partial<EntradaLugar>): { ok: true; lugar: { nombre: string; ciudad: string; barrio: string | null; celda: string | null } } | { ok: false; errores: ErroresLugar } {
  const errores: ErroresLugar = {};
  const nombre = (entrada.nombre ?? '').trim().replace(/\s+/g, ' ');
  if (!nombre) errores.nombre = 'Ponle un nombre a este lugar, por ejemplo «Casa».';
  else if (nombre.length > 30) errores.nombre = 'Usa un nombre más corto.';
  const ciudad = entrada.ciudad ?? '';
  if (!municipioPorCodigo(ciudad)) errores.ciudad = 'Elige la ciudad de la lista.';
  const barrio = entrada.barrio ? barrioPorCodigo(entrada.barrio) : undefined;
  if (entrada.barrio && (!barrio || ciudad !== MEDELLIN)) errores.barrio = 'Elige el barrio de la lista.';
  if (Object.keys(errores).length) return { ok: false, errores };
  return { ok: true, lugar: { nombre, ciudad, barrio: barrio?.codigo ?? null, celda: barrio?.celda ?? null } };
}

// Hasta dónde llega un plan. Con celdas H3 de resolución 8 (~1 km de lado a lado).
export type Alcance = 'cerca' | 'zona' | 'ciudad';
export const alcances: { id: Alcance; nombre: string; detalle: string; anillos: number | null }[] = [
  { id: 'cerca', nombre: 'Muy cerca', detalle: 'A menos de 2 km', anillos: 1 },
  { id: 'zona', nombre: 'Mi zona', detalle: 'A menos de 4 km', anillos: 2 },
  { id: 'ciudad', nombre: 'Mi ciudad', detalle: 'En toda la ciudad', anillos: null },
];

// Distancia por franjas, nunca exacta (para que no se pueda triangular dónde vive alguien).
export function franja(anillosDeDistancia: number | null): string {
  if (anillosDeDistancia === null) return 'En tu ciudad';
  if (anillosDeDistancia <= 1) return 'A menos de 2 km';
  if (anillosDeDistancia <= 2) return 'A menos de 4 km';
  return 'En tu ciudad';
}

export const nombreDeZona = (ciudad: string, barrio: string | null) => {
  const b = barrio ? barrioPorCodigo(barrio) : undefined;
  const m = municipioPorCodigo(ciudad);
  return b ? `${b.nombre}, ${m?.nombre ?? ''}` : m?.nombre ?? '';
};

// Un plan: qué, cuándo, dónde (lugar público, nunca la casa de nadie) y hasta dónde llega.
export type EntradaPlan = { titulo: string; descripcion?: string; cuando: string; lugarPublico: string; ciudad: string; barrio?: string | null; alcance: Alcance; cupo?: number | null };
export type ErroresPlan = Partial<Record<keyof EntradaPlan, string>>;
const DIAS_MAXIMOS = 60;

export function validarPlan(entrada: Partial<EntradaPlan>, ahora: Date): { ok: true; plan: Required<Omit<EntradaPlan, 'cuando'>> & { cuando: Date; celda: string | null } } | { ok: false; errores: ErroresPlan } {
  const errores: ErroresPlan = {};
  const limpio = (t?: string) => (t ?? '').trim().replace(/\s+/g, ' ');
  const titulo = limpio(entrada.titulo);
  if (titulo.length < 3) errores.titulo = 'Cuéntanos en pocas palabras qué quieres hacer.';
  else if (titulo.length > 80) errores.titulo = 'Usa un título más corto.';
  const descripcion = (entrada.descripcion ?? '').trim();
  if (descripcion.length > 400) errores.descripcion = 'Usa una descripción más corta.';
  const cuando = new Date(entrada.cuando ?? '');
  if (Number.isNaN(cuando.getTime()) || cuando.getTime() < ahora.getTime()) errores.cuando = 'Elige una fecha y una hora que todavía no hayan pasado.';
  else if (cuando.getTime() > ahora.getTime() + DIAS_MAXIMOS * 864e5) errores.cuando = `Por ahora, planes de los próximos ${DIAS_MAXIMOS} días.`;
  const lugarPublico = limpio(entrada.lugarPublico);
  if (lugarPublico.length < 3) errores.lugarPublico = 'Escribe un lugar público: un parque, una biblioteca, un café…';
  else if (lugarPublico.length > 80) errores.lugarPublico = 'Usa un nombre de lugar más corto.';
  const ciudad = entrada.ciudad ?? '';
  if (!municipioPorCodigo(ciudad)) errores.ciudad = 'Elige la ciudad de la lista.';
  const barrio = entrada.barrio ? barrioPorCodigo(entrada.barrio) : undefined;
  if (entrada.barrio && (!barrio || ciudad !== MEDELLIN)) errores.barrio = 'Elige el barrio de la lista.';
  const alcance = alcances.some(a => a.id === entrada.alcance) ? entrada.alcance! : 'cerca';
  // Sin barrio no hay celda: el plan solo puede llegar a toda la ciudad.
  if (alcance !== 'ciudad' && !barrio) errores.alcance = hayBarrios(ciudad) ? 'Elige el barrio del lugar para que llegue a quienes viven cerca.' : 'En esta ciudad, por ahora, los planes llegan a toda la ciudad.';
  const cupo = entrada.cupo ?? null;
  if (cupo !== null && (!Number.isInteger(cupo) || cupo < 2 || cupo > 30)) errores.cupo = 'El cupo va de 2 a 30 personas.';
  if (Object.keys(errores).length) return { ok: false, errores };
  return { ok: true, plan: { titulo, descripcion, cuando, lugarPublico, ciudad, barrio: barrio?.codigo ?? null, alcance, cupo, celda: barrio?.celda ?? null } };
}
