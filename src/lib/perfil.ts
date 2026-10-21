// Perfil que Brisa llena conversando, invierno, puerta abierta y saludos de lejos (decisiones de Mateo, 15 de octubre de 2026).
// - El perfil acerca sin exponer: primer nombre, una frase, lo que te gusta, lo que compartes. Sin foto ni ubicación.
//   Solo se muestra en Mi zona si la persona lo aprueba.
// - «Puerta abierta» (esta semana me caería bien compañía) la ven solo las personas con las que ya te viste. Dura 7 días.
// - El invierno lo declara la persona (regla 6), se guarda cifrado y solo lo sabe quien ella elija.
// - El saludo de lejos usa frases ya escritas: no abre un chat ni compromete a nada.
import { tipos, type Tipo } from './lugares.js';

export type EntradaPerfil = { frase: string; gustos: Tipo[]; comparte: string; aprender: string; visible: boolean; nombrePreferido?: string; visibleEnRed?: boolean };
export const DIAS_PUERTA = 7;
export const DIAS_ENTRE_SALUDOS = 7;

export const saludos = [
  { id: 'buenos-dias', texto: 'Buenos días, vecino o vecina' },
  { id: 'bonito', texto: 'Qué bonito lo que compartes' },
  { id: 'en-comun', texto: 'Tenemos gustos en común' },
  { id: 'pienso', texto: 'Pienso en ti' },
  { id: 'aqui-estoy', texto: 'Aquí estoy, si necesitas algo' },
  { id: 'tinto', texto: '¿Un tinto cuando quieras?' },
] as const;
export type Saludo = typeof saludos[number]['id'];
export const textoSaludo = (id: string) => saludos.find(s => s.id === id)?.texto ?? '';

const limpio = (t: unknown, max: number) => String(t ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

export function validarPerfil(entrada: Partial<Record<keyof EntradaPerfil, unknown>>): { ok: true; perfil: EntradaPerfil } | { ok: false; error: string } {
  if (entrada.nombrePreferido !== undefined && (typeof entrada.nombrePreferido !== 'string' || entrada.nombrePreferido.trim().length > 40)) return { ok: false, error: 'El nombre preferido debe ser un texto de hasta 40 caracteres.' };
  if (entrada.visibleEnRed !== undefined && typeof entrada.visibleEnRed !== 'boolean') return { ok: false, error: 'Elige si quieres compartir tu presentación con tu red.' };
  const frase = limpio(entrada.frase, 140);
  const comparte = limpio(entrada.comparte, 80);
  const aprender = limpio(entrada.aprender, 80);
  const gustos = [...new Set((Array.isArray(entrada.gustos) ? entrada.gustos : []).filter((g): g is Tipo => tipos.includes(g as Tipo) && g !== 'otro'))];
  const visible = entrada.visible === true;
  if (visible && !frase && !comparte && !gustos.length) return { ok: false, error: 'Cuéntame algo de ti antes de mostrar tu perfil.' };
  return { ok: true, perfil: { frase, gustos, comparte, aprender, visible,
    ...(entrada.nombrePreferido !== undefined ? { nombrePreferido: limpio(entrada.nombrePreferido, 40) } : {}),
    ...(entrada.visibleEnRed !== undefined ? { visibleEnRed: entrada.visibleEnRed as boolean } : {}) } };
}
