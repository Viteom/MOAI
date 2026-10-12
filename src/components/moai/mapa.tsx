// Mapa de la comunidad (diseño de Mateo, 12 de octubre): tablero de hexágonos de ~1 km alrededor de tu zona,
// con una luz por plan y burbujas tipo chat. Las luces son planes en lugares públicos, nunca personas.
// Sin servicios de mapas externos: el tablero se dibuja aquí con lo que manda el servidor (metros relativos).
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, MapPin, Navigation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Mapa, Plan } from '@/lib/api';

type Disponible = Extract<Mapa, { disponible: true }>;
const MARGEN = 260; // metros alrededor del tablero
const MAX_BURBUJAS = 3;

const capital = (t: string) => t.charAt(0).toLocaleUpperCase('es') + t.slice(1);
const minuscula = (t: string) => t.charAt(0).toLocaleLowerCase('es') + t.slice(1);
export const cuandoCorto = (plan: Plan) => {
  const fecha = new Date(plan.cuando);
  const hora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(fecha);
  if (plan.repite) return `Todos los ${plan.diaRepite}, ${hora}`;
  return capital(`${new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(fecha)}, ${hora}`);
};
const claseLuz = (plan: Plan) => plan.voy || plan.mio ? 'luz-mia' : plan.repite ? 'luz-semanal' : 'luz-semana';

// Lucecitas de ventanas dentro de cada hexágono: decorativas y siempre iguales (semilla por posición).
function ventanas(x: number, y: number) {
  let s = Math.abs(x * 73856093 ^ y * 19349663) >>> 0;
  const azar = () => ((s = (s * 1103515245 + 12345) >>> 0) % 1000) / 1000;
  return Array.from({ length: 9 }, () => ({ x: x + (azar() - 0.5) * 520, y: y + (azar() - 0.5) * 480, r: 6 + azar() * 7 }));
}

