// Correos de MOAI con diseño (Mateo, 20 de octubre: «diseñar un mejor correo de bienvenida»).
// HTML con tablas y estilos en línea, que es lo que los programas de correo respetan; sin imágenes remotas ni seguimiento
// (ningún píxel de apertura, ningún enlace con identificadores). Siempre va también la versión en texto.
import type { Proposito } from './envios.js';

const VERDE = '#0c1f19', PANEL = '#123027', LIMA = '#cefa63', MENTA = '#8be4d5', TEXTO = '#eef4ec', SUAVE = '#b8cdc3';
const escapar = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function marco(titulo: string, cuerpo: string, pie: string) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><title>${escapar(titulo)}</title></head>
<body style="margin:0;padding:0;background:${VERDE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${VERDE};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 8px 20px;font:600 13px/1 Inter,Segoe UI,Arial,sans-serif;letter-spacing:.3em;color:${MENTA};">MOAI</td></tr>
<tr><td style="background:${PANEL};border:1px solid rgba(139,228,213,.3);border-radius:24px;padding:36px 32px;font:400 17px/1.55 Inter,Segoe UI,Arial,sans-serif;color:${TEXTO};">
${cuerpo}
</td></tr>
<tr><td style="padding:20px 8px 0;font:400 13px/1.5 Inter,Segoe UI,Arial,sans-serif;color:${SUAVE};">${pie}</td></tr>
</table></td></tr></table></body></html>`;
}

export function correoCodigo(codigo: string, proposito: Proposito, minutos: number) {
  const registro = proposito === 'registro';
  const asunto = registro ? `Te damos la bienvenida a MOAI · tu código es ${codigo}` : `Tu código para entrar a MOAI: ${codigo}`;
  const saludo = registro ? 'Qué bueno que llegas.' : 'Hola de nuevo.';
  const intro = registro
    ? 'MOAI es un lugar para encontrarte con tu gente, cerca de casa: planes sencillos con vecinos, tus Moais y Brisa, que te acompaña. Para empezar, confirma tu correo con este código:'
    : 'Este es tu código para entrar a MOAI:';
  const cifras = escapar(codigo);
  const html = marco(asunto, `
<h1 style="margin:0 0 12px;font:700 28px/1.2 Inter,Segoe UI,Arial,sans-serif;color:#ffffff;">${saludo}</h1>
<p style="margin:0 0 24px;">${intro}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
<td style="border:2px solid ${LIMA};border-radius:18px;padding:14px 22px;font:700 32px/1 'Courier New',monospace;letter-spacing:.22em;white-space:nowrap;color:${LIMA};">${cifras}</td>
</tr></table>
<p style="margin:0 0 8px;color:${SUAVE};">Vence en ${minutos} minutos. Escríbelo en la pantalla donde lo pediste.</p>
${registro ? `<p style="margin:16px 0 0;">Cuando entres, Brisa te saluda. Es una inteligencia artificial, no una persona, y está para ayudarte a encontrar planes y a tu gente.</p>` : ''}`,
  'Si no pediste este código, ignora este correo: nadie puede entrar sin él. MOAI nunca te pedirá el código por teléfono ni por chat.');
  const texto = `${saludo}\n\n${intro}\n\n${codigo}\n\nVence en ${minutos} minutos.${registro ? '\n\nCuando entres, Brisa te saluda. Es una inteligencia artificial, no una persona.' : ''}\n\nSi no pediste este código, ignora este correo: nadie puede entrar sin él.`;
  return { asunto, texto, html };
}
