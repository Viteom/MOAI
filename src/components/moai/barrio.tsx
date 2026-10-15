// Escenario conceptual: la ilustración no representa calles ni edificios reales.
// Solo las luces provienen del mapa de planes; nunca se inventan actividades.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Mapa, Plan } from '@/lib/api';
import { CapaBurbujas, CapaLuces, reservas, type Punto, type Rect } from './capas';
import { MapaComunidad } from './mapa';

type Disponible = Extract<Mapa, { disponible: true }>;
type Vista = { zoom: number; x: number; y: number }; // x, y: desplazamiento del centro de la imagen (px)

const IMAGEN = { ancho: 1586, alto: 992 };
const ZOOM_MAX = 2.5;

export function BarrioIlustrado({ mapa, planes, elegido, onElegir }: {
  mapa: Disponible; planes: Plan[]; elegido: string | null; onElegir: (id: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ ancho: 1440, alto: 900 });
  const [ocupado, setOcupado] = useState<Rect[]>([]);
  const [vista, setVista] = useState<Vista>({ zoom: 1, x: 0, y: 0 });
  const [fallo, setFallo] = useState(false);
  // Punteros activos: uno arrastra, dos pellizcan.
  const punteros = useRef(new Map<number, Punto>());
  const gesto = useRef<{ distancia: number; medio: Punto } | null>(null);
  const porId = useMemo(() => new Map(planes.map(p => [p.id, p])), [planes]);
  const limites = useMemo(() => {
    const puntos = mapa.celdas.flatMap(c => c.puntos);
    return { radio: Math.max(1, ...puntos.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y)))) };
  }, [mapa]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      setTam({ ancho: el.clientWidth || 1440, alto: el.clientHeight || 900 });
      setOcupado(reservas(el));
    };
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    el.closest('.comunidad')?.querySelectorAll('[data-reserva]').forEach(n => observador.observe(n));
    return () => observador.disconnect();
  }, [elegido, planes.length]);

  // Misma transformación para imagen, luces y burbujas. Sus tamaños de lectura permanecen constantes.
  const base = Math.max(tam.ancho / IMAGEN.ancho, tam.alto / IMAGEN.alto);
  const escala = base * vista.zoom;
  const proyectar = (x: number, y: number) => ({
    x: tam.ancho / 2 + vista.x + x / limites.radio * 570 * escala,
    y: tam.alto / 2 + vista.y + y / limites.radio * 330 * escala,
  });
  const luces = mapa.planes.filter(p => porId.has(p.id)).map(p => ({ id: p.id, ...proyectar(p.x, p.y) }));
  const centro = mapa.celdas.find(c => c.anillo === 0);
  const zona = proyectar(centro?.x ?? 0, centro?.y ?? 0);
  // «Tu zona» también se reserva: ninguna burbuja la tapa.
  const libres: Rect[] = [...ocupado, [zona.x - 70, zona.y - 30, zona.x + 70, zona.y + 30]];

  // La imagen siempre cubre la pantalla: el desplazamiento no deja ver bordes vacíos.
  const limitar = ({ zoom, x, y }: Vista): Vista => {
    const margenX = Math.max(0, (IMAGEN.ancho * base * zoom - tam.ancho) / 2);
    const margenY = Math.max(0, (IMAGEN.alto * base * zoom - tam.alto) / 2);
    return { zoom, x: Math.max(-margenX, Math.min(margenX, x)), y: Math.max(-margenY, Math.min(margenY, y)) };
  };
  // Acercar dejando quieto el punto de la imagen que está bajo el cursor o entre los dedos (por defecto, el centro).
  const acercar = (factor: number, punto: Punto = { x: tam.ancho / 2, y: tam.alto / 2 }) => setVista(v => {
    const zoom = Math.min(ZOOM_MAX, Math.max(1, v.zoom * factor));
    const k = zoom / v.zoom;
    const px = punto.x - tam.ancho / 2, py = punto.y - tam.alto / 2;
    return limitar({ zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
  });
  const local = (e: { clientX: number; clientY: number }): Punto => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const medidaDelGesto = () => {
    const [a, b] = [...punteros.current.values()];
    return { distancia: Math.hypot(a.x - b.x, a.y - b.y), medio: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  if (fallo) return <MapaComunidad mapa={mapa} planes={planes} elegido={elegido} onElegir={onElegir}/>;
  return <div ref={ref} className="maqueta barrio-ilustrado">
    <div className="barrio-arrastre"
      onWheel={e => acercar(e.deltaY < 0 ? 1.12 : 1 / 1.12, local(e))}
      onPointerDown={e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        punteros.current.set(e.pointerId, local(e));
        gesto.current = punteros.current.size === 2 ? medidaDelGesto() : null;
      }}
      onPointerMove={e => {
        const antes = punteros.current.get(e.pointerId);
        if (!antes) return;
        const ahora = local(e);
        punteros.current.set(e.pointerId, ahora);
        if (punteros.current.size === 1) {
          setVista(v => limitar({ ...v, x: v.x + ahora.x - antes.x, y: v.y + ahora.y - antes.y }));
        } else if (punteros.current.size === 2 && gesto.current) {
          const previo = gesto.current, nuevo = medidaDelGesto();
          const dx = nuevo.medio.x - previo.medio.x, dy = nuevo.medio.y - previo.medio.y;
          setVista(v => limitar({ ...v, x: v.x + dx, y: v.y + dy }));
          if (previo.distancia > 0) acercar(nuevo.distancia / previo.distancia, nuevo.medio);
          gesto.current = nuevo;
        }
      }}
      onPointerUp={e => { punteros.current.delete(e.pointerId); gesto.current = null; }}
      onPointerCancel={e => { punteros.current.delete(e.pointerId); gesto.current = null; }}>
      <img className="barrio-imagen" src="/backgrounds/comunidad-ilustrada.webp" alt="" draggable={false} onError={() => setFallo(true)}
        style={{ width: IMAGEN.ancho * escala, height: IMAGEN.alto * escala, transform: `translate(-50%, -50%) translate(${vista.x}px, ${vista.y}px)` }}/>
    </div>
    <span className="mapa-tu-zona capa" style={{ left: zona.x, top: zona.y }}>Tu zona</span>
    <CapaLuces luces={luces} porId={porId} elegido={elegido} onElegir={onElegir}/>
    <CapaBurbujas luces={luces} porId={porId} ancho={tam.ancho} alto={tam.alto} ocupado={libres} onElegir={onElegir}/>
    <div className="maqueta-zoom" data-reserva aria-label="Encuadre del barrio">
      <button type="button" aria-label="Acercar" onClick={() => acercar(1.2)}>+</button>
      <button type="button" aria-label="Alejar" onClick={() => acercar(1 / 1.2)}>−</button>
      <button type="button" aria-label="Centrar el barrio" onClick={() => setVista({ zoom: 1, x: 0, y: 0 })}>⌂</button>
    </div>
    {/* Con un plan abierto, la tarjeta ya dice el lugar real: la nota se aparta. */}
    {!elegido && <span className="barrio-nota" data-reserva>Escenario ilustrado · los lugares se consultan en cada plan</span>}
  </div>;
}
