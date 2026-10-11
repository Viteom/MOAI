import { Button } from '@/components/ui/button';
import { Panel, Primary, Seal } from './primitives';
import { cartaMoai, cartaMoaiTrasEncuentro, integrantesMoai, type Hilo } from '@/lib/moai/demo';

// H4 · Tu Moai (de ejemplo). Un claro con tres árboles unidos por hilos que se
// engrosan cuando las personas cuentan que se vieron. Es una simulación.
const posiciones = [{ x: 195, y: 150 }, { x: 78, y: 70 }, { x: 312, y: 70 }];

function Arbol({ x, y, nombre }: { x: number; y: number; nombre: string }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M0 14 L0 58" className="moai-trunk" />
    <ellipse cx="0" cy="0" rx="34" ry="16" className="moai-canopy-halo" />
    <path d="M-32 6 Q-24 -18 0 -17 Q24 -18 32 6 Q0 20 -32 6Z" className="moai-canopy" />
    <text x="0" y="82" textAnchor="middle" className="moai-name">{nombre}</text>
  </g>;
}

export function MoaiClaro({ hilo, abrazoEnviado, seVieron, onAbrazo, onSeVieron }: {
  hilo: Hilo; abrazoEnviado: boolean; seVieron: boolean; onAbrazo: () => void; onSeVieron: () => void;
}) {
  return <>
    <div className="scene-caption home-caption"><h1>Tu Moai.</h1><p>Un claro con tu gente.</p></div>
    <svg viewBox="0 0 390 200" className="moai-clearing" role="img" aria-label="Un claro con tres árboles: el tuyo, el de Luis y el de Carolina, unidos por hilos">
      <ellipse cx="195" cy="150" rx="180" ry="44" className="moai-ground" />
      <g className={`moai-threads hilo-${hilo}`}>
        {[[0, 1], [0, 2], [1, 2]].map(([a, b]) => <path key={`${a}${b}`} d={`M${posiciones[a!]!.x} ${posiciones[a!]!.y + 60} Q195 ${178} ${posiciones[b!]!.x} ${posiciones[b!]!.y + 60}`} className="moai-thread" />)}
      </g>
      {integrantesMoai.map((nombre, i) => <Arbol key={nombre} x={posiciones[i]!.x} y={posiciones[i]!.y} nombre={nombre} />)}
    </svg>
    <Panel className="home-panel"><div className="panel-scroll">
      <div className="letter-heading"><Seal/><div><strong>Carta de Brisa</strong><p>Tu Moai, de ejemplo</p></div></div>
      <p className="serif-message" aria-live="polite">{seVieron ? cartaMoaiTrasEncuentro : cartaMoai}</p>
      {abrazoEnviado && <p className="help-text" role="status">Tu abrazo salió. Es una simulación: nada se envía de verdad.</p>}
    </div>
      <Primary onClick={onAbrazo} disabled={abrazoEnviado}>{abrazoEnviado ? 'Abrazo enviado' : 'Mandar un abrazo corto'}</Primary>
      <Button variant="moaiSecondary" size="moai" onClick={onSeVieron} disabled={seVieron}>{seVieron ? 'Gracias por contarlo' : 'Ya nos vimos'}</Button>
    </Panel>
  </>;
}
