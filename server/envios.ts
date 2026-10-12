// Cómo llega el código de verificación a cada canal.
// - Correo: código propio enviado con Resend.
// - WhatsApp: Twilio Verify genera, envía y comprueba el código.
// - Sin claves (desarrollo): el código se escribe en la consola del servidor, con el destino enmascarado (regla 7).
import { enmascarar, type Canal } from '../src/lib/registro';

export type Proposito = 'registro' | 'acceso';
export type Propio = { tipo: 'propio'; enviar(destino: string, codigo: string, proposito: Proposito): Promise<void> };
export type Externo = { tipo: 'externo'; iniciar(destino: string): Promise<void>; comprobar(destino: string, codigo: string): Promise<boolean> };
export type Via = Propio | Externo;
export type Vias = Record<Canal, Via>;

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
      const respuesta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: remitente, to: [destino], subject: `Tu código de MOAI: ${codigo}`, text: texto }),
      });
      if (!respuesta.ok) throw new Error(`Resend respondió ${respuesta.status}`);
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

export function viasDesdeEntorno(env: NodeJS.ProcessEnv): Vias {
  const produccion = env.NODE_ENV === 'production';
  const correo = env.RESEND_API_KEY && env.CORREO_REMITENTE ? resend(env.RESEND_API_KEY, env.CORREO_REMITENTE) : null;
  const whatsapp = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SID
    ? twilioVerify(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, env.TWILIO_VERIFY_SID) : null;
  if (produccion && (!correo || !whatsapp)) throw new Error('Faltan las claves de Resend o de Twilio en producción.');
  return { correo: correo ?? consola('correo'), whatsapp: whatsapp ?? consola('whatsapp') };
}
