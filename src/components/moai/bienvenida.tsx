import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FondoBosque } from './bosque';

// P02 · Brisa da la bienvenida (docs/09): primer paso de «Crear cuenta», antes del registro.
// El panel de la interfaz tapa el panel vacío del video (ver bosque.tsx). Regla 12: Brisa se presenta como IA.
const titulo = 'Hola, soy Brisa.';
const apoyo = 'Qué bueno tenerte aquí.';
const ia = 'Soy una inteligencia artificial y voy a acompañarte en MOAI.';
const voz = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

export function Bienvenida({ onContinuar, onYaTengoCuenta }: { onContinuar: () => void; onYaTengoCuenta: () => void }) {
  const [conVideo, setConVideo] = useState(true);
  const [hablando, setHablando] = useState(false);
  useEffect(() => () => voz()?.cancel(), []);
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
    <FondoBosque onSinVideo={() => setConVideo(false)}/>
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
