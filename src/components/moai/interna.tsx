// Piezas compartidas de las internas (rediseño de Mateo, 19 de octubre de 2026): naturaleza integrada con la ciudad,
// superficies verde profundo, vidrio suave con bordes menta, lima para la acción principal y cian de acento.
// Las imágenes son recortes de la misma ilustración del barrio, optimizados en AVIF y WebP; si una falla, queda el
// verde de fondo y todo sigue legible.
import { useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { Ir } from './diario';

export type NombreImagen = 'plan' | 'crear' | 'lugares' | 'gente' | 'moai' | 'cuenta';
const RUTA = '/backgrounds/internas';

// Una imagen de cabecera: AVIF si el navegador puede, WebP si no. `prioridad`: la imagen principal visible.
export function Imagen({ nombre, prioridad = false, clase = '' }: { nombre: NombreImagen; prioridad?: boolean; clase?: string }) {
  const [fallo, setFallo] = useState(false);
  if (fallo) return null;
  return <picture className={clase}>
    <source srcSet={`${RUTA}/cabecera-${nombre}.avif`} type="image/avif"/>
    <img src={`${RUTA}/cabecera-${nombre}.webp`} alt="" width={1000} height={400} decoding="async"
      loading={prioridad ? 'eager' : 'lazy'} fetchPriority={prioridad ? 'high' : 'auto'} onError={() => setFallo(true)}/>
  </picture>;
}

// Cabecera de una interna: la imagen arriba, el «volver» sobre ella y el título con su bajada.
export function Cabecera({ imagen, titulo, bajada, volver, ir, children }: {
  imagen: NombreImagen; titulo?: ReactNode; bajada?: ReactNode; volver?: { texto: string; ruta: string }; ir: Ir; children?: ReactNode;
}) {
  return <header className="cabecera">
    <Imagen nombre={imagen} prioridad clase="cabecera-imagen"/>
    {volver && <button type="button" className="cabecera-volver" onClick={() => volver.ruta === 'atras' ? (window.history.length > 1 ? window.history.back() : ir('/inicio')) : ir(volver.ruta)}><ArrowLeft aria-hidden="true"/>{volver.texto}</button>}
    {titulo && <div className="cabecera-texto"><h1 tabIndex={-1}>{titulo}</h1>{bajada && <p>{bajada}</p>}</div>}
    {children}
  </header>;
}

// Una fila de acción: icono, texto y flecha. Para Mi cuenta, Mi gente y listas parecidas.
export function Fila({ icono, children, detalle, onClick, peligro = false, punto }: {
  icono?: ReactNode; children: ReactNode; detalle?: ReactNode; onClick: () => void; peligro?: boolean; punto?: string;
}) {
  return <button type="button" className={`fila${peligro ? ' peligro' : ''}`} onClick={onClick}>
    {punto && <span className={`fila-punto ${punto}`} aria-hidden="true"/>}
    {icono && <span className="fila-icono" aria-hidden="true">{icono}</span>}
    <span className="fila-texto">{children}{detalle && <small>{detalle}</small>}</span>
    {!peligro && <ChevronRight className="fila-flecha" aria-hidden="true"/>}
  </button>;
}
