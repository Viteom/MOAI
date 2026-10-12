// Único punto del frontend que habla con la red, y solo con /api del mismo origen
// (src/test/privacy.test.ts lo comprueba). Nada se guarda en el navegador: la sesión es una cookie httpOnly.
import type { Canal, EntradaRegistro, Errores } from './registro';

export type Envio = { canal: Canal; destinoVisible: string };
// Estado de los pasos después del código (docs/09). `skipped` no es `pending`: no se vuelve a preguntar.
export type Paso = "pending" | "completed" | "skipped";
export type Perfil = { nombre: string; ciudad: string | null; barrio: string | null; nacimientoPendiente: boolean; comunidad: Paso };
// `status` 0 = sin conexión: no es lo mismo que «sin sesión» (401).
export type Respuesta<T> = { ok: true; datos: T } | { ok: false; error: string; errores?: Errores; status?: number };
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
    return { ok: false, error: datos.error ?? 'Algo salió mal. Intenta de nuevo.', errores: datos.errores, status: respuesta.status };
  } catch {
    return { ok: false, error: sinConexion, status: 0 };
  }
}

export const api = {
  registrar: (entrada: EntradaRegistro) => llamar<Envio>('registro', entrada),
  pedirAcceso: (contacto: Contacto) => llamar<Envio>('acceso', contacto),
  verificar: (contacto: Contacto & { codigo: string }) => llamar<Perfil>('verificar', contacto),
  sesion: () => llamar<Perfil>('sesion'),
  guardarNacimiento: (fechaNacimiento: string) => llamar<Perfil>('perfil/nacimiento', { fechaNacimiento }),
  guardarComunidad: (comunidad: { ciudad: string; barrio?: string } | { omitir: true }) => llamar<Perfil>('perfil/comunidad', comunidad),
  salir: () => llamar<{ ok: true }>('salir', {}),
};
export type Api = typeof api;
