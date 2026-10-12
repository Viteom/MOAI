// Rutas con la History API, sin dependencias. La decisión de a dónde va cada persona
// vive en una sola función (resolverRuta), como pide docs/09-flujos-acceso-y-comunidad.md.
import { useCallback, useEffect, useState } from 'react';

export const rutasPublicas = ['/', '/bienvenida', '/registro', '/acceso', '/verificar'] as const;
export const rutasPrivadas = ['/ciudad'] as const;
export type Ruta = typeof rutasPublicas[number] | typeof rutasPrivadas[number];
export const DESTINO_INICIAL: Ruta = '/ciudad';

const esPublica = (ruta: string) => (rutasPublicas as readonly string[]).includes(ruta);
const esPrivada = (ruta: string) => (rutasPrivadas as readonly string[]).includes(ruta);

// Solo rutas internas conocidas: nunca se redirige a una URL que venga de afuera.
export function destinoSeguro(valor: string | null): Ruta | null {
  return valor && esPrivada(valor) ? valor as Ruta : null;
}

export type Sesion = { estado: 'cargando' } | { estado: 'error' } | { estado: 'anonima' } | { estado: 'activa'; nombre: string };

// Devuelve la ruta a la que hay que ir, o null si la actual está bien.
export function resolverRuta(ruta: string, sesion: Sesion, destino: string | null): string | null {
  if (sesion.estado === 'cargando' || sesion.estado === 'error') return null; // P00 decide qué mostrar
  if (sesion.estado === 'anonima') {
    if (esPublica(ruta)) return null;
    return esPrivada(ruta) ? `/acceso?destino=${encodeURIComponent(ruta)}` : '/';
  }
  // Con sesión, las pantallas de entrada ya no aplican.
  if (esPrivada(ruta)) return null;
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
