import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

// Bienvenida de Brisa al entrar (diseño de Mateo: bosque nocturno, esfera de luz y panel de vidrio).
// Video de Higgsfield, 1280×720 y 8 s: hasta ~4 s trae texto (que se deforma); de ahí al final el panel
// del video queda vacío, con un botón de letras rotas. Por eso se reproduce solo ese tramo en bucle y el
// panel de la interfaz se pone encima, centrado y con desenfoque, para que el único texto legible sea el nuestro.
// Regla 12: Brisa siempre se presenta como una IA.
const video = '/backgrounds/brisa.mp4';
const TRAMO_LIMPIO = 4.1; // segundos
const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function Bienvenida({ nombre, nueva, onContinuar }: { nombre: string; nueva: boolean; onContinuar: () => void }) {
  const [conVideo, setConVideo] = useState(true);
  const ref = useRef<HTMLVideoElement>(null);
  const alCargar = () => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = sinMovimiento() ? 5 : TRAMO_LIMPIO; // con «reducir movimiento», un cuadro quieto
    if (!sinMovimiento()) void v.play().catch(() => {});
  };
  const otraVez = () => { const v = ref.current; if (v) { v.currentTime = TRAMO_LIMPIO; void v.play().catch(() => {}); } };
  return <main className={`brisa${conVideo ? ' con-video' : ''}`}>
    <div className="brisa-fondo" aria-hidden="true">
      {conVideo ? <video ref={ref} src={video} muted playsInline preload="auto" onLoadedMetadata={alCargar} onEnded={otraVez} onError={() => setConVideo(false)}/>
        : <div className="brisa-esfera"/>}
    </div>
    {/* El video ya trae «MOAI» arriba; sin video lo pone la interfaz. */}
    <p className="brisa-marca">MOAI</p>
    <section className="brisa-panel" aria-labelledby="brisa-titulo">
      <h1 id="brisa-titulo">{nueva ? 'Hola, soy Brisa.' : `Hola de nuevo, ${nombre.split(' ')[0]}.`}</h1>
      <p className="brisa-sub">{nueva ? 'Qué bueno tenerte aquí.' : 'Qué bueno verte otra vez.'}</p>
      <Button className="brisa-boton" onClick={onContinuar} autoFocus>Continuar</Button>
      <p className="brisa-ia">{nueva ? 'Soy una inteligencia artificial y voy a acompañarte en MOAI.' : 'Soy Brisa, la inteligencia artificial que te acompaña en MOAI.'}</p>
    </section>
  </main>;
}
