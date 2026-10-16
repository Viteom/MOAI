import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

// Fondo del bosque de Brisa, compartido por la bienvenida y las pantallas de cuenta (diseño de Mateo).
// Video de Higgsfield, 1280×720 y 8 s: hasta ~4 s trae texto que se deforma; de ahí al final queda un panel
// vacío con un botón de letras rotas. Se reproduce solo ese tramo en bucle y los paneles de la interfaz
// lo tapan con desenfoque, así que el único texto legible es el nuestro. «MOAI» de arriba ya viene en el video.
export const VIDEO_BOSQUE = '/backgrounds/brisa.mp4';
const TRAMO_LIMPIO = 4.1; // segundos
export const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const FUNDIDO = 0.9; // segundos: el final de una copia se funde con el comienzo de la otra

// Bucle sin salto: dos copias del video se turnan. Cuando la visible está por terminar, la otra arranca desde el
// tramo limpio debajo y se funde encima. Ninguna se ve mientras se rebobina, así que no aparece el cuadro vacío.
// Con «reducir movimiento», un cuadro quieto.
function VideoEnBucle({ onError }: { onError: () => void }) {
  const copias = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const [visible, setVisible] = useState<0 | 1 | null>(null);
  const actual = useRef<0 | 1>(0);
  useEffect(() => {
    let cuadro = 0;
    const revisar = () => {
      const v = copias[actual.current].current, otra = copias[1 - actual.current].current;
      if (v && otra && v.duration && !v.paused && v.currentTime >= v.duration - FUNDIDO) {
        otra.currentTime = TRAMO_LIMPIO;
        void otra.play().catch(() => {});
        actual.current = (1 - actual.current) as 0 | 1;
        setVisible(actual.current);
      }
      cuadro = requestAnimationFrame(revisar);
    };
    if (!sinMovimiento()) cuadro = requestAnimationFrame(revisar);
    return () => cancelAnimationFrame(cuadro);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const alCargar = (i: 0 | 1) => {
    const v = copias[i].current;
    if (!v) return;
    v.currentTime = sinMovimiento() ? 5 : TRAMO_LIMPIO;
    if (i === 0 && !sinMovimiento()) void v.play().catch(() => {});
  };
  return <>{([0, 1] as const).map(i => <video key={i} ref={copias[i]} src={VIDEO_BOSQUE} muted playsInline preload="auto" className={visible === i ? 'visible' : undefined}
    onLoadedMetadata={() => alCargar(i)} onSeeked={() => { if (i === 0 && visible === null) setVisible(0); }} onEnded={e => e.currentTarget.pause()} onError={onError}/>)}</>;
}

export function FondoBosque({ onSinVideo }: { onSinVideo?: () => void }) {
  const [conVideo, setConVideo] = useState(true);
  return <div className="brisa-fondo" aria-hidden="true">
    {conVideo ? <VideoEnBucle onError={() => { setConVideo(false); onSinVideo?.(); }}/> : <div className="brisa-esfera"/>}
  </div>;
}

// Brisa pequeña: el mismo video, recortado alrededor de la esfera y con bordes difuminados.
// Mientras no haya un asset limpio de la esfera sola, es la forma de que se mueva igual que en la bienvenida.
export function OrbeBrisa() {
  const [conVideo, setConVideo] = useState(true);
  return <div className="orbe" aria-hidden="true">
    {conVideo ? <VideoEnBucle onError={() => setConVideo(false)}/> : <div className="orbe-css"/>}
  </div>;
}

// Pantallas de cuenta y de los pasos siguientes: panel de vidrio centrado sobre el bosque.
export function HojaBosque({ titulo, bajada, onVolver, children }: { titulo: string; bajada?: ReactNode; onVolver?: () => void; children: ReactNode }) {
  const [conVideo, setConVideo] = useState(true);
  return <main className={`bosque${conVideo ? ' con-video' : ''}`}>
    <FondoBosque onSinVideo={() => setConVideo(false)}/>
    {onVolver && <button type="button" className="bosque-volver" onClick={onVolver}><ArrowLeft aria-hidden="true"/>Volver</button>}
    <p className="brisa-marca">MOAI</p>
    <section className="bosque-panel" aria-labelledby="bosque-titulo">
      <OrbeBrisa/>
      <h1 id="bosque-titulo" tabIndex={-1}>{titulo}</h1>
      {bajada && <p className="bosque-bajada">{bajada}</p>}
      {children}
    </section>
  </main>;
}
