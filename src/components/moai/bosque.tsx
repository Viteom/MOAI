import { useRef, useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

// Fondo del bosque de Brisa, compartido por la bienvenida y las pantallas de cuenta (diseño de Mateo).
// Video de Higgsfield, 1280×720 y 8 s: hasta ~4 s trae texto que se deforma; de ahí al final queda un panel
// vacío con un botón de letras rotas. Se reproduce solo ese tramo en bucle y los paneles de la interfaz
// lo tapan con desenfoque, así que el único texto legible es el nuestro. «MOAI» de arriba ya viene en el video.
export const VIDEO_BOSQUE = '/backgrounds/brisa.mp4';
const TRAMO_LIMPIO = 4.1; // segundos
export const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function useBucleLimpio() {
  const ref = useRef<HTMLVideoElement>(null);
  const alCargar = () => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = sinMovimiento() ? 5 : TRAMO_LIMPIO; // con «reducir movimiento», un cuadro quieto
    if (!sinMovimiento()) void v.play().catch(() => {});
  };
  const otraVez = () => { const v = ref.current; if (v) { v.currentTime = TRAMO_LIMPIO; void v.play().catch(() => {}); } };
  return { ref, onLoadedMetadata: alCargar, onEnded: otraVez };
}

export function FondoBosque({ onSinVideo }: { onSinVideo?: () => void }) {
  const [conVideo, setConVideo] = useState(true);
  const bucle = useBucleLimpio();
  return <div className="brisa-fondo" aria-hidden="true">
    {conVideo ? <video {...bucle} src={VIDEO_BOSQUE} muted playsInline preload="auto" onError={() => { setConVideo(false); onSinVideo?.(); }}/>
      : <div className="brisa-esfera"/>}
  </div>;
}

// Brisa pequeña: el mismo video, recortado alrededor de la esfera y con bordes difuminados.
// Mientras no haya un asset limpio de la esfera sola, es la forma de que se mueva igual que en la bienvenida.
export function OrbeBrisa() {
  const [conVideo, setConVideo] = useState(true);
  const bucle = useBucleLimpio();
  return <div className="orbe" aria-hidden="true">
    {conVideo ? <video {...bucle} src={VIDEO_BOSQUE} muted playsInline preload="auto" onError={() => setConVideo(false)}/> : <div className="orbe-css"/>}
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
