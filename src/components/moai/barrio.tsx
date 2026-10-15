// Escenario conceptual: la ilustración no representa calles ni edificios reales.
// Solo las luces provienen del mapa de planes; nunca se inventan actividades.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Mapa, Plan } from '@/lib/api';
import { CapaBurbujas, CapaLuces } from './maqueta';
import { MapaComunidad } from './mapa';

type Disponible = Extract<Mapa, { disponible: true }>;
type Rect = [number, number, number, number];

export function BarrioIlustrado({ mapa, planes, elegido, onElegir }: {
  mapa: Disponible; planes: Plan[]; elegido: string | null; onElegir: (id: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ ancho: 1440, alto: 900 });
  const [ocupado, setOcupado] = useState<Rect[]>([]);
  const [vista, setVista] = useState({ zoom: 1, x: 0, y: 0 });
  const [fallo, setFallo] = useState(false);
  const arrastre = useRef<{ x: number; y: number; origenX: number; origenY: number } | null>(null);
  const porId = useMemo(() => new Map(planes.map(p => [p.id, p])), [planes]);
  const limites = useMemo(() => {
    const puntos = mapa.celdas.flatMap(c => c.puntos);
    return { radio: Math.max(1, ...puntos.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y)))) };
  }, [mapa]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const base = el.getBoundingClientRect();
      setTam({ ancho: base.width || 1440, alto: base.height || 900 });
      setOcupado([...el.closest('.comunidad')!.querySelectorAll<HTMLElement>('[data-reserva]')].map(n => {
        const r = n.getBoundingClientRect();
        return [r.left - base.left - 12, r.top - base.top - 12, r.right - base.left + 12, r.bottom - base.top + 12] as Rect;
      }));
    };
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    el.closest('.comunidad')!.querySelectorAll('[data-reserva]').forEach(n => observador.observe(n));
    return () => observador.disconnect();
  }, [elegido, planes.length]);
  // Misma transformación para imagen, luces y burbujas. Sus tamaños de lectura permanecen constantes.
  const escala = Math.max(tam.ancho / 1586, tam.alto / 992) * vista.zoom;
  const proyectar = (x: number, y: number) => ({
    x: tam.ancho / 2 + vista.x + x / limites.radio * 570 * escala,
    y: tam.alto / 2 + vista.y + y / limites.radio * 330 * escala,
  });
  const luces = mapa.planes.filter(p => porId.has(p.id)).map(p => ({ id: p.id, ...proyectar(p.x, p.y) }));
  const centro = mapa.celdas.find(c => c.anillo === 0);
  const zona = proyectar(centro?.x ?? 0, centro?.y ?? 0);
  const limitar = (zoom: number, x: number, y: number) => {
    const escalaNueva = Math.max(tam.ancho / 1586, tam.alto / 992) * zoom;
    const margenX = Math.max(0, (1586 * escalaNueva - tam.ancho) / 2);
    const margenY = Math.max(0, (992 * escalaNueva - tam.alto) / 2);
    return { zoom, x: Math.max(-margenX, Math.min(margenX, x)), y: Math.max(-margenY, Math.min(margenY, y)) };
  };
  const acercar = (factor: number) => setVista(v => limitar(Math.min(2.5, Math.max(1, v.zoom * factor)), v.x, v.y));
  if (fallo) return <MapaComunidad mapa={mapa} planes={planes} elegido={elegido} onElegir={onElegir}/>;
  return <div ref={ref} className="maqueta barrio-ilustrado">
    <div className="barrio-arrastre" onPointerDown={e => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      arrastre.current = { x: e.clientX, y: e.clientY, origenX: vista.x, origenY: vista.y };
    }} onPointerMove={e => {
      const a = arrastre.current;
      if (a) setVista(v => limitar(v.zoom, a.origenX + e.clientX - a.x, a.origenY + e.clientY - a.y));
    }} onPointerUp={() => { arrastre.current = null; }} onPointerCancel={() => { arrastre.current = null; }}>
      <img className="barrio-imagen" src="/backgrounds/comunidad-ilustrada.webp" alt="" draggable={false} onError={() => setFallo(true)}
        style={{ width: 1586 * escala, height: 992 * escala, transform: `translate(-50%, -50%) translate(${vista.x}px, ${vista.y}px)` }}/>
    </div>
    <span className="mapa-tu-zona capa" style={{ left: zona.x, top: zona.y }}>Tu zona</span>
    <CapaLuces luces={luces} porId={porId} elegido={elegido} onElegir={onElegir}/>
    <CapaBurbujas luces={luces} porId={porId} ancho={tam.ancho} alto={tam.alto} ocupado={ocupado} onElegir={onElegir}/>
    <div className="maqueta-zoom" data-reserva aria-label="Encuadre del barrio">
      <button type="button" aria-label="Acercar" onClick={() => acercar(1.2)}>+</button>
      <button type="button" aria-label="Alejar" onClick={() => acercar(1 / 1.2)}>−</button>
      <button type="button" aria-label="Centrar el barrio" onClick={() => setVista({ zoom: 1, x: 0, y: 0 })}>⌂</button>
    </div>
    <span className="barrio-nota" data-reserva>Escenario ilustrado · los lugares se consultan en cada plan</span>
  </div>;
}
