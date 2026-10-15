// Reglas compartidas de los Moais, los bloqueos y los reportes (decisión de Mateo, 14 de octubre de 2026).
// - Un Moai nace entre dos personas que se vieron en persona (las dos confirman «Ya nos vimos») y crece por invitación.
// - Máximo 5 personas. Para sumar a alguien, aceptan todos los miembros. Se puede estar en varios Moais.
// - Reportar no muestra quién reportó. Dos personas distintas en 90 días pausan a la cuenta hasta una revisión humana.

export const MAX_MOAI = 5;
export const DIAS_ENCUENTRO = 7;            // durante cuántos días después de un plan se pregunta «¿te viste con…?»
export const ENCUENTROS_PARA_SUGERIR = 2;   // Brisa sugiere formar un Moai tras dos encuentros confirmados (si la persona lo activó)
export const REPORTES_PARA_PAUSA = 2;
export const DIAS_REPORTES = 90;
export const DIAS_MENSAJES_MOAI = 90;       // la conversación del Moai guarda los últimos 90 días

export const motivosReporte = [
  { id: 'trato', nombre: 'Me incomodó su trato' },
  { id: 'insistencia', nombre: 'Insistió o me acosó' },
  { id: 'dinero', nombre: 'Me pidió dinero o datos personales' },
  { id: 'identidad', nombre: 'No es quien dice ser' },
  { id: 'peligro', nombre: 'Me sentí en peligro' },
  { id: 'otro', nombre: 'Otra cosa' },
] as const;
export type MotivoReporte = typeof motivosReporte[number]['id'];

export const MAX_DETALLE_REPORTE = 600;

export function validarNombreMoai(nombre: unknown): { ok: true; nombre: string } | { ok: false; error: string } {
  const limpio = String(nombre ?? '').trim().replace(/\s+/g, ' ');
  if (limpio.length < 2) return { ok: false, error: 'Ponle un nombre a su Moai: por ejemplo, «Los del parque».' };
  if (limpio.length > 40) return { ok: false, error: 'Usa un nombre más corto.' };
  return { ok: true, nombre: limpio };
}

export const mensajePausa = 'Tu cuenta está en pausa mientras revisamos un reporte. Puedes seguir viendo planes y sumarte, pero por ahora no puedes proponer planes, escribir ni invitar. Si crees que es un error, escríbenos.';
