// Único punto del frontend que habla con la red, y solo con /api del mismo origen
// (src/test/privacy.test.ts lo comprueba). Nada se guarda en el navegador: la sesión es una cookie httpOnly.
import type { Canal, EntradaRegistro, Errores } from './registro';
import type { Alcance, EntradaLugar, EntradaPlan, Repite, Tipo } from './lugares';
import type { MotivoReporte } from './moai';
import type { TipoOrganizacion } from './organizaciones';

export type Envio = { canal: Canal; destinoVisible: string };
// Estado de los pasos después del código (docs/09). `skipped` no es `pending`: no se vuelve a preguntar.
export type Paso = "pending" | "completed" | "skipped";
// Un lugar guardado. `zona` es el nombre legible («Laureles, Medellín»); la celda nunca sale del servidor.
export type Lugar = { id: string; nombre: string; ciudad: string; barrio: string | null; zona: string; activo: boolean };
// `equipo`: la persona revisa reportes y entidades. `organizaciones`: entidades a nombre de las que puede convocar.
export type OrganizacionPropia = { id: string; nombre: string; tipo: TipoOrganizacion };
export type Perfil = { nombre: string; nacimientoPendiente: boolean; comunidad: Paso; lugar: Lugar | null; equipo?: boolean; organizaciones?: OrganizacionPropia[] };
// Un plan visto por alguien: la distancia va por franjas («A menos de 2 km»), nunca exacta.
export type Plan = {
  id: string; titulo: string; descripcion: string; cuando: string; lugarPublico: string; zona: string; franja: string; alcance: Alcance;
  tipo: Tipo; repite: Repite; diaRepite: string | null; autor: string; autorRef?: string; organizacion?: { nombre: string; tipo: TipoOrganizacion }; mio: boolean; voy: boolean; lleno: boolean; asistentes?: string[];
};
// `cuando` es la próxima ocurrencia (en los planes semanales, la de esta semana o la siguiente).
export type Mensaje = { id: string; autor: string; mio: boolean; texto: string; creado: string };
// Lo que Brisa le cuenta a la persona: «fuiste por tu cuenta» o una recomendación que ella pidió (regla 9).
export type Carta =
  | { clave: string; tipo: 'solo'; planId: string; texto: string; repetir: boolean }
  | { clave: string; tipo: 'sugerencia'; planId: string; texto: string; motivo: string; plan: Plan }
  | { clave: string; tipo: 'gente'; texto: string; motivo?: string };
// Otra persona, vista por ti: `ref` es una referencia que solo sirve en tu cuenta (nunca su identificador).
export type Persona = { ref: string; nombre: string };
// «¿Te viste con…?» después de un plan al que fuiste o que propusiste.
export type Encuentro = { planId: string; titulo: string; ocurrencia: string; personas: Persona[] };
// Personas con las que las dos confirmaron «Ya nos vimos».
export type Conocido = Persona & { moaiComun: boolean; propuesta: boolean };
export type MoaiResumen = { id: string; nombre: string; miembros: (Persona & { yo: boolean })[]; esperando: string[] };
export type Invitacion =
  | { id: string; tipo: 'nuevo'; de: string; nombre: string }
  | { id: string; tipo: 'entrar'; de: string; nombre: string; miembros: string[] }
  | { id: string; tipo: 'aprobar'; de: string; nombre: string; persona: string };
export type Gente = { encuentros: Encuentro[]; conocidos: Conocido[]; moais: MoaiResumen[]; invitaciones: Invitacion[]; pausa: boolean };
export type Reporte = { ref: string; motivo: MotivoReporte; detalle?: string; bloquear?: boolean };
// Solo para el equipo: una persona reportada y sus reportes.
export type CasoReporte = {
  cuenta: string; nombre: string; correo: string; suspendida: boolean; pausa: boolean; pendientes: number;
  reportes: { id: string; de: string; motivo: string; detalle: string; fecha: string; revisado: boolean; decision: string | null }[];
};
export type Decision = 'sin_medidas' | 'suspender' | 'reactivar';
export type OrganizacionEquipo = { id: string; nombre: string; tipo: TipoOrganizacion; activa: boolean; responsables: string[] };
export type EntradaOrganizacion = { nombre: string; tipo: TipoOrganizacion | ''; responsable: string };
export type Preferencias = { sugerencias: boolean; gustos: Tipo[]; resumenSemanal: boolean };
// El mapa de la comunidad: hexágonos a dos anillos de tu zona y las luces de los planes, en metros relativos a tu zona.
export type Mapa = { disponible: false } | { disponible: true; celdas: { id?: string; x: number; y: number; anillo: number; puntos: [number, number][] }[]; planes: { id: string; x: number; y: number }[] };
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
  crearPlan: (plan: EntradaPlan & { organizacion?: string | null }) => llamar<Plan[]>('planes', plan),
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
  gente: () => llamar<Gente>('gente'),
  nosVimos: (e: { planId: string; ocurrencia: string; ref: string; si: boolean }) => llamar<Gente>('gente/encuentro', e),
  proponerMoai: (ref: string, nombre: string) => llamar<Gente>('moais', { ref, nombre }),
  invitarAMoai: (id: string, ref: string) => llamar<Gente>(`moais/${encodeURIComponent(id)}/invitar`, { ref }),
  responderInvitacion: (id: string, acepta: boolean) => llamar<Gente>(`invitaciones/${encodeURIComponent(id)}`, { acepta }),
  renombrarMoai: (id: string, nombre: string) => llamar<Gente>(`moais/${encodeURIComponent(id)}/nombre`, { nombre }),
  salirDeMoai: (id: string) => llamar<Gente>(`moais/${encodeURIComponent(id)}/salir`, {}),
  mensajesMoai: (id: string) => llamar<Mensaje[]>(`moais/${encodeURIComponent(id)}/mensajes`),
  enviarMensajeMoai: (id: string, texto: string) => llamar<Mensaje[]>(`moais/${encodeURIComponent(id)}/mensajes`, { texto }),
  bloquear: (ref: string) => llamar<Gente>('personas/bloquear', { ref }),
  reportar: (reporte: Reporte) => llamar<Gente>('personas/reportar', reporte),
  casos: () => llamar<CasoReporte[]>('equipo/casos'),
  decidirCaso: (cuenta: string, decision: Decision) => llamar<CasoReporte[]>(`equipo/casos/${encodeURIComponent(cuenta)}`, { decision }),
  organizaciones: () => llamar<OrganizacionEquipo[]>('equipo/organizaciones'),
  crearOrganizacion: (o: EntradaOrganizacion) => llamar<OrganizacionEquipo[]>('equipo/organizaciones', o),
  activarOrganizacion: (id: string, activa: boolean) => llamar<OrganizacionEquipo[]>(`equipo/organizaciones/${encodeURIComponent(id)}/activa`, { activa }),
  salir: () => llamar<{ ok: true }>('salir', {}),
};
export type Api = typeof api;

// La maqueta de un hexágono: un archivo estático del mismo origen (public/maqueta), sin datos de personas.
export async function archivoDeMaqueta<T>(celda: string): Promise<T | null> {
  if (!/^[0-9a-f]{15}$/.test(celda)) return null;
  try {
    const respuesta = await fetch(`/maqueta/${celda}.json`, { credentials: 'same-origin' });
    return respuesta.ok ? await respuesta.json() as T : null;
  } catch {
    return null;
  }
}
