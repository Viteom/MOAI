// «¿Cómo cuidas y cómo te cuidas?» como escena (referente de Mateo, 15 de octubre): pantalla completa sobre el bosque,
// dos círculos finos que se cruzan, la pregunta al centro y las respuestas como anillos. Como las decisiones de un juego
// de rol: inmersivo, una pregunta a la vez. Se puede salir cuando se quiera. Con «reducir movimiento», sin animaciones.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { avisoCuidado, preguntasCuidado, resultadoCuidado, textosCuidado, type Letra } from '@/lib/cuidado';
import { FondoBosque } from './bosque';

export function EscenaCuidado({ onTerminar }: { onTerminar: (respuestas: Letra[] | null, guardar: boolean) => void }) {
  const [respuestas, setRespuestas] = useState<Letra[]>([]);
  const titulo = useRef<HTMLHeadingElement>(null);
  const i = respuestas.length;
  const terminado = i >= preguntasCuidado.length;
  const letras = terminado ? resultadoCuidado(respuestas) ?? [] : [];
  useEffect(() => { titulo.current?.focus(); }, [i]);
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onTerminar(null, false); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onTerminar]);

  // Va directo en <body>: dentro del panel de vidrio (backdrop-filter) una capa fija quedaría encerrada en el panel.
  return createPortal(<div className="escena" role="dialog" aria-modal="true" aria-labelledby="escena-titulo">
    <FondoBosque/>
    <div className="escena-velo" aria-hidden="true"/>
    <button type="button" className="escena-salir" onClick={() => onTerminar(null, false)}>Salir</button>
    <p className="escena-rotulo">Un momento para ti</p>
    <p className="escena-paso">{terminado ? 'Tu camino' : `${i + 1} de ${preguntasCuidado.length}`}</p>
    <svg className="escena-circulos" viewBox="0 0 300 560" aria-hidden="true">
      <circle cx="150" cy="170" r="138"/>
      <circle cx="150" cy="390" r="138"/>
      <path d="M150 32 l-5 -4 M150 32 l-5 4" transform="rotate(-8 150 170)"/>
      <path d="M150 528 l5 -4 M150 528 l5 4"/>
    </svg>
    <div className="escena-centro" key={i}>
      {!terminado ? <>
        <h2 id="escena-titulo" ref={titulo} tabIndex={-1} className="escena-pregunta">{preguntasCuidado[i].pregunta}</h2>
        <div className="escena-opciones" role="group" aria-label="Elige la respuesta que más se parezca a ti">
          {(['A', 'B', 'C'] as Letra[]).map(l => <button key={l} type="button" onClick={() => setRespuestas(r => [...r, l])}>{preguntasCuidado[i].opciones[l]}</button>)}
        </div>
      </> : <>
        <h2 id="escena-titulo" ref={titulo} tabIndex={-1} className="escena-pregunta">{letras.map(l => textosCuidado[l]).join(' ')}</h2>
        <p className="escena-aviso">{avisoCuidado}</p>
        <p className="escena-aviso">¿Quieres que lo guarde? Así Brisa puede recordarte cuidar tus límites y a quienes te nutren. Solo tú lo ves.</p>
        <div className="escena-opciones">
          <button type="button" onClick={() => onTerminar(respuestas, true)}>Sí, guárdalo</button>
          <button type="button" onClick={() => onTerminar(respuestas, false)}>Solo quería verlo</button>
        </div>
      </>}
    </div>
    <svg className="escena-onda" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 20 C 200 0, 400 40, 600 20 S 1000 0, 1200 20"/></svg>
    <p className="escena-pie">Cada respuesta cambia el rumbo. Puedes volver a hacerlo cuando cambies.</p>
  </div>, document.body);
}
