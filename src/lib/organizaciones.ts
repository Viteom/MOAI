// Entidades de la ciudad (públicas, privadas o comunitarias) que publican convocatorias: «Buscamos 5 personas
// para sembrar árboles», «Necesitamos voluntarios». Decisión de Mateo (14 de octubre de 2026).
// Solo el equipo de MOAI da de alta una entidad y nombra a sus responsables: así toda convocatoria viene de alguien verificado.

export type TipoOrganizacion = 'publica' | 'privada' | 'comunitaria';
export const tiposOrganizacion: { id: TipoOrganizacion; nombre: string }[] = [
  { id: 'publica', nombre: 'Entidad pública' },
  { id: 'privada', nombre: 'Empresa o entidad privada' },
  { id: 'comunitaria', nombre: 'Organización comunitaria' },
];
export const nombreTipoOrganizacion = (tipo: TipoOrganizacion) => tiposOrganizacion.find(t => t.id === tipo)?.nombre ?? '';

// Una convocatoria puede reunir más gente que un plan entre vecinos.
export const MAX_CUPO_PLAN = 30;
export const MAX_CUPO_CONVOCATORIA = 200;

export function validarOrganizacion(entrada: { nombre?: unknown; tipo?: unknown; responsable?: unknown }):
  { ok: true; nombre: string; tipo: TipoOrganizacion; responsable: string } | { ok: false; errores: Record<string, string> } {
  const errores: Record<string, string> = {};
  const nombre = String(entrada.nombre ?? '').trim().replace(/\s+/g, ' ');
  if (nombre.length < 3) errores.nombre = 'Escribe el nombre de la entidad.';
  else if (nombre.length > 80) errores.nombre = 'Usa un nombre más corto.';
  const tipo = tiposOrganizacion.some(t => t.id === entrada.tipo) ? entrada.tipo as TipoOrganizacion : null;
  if (!tipo) errores.tipo = 'Elige qué tipo de entidad es.';
  const responsable = String(entrada.responsable ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(responsable)) errores.responsable = 'Escribe el correo con el que la persona responsable entra a MOAI.';
  if (Object.keys(errores).length || !tipo) return { ok: false, errores };
  return { ok: true, nombre, tipo, responsable };
}
