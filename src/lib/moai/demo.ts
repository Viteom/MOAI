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

// H5 · Lluvia fuerte (simulada). Brisa cambia de tono y pregunta; la persona confirma
// en un toque. Una ventana con luz de vela significa «confirmó»; una tenue, «sin noticias».
// Nunca rojo ni alarma: no tener señal no es estar en peligro (docs/05-emergencias.md).
export type Confirmacion = 'bien' | 'escriban' | 'noDecir';
export const opcionesConfirmacion: { id: Confirmacion; label: string }[] = [
  { id: 'bien', label: 'Estoy bien' },
  { id: 'escriban', label: 'Necesito que alguien me escriba' },
  { id: 'noDecir', label: 'Prefiero no decir' },
];
export function confirmo(c: Confirmacion | null): boolean { return c === 'bien' || c === 'escriban'; }
export function luzDeVentana(confirmada: boolean): 'vela' | 'tenue' { return confirmada ? 'vela' : 'tenue'; }
export function preguntaLluvia(ciudad: string) { return `Hoy llovió muy fuerte en ${ciudad}. ¿Cómo estás?`; }
export function respuestaLluvia(c: Confirmacion): string {
  if (c === 'bien') return 'Gracias por avisar. Tu ventana quedó con luz de vela.';
  if (c === 'escriban') return 'Aquí estoy contigo. En la versión real, tu Moai vería este aviso solo si tú lo permites.';
  return 'Está bien, no tienes que decirlo. Tu ventana queda con una luz tenue y aquí sigo.';
}
// Solo se nombra una línea cuando está verificada. Pendiente: confirmar los números de cada país.
export function ayudaUrgente(ciudad: string): string {
  const colombia = ciudad === 'Medellín' || ciudad === 'Bogotá';
  return colombia
    ? 'MOAI no es un servicio de emergencias. Si necesitas ayuda urgente, llama a la línea 123.'
    : 'MOAI no es un servicio de emergencias. Si necesitas ayuda urgente, llama a los servicios de emergencia de tu ciudad.';
}

// H7 · Modo Ahorro. Dos toques para decir «Estoy bien»: primero se declara, luego se elige
// quién lo sabe. Nada se envía en el prototipo; «Solo para mí» no avisa a nadie.
export type EstoyBien = 'ninguno' | 'declarado' | 'avisado' | 'privado';

export function estoyBienSiguiente(actual: EstoyBien, accion: 'declarar' | 'avisar' | 'privado'): EstoyBien {
  if (accion === 'declarar') return actual === 'ninguno' ? 'declarado' : actual;
  if (actual !== 'declarado') return actual;
  return accion === 'avisar' ? 'avisado' : 'privado';
}
