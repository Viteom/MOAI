import type { Person } from './state';

// Datos de mentira y lógica pura de las simulaciones del prototipo (H3 a H5).
// Nada de esto toca la ubicación del teléfono, la red ni el almacenamiento.

export const redEjemplo: (Person & { luz: boolean })[] = [
  { nombre: 'Mamá', anillo: 'raiz', luz: true },
  { nombre: 'Luis', anillo: 'tronco', luz: true },
  { nombre: 'Carolina', anillo: 'rama', luz: false },
];
export const personaCercana: Person = { nombre: 'Luis', anillo: 'tronco' };

// H3 · Radar simulado. El nombre solo se revela cuando los dos aceptan el saludo.
export type Radar = 'apagado' | 'cerca' | 'ofrecido' | 'enviado' | 'revelado';
export type EventoRadar = 'simular' | 'tocar' | 'saludar' | 'aceptar' | 'ahoraNo' | 'cerrar';
export function radarSiguiente(actual: Radar, evento: EventoRadar): Radar {
  switch (actual) {
    case 'apagado': return evento === 'simular' ? 'cerca' : actual;
    case 'cerca': return evento === 'tocar' ? 'ofrecido' : evento === 'cerrar' ? 'apagado' : actual;
    case 'ofrecido': return evento === 'saludar' ? 'enviado' : evento === 'ahoraNo' ? 'apagado' : actual;
    case 'enviado': return evento === 'aceptar' ? 'revelado' : actual;
    case 'revelado': return evento === 'cerrar' ? 'apagado' : actual;
  }
}
// Lo que se puede decir del Radar según la etapa: el nombre solo aparece al final.
export function nombreVisible(radar: Radar): string | null {
  return radar === 'revelado' ? personaCercana.nombre : null;
}

// H4 · Moai de ejemplo. La fuerza de un vínculo se dibuja como grosor del hilo y
// nunca como número (CLAUDE.md, regla 5).
export type Hilo = 'fino' | 'medio' | 'grueso';
export function engrosar(hilo: Hilo): Hilo {
  return hilo === 'fino' ? 'medio' : 'grueso';
}
export const integrantesMoai = ['Tú', 'Luis', 'Carolina'] as const;
export const anfitrionMoai = 'Luis';
export const cartaMoai = `Hace un tiempo que tu Moai no se reúne. ¿Y si esta semana alguien propone un café sin agenda? Esta vez le toca proponer a ${anfitrionMoai}.`;
export const cartaMoaiTrasEncuentro = 'Qué bueno que se vieron. Los hilos de tu Moai se hicieron más fuertes.';
