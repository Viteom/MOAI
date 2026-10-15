// Rutas con la History API, sin dependencias. La decisión de a dónde va cada persona
// vive en una sola función (resolverRuta), como pide docs/09-flujos-acceso-y-comunidad.md.
import { useCallback, useEffect, useState } from 'react';
import type { Perfil } from './api';

export const rutasPublicas = ['/', '/bienvenida', '/registro', '/acceso', '/verificar', '/terminos', '/privacidad'] as const;
export const rutasPasos = ['/configuracion/nacimiento', '/configuracion/comunidad'] as const;
export const rutasPrivadas = ['/comunidad', '/gente', '/lugares', '/planes/nuevo', '/avisos', '/ciudad', '/equipo'] as const;
// El detalle de cada plan: /planes/<uuid>.
export const rutaDePlan = /^\/planes\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
// Cada Moai: /moais/<uuid>.
export const rutaDeMoai = /^\/moais\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
export const DESTINO_INICIAL = '/comunidad';
// Se pueden ver con o sin sesión (los textos legales se abren desde el registro).
const rutasAbiertas = ['/terminos', '/privacidad'];

const incluye = (lista: readonly string[], ruta: string) => lista.includes(ruta) || (lista === rutasPrivadas && (rutaDePlan.test(ruta) || rutaDeMoai.test(ruta)));

// Solo rutas internas conocidas: nunca se redirige a una URL que venga de afuera.
export function destinoSeguro(valor: string | null): string | null {
  return valor && incluye(rutasPrivadas, valor) ? valor : null;
}

export type Sesion = { estado: 'cargando' } | { estado: 'error' } | { estado: 'anonima' } | { estado: 'activa'; perfil: Perfil };

// El primer paso que falta después del código, o null si no falta ninguno.
export function pasoPendiente(perfil: Perfil): string | null {
  if (perfil.nacimientoPendiente) return '/configuracion/nacimiento';
  if (perfil.comunidad === 'pending') return '/configuracion/comunidad';
  return null;
}

// Devuelve la ruta a la que hay que ir, o null si la actual está bien.
export function resolverRuta(ruta: string, sesion: Sesion, destino: string | null): string | null {
  if (sesion.estado === 'cargando' || sesion.estado === 'error') return null; // P00 decide qué mostrar
  if (incluye(rutasAbiertas, ruta)) return null;
  if (sesion.estado === 'anonima') {
    if (incluye(rutasPublicas, ruta)) return null;
    return incluye(rutasPrivadas, ruta) ? `/acceso?destino=${encodeURIComponent(ruta)}` : '/';
  }
  const paso = pasoPendiente(sesion.perfil);
  if (paso) return ruta === paso ? null : destino ? `${paso}?destino=${encodeURIComponent(destino)}` : paso;
  if (incluye(rutasPrivadas, ruta)) return null;
  return destinoSeguro(destino) ?? DESTINO_INICIAL;
}

function leer() {
  const { pathname, search } = window.location;
  return { ruta: pathname, destino: new URLSearchParams(search).get('destino') };
}

export function useRuta() {
  const [actual, setActual] = useState(leer);
  useEffect(() => {
    const alVolver = () => setActual(leer());
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);
  const navegar = useCallback((destino: string, { reemplazar = false } = {}) => {
    if (destino === window.location.pathname + window.location.search) return;
    window.history[reemplazar ? 'replaceState' : 'pushState'](null, '', destino);
    setActual(leer());
  }, []);
  return { ...actual, navegar };
}
