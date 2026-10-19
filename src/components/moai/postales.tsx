// Mi barrio en tinta y postales (dirección de Mateo, 19 de octubre de 2026: mezcla de «barrio vivo», «mapa en tinta» y
// «postales»). El mapa dibuja solo lo que es verdad: las celdas de ~1 km alrededor de tu zona, con el nombre del barrio
// de cada una (catálogo público), y un sello por plan. Cada plan es una postal con su viñeta y el mismo sello, que
// une la postal con su lugar en el mapa. Nunca hay coordenadas ni direcciones de personas (regla 1).
import { useMemo, type ReactNode } from 'react';
import type { Mapa, Plan } from '@/lib/api';
import type { Tipo } from '@/lib/lugares';
import { nombreTipoOrganizacion } from '@/lib/organizaciones';

// Quién está detrás de un plan: una persona o, en las convocatorias, una entidad verificada por el equipo.
export const quienPropone = (plan: Plan) => plan.organizacion
  ? (plan.mio ? `Lo publicaste a nombre de ${plan.organizacion.nombre}` : `Convoca ${plan.organizacion.nombre} · ${nombreTipoOrganizacion(plan.organizacion.tipo)}`)
  : plan.mio ? 'Lo propusiste tú' : `Lo propone ${plan.autor}`;

const capital = (t: string) => t.charAt(0).toLocaleUpperCase('es') + t.slice(1);
export const cuandoCorto = (plan: Plan) => {
  const fecha = new Date(plan.cuando);
  const hora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(fecha);
  const horaJunta = hora.replace(/\s/g, '\u00a0'); // «8:00 a. m.» no se parte entre renglones
  if (plan.repite) return `Todos los ${plan.diaRepite}, ${horaJunta}`;
  return capital(`${new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(fecha)}, ${horaJunta}`);
};

type Disponible = Extract<Mapa, { disponible: true }>;
const MARGEN = 220; // metros alrededor del tablero

export const claseDePlan = (plan: Plan) => plan.voy || plan.mio ? 'es-mio' : plan.organizacion ? 'es-convocatoria' : plan.repite ? 'es-semanal' : 'es-semana';
const diaCorto = (plan: Plan) => new Intl.DateTimeFormat('es-CO', { weekday: 'short' }).format(new Date(plan.cuando)).replace('.', '');
// En el sello, la hora grande y «a. m.» o «p. m.» aparte, para que quepa en el círculo.
const horaCorta = (plan: Plan) => {
  const d = new Date(plan.cuando);
  return { hora: `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`, franja: d.getHours() < 12 ? 'a. m.' : 'p. m.' };
};

