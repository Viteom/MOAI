import { describe, expect, it } from 'vitest';
import { destinoSeguro, resolverRuta } from './rutas';
import type { Perfil } from './api';

const listo: Perfil = { nombre: 'Rosa', ciudad: '05001', barrio: null, nacimientoPendiente: false, comunidad: 'completed' };

const activa = { estado: 'activa' as const, perfil: listo };
const conPasos = (cambio: Partial<Perfil>) => ({ estado: 'activa' as const, perfil: { ...listo, ...cambio } });
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

describe('pasos pendientes', () => {
  it('primero la fecha de nacimiento, luego la comunidad, conservando el destino', () => {
    expect(resolverRuta('/ciudad', conPasos({ nacimientoPendiente: true, comunidad: 'pending' }), null)).toBe('/configuracion/nacimiento');
    expect(resolverRuta('/verificar', conPasos({ comunidad: 'pending' }), '/ciudad')).toBe('/configuracion/comunidad?destino=%2Fciudad');
    expect(resolverRuta('/configuracion/comunidad', conPasos({ comunidad: 'pending' }), null)).toBeNull();
  });
  it('lo omitido no se vuelve a preguntar', () => {
    expect(resolverRuta('/configuracion/comunidad', conPasos({ comunidad: 'skipped' }), null)).toBe('/ciudad');
  });
  it('los textos legales se ven con o sin sesión', () => {
    expect(resolverRuta('/terminos', activa, null)).toBeNull();
    expect(resolverRuta('/privacidad', { estado: 'anonima' }, null)).toBeNull();
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
