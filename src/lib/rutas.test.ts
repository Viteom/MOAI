import { describe, expect, it } from 'vitest';
import { destinoSeguro, resolverRuta } from './rutas';
import type { Perfil } from './api';

const listo: Perfil = { nombre: 'Rosa', nacimientoPendiente: false, comunidad: 'completed', lugar: null };

const activa = { estado: 'activa' as const, perfil: listo };
const conPasos = (cambio: Partial<Perfil>) => ({ estado: 'activa' as const, perfil: { ...listo, ...cambio } });
const anonima = { estado: 'anonima' as const };

describe('resolverRuta', () => {
  it('mientras carga o sin red no decide nada', () => {
    expect(resolverRuta('/gente', { estado: 'cargando' }, null)).toBeNull();
    expect(resolverRuta('/gente', { estado: 'error' }, null)).toBeNull();
  });
  it('sin sesión: las públicas se quedan, las privadas piden entrar con destino', () => {
    expect(resolverRuta('/registro', anonima, null)).toBeNull();
    expect(resolverRuta('/gente', anonima, null)).toBe('/acceso?destino=%2Fgente');
    expect(resolverRuta('/no-existe', anonima, null)).toBe('/');
  });
  it('con sesión: las pantallas de entrada llevan al destino o al inicio', () => {
    expect(resolverRuta('/', activa, null)).toBe('/inicio');
    expect(resolverRuta('/verificar', activa, '/lugares')).toBe('/lugares');
    expect(resolverRuta('/gente', activa, null)).toBeNull();
  });
});

describe('pasos pendientes', () => {
  it('primero la fecha de nacimiento, luego la comunidad, conservando el destino', () => {
    expect(resolverRuta('/gente', conPasos({ nacimientoPendiente: true, comunidad: 'pending' }), null)).toBe('/configuracion/nacimiento');
    expect(resolverRuta('/verificar', conPasos({ comunidad: 'pending' }), '/gente')).toBe('/configuracion/comunidad?destino=%2Fgente');
    expect(resolverRuta('/configuracion/comunidad', conPasos({ comunidad: 'pending' }), null)).toBeNull();
  });
  it('lo omitido no se vuelve a preguntar', () => {
    expect(resolverRuta('/configuracion/comunidad', conPasos({ comunidad: 'skipped' }), null)).toBe('/inicio');
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
    expect(destinoSeguro('/gente')).toBe('/gente');
    expect(destinoSeguro('/ciudad')).toBeNull(); // el prototipo viejo ya no es un destino
  });
});