// Viñetas dibujadas a tinta, con gente pequeña: el «barrio vivo» dentro de cada postal.
const VINETAS: Record<Tipo, ReactNode> = {
  caminar: <>
    <path d="M4 50 C 24 46, 44 52, 76 47"/>
    <circle cx="27" cy="18" r="4"/><path d="M27 22 L 26 35 M26 35 L 21 47 M26 35 L 31 46 M26 26 L 20 32 M26 26 L 33 30"/>
    <circle cx="41" cy="20" r="3.6"/><path d="M41 24 L 41 36 M41 36 L 37 47 M41 36 L 46 46 M41 27 L 35 31 M41 27 L 47 32"/>
    <path d="M62 46 L 62 30 M62 30 C 52 28, 52 14, 62 12 C 72 14, 72 28, 62 30"/>
  </>,
  tinto: <>
    <path d="M10 48 L 70 48"/>
    <path d="M18 30 L 20 46 L 34 46 L 36 30 Z M36 34 C 42 34, 42 42, 35 42"/>
    <path d="M44 30 L 46 46 L 60 46 L 62 30 Z M62 34 C 68 34, 68 42, 61 42"/>
    <path d="M24 26 C 21 21, 28 18, 25 12 M30 26 C 27 21, 34 18, 31 12 M50 26 C 47 21, 54 18, 51 12"/>
  </>,
  huerta: <>
    <path d="M6 48 C 26 40, 54 40, 74 48"/>
    <path d="M22 44 L 22 30 M22 34 C 14 32, 14 24, 21 26 M22 31 C 30 28, 30 20, 23 22"/>
    <path d="M40 42 L 40 22 M40 28 C 31 26, 31 16, 39 18 M40 25 C 49 22, 49 13, 41 15"/>
    <path d="M58 44 L 58 32 M58 35 C 51 33, 51 27, 57 28 M58 33 C 65 31, 65 25, 59 26"/>
    <circle cx="66" cy="14" r="5"/>
  </>,
  ajedrez: <>
    <path d="M14 18 L 54 18 L 54 50 L 14 50 Z M14 26 L 54 26 M14 34 L 54 34 M14 42 L 54 42 M24 18 L 24 50 M34 18 L 34 50 M44 18 L 44 50"/>
    <circle cx="66" cy="22" r="4"/><path d="M66 26 C 61 32, 62 40, 60 46 L 72 46 C 70 40, 71 32, 66 26 M58 50 L 74 50"/>
  </>,
  tejer: <>
    <circle cx="34" cy="34" r="14"/><path d="M22 28 C 30 34, 40 34, 47 27 M21 37 C 30 42, 40 42, 48 36 M27 21 C 34 28, 36 40, 33 48"/>
    <path d="M50 12 L 70 50 M60 10 L 54 52"/><path d="M48 34 C 56 40, 60 46, 70 48"/>
  </>,
  mandados: <>
    <path d="M20 26 L 60 26 L 56 50 L 24 50 Z M30 26 C 30 14, 50 14, 50 26"/>
    <path d="M34 26 C 32 16, 40 12, 42 22 M46 26 C 50 18, 58 20, 52 26"/>
  </>,
  voluntariado: <>
    <path d="M6 48 C 26 44, 54 44, 74 48"/>
    <path d="M30 46 L 30 30 M30 30 C 20 28, 20 14, 30 12 C 40 14, 40 28, 30 30"/>
    <circle cx="54" cy="18" r="4"/><path d="M54 22 L 54 35 M54 35 L 49 46 M54 35 L 59 46 M54 26 L 44 30 M54 26 L 62 31"/>
    <path d="M38 40 L 44 30"/>
  </>,
  otro: <>
    <path d="M10 48 L 70 48 M16 36 L 64 36 M18 36 L 16 48 M62 36 L 64 48 M16 30 L 64 30"/>
    <path d="M70 48 L 70 12 M70 12 C 64 12, 62 16, 62 18 M62 18 L 66 18"/>
  </>,
};
export function Vineta({ tipo }: { tipo: Tipo }) {
  return <svg className="vineta" viewBox="0 0 80 60" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{VINETAS[tipo] ?? VINETAS.otro}</svg>;
}

// El sello postal: día y hora del plan, con las líneas onduladas de matasellos. El mismo sello marca el mapa.
export function Sello({ plan }: { plan: Plan }) {
  return <span className={`sello ${claseDePlan(plan)}`} aria-hidden="true">
    <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="37"/></svg>
    <span className="sello-dia">{diaCorto(plan)}</span>
    <span className="sello-hora">{horaCorta(plan).hora}</span>
    <span className="sello-franja">{horaCorta(plan).franja}</span>
    <svg className="sello-ondas" viewBox="0 0 60 30"><path d="M0 6 C 10 0, 20 12, 30 6 S 50 0, 60 6 M0 15 C 10 9, 20 21, 30 15 S 50 9, 60 15 M0 24 C 10 18, 20 30, 30 24 S 50 18, 60 24"/></svg>
  </span>;
}

// Nombre de barrio partido en dos renglones si es largo, para que quepa en su celda.
function renglones(nombre: string): string[] {
  if (nombre.length <= 10) return [nombre];
  const palabras = nombre.split(' ');
  let mejor = [nombre];
  for (let i = 1; i < palabras.length; i++) {
    const a = palabras.slice(0, i).join(' '), b = palabras.slice(i).join(' ');
    if (Math.max(a.length, b.length) < Math.max(...mejor.map(m => m.length))) mejor = [a, b];
  }
  return mejor;
}

