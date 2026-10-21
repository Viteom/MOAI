// Cómo llega el código de verificación a cada canal.
// - Correo: código propio enviado con Resend.
// - WhatsApp: Twilio Verify genera, envía y comprueba el código.
// - Sin claves (desarrollo): el código se escribe en la consola del servidor, con el destino enmascarado (regla 7).
import { enmascarar, type Canal } from '../src/lib/registro.js';

export type Proposito = 'registro' | 'acceso';
export type Propio = { tipo: 'propio'; enviar(destino: string, codigo: string, proposito: Proposito): Promise<void> };
export type Externo = { tipo: 'externo'; iniciar(destino: string): Promise<void>; comprobar(destino: string, codigo: string): Promise<boolean> };
export type Via = Propio | Externo;
// WhatsApp es opcional: sin Twilio (hoy, por costo) el canal queda apagado en producción.
export type Vias = { correo: Via; whatsapp?: Via };
export type Recordar = (destino: string, nombre: string, diasRestantes: number) => Promise<void>;
// Correo libre (por ahora, el resumen semanal de planes).
export type Correo = (destino: string, asunto: string, texto: string) => Promise<void>;

export const MINUTOS_VIGENCIA = 10;

export function consola(canal: Canal, escribir: (linea: string) => void = console.log): Propio {
  return { tipo: 'propio', async enviar(destino, codigo) { escribir(`[desarrollo] código para ${enmascarar(canal, destino)}: ${codigo}`); } };
}

export function resend(apiKey: string, remitente: string): Propio {
  return {
    tipo: 'propio',
    async enviar(destino, codigo, proposito) {
      const accion = proposito === 'registro' ? 'confirmar tu correo' : 'entrar';
      const texto = `Hola. Tu código para ${accion} en MOAI es ${codigo}.\n\nVence en ${MINUTOS_VIGENCIA} minutos. Si no lo pediste, ignora este correo: nadie puede entrar sin el código.`;
      await enviarResend(apiKey, remitente, destino, `Tu código de MOAI: ${codigo}`, texto);
    },
  };
}

export function twilioVerify(cuenta: string, token: string, servicio: string): Externo {
  const base = `https://verify.twilio.com/v2/Services/${servicio}`;
  const llamar = (ruta: string, campos: Record<string, string>) => fetch(`${base}/${ruta}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${cuenta}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(campos),
  });
  return {
    tipo: 'externo',
    async iniciar(destino) {
      const respuesta = await llamar('Verifications', { To: destino, Channel: 'whatsapp', Locale: 'es' });
      if (!respuesta.ok) throw new Error(`Twilio respondió ${respuesta.status}`);
    },
    async comprobar(destino, codigo) {
      const respuesta = await llamar('VerificationCheck', { To: destino, Code: codigo });
      if (respuesta.status === 404) return false; // vencida o ya usada
      if (!respuesta.ok) throw new Error(`Twilio respondió ${respuesta.status}`);
      return (await respuesta.json() as { status?: string }).status === 'approved';
    },
  };
}

async function enviarResend(apiKey: string, remitente: string, destino: string, asunto: string, texto: string) {
  const respuesta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: remitente, to: [destino], subject: asunto, text: texto }),
  });
  if (!respuesta.ok) throw new Error(`Resend respondió ${respuesta.status}`);
}

// Recordatorio para quien empezó su cuenta y no confirmó el correo (decisión de Mateo: dos por semana).
export function recordatorioResend(apiKey: string, remitente: string, urlApp: string): Recordar {
  return (destino, nombre, diasRestantes) => enviarResend(apiKey, remitente, destino, 'Te falta un paso para entrar a MOAI',
    `Hola, ${nombre}.\n\nEmpezaste a crear tu cuenta en MOAI y falta confirmar tu correo. Entra a ${urlApp}, elige «Crear cuenta» con este mismo correo y te enviamos un código nuevo.\n\nSi no la confirmas en ${diasRestantes} días, borramos los datos que nos diste. Si no fuiste tú, ignora este correo.`);
}

export function recordatorioConsola(escribir: (linea: string) => void = console.log): Recordar {
  return async (destino, _nombre, diasRestantes) => escribir(`[desarrollo] recordatorio para ${enmascarar('correo', destino)} (${diasRestantes} días para confirmar)`);
}

export function correoConsola(escribir: (linea: string) => void = console.log): Correo {
  return async (destino, asunto) => escribir(`[desarrollo] correo para ${enmascarar('correo', destino)}: ${asunto}`);
}

export function viasDesdeEntorno(env: NodeJS.ProcessEnv): { vias: Vias; recordar: Recordar; correo: Correo } {
  const produccion = env.NODE_ENV === 'production';
  const conResend = env.RESEND_API_KEY && env.CORREO_REMITENTE;
  const correo = conResend ? resend(env.RESEND_API_KEY!, env.CORREO_REMITENTE!) : null;
  const twilio = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SID
    ? twilioVerify(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, env.TWILIO_VERIFY_SID) : undefined;
  if (produccion && (!correo || !env.APP_URL)) throw new Error('Faltan RESEND_API_KEY, CORREO_REMITENTE o APP_URL en producción.');
  return {
    vias: { correo: correo ?? consola('correo'), whatsapp: twilio ?? (produccion ? undefined : consola('whatsapp')) },
    recordar: conResend && env.APP_URL ? recordatorioResend(env.RESEND_API_KEY!, env.CORREO_REMITENTE!, env.APP_URL) : recordatorioConsola(),
    correo: conResend ? (destino, asunto, texto) => enviarResend(env.RESEND_API_KEY!, env.CORREO_REMITENTE!, destino, asunto, texto) : correoConsola(),
  };
}
