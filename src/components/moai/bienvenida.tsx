import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Bienvenida de Brisa al entrar (diseño de Mateo: bosque nocturno, esfera de luz y panel de vidrio).
// El fondo final es un video en edición: /backgrounds/brisa.mp4 con /backgrounds/brisa.jpg como imagen fija.
// Deben venir SIN panel ni textos, porque esos los pone la interfaz. Sin archivos, queda un respaldo en CSS.
// Regla 12: Brisa siempre se presenta como una IA.
const video = '/backgrounds/brisa.mp4';
const imagen = '/backgrounds/brisa.jpg';
const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function Bienvenida({ nombre, nueva, onContinuar }: { nombre: string; nueva: boolean; onContinuar: () => void }) {
  const [fondo, setFondo] = useState<'video' | 'imagen' | 'ninguno'>(() => sinMovimiento() ? 'imagen' : 'video');
  return <main className="brisa">
    <div className="brisa-fondo" aria-hidden="true">
      {fondo === 'video' && <video src={video} poster={imagen} autoPlay muted loop playsInline onError={() => setFondo('imagen')}/>}
      {fondo === 'imagen' && <img src={imagen} alt="" onError={() => setFondo('ninguno')}/>}
      {fondo === 'ninguno' && <div className="brisa-esfera"/>}
    </div>
    <p className="brisa-marca" aria-label="MOAI">MOAI</p>
    <section className="brisa-panel" aria-labelledby="brisa-titulo">
      <h1 id="brisa-titulo">{nueva ? 'Hola, soy Brisa.' : `Hola de nuevo, ${nombre.split(' ')[0]}.`}</h1>
      <p className="brisa-sub">{nueva ? 'Qué bueno tenerte aquí.' : 'Qué bueno verte otra vez.'}</p>
      <Button className="brisa-boton" onClick={onContinuar} autoFocus>Continuar</Button>
      <p className="brisa-ia">{nueva ? 'Soy una inteligencia artificial y voy a acompañarte en MOAI.' : 'Soy Brisa, la inteligencia artificial que te acompaña en MOAI.'}</p>
    </section>
  </main>;
}
