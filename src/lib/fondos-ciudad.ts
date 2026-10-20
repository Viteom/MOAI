import { municipioPorCodigo } from './registro';
import type { Lugar } from './api';

// Catálogo editorial, independiente de disponer de mapa o barrios H3.
// Los nombres de archivos no proceden de texto libre ni identifican a una persona.
const catalogo: Record<string, { id: string; nombre: string }> = {
  '05001': { id: 'medellin', nombre: 'Medellín' },
  '11001': { id: 'bogota', nombre: 'Bogotá' },
};
export function nombreCiudad(lugar: Lugar | null) {
  if (!lugar) return 'Tu ciudad';
  return fondoDeCiudad(lugar.ciudad).id !== 'generico' ? catalogo[lugar.ciudad].nombre : municipioPorCodigo(lugar.ciudad)?.nombre ?? 'Tu ciudad';
}
export function fondoDeCiudad(codigo?: string) {
  return codigo && Object.hasOwn(catalogo, codigo) ? catalogo[codigo] : { id: 'generico', nombre: 'Escenario MOAI' };
}