export function MapaTinta({ mapa, planes, elegido, onElegir }: { mapa: Disponible; planes: Plan[]; elegido: string | null; onElegir: (id: string) => void }) {
  const caja = useMemo(() => {
    const xs = mapa.celdas.flatMap(c => c.puntos.map(p => p[0])), ys = mapa.celdas.flatMap(c => c.puntos.map(p => p[1]));
    const x0 = Math.min(...xs) - MARGEN, y0 = Math.min(...ys) - MARGEN;
    return { x0, y0, ancho: Math.max(...xs) + MARGEN - x0, alto: Math.max(...ys) + MARGEN - y0 };
  }, [mapa]);
  const visibles = mapa.planes.flatMap(m => { const plan = planes.find(p => p.id === m.id); return plan ? [{ ...m, plan }] : []; });
  const pct = (x: number, y: number) => ({ left: `${((x - caja.x0) / caja.ancho) * 100}%`, top: `${((y - caja.y0) / caja.alto) * 100}%` });
  const centro = mapa.celdas.find(c => c.anillo === 0) ?? mapa.celdas[0];
  const radioCelda = centro?.puntos[0] ? Math.hypot(centro.puntos[0][0] - centro.x, centro.puntos[0][1] - centro.y) : 460; // ~460 m en res 8
  // Si un sello cae en una celda, su nombre baja para que el sello no lo tape.
  const celdaDe = (x: number, y: number) => mapa.celdas.reduce((a, c) => Math.hypot(c.x - x, c.y - y) < Math.hypot(a.x - x, a.y - y) ? c : a, mapa.celdas[0]);
  const haciaFuera = (c: { x: number; y: number }) => { const d = Math.hypot(c.x, c.y) || 1; return [c.x / d, c.y / d] as const; };
  const conSello = (c: { x: number; y: number }) => visibles.some(v => celdaDe(v.x, v.y) === c);
  const lugarDelSello = (v: { x: number; y: number }) => {
    const c = celdaDe(v.x, v.y);
    if (!c?.barrio || c.anillo === 0) return { x: v.x, y: v.y };
    const [ux, uy] = haciaFuera(c);
    return { x: c.x - ux * radioCelda * 0.32, y: c.y - uy * radioCelda * 0.32 };
  };
  const lugarDelNombre = (c: { x: number; y: number }) => {
    if (!conSello(c)) return pct(c.x, c.y);
    const [ux, uy] = haciaFuera(c);
    return pct(c.x + ux * radioCelda * 0.48, c.y + uy * radioCelda * 0.48);
  };
  const sellos = visibles.map(v => ({ ...v, ...lugarDelSello(v) }));
  const elegidoEnMapa = sellos.find(v => v.id === elegido);

  return <div className="mapa-tinta" style={{ aspectRatio: `${caja.ancho} / ${caja.alto}` }}>
    <svg viewBox={`${caja.x0} ${caja.y0} ${caja.ancho} ${caja.alto}`} aria-hidden="true">
      <defs>
        <filter id="tinta" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7"/>
          <feDisplacementMap in="SourceGraphic" scale="14"/>
        </filter>
      </defs>
      <g filter="url(#tinta)">
        {mapa.celdas.map(c => <path key={c.id ?? `${c.x}:${c.y}`} className={`celda anillo-${c.anillo}`} d={`M${c.puntos.map(p => p.join(' ')).join(' L')} Z`}/>)}
        <circle className="anillo-guia" cx={0} cy={0} r={radioCelda * 2.6}/>
        <circle className="anillo-guia" cx={0} cy={0} r={radioCelda * 4.4}/>
      </g>
      {elegidoEnMapa && <path key={elegidoEnMapa.id} className="trazo" pathLength={1} d={`M0 0 Q ${elegidoEnMapa.x * 0.5 + elegidoEnMapa.y * 0.25} ${elegidoEnMapa.y * 0.5 - elegidoEnMapa.x * 0.25} ${elegidoEnMapa.x} ${elegidoEnMapa.y}`}/>}
    </svg>
    {mapa.celdas.filter(c => c.barrio && c.anillo > 0).map(c => { const lineas = renglones(c.barrio!); return <span key={`b${c.id}`}
      className={`nombre-barrio anillo-${c.anillo}${Math.max(...lineas.map(l => l.length)) > 11 ? ' largo' : ''}`} style={lugarDelNombre(c)} aria-hidden="true">
      {lineas.map(r => <span key={r}>{r}</span>)}
    </span>; })}
    <span className="mapa-tu" style={pct(0, 0)}><span className="mapa-tu-punto" aria-hidden="true"/>Tú{centro?.barrio && <small>{centro.barrio}</small>}</span>
    <span className="mapa-etiqueta-anillo" style={pct(0, -radioCelda * 2.6)}>cerca</span>
    <span className="mapa-etiqueta-anillo" style={pct(0, -radioCelda * 4.4)}>tu zona</span>
    {sellos.map(v => <button key={v.id} type="button" className={`mapa-sello ${claseDePlan(v.plan)}${elegido === v.id ? ' elegido' : ''}`} style={pct(v.x, v.y)}
      aria-pressed={elegido === v.id} aria-label={`${v.plan.titulo}. ${cuandoCorto(v.plan)}. ${quienPropone(v.plan)}`} onClick={() => onElegir(v.id)}>
      <Vineta tipo={v.plan.tipo}/>
      <span className="mapa-sello-hora" aria-hidden="true">{diaCorto(v.plan)} {horaCorta(v.plan).hora}</span>
    </button>)}
  </div>;
}