export function MapaComunidad({ mapa, planes, elegido, onElegir, burbujasDe }: {
  mapa: Disponible; planes: Plan[]; elegido: string | null; onElegir: (id: string | null) => void; burbujasDe?: (plan: Plan) => string;
}) {
  const caja = useMemo(() => {
    const xs = mapa.celdas.flatMap(c => c.puntos.map(p => p[0])), ys = mapa.celdas.flatMap(c => c.puntos.map(p => p[1]));
    const minX = Math.min(...xs) - MARGEN, minY = Math.min(...ys) - MARGEN;
    return { minX, minY, ancho: Math.max(...xs) + MARGEN - minX, alto: Math.max(...ys) + MARGEN - minY };
  }, [mapa]);
  // Ancho real del mapa en pantalla, para saber cuánto terreno tapa una burbuja.
  const ref = useRef<HTMLDivElement>(null);
  const [anchoPx, setAnchoPx] = useState(800);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const medir = new ResizeObserver(() => setAnchoPx(el.clientWidth || 800));
    medir.observe(el);
    return () => medir.disconnect();
  }, []);
  const porId = new Map(planes.map(p => [p.id, p]));
  const luces = mapa.planes.filter(l => porId.has(l.id));
  // Burbujas: las más cercanas a tu zona, sin repetir autor. Al sur de tu zona van debajo de la luz (para no tapar
  // «Tu zona»); si chocan con otra se pasan al otro lado, y si tampoco caben, queda solo la luz.
  const metrosPorPx = caja.ancho / anchoPx;
  const anchoB = 240 * metrosPorPx, altoB = 100 * metrosPorPx, separacion = 30 * metrosPorPx;
  const puestas: { id: string; abajo: boolean; caja: [number, number, number, number] }[] = [];
  for (const l of [...luces].sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))) {
    if (puestas.length >= MAX_BURBUJAS || puestas.some(p => porId.get(p.id)!.autor === porId.get(l.id)!.autor)) continue;
    for (const abajo of l.y > 0 ? [true, false] : [false, true]) {
      const y0 = abajo ? l.y + separacion : l.y - separacion - altoB;
      const rect: [number, number, number, number] = [l.x - anchoB / 2, y0, l.x + anchoB / 2, y0 + altoB];
      if (puestas.some(({ caja: c }) => rect[0] < c[2] && rect[2] > c[0] && rect[1] < c[3] && rect[3] > c[1])) continue;
      puestas.push({ id: l.id, abajo, caja: rect });
      break;
    }
  }
  const conBurbuja = puestas.map(p => ({ ...luces.find(l => l.id === p.id)!, abajo: p.abajo }));
  const pct = (x: number, y: number) => ({ left: `${((x - caja.minX) / caja.ancho) * 100}%`, top: `${((y - caja.minY) / caja.alto) * 100}%` });
  const centro = mapa.celdas.find(c => c.anillo === 0)!;
  const texto = burbujasDe ?? ((p: Plan) => `${p.mio ? 'Tú' : p.autor}: ${minuscula(p.titulo)}`);

  return <div ref={ref} className="mapa" style={{ aspectRatio: `${caja.ancho} / ${caja.alto}` }}>
    <svg viewBox={`${caja.minX} ${caja.minY} ${caja.ancho} ${caja.alto}`} className="mapa-tablero" aria-hidden="true">
      <defs>
        <radialGradient id="hex-fondo"><stop offset="0%" stopColor="oklch(.33 .06 160)"/><stop offset="100%" stopColor="oklch(.2 .04 170)"/></radialGradient>
        <radialGradient id="hex-centro"><stop offset="0%" stopColor="oklch(.4 .08 155)"/><stop offset="100%" stopColor="oklch(.24 .05 165)"/></radialGradient>
        <filter id="brillo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
      </defs>
      {mapa.celdas.map(c => <g key={`${c.x},${c.y}`} className={`hex anillo-${c.anillo}`}>
        <polygon points={c.puntos.map(p => p.join(',')).join(' ')} fill={c.anillo === 0 ? 'url(#hex-centro)' : 'url(#hex-fondo)'}/>
        {ventanas(c.x, c.y).map((v, i) => <circle key={i} className="ventana" cx={v.x} cy={v.y} r={v.r}/>)}
      </g>)}
      <polygon className="hex-borde-centro" points={centro.puntos.map(p => p.join(',')).join(' ')}/>
      {luces.map(l => <g key={l.id} className={`luz ${claseLuz(porId.get(l.id)!)}${elegido === l.id ? ' elegida' : ''}`}>
        <circle cx={l.x} cy={l.y} r={95} filter="url(#brillo)" className="luz-halo"/>
        <circle cx={l.x} cy={l.y} r={42} className="luz-centro"/>
      </g>)}
    </svg>
    <span className="mapa-tu-zona" style={pct(centro.x, centro.y + 200)}>Tu zona</span>
    {luces.map(l => {
      const plan = porId.get(l.id)!;
      return <button key={l.id} type="button" className="mapa-luz" style={pct(l.x, l.y)} aria-pressed={elegido === l.id}
        aria-label={`${plan.titulo} · ${cuandoCorto(plan)} · ${plan.lugarPublico} · ${plan.franja}`} onClick={() => onElegir(elegido === l.id ? null : l.id)}/>;
    })}
    {conBurbuja.map(l => {
      const plan = porId.get(l.id)!;
      const [quien, ...resto] = texto(plan).split(': ');
      // Nunca se sale de la pantalla: la burbuja se corre hacia adentro y la colita sigue apuntando a la luz.
      const { abajo } = l;
      const { left, top } = pct(l.x, l.y);
      return <span key={`b-${l.id}`} aria-hidden="true">
        <button type="button" className={`mapa-burbuja${abajo ? ' abajo' : ''}`} tabIndex={-1} onClick={() => onElegir(l.id)}
          style={{ top, left: `clamp(var(--borde-burbuja), ${left}, calc(100% - var(--borde-burbuja)))` }}>
          <strong>{quien}:</strong> {resto.join(': ')}
        </button>
        <span className={`mapa-burbuja-cola${abajo ? ' abajo' : ''}`} style={{ left, top }}/>
      </span>;
    })}
  </div>;
}

// La tarjeta del plan elegido: hoja que sube en móvil, tarjeta abajo a la izquierda en desktop.
export function TarjetaMapa({ plan, onCerrar, onIr, onNoIr, onAbrir }: { plan: Plan; onCerrar: () => void; onIr: () => void; onNoIr: () => void; onAbrir: () => void }) {
  return <section className="mapa-tarjeta" aria-labelledby="mapa-tarjeta-titulo" data-reserva>
    <button type="button" className="mapa-cerrar" aria-label="Cerrar" onClick={onCerrar}><X aria-hidden="true"/></button>
    <h2 id="mapa-tarjeta-titulo">{plan.titulo}</h2>
    <p><CalendarDays aria-hidden="true"/>{cuandoCorto(plan)}</p>
    <p><MapPin aria-hidden="true"/>Lugar público: {plan.lugarPublico}</p>
    <p><Navigation aria-hidden="true"/>{plan.franja}</p>
    <p className="mapa-tarjeta-autor">{plan.mio ? 'Lo propusiste tú' : `Lo propone ${plan.autor}`}</p>
    {plan.mio ? <Button className="diario-boton principal mapa-tarjeta-boton" onClick={onAbrir}>Ver mi plan</Button>
      : plan.voy ? <div className="plan-acciones"><span className="plan-voy">Vas a ir</span><Button className="diario-boton" onClick={onNoIr}>Ya no voy</Button></div>
      : plan.lleno ? <p className="plan-voy">Completo</p>
      : <Button className="diario-boton principal mapa-tarjeta-boton" onClick={onIr}>Me sumo</Button>}
    {(plan.mio || plan.voy) && <button type="button" className="brisa-enlace" onClick={onAbrir}>Hablar con quienes van</button>}
  </section>;
}
