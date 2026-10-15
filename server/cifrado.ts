// Cifrado de datos íntimos en la base (Moai interno y resultado del test de cuidado).
// Regla 4: nada de criptografía propia. Se usa AES-256-GCM de node:crypto (OpenSSL) con una clave derivada por HKDF
// del secreto del servidor (CODIGO_SECRETO). Si el secreto cambia, estos datos dejan de poder leerse.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

export type Cifrador = { cifrar: (texto: string) => string; descifrar: (guardado: string) => string | null };

export function crearCifrador(secreto: string): Cifrador {
  const clave = Buffer.from(hkdfSync('sha256', secreto, 'moai', 'datos-intimos-v1', 32));
  return {
    cifrar(texto) {
      const iv = randomBytes(12);
      const cifra = createCipheriv('aes-256-gcm', clave, iv);
      const cuerpo = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
      return ['v1', iv.toString('base64'), cifra.getAuthTag().toString('base64'), cuerpo.toString('base64')].join('.');
    },
    descifrar(guardado) {
      try {
        const [version, iv, etiqueta, cuerpo] = guardado.split('.');
        if (version !== 'v1') return null;
        const descifra = createDecipheriv('aes-256-gcm', clave, Buffer.from(iv, 'base64'));
        descifra.setAuthTag(Buffer.from(etiqueta, 'base64'));
        return Buffer.concat([descifra.update(Buffer.from(cuerpo, 'base64')), descifra.final()]).toString('utf8');
      } catch {
        return null;
      }
    },
  };
}
