// Revisión de mensajes antes de enviarlos (decisión de Mateo, 15 de octubre de 2026). Sin IA y sin guardar nada:
// solo se buscan frases claramente abusivas o riesgosas en el momento de enviar.
// - «bloqueo»: amenazas, insultos graves o contenido sexual. No se envía.
// - «aviso»: insultos leves, pedir o manejar dinero, datos sensibles, un teléfono o una casa. Se avisa a quien escribe
//   y puede enviarlo igual. Nadie más se entera: el resultado no se guarda ni se usa para nada más (regla 6 ajustada).
// Lo demás lo ven las personas, que pueden reportar un mensaje concreto para que lo revise el equipo.

export type Revision = { nivel: 'ok' } | { nivel: 'aviso' | 'bloqueo'; motivo: string };

const plano = (t: string) => ` ${t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ\s+]/g, ' ').replace(/\s+/g, ' ')} `;

const BLOQUEO: [RegExp, string][] = [
  [/ te (voy a|vamos a) (matar|pegar|chuzar|cascar|joder) | te mato | te voy a buscar | se van a morir /, 'Ese mensaje suena a amenaza y no se puede enviar. Si estás en peligro, llama a la línea 123.'],
  [/ (hijueputa|hijo de puta|hija de puta|malparid[oa]|gonorrea hijueputa|puta|perra|zorra|careverga|carechimba) /, 'Ese mensaje tiene insultos graves y no se puede enviar. Aquí nos tratamos con cuidado.'],
  [/ (desnud[oa]s?|sin ropa|fotos? intimas?|sexo conmigo|culo|tetas|mamar) /, 'Ese mensaje tiene contenido sexual y no se puede enviar en MOAI.'],
];

const AVISO: [RegExp, string][] = [
  [/ (idiota|estupid[oa]|imbecil|guevon|huevon|marica|gonorrea|lambon) /, 'Ese mensaje puede lastimar a alguien. ¿Lo quieres cambiar?'],
  [/ (prestame|me prestas|presteme|consignam[e]|consignar|consignacion|transferencia|transfiere|nequi|daviplata|numero de cuenta|plata para|cuanto (me )?cobra) /, 'En MOAI no se pide ni se maneja dinero. Nunca envíes plata a alguien que conociste aquí.'],
  [/ (contrasena|cedula|tarjeta de credito|cvv|codigo de verificacion) /, 'Parece que vas a compartir un dato sensible. Nunca compartas claves, cédulas ni tarjetas.'],
  [/ (\+?57 ?)?3\d{2} ?\d{3} ?\d{4} /, 'Tu número lo verán todas las personas de esta conversación. ¿Seguro que quieres compartirlo?'],
  [/ (en mi casa|a mi casa|mi apartamento|mi apto|en tu casa|a tu casa|mi direccion|tu direccion) /, 'Los encuentros en MOAI son en lugares públicos, nunca en la casa de nadie.'],
];

export function revisarMensaje(texto: string): Revision {
  const t = plano(texto);
  for (const [re, motivo] of BLOQUEO) if (re.test(t)) return { nivel: 'bloqueo', motivo };
  for (const [re, motivo] of AVISO) if (re.test(t)) return { nivel: 'aviso', motivo };
  return { nivel: 'ok' };
}
