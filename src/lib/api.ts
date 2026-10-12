// Único punto del frontend que habla con la red, y solo con /api del mismo origen
// (src/test/privacy.test.ts lo comprueba). Nada se guarda en el navegador: la sesión es una cookie httpOnly.
import type { Canal, EntradaRegistro, Errores } from './registro';
import type { Alcance, EntradaLugar, EntradaPlan, Repite, Tipo } from './lugares';

export type Envio = { canal: Canal; destinoVisible: string };
// Estado de los pasos después del código (docs/09). `skipped` no es `pending`: no se vuelve a preguntar.
export type Paso = "pending" | "completed" | "skipped";
// Un lugar guardado. `zona` es el nombre legible («Laureles, Medellín»); la celda nunca sale del servidor.
export type Lugar = { id: string; nombre: string; ciudad: string; barrio: string | null; zona: string; activo: boolean };
export type Perfil = { nombre: string; nacimientoPendiente: boolean; comunidad: Paso; lugar: Lugar | null };
// Un plan visto por alguien: la distancia va por franjas («A menos de 2 km»), nunca exacta.
export type Plan = {
  id: string; titulo: string; descripcion: string; cuando: string; lugarPublico: string; zona: string; franja: string; alcance: Alcance;
  tipo: Tipo; repite: Repite; diaRepite: string | null; autor: string; mio: boolean; voy: boolean; lleno: boolean; asistentes?: string[];
};
// `cuando` es la próxima ocurrencia (en los planes semanales, la de esta semana o la siguiente).
export type Mensaje = { id: string; autor: string; mio: boolean; texto: string; creado: string };
// Lo que Brisa le cuenta a la persona: «fuiste por tu cuenta» o una recomendación que ella pidió (regla 9).
export type Carta =
  | { clave: string; tipo: 'solo'; planId: string; texto: string; repetir: boolean }
  | { clave: string; tipo: 'sugerencia'; planId: string; texto: string; motivo: string; plan: Plan };
export type Preferencias = { sugerencias: boolean; gustos: Tipo[]; resumenSemanal: boolean };
// El mapa de la comunidad: hexágonos a dos anillos de tu zona y las luces de los planes, en metros relativos a tu zona.
export type Mapa = { disponible: false } | { disponible: true; celdas: { x: number; y: number; anillo: number; puntos: [number, number][] }[]; planes: { id: string; x: number; y: number }[] };
// `status` 0 = sin conexión: no es lo mismo que «sin sesión» (401).
export type Respuesta<T> = { ok: true; datos: T } | { ok: false; error: string; errores?: Errores; status?: number };
export type Contacto = { canal: Canal; destino: string; pais?: string };

const sinConexion = 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.';

async function llamar<T>(ruta: string, cuerpo?: object, metodo?: 'DELETE'): Promise<Respuesta<T>> {
  try {
    const respuesta = await fetch(`/api/${ruta}`, {
      method: metodo ?? (cuerpo ? 'POST' : 'GET'),
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
  guardarComunidad: (comunidad: { ciudad: string; barrio?: string | null } | { omitir: true }) => llamar<Perfil>('perfil/comunidad', comunidad),
  lugares: () => llamar<Lugar[]>('lugares'),
  crearLugar: (lugar: EntradaLugar) => llamar<Lugar[]>('lugares', lugar),
  activarLugar: (id: string) => llamar<Lugar[]>(`lugares/${encodeURIComponent(id)}/activar`, {}),
  borrarLugar: (id: string) => llamar<Lugar[]>(`lugares/${encodeURIComponent(id)}`, undefined, 'DELETE'),
  planes: () => llamar<Plan[]>('planes'),
  crearPlan: (plan: EntradaPlan) => llamar<Plan[]>('planes', plan),
  irAPlan: (id: string) => llamar<Plan[]>(`planes/${encodeURIComponent(id)}/ir`, {}),
  noIrAPlan: (id: string) => llamar<Plan[]>(`planes/${encodeURIComponent(id)}/no-ir`, {}),
  cancelarPlan: (id: string) => llamar<Plan[]>(`planes/${encodeURIComponent(id)}/cancelar`, {}),
  plan: (id: string) => llamar<Plan>(`planes/${encodeURIComponent(id)}`),
  repetirPlan: (id: string) => llamar<Plan[]>(`planes/${encodeURIComponent(id)}/repetir`, {}),
  mensajes: (id: string) => llamar<Mensaje[]>(`planes/${encodeURIComponent(id)}/mensajes`),
  enviarMensaje: (id: string, texto: string) => llamar<Mensaje[]>(`planes/${encodeURIComponent(id)}/mensajes`, { texto }),
  cartas: () => llamar<Carta[]>('brisa'),
  cartaVista: (clave: string) => llamar<Carta[]>('brisa/visto', { clave }),
  mapa: () => llamar<Mapa>('mapa'),
  preferencias: () => llamar<Preferencias>('preferencias'),
  guardarPreferencias: (p: Preferencias) => llamar<Preferencias>('preferencias', p),
  salir: () => llamar<{ ok: true }>('salir', {}),
};
export type Api = typeof api;
