// «¿Cómo cuidas y cómo te cuidas?» y el Moai interno (decisión de Mateo, 15 de octubre de 2026).
// Seis preguntas para cuidar a quien cuida (adaptadas del recurso «Aprendemos juntos» de BBVA que compartió Mateo).
// No es un instrumento clínico ni diagnostica (reglas 6 y 11): la persona lo responde si quiere, ve su resultado
// en palabras, nunca en puntaje, y Brisa lo usa solo para cuidarla a ella.

export type Letra = 'A' | 'B' | 'C';
export const preguntasCuidado: { pregunta: string; opciones: Record<Letra, string> }[] = [
  { pregunta: '¿Cómo reaccionas cuando alguien te cuenta un problema que le duele?', opciones: { A: 'Lo siento como si fuera mío', B: 'Escucho sin perder el equilibrio', C: 'Casi no me afecta' } },
  { pregunta: '¿Qué te pasa cuando alguien cercano está triste?', opciones: { A: 'Su tristeza me desborda', B: 'Lo acompaño y después vuelvo a lo mío', C: 'Me cuesta involucrarme' } },
  { pregunta: '¿Qué haces ante el sufrimiento de otra persona?', opciones: { A: 'Intento resolverlo, aunque me agote', B: 'Acompaño sin querer solucionarlo todo', C: 'Solo intervengo si es alguien muy cercano' } },
  { pregunta: '¿Cómo quedas después de escuchar a alguien que se desahoga?', opciones: { A: 'Con mucho peso encima', B: 'Conectado, pero estable', C: 'Sin muchos cambios' } },
  { pregunta: '¿Cómo vives los conflictos entre otras personas?', opciones: { A: 'Me involucro con intensidad', B: 'Los entiendo, desde cierta distancia', C: 'Prefiero no meterme' } },
  { pregunta: '¿Cómo eres en las relaciones intensas?', opciones: { A: 'Se me borran los límites', B: 'Conecto sin perder mi espacio', C: 'Me reservo lo que siento' } },
];

export const textosCuidado: Record<Letra, string> = {
  A: 'Conectas con mucha intensidad con lo que viven los demás. Es un regalo para tu Moai, y también conviene cuidar tus límites para no cargar con lo que no es tuyo.',
  B: 'Conectas y a la vez cuidas tu propio espacio. Ese equilibrio te deja acompañar sin desgastarte.',
  C: 'Tiendes a tomar distancia de lo que sienten los demás. Puede ser tu forma de protegerte; vale la pena mirar si a veces te aleja de quienes quieres.',
};
export const avisoCuidado = 'Esto no es un diagnóstico: es una forma de mirarte. Si sientes que cuidar a otros te está pesando demasiado, habla con alguien de confianza o con un profesional.';

// Las letras que más se repiten (puede haber empate). Devuelve null si las respuestas no son seis letras válidas.
export function resultadoCuidado(respuestas: unknown): Letra[] | null {
  if (!Array.isArray(respuestas) || respuestas.length !== preguntasCuidado.length || !respuestas.every(r => r === 'A' || r === 'B' || r === 'C')) return null;
  const cuenta = { A: 0, B: 0, C: 0 } as Record<Letra, number>;
  for (const r of respuestas as Letra[]) cuenta[r]++;
  const max = Math.max(cuenta.A, cuenta.B, cuenta.C);
  return (['A', 'B', 'C'] as Letra[]).filter(l => cuenta[l] === max);
}

// Las personas cambian: si el resultado guardado tiene más de 90 días, Brisa propone repetir las preguntas.
export const DIAS_REPETIR_CUIDADO = 90;

// Moai interno: quién te nutre, aunque no use MOAI. Privado; Brisa recuerda como mucho una vez por semana.
export const MAX_INTERNO = 5;
export const DIAS_SIN_HABLAR = 14;

export function validarPersonaInterna(entrada: { nombre?: unknown; relacion?: unknown }): { ok: true; nombre: string; relacion: string } | { ok: false; errores: Record<string, string> } {
  const nombre = String(entrada.nombre ?? '').trim().replace(/\s+/g, ' ');
  const relacion = String(entrada.relacion ?? '').trim().replace(/\s+/g, ' ');
  const errores: Record<string, string> = {};
  if (nombre.length < 2) errores.nombre = 'Escribe cómo le dices.';
  else if (nombre.length > 40) errores.nombre = 'Usa un nombre más corto.';
  if (relacion.length > 40) errores.relacion = 'Usa menos palabras.';
  return Object.keys(errores).length ? { ok: false, errores } : { ok: true, nombre, relacion };
}
