import { Panel, Voice, House } from './primitives';
import { Button } from '@/components/ui/button';
import { ayudaUrgente, confirmo, luzDeVentana, opcionesConfirmacion, preguntaLluvia, redEjemplo, respuestaLluvia, type Confirmacion } from '@/lib/moai/demo';

// H5 · Lluvia fuerte (simulada). Tres toques posibles; el aviso es una simulación.
export function EventoLluvia({ ciudad, confirmacion, onConfirmar, children }: {
  ciudad: string; confirmacion: Confirmacion | null; onConfirmar: (c: Confirmacion) => void; children?: React.ReactNode;
}) {
  return <>
    <div className="scene-caption home-caption"><h1>La lluvia.</h1><p>{ciudad}</p></div>
    <Panel className="home-panel"><div className="panel-scroll" aria-live="polite">
      {confirmacion === null ? <>
        <Voice line="Soy Brisa, una inteligencia artificial." question={preguntaLluvia(ciudad)}/>
        <div className="choice-list">{opcionesConfirmacion.map(o => <Button key={o.id} variant="moaiOption" size="moai" onClick={() => onConfirmar(o.id)}>{o.label}</Button>)}</div>
      </> : <>
        <Voice line="Gracias por contestar." question={respuestaLluvia(confirmacion)}/>
        <h2 className="demo-group">Una calle de ejemplo, esta noche</h2>
        {redEjemplo.map(p => <House key={p.nombre} person={p} lit={false} luz={luzDeVentana(p.luz)}/>)}
        <House person={{ nombre: 'Tú', anillo: 'tronco' }} lit={false} luz={luzDeVentana(confirmo(confirmacion))}/>
        <p className="help-text">{ayudaUrgente(ciudad)}</p>
        <p className="help-text">Esto es una simulación: nada se envía ni se guarda.</p>
      </>}
    </div>{confirmacion !== null && children}</Panel>
  </>;
}
