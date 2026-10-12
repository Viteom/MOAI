import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

// P02 · Brisa da la bienvenida (docs/09): primer paso de «Crear cuenta», antes del registro.
// Video de Higgsfield, 1280×720 y 8 s: hasta ~4 s trae texto (que se deforma); de ahí al final el panel
// del video queda vacío, con un botón de letras rotas. Por eso se reproduce solo ese tramo en bucle y el
// panel de la interfaz se pone encima, centrado y con desenfoque, para que el único texto legible sea el nuestro.
// Regla 12: Brisa siempre se presenta como una IA.
const video = '/backgrounds/brisa.mp4';
const TRAMO_LIMPIO = 4.1; // segundos
const titulo = 'Hola, soy Brisa.';
const apoyo = 'Qué bueno tenerte aquí.';
const ia = 'Soy una inteligencia artificial y voy a acompañarte en MOAI.';
const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const voz = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

export function Bienvenida({ onContinuar, onYaTengoCuenta }: { onContinuar: () => void; onYaTengoCuenta: () => void }) {
  const [conVideo, setConVideo] = useState(true);
  const [hablando, setHablando] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => () => voz()?.cancel(), []);
  const alCargar = () => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = sinMovimiento() ? 5 : TRAMO_LIMPIO; // con «reducir movimiento», un cuadro quieto
    if (!sinMovimiento()) void v.play().catch(() => {});
  };
  const otraVez = () => { const v = ref.current; if (v) { v.currentTime = TRAMO_LIMPIO; void v.play().catch(() => {}); } };
  // «Escuchar a Brisa» usa la voz del navegador: no se envía nada a ningún servicio.
  const escuchar = () => {
    const sintesis = voz();
    if (!sintesis) return;
    if (hablando) { sintesis.cancel(); setHablando(false); return; }
    const frase = new SpeechSynthesisUtterance(`${titulo} ${apoyo} ${ia}`);
    frase.lang = 'es-CO';
    frase.onend = frase.onerror = () => setHablando(false);
    sintesis.speak(frase);
    setHablando(true);
  };
  return <main className={`brisa${conVideo ? ' con-video' : ''}`}>
    <div className="brisa-fondo" aria-hidden="true">
      {conVideo ? <video ref={ref} src={video} muted playsInline preload="auto" onLoadedMetadata={alCargar} onEnded={otraVez} onError={() => setConVideo(false)}/>
        : <div className="brisa-esfera"/>}
    </div>
    {/* El video ya trae «MOAI» arriba; sin video lo pone la interfaz. */}
    <p className="brisa-marca">MOAI</p>
    <section className="brisa-panel" aria-labelledby="brisa-titulo">
      <h1 id="brisa-titulo" tabIndex={-1}>{titulo}</h1>
      <p className="brisa-sub">{apoyo}</p>
      <Button className="brisa-boton" onClick={() => { voz()?.cancel(); onContinuar(); }}>Continuar</Button>
      <p className="brisa-ia">{ia}</p>
      <div className="brisa-secundarias">
        <button type="button" className="brisa-enlace" onClick={onYaTengoCuenta}>Ya tengo cuenta</button>
        {voz() && <button type="button" className="brisa-enlace" aria-pressed={hablando} onClick={escuchar}>{hablando ? 'Silenciar' : 'Escuchar a Brisa'}</button>}
      </div>
    </section>
  </main>;
}
