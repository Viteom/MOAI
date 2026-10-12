import { describe, expect, it } from 'vitest';
import { destinoSeguro, resolverRuta } from './rutas';

const activa = { estado: 'activa' as const, nombre: 'Rosa' };
const anonima = { estado: 'anonima' as const };

describe('resolverRuta', () => {
  it('mientras carga o sin red no decide nada', () => {
    expect(resolverRuta('/ciudad', { estado: 'cargando' }, null)).toBeNull();
    expect(resolverRuta('/ciudad', { estado: 'error' }, null)).toBeNull();
  });
  it('sin sesión: las públicas se quedan, las privadas piden entrar con destino', () => {
    expect(resolverRuta('/registro', anonima, null)).toBeNull();
    expect(resolverRuta('/ciudad', anonima, null)).toBe('/acceso?destino=%2Fciudad');
    expect(resolverRuta('/no-existe', anonima, null)).toBe('/');
  });
  it('con sesión: las pantallas de entrada llevan al destino o a la ciudad', () => {
    expect(resolverRuta('/', activa, null)).toBe('/ciudad');
    expect(resolverRuta('/verificar', activa, '/ciudad')).toBe('/ciudad');
    expect(resolverRuta('/ciudad', activa, null)).toBeNull();
  });
});

describe('destinoSeguro', () => {
  it('nunca acepta URLs externas ni rutas desconocidas', () => {
    expect(destinoSeguro('https://otro-sitio.example')).toBeNull();
    expect(destinoSeguro('//otro-sitio.example')).toBeNull();
    expect(destinoSeguro('/registro')).toBeNull();
    expect(destinoSeguro('/ciudad')).toBe('/ciudad');
  });
});
