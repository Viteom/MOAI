// Reglas del registro, compartidas por el formulario (src/) y el servidor (server/).
// REVISIÓN HUMANA: datos personales y consentimiento (Ley 1581). Los textos legales son borradores.
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';
import municipiosJson from './colombia/municipios.json';

export type Canal = 'correo' | 'whatsapp';
export type Municipio = { codigo: string; nombre: string; departamento: string };

export const EDAD_MINIMA = 18;
// Apagado hasta contratar Twilio (decisión de Mateo, octubre de 2026). El servidor también lo rechaza sin proveedor.
export const WHATSAPP_DISPONIBLE = false;
// Cambia cuando cambie el texto de términos o de tratamiento de datos: se guarda con cada aceptación.
export const VERSION_TEXTOS = '2026-10-16-borrador-mi-cuenta';

export const municipios: Municipio[] = (municipiosJson as [string, string, string][])
  .map(([codigo, nombre, departamento]) => ({ codigo, nombre, departamento }));
const porCodigo = new Map(municipios.map(m => [m.codigo, m]));
export const municipioPorCodigo = (codigo: string) => porCodigo.get(codigo);

const sinTildes = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export function buscarMunicipios(texto: string, limite = 8): Municipio[] {
  const q = sinTildes(texto.trim());
  if (!q) return [];
  const empieza: Municipio[] = [], contiene: Municipio[] = [];
  for (const m of municipios) {
    const nombre = sinTildes(m.nombre);
    if (nombre.startsWith(q) || nombre.split(/[\s-]/).some(p => p.startsWith(q))) empieza.push(m);
    else if (nombre.includes(q) || sinTildes(m.departamento).startsWith(q)) contiene.push(m);
  }
  return [...empieza, ...contiene].slice(0, limite);
}

export type Pais = { codigo: CountryCode; nombre: string; prefijo: string };
export function paises(idioma = 'es'): Pais[] {
  const nombres = new Intl.DisplayNames([idioma], { type: 'region' });
  const lista = getCountries().map(codigo => ({ codigo, nombre: nombres.of(codigo) ?? codigo, prefijo: `+${getCountryCallingCode(codigo)}` }));
  lista.sort((a, b) => a.codigo === 'CO' ? -1 : b.codigo === 'CO' ? 1 : a.nombre.localeCompare(b.nombre, idioma));
  return lista;
}

const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function normalizarDestino(canal: Canal, destino: string, pais: string = 'CO'): string | null {
  if (canal === 'correo') {
    const correo = destino.trim().toLowerCase();
    return correoValido.test(correo) && correo.length <= 254 ? correo : null;
  }
  const numero = parsePhoneNumberFromString(destino.trim(), pais as CountryCode);
  return numero?.isValid() ? numero.number : null;
}

export function edadEn(fechaNacimiento: string, hoy: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaNacimiento);
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  let edad = hoy.getUTCFullYear() - anio;
  if (hoy.getUTCMonth() + 1 < mes || (hoy.getUTCMonth() + 1 === mes && hoy.getUTCDate() < dia)) edad--;
  return edad;
}

// Registro liviano (diseño de Mateo, 12 de octubre de 2026): nombre, contacto y los dos consentimientos.
// La fecha de nacimiento y la ciudad se piden después del código, en pasos propios.
export type EntradaRegistro = {
  nombre: string; canal: Canal; destino: string; pais?: string;
  aceptaTerminos: boolean; aceptaDatos: boolean;
};
export type Registro = Omit<EntradaRegistro, 'pais'>;
export type Errores = Partial<Record<keyof EntradaRegistro | 'fechaNacimiento' | 'ciudad' | 'barrio', string>>;

export function validarRegistro(entrada: Partial<EntradaRegistro>): { ok: true; registro: Registro } | { ok: false; errores: Errores } {
  const errores: Errores = {};
  const nombre = (entrada.nombre ?? '').trim().replace(/\s+/g, ' ');
  if (!nombre) errores.nombre = 'Escribe tu nombre o cómo te gusta que te llamen.';
  else if (nombre.length > 60) errores.nombre = 'Usa un nombre más corto.';
  const canal: Canal = entrada.canal === 'whatsapp' ? 'whatsapp' : 'correo';
  const destino = normalizarDestino(canal, entrada.destino ?? '', entrada.pais);
  if (!destino) errores.destino = canal === 'correo' ? 'Revisa tu correo: parece incompleto.' : 'Revisa el número y el país.';
  if (entrada.aceptaTerminos !== true) errores.aceptaTerminos = 'Necesitamos que aceptes los términos y la política de privacidad.';
  if (entrada.aceptaDatos !== true) errores.aceptaDatos = 'Necesitamos tu autorización para tratar tus datos.';
  if (Object.keys(errores).length) return { ok: false, errores };
  return { ok: true, registro: { nombre, canal, destino: destino!, aceptaTerminos: true, aceptaDatos: true } };
}

// Paso posterior al código: fecha de nacimiento (edad mínima y «momentos de verdad»).
export function validarNacimiento(fechaNacimiento: string, hoy: Date): { ok: true } | { ok: false; error: string; menor?: true } {
  const edad = edadEn(fechaNacimiento, hoy);
  if (edad === null || edad < 0 || edad > 120) return { ok: false, error: 'Revisa tu fecha de nacimiento.' };
  if (edad < EDAD_MINIMA) return { ok: false, error: `Por ahora MOAI es para personas de ${EDAD_MINIMA} años o más.`, menor: true };
  return { ok: true };
}

export function enmascarar(canal: Canal, destino: string): string {
  if (canal === 'correo') {
    const [usuario, dominio] = destino.split('@');
    return `${usuario.slice(0, 1)}•••@${dominio}`;
  }
  const prefijo = parsePhoneNumberFromString(destino)?.countryCallingCode;
  return `${prefijo ? `+${prefijo} ` : ''}•••• ${destino.slice(-4)}`;
}

export const codigoValido = (codigo: string) => /^\d{6}$/.test(codigo);
