import type { MoaiState, Person } from '@/lib/moai/state';
import { nodosDeCopa, nodosDeMicelio } from '@/lib/moai/arbol';

// H2 · Tu árbol. Se ve de arriba abajo: la copa (tu red extendida), el tronco con sus
// anillos de crecimiento, la lámpara de hoy, las raíces con la luz de un ancestro y,
// al deslizar, el subsuelo con el micelio que une las casas. Todo se dibuja en el
// dispositivo; el estado del día y la luz de ancestros no salen de aquí.

function Copa({ personas }: { personas: Person[] }) {
  const nodos = nodosDeCopa(personas.length);
  return <g className="tree-canopy-group">
    <ellipse cx="195" cy="150" rx="158" ry="50" className="tree-canopy-halo" />
    <path d="M42 160 Q62 72 195 68 Q328 72 348 160 Q195 210 42 160Z" className="tree-canopy" />
    <path d="M52 158 Q195 120 338 158 M195 72 L112 150 M195 72 L282 150 M195 72 L195 178 M195 72 L152 168 M195 72 L238 168" className="tree-veins" />
    {personas.map((persona, i) => {
      const nodo = nodos[i]!;
      return <circle key={`${persona.nombre}-${i}`} cx={nodo.x} cy={nodo.y} r="7" className={`tree-node ring-${persona.anillo}`} />;
    })}
  </g>;
}

function Tronco({ estado }: { estado: MoaiState['estadoDia'] }) {
  return <g>
    <path d="M186 196 Q180 280 176 392 M195 196 L195 392 M204 196 Q210 280 214 392" className="tree-fibers" />
    <path d="M174 392 L216 392" className="tree-ground-line" />
    <g className="tree-lamp-group">
      <path d="M204 262 q22 4 22 20" className="tree-lamp-hook" />
      <rect x="216" y="282" width="20" height="28" rx="8" className={`tree-lamp-light mood-${estado ?? 'none'}`} />
    </g>
    <g className="tree-rings" transform="translate(195 332)">
      <circle r="12" className="ring-raiz tree-ring" />
      <circle r="22" className="ring-tronco tree-ring" />
      <circle r="32" className="ring-rama tree-ring" />
    </g>
  </g>;
}

function Raices() {
  return <g>
    <path d="M195 0 Q170 60 120 110 M195 0 Q196 70 188 140 M195 0 Q222 55 274 100" className="tree-root" />
    <path d="M120 110 Q96 130 70 134 M274 100 Q300 120 326 118" className="tree-root thin" />
    <circle cx="70" cy="134" r="14" className="ancestor-halo" />
    <circle cx="70" cy="134" r="7" className="ancestor-light" />
  </g>;
}

function Micelio({ personas }: { personas: Person[] }) {
  const nodos = nodosDeMicelio(personas.length);
  return <g>
    {nodos.map((nodo, i) => <path key={i} d={`M195 10 Q${(195 + nodo.x) / 2} ${nodo.y - 40} ${nodo.x} ${nodo.y}`} className="mycelium-thread" />)}
    {nodos.map((nodo, i) => <g key={`n${i}`} transform={`translate(${nodo.x} ${nodo.y})`}>
      <circle r="13" className="mycelium-glow" />
      <rect x="-9" y="-7" width="18" height="16" rx="2" className={`mycelium-house ring-${personas[i]!.anillo}`} />
      <path d="M-11 -7 L0 -17 L11 -7Z" className={`mycelium-roof ring-${personas[i]!.anillo}`} />
    </g>)}
    <circle cx="195" cy="10" r="9" className="mycelium-core" />
  </g>;
}

export function TreeView({ state }: { state: MoaiState }) {
  const estado = state.estadoDia;
  return <div className="tree-scroll" role="region" aria-label="Tu árbol, de la copa a las raíces" tabIndex={0}>
    <header className="tree-title">
      <h1>Tu árbol.</h1>
      <p>Una vida que crece contigo. Desliza hacia abajo para ver las raíces.</p>
    </header>
    <svg viewBox="0 0 390 420" className="tree-svg" role="img" aria-label={`Tu ${state.semilla || 'árbol'}: copa, tronco con anillos y lámpara`}>
      <Copa personas={state.personas} />
      <Tronco estado={estado} />
    </svg>
    <section className="tree-note">
      <div className="tree-note-row"><strong className="seed-name">{state.semilla || 'Tu semilla'}</strong><span>Tu semilla</span></div>
      <p>La copa es tu red extendida: cada punto es alguien de tu gente, con el color de su anillo (raíz, tronco o rama).</p>
      <p>Los anillos del tronco guardan lo que has ido sembrando: la raíz, el tronco y la rama.</p>
      {estado ? <p><strong>Tu luz de hoy: {estado}.</strong> La ves solo tú.</p> : <p>La lámpara descansa. Cuando quieras, te pregunto cómo amaneciste.</p>}
      {state.oficios.length > 0 && <p className="tree-trades">{state.oficios.join(' · ')}</p>}
      {state.companeros.length > 0 && <p className="tree-trades">Te acompañan: {state.companeros.join(', ')}.</p>}
    </section>
    <svg viewBox="0 0 390 170" className="tree-svg tree-roots" role="img" aria-label="Las raíces con la luz de un ancestro">
      <g transform="translate(0 6)"><Raices /></g>
    </svg>
    <section className="tree-note">
      <h2>Tus raíces</h2>
      <p>Esa luz dorada recuerda a alguien de tu familia que ya no está. Solo tú la ves y se queda en tu teléfono.</p>
    </section>
    <h2 className="tree-underground-title">Bajo la tierra</h2>
    <svg viewBox="0 0 390 250" className="tree-svg tree-soil" role="img" aria-label="El micelio que une las casas de tu calle">
      <Micelio personas={state.personas} />
    </svg>
    <section className="tree-note">
      <p>{state.personas.length
        ? 'Debajo de la tierra, el micelio une las casas de tu calle. Los hilos crecen cuando se encuentran.'
        : 'Debajo de la tierra, el micelio espera. Aquí aparecerán los hilos hacia tu gente.'}</p>
    </section>
  </div>;
}
