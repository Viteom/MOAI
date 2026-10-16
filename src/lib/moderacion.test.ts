import { describe, expect, it } from 'vitest';
import { revisarMensaje } from './moderacion';

describe('Revisión de mensajes antes de enviarlos', () => {
  it('las conversaciones cotidianas pasan', () => {
    for (const t of ['Llego 5 minutos tarde', 'Traigo un pack de agua', 'Yo te pago el tinto', '¿Nos vemos en la entrada del parque?', 'Compro el pan en la esquina', 'Vamos en vehículo'])
      expect(revisarMensaje(t)).toEqual({ nivel: 'ok' });
  });
  it('amenazas, insultos graves y contenido sexual no se envían', () => {
    expect(revisarMensaje('Te voy a matar').nivel).toBe('bloqueo');
    expect(revisarMensaje('Eres un hijueputa').nivel).toBe('bloqueo');
    expect(revisarMensaje('Mándame fotos íntimas').nivel).toBe('bloqueo');
  });
  it('dinero, datos, teléfonos y casas: se avisa y se puede enviar igual', () => {
    expect(revisarMensaje('Préstame plata, porfa')).toMatchObject({ nivel: 'aviso', motivo: expect.stringMatching(/dinero/) });
    expect(revisarMensaje('Mi Nequi es este')).toMatchObject({ nivel: 'aviso' });
    expect(revisarMensaje('Escríbeme al 300 555 0101')).toMatchObject({ nivel: 'aviso', motivo: expect.stringMatching(/número/) });
    expect(revisarMensaje('Mejor nos vemos en mi casa')).toMatchObject({ nivel: 'aviso', motivo: expect.stringMatching(/lugares públicos/) });
    expect(revisarMensaje('No seas idiota').nivel).toBe('aviso');
  });
});
