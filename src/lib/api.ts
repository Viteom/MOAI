// Único punto del frontend que habla con la red, y solo con /api del mismo origen
// (src/test/privacy.test.ts lo comprueba). Nada se guarda en el navegador: la sesión es una cookie httpOnly.
import type { Canal, EntradaRegistro, Errores } from './registro';

export type Envio = { canal: Canal; destinoVisible: string };
export type Perfil = { nombre: string; ciudad: string };
export type Respuesta<T> = { ok: true; datos: T } | { ok: false; error: string; errores?: Errores };
export type Contacto = { canal: Canal; destino: string; pais?: string };

const sinConexion = 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.';

async function llamar<T>(ruta: string, cuerpo?: object): Promise<Respuesta<T>> {
  try {
    const respuesta = await fetch(`/api/${ruta}`, {
      method: cuerpo ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (respuesta.ok) return { ok: true, datos: datos as T };
    return { ok: false, error: datos.error ?? 'Algo salió mal. Intenta de nuevo.', errores: datos.errores };
  } catch {
    return { ok: false, error: sinConexion };
  }
}

export const api = {
  registrar: (entrada: EntradaRegistro) => llamar<Envio>('registro', entrada),
  pedirAcceso: (contacto: Contacto) => llamar<Envio>('acceso', contacto),
  verificar: (contacto: Contacto & { codigo: string }) => llamar<Perfil>('verificar', contacto),
  sesion: () => llamar<Perfil>('sesion'),
  salir: () => llamar<{ ok: true }>('salir', {}),
};
export type Api = typeof api;
