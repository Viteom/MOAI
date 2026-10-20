import type { PersonaLazo } from './api';

export const descripcionContacto = { vivo: 'Contacto reciente registrado', tibio: 'Hace un tiempo desde el último contacto registrado', dormido: 'Sin contacto reciente registrado' };

export type CategoriaVinculo = 'raiz' | 'tronco' | 'rama';
export type FichaPrivada = { comoNosConocemos: string; algoCompartimos: string; nota: string };
export const fichaVacia: FichaPrivada = { comoNosConocemos: '', algoCompartimos: '', nota: '' };
export const categorias: { id: CategoriaVinculo; nombre: string; titulo: string; descripcion: string }[] = [
  { id: 'raiz', nombre: 'Raíz', titulo: 'Familia', descripcion: 'Tu familia, esté donde esté.' },
  { id: 'tronco', nombre: 'Tronco', titulo: 'Quienes me nutren', descripcion: 'Las personas que eliges tener cerca.' },
  { id: 'rama', nombre: 'Ramas', titulo: 'Personas de mi red', descripcion: 'Personas que conoces en MOAI.' },
];
export const categoriaDe = (p: PersonaLazo): CategoriaVinculo => p.categoria ?? (p.grupo === 'raiz' ? 'raiz' : p.grupo === 'interno' ? 'tronco' : 'rama');
export const nombreCategoria = (p: PersonaLazo) => categorias.find(c => c.id === categoriaDe(p))!.nombre;
export const normalizarNombre = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
export type FiltroMoai = 'todas' | 'compartimos' | 'sin-compartir';
export function filtrarPersonas(personas: PersonaLazo[], buscar: string, filtro: FiltroMoai, categoria: CategoriaVinculo | 'todas') {
  const texto = normalizarNombre(buscar);
  return personas.filter(p => normalizarNombre(p.nombre).includes(texto)
    && (categoria === 'todas' || categoriaDe(p) === categoria)
    && (filtro === 'todas' || (filtro === 'compartimos' ? !!p.moais?.length : !p.moais?.length)));
}

export function validarFicha(entrada: unknown): { ok: true; ficha: FichaPrivada } | { ok: false; errores: Record<string, string> } {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return { ok: false, errores: { nota: 'Revisa tu ficha.' } };
  const e = entrada as Record<string, unknown>;
  const errores: Record<string, string> = {};
  const ficha = { ...fichaVacia };
  for (const [campo, max] of [['comoNosConocemos', 160], ['algoCompartimos', 160], ['nota', 500]] as const) {
    if (typeof e[campo] !== 'string') errores[campo] = 'Escribe un texto o deja el campo vacío.';
    else if (e[campo].length > max) errores[campo] = `Usa como máximo ${max} caracteres.`;
    else ficha[campo] = e[campo].trim();
  }
  return Object.keys(errores).length ? { ok: false, errores } : { ok: true, ficha };
}
