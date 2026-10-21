// Mi barrio: el escenario ilustrado con sus luces (rediseño de Mateo, 19 de octubre de 2026).
// - El fondo es una ilustración estática: no representa calles ni edificios reales, y la pantalla lo dice.
// - Cada luz es un plan, nunca una persona ni un domicilio. Su posición sale de la celda del plan respecto a tu zona,
//   repartida dentro de una zona segura de la ilustración: indica cerca o lejos, no el lugar exacto.
// - Las luces viven dentro del mismo lienzo que la imagen, así que quedan ancladas a ella en cualquier tamaño.
// - Como mucho dos burbujas de invitación a la vez; al elegir un plan desaparecen y se abre su tarjeta.
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { Mapa, Plan } from '@/lib/api';
import { nombreTipoOrganizacion } from '@/lib/organizaciones';
import type { NombreImagen } from './interna';
import { FondoCiudad } from './fondo-ciudad';

// Quién está detrás de un plan: una persona o, en las convocatorias, una entidad verificada por el equipo.
export const quienPropone = (plan: Plan) => plan.organizacion
  ? (plan.mio ? `Lo publicaste a nombre de ${plan.organizacion.nombre}` : `Convoca ${plan.organizacion.nombre} · ${nombreTipoOrganizacion(plan.organizacion.tipo)}`)
  : plan.mio ? 'Lo propusiste tú' : `Lo propone ${plan.autor}`;

const capital = (t: string) => t.charAt(0).toLocaleUpperCase('es') + t.slice(1);
export const cuandoCorto = (plan: Plan) => {
  const fecha = new Date(plan.cuando);
  const hora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(fecha);
  const horaJunta = hora.replace(/\s/g, ' '); // «8:00 a. m.» no se parte entre renglones
  if (plan.repite) return `Todos los ${plan.diaRepite} · ${horaJunta}`;
  return capital(`${new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(fecha)} · ${horaJunta}`);
};

export const claseDePlan = (plan: Plan) => plan.voy || plan.mio ? 'es-mio' : plan.organizacion ? 'es-convocatoria' : plan.repite ? 'es-semanal' : 'es-semana';
// La miniatura de cada tipo de plan: un recorte de la misma ilustración (decorativo).
export const imagenDePlan = (plan: Plan): NombreImagen => ({ caminar: 'plan', tinto: 'moai', huerta: 'gente', voluntariado: 'gente' } as Record<string, NombreImagen>)[plan.tipo] ?? 'crear';

type Disponible = Extract<Mapa, { disponible: true }>;
const MAX_BURBUJAS = 2;
const posicion = (px: number, py: number) => ({ ['--px' as string]: px.toFixed(3), ['--py' as string]: py.toFixed(3) });

export function EscenaBarrio({ ciudad, mapa, planes, elegido, onElegir }: { ciudad?: string; mapa?: Disponible; planes: Plan[]; elegido: string | null; onElegir: (id: string | null) => void }) {
  const escena = useRef<HTMLDivElement>(null);
  // De metros alrededor de tu zona a 0..1 dentro de la zona segura de la ilustración (la que se ve en todo tamaño).
  const radio = useMemo(() => Math.max(1, ...(mapa?.celdas ?? []).flatMap(c => c.puntos.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y))))), [mapa]);
  const luces = (mapa?.planes ?? []).flatMap(m => {
    const plan = planes.find(p => p.id === m.id);
    return plan ? [{ plan, px: 0.5 + m.x / (2 * radio), py: 0.5 + m.y / (2 * radio) }] : [];
  });
  const burbujas = elegido ? [] : luces.slice(0, MAX_BURBUJAS);

  // Las invitaciones son decorativas: si no caben, se conserva la luz accesible.
  // Se miden también los controles, para no taparlos con un título largo o al girar el teléfono.
  useLayoutEffect(() => {
    const el = escena.current;
    if (!el) return;
    const reservados = [...(el.closest('.barrio')?.querySelectorAll<HTMLElement>('[data-reserva-barrio], .barra') ?? [])];
    const medir = () => {
      const limite = el.getBoundingClientRect();
      const ocupados = reservados.map(n => n.getBoundingClientRect());
      const luces = [...el.querySelectorAll<HTMLElement>('.luz')];
      const intersecta = (a: DOMRect, b: DOMRect) => a.left < b.right + 8 && a.right > b.left - 8 && a.top < b.bottom + 8 && a.bottom > b.top - 8;
      el.querySelectorAll<HTMLElement>('.burbuja-invitacion').forEach(b => {
        const r = b.getBoundingClientRect();
        const otrasLuces = luces.filter(l => l.dataset.plan !== b.dataset.plan).map(l => l.getBoundingClientRect());
        const noCabe = r.left < limite.left + 12 || r.right > limite.right - 12 || r.top < limite.top + 12 || r.bottom > limite.bottom - 12
          || [...ocupados, ...otrasLuces].some(o => intersecta(r, o));
        b.dataset.oculta = String(noCabe);
        if (!noCabe) ocupados.push(r);
      });
    };
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medir);
    [el, ...reservados, ...el.querySelectorAll<HTMLElement>('.burbuja-invitacion')].forEach(n => observador.observe(n));
    return () => observador.disconnect();
  }, [elegido, mapa, planes]);

  return <div className="escena-barrio" ref={escena} onClick={e => { if (e.target === e.currentTarget) onElegir(null); }}>
    <div className="escena-lienzo" onClick={e => { if (e.target === e.currentTarget) onElegir(null); }}>
      <FondoCiudad ciudad={ciudad}/>
      {luces.map(({ plan, px, py }) => <button key={plan.id} type="button" data-plan={plan.id} className={`luz ${claseDePlan(plan)}${elegido === plan.id ? ' elegida' : ''}`}
        style={posicion(px, py)} aria-pressed={elegido === plan.id}
        aria-label={`${plan.titulo}. ${cuandoCorto(plan)}. ${quienPropone(plan)}`} onClick={() => onElegir(elegido === plan.id ? null : plan.id)}>
        <span aria-hidden="true"/>
      </button>)}
      {burbujas.map(({ plan, px, py }, i) => <span key={`b${plan.id}`} aria-hidden="true" data-plan={plan.id}
        className={`burbuja-invitacion ${claseDePlan(plan)}${i === 1 && py < 0.65 ? ' abajo' : ''}`} style={posicion(px, py)}>
        <strong>{plan.organizacion?.nombre ?? (plan.mio ? 'Tú' : plan.autor)}</strong>{plan.titulo}
      </span>)}
    </div>
  </div>;
}
