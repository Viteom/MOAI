import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Focus, Users } from 'lucide-react';
import type { PersonaLazo } from '@/lib/api';
import { disponerRed } from '@/lib/red-gente';
import { categorias, descripcionContacto, nombreCategoria } from '@/lib/vinculos';

export function RedGente({ personas, moais, nombre, personaId, moaiId, onPersona, onMoai, onPropio }: {
  personas: PersonaLazo[]; moais: { id: string; nombre: string }[]; nombre: string; personaId: string | null; moaiId: string | null;
  onPersona: (id: string) => void; onMoai: (id: string) => void; onPropio: () => void;
}) {
  const visor = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ ancho: 1000, alto: 540 });
  const vertical = tam.ancho < 600;
  const geo = useMemo(() => disponerRed(personas, moais, tam.ancho < 600 ? tam.ancho : Math.max(1000, tam.ancho), Math.max(480, tam.alto), nombre), [personas, moais, tam, nombre]);
  const porId = useMemo(() => new Map(geo.nodos.map(n => [n.id, n])), [geo]);
  useLayoutEffect(() => {
    const el = visor.current;
    if (!el) return;
    const medir = () => setTam(t => t.ancho === el.clientWidth && t.alto === el.clientHeight ? t : { ancho: el.clientWidth, alto: el.clientHeight });
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const o = new ResizeObserver(medir); o.observe(el); return () => o.disconnect();
  }, []);
  const centrar = () => {
    const el = visor.current;
    if (el) { el.scrollLeft = (geo.ancho - el.clientWidth) / 2; el.scrollTop = Math.max(0, geo.centro.y + (vertical ? 24 : 0) - el.clientHeight / 2); }
  };
  useLayoutEffect(centrar, [geo.ancho, geo.alto]);
  const curva = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    return `M ${a.x} ${a.y} C ${a.x + dx * .55 - dy * .12} ${a.y + dy * .18}, ${a.x + dx * .55 + dy * .12} ${b.y - dy * .18}, ${b.x} ${b.y}`;
  };
  return <section className="gente-red" aria-label="Vista Red">
    <div className="gente-encuadre">
      <p>Explora tus vínculos.</p>
      <div role="group" aria-label="Encuadre de la red">
        <button type="button" aria-label={vertical ? 'Recorrer hacia arriba' : 'Recorrer a la izquierda'} onClick={() => visor.current?.scrollBy(vertical ? { top: -220 } : { left: -260 })}><ChevronLeft className={vertical ? 'vertical' : ''} aria-hidden="true"/></button>
        <button type="button" onClick={centrar}><Focus aria-hidden="true"/><span>Centrar</span></button>
        <button type="button" aria-label={vertical ? 'Recorrer hacia abajo' : 'Recorrer a la derecha'} onClick={() => visor.current?.scrollBy(vertical ? { top: 220 } : { left: 260 })}><ChevronRight className={vertical ? 'vertical' : ''} aria-hidden="true"/></button>
      </div>
    </div>
    <div className="gente-red-visor" ref={visor} tabIndex={0} role="region" aria-label="Red de vínculos. Desplázate para explorar; también puedes usar Lista.">
      <div className="gente-red-lienzo" style={{ width: geo.ancho, height: geo.alto }}>
        <svg className="gente-orbitas" width={geo.ancho} height={geo.alto} aria-hidden="true">
          <ellipse cx={geo.centro.x} cy={geo.centro.y} rx={vertical ? 130 : 260} ry={180}/>
          <ellipse cx={geo.centro.x} cy={geo.centro.y} rx={vertical ? 155 : 410} ry={vertical ? 350 : 265}/>
          <ellipse cx={geo.centro.x} cy={geo.centro.y} rx={vertical ? 170 : 480} ry={vertical ? 500 : 315}/>
          {personas.map(p => {
            const n = porId.get(p.id)!;
            const destacado = !moaiId || p.moais?.some(m => m.id === moaiId);
            return <path key={p.id} d={curva(geo.centro, n)} className={`gente-conexion ${p.categoria === 'raiz' ? 'lila' : 'menta'}${destacado ? '' : ' atenuada'}${personaId === p.id ? ' elegida' : ''}`}/>;
          })}
          {moaiId && personas.filter(p => p.moais?.some(m => m.id === moaiId)).map(p => {
            const m = porId.get(moaiId), n = porId.get(p.id);
            return m && n ? <path key={`pertenece:${p.id}`} d={curva(m, n)} className="gente-pertenencia"/> : null;
          })}
        </svg>
        {geo.sectores.map(s => <span className={`gente-sector categoria-${s.id}`} key={s.id} style={{ left: s.x, top: s.y }}>{categorias.find(c => c.id === s.id)!.nombre}</span>)}
        <button type="button" className="gente-yo" aria-label={`Mi presentación: ${nombre}`} style={{ left: geo.centro.x, top: geo.centro.y }} onClick={onPropio}>
          <span className="gente-orbe" aria-hidden="true"/><strong>{nombre}</strong><small>Mi presentación</small>
        </button>
        {personas.map(p => {
          const n = porId.get(p.id)!;
          const miembro = moaiId && p.moais?.some(m => m.id === moaiId);
          return <button key={p.id} type="button" data-nodo-persona={p.id} className={`gente-nodo gente-nodo-persona${personaId === p.id ? ' seleccionado' : ''}${miembro ? ' miembro' : ''}`}
            style={{ left: n.x, top: n.y, width: n.ancho, minHeight: n.alto }} aria-pressed={personaId === p.id} onClick={() => onPersona(p.id)}>
            <span className={`gente-luz estado-${p.estado}`} aria-hidden="true"/>
            <strong>{p.nombre}</strong><span className="solo-lectores">{descripcionContacto[p.estado]}</span><small>{nombreCategoria(p)}{!!p.moais?.length && <span className="gente-distintivo"><Users aria-hidden="true"/>Moai compartido</span>}</small>
          </button>;
        })}
        {moais.map(m => {
          const n = porId.get(m.id)!;
          return <button key={m.id} type="button" data-nodo-moai={m.id} className={`gente-nodo gente-nodo-moai${moaiId === m.id ? ' seleccionado' : ''}`}
            style={{ left: n.x, top: n.y, width: n.ancho, minHeight: n.alto }} aria-pressed={moaiId === m.id} onClick={() => onMoai(m.id)}>
            <span className="gente-simbolo-moai" aria-hidden="true"><i/><i/><i/></span><strong>{m.nombre}</strong><small>Moai que compartimos</small>
          </button>;
        })}
      </div>
    </div>
  </section>;
}
