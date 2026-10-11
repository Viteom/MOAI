import { Button } from '@/components/ui/button';
import { Panel, Primary, Voice } from './primitives';
import { nombreVisible, type Radar } from '@/lib/moai/demo';

// H3 · Radar simulado. El borde de la pantalla toma el color del anillo, sin nombre.
// Es una simulación: no se pide ni se usa la ubicación del teléfono.
export function RadarOverlay({ radar, onTocar, onSaludar, onAhoraNo, onCerrar }: {
  radar: Radar; onTocar: () => void; onSaludar: () => void; onAhoraNo: () => void; onCerrar: () => void;
}) {
  if (radar === 'apagado') return null;
  return <>
    <div className="radar-edge ring-tronco" aria-hidden="true" />
    {radar === 'cerca' && <Button variant="moaiSecondary" size="moai" className="radar-pill ring-tronco" onClick={onTocar}>Alguien de tu tronco está cerca</Button>}
    {radar !== 'cerca' && <Panel className="home-panel radar-panel"><div className="panel-scroll" aria-live="polite">
      {radar === 'ofrecido' && <>
        <Voice question="Alguien de tu tronco está cerca. ¿Quieres mandarle un saludo?"/>
        <p className="help-text">No sé dónde está y no te lo voy a decir. Solo sabrás quién es si los dos quieren. Esto es una simulación: no usamos tu ubicación.</p>
      </>}
      {radar === 'enviado' && <>
        <Voice line="Tu saludo salió." question="Un momento, a ver si responde…"/>
        <p className="help-text">Simulado. Nada se envía de verdad.</p>
      </>}
      {radar === 'revelado' && <>
        <Voice line="Los dos quisieron saludarse." question={`Era ${nombreVisible(radar)}. También quiso saludarte.`}/>
        <p className="body-message">A veces los caminos se cruzan solos.</p>
      </>}
    </div>
      {radar === 'ofrecido' && <><Primary onClick={onSaludar}>Mandar un saludo</Primary><Button variant="moaiSecondary" size="moai" className="text-action" onClick={onAhoraNo}>Ahora no</Button></>}
      {radar === 'revelado' && <Primary onClick={onCerrar}>Listo</Primary>}
    </Panel>}
  </>;
}
