import { useEffect, useState, useId } from 'react';
import type { City, Time, Weather, MoaiState } from '@/lib/moai/state';

const homes: [number, number, number][] = [
  [35,407,24],[74,380,22],[104,420,28],[142,354,20],[177,389,27],[210,330,22],[249,361,27],[292,304,23],[325,342,27],[353,290,20],
  [11,485,33],[54,459,26],[95,501,34],[133,450,28],[172,489,33],[218,426,31],[256,461,30],[300,402,33],[342,437,31],[370,380,28],
  [-10,571,44],[43,549,37],[93,580,44],[148,531,35],[196,570,39],[244,504,36],[290,543,42],[350,489,34],
  [14,653,47],[76,623,43],[130,669,50],[192,611,42],[249,657,46],[314,596,44],[365,626,39],
];
function Umbrella({ x, y, scale = 1, variant = '' }: { x: number; y: number; scale?: number; variant?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} className={`umbrella-tree ${variant}`}>
    <path d="M0 12 C-3 80 5 101 -5 142 M0 61 L-28 26 M0 52 L32 18" className="umbrella-trunk" />
    <ellipse cx="0" cy="0" rx="68" ry="24" className="canopy-halo" />
    <path d="M-65 5 Q-50 -33 0 -31 Q50 -32 65 5 Q0 29 -65 5Z" className="canopy" />
    <path d="M-59 4 Q0 -14 58 4 M0 -29 L-28 10 M0 -29 L26 11 M0 -29 L0 15" className="canopy-veins" />
  </g>;
}
export function Scene({ city, time, weather, courtyard, descend = false, onBackground }: { city: City; time: Time; weather: Weather; courtyard?: MoaiState | undefined; descend?: boolean; onBackground?: (real: boolean) => void }) {
  const [imageReady, setImageReady] = useState(false);
  const id = useId().replace(/:/g, '');
  const image = `/backgrounds/${city}-${time}.jpg`;
  useEffect(() => { setImageReady(false); onBackground?.(false); }, [image]); // eslint-disable-line react-hooks/exhaustive-deps
  const skyId = `sky-${id}`;
  return <div className={`scene scene-${time} city-${city} weather-${weather} ${descend ? 'scene-descend' : ''}`} aria-hidden="true">
    <svg className="procedural-scene" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="sky-top" /><stop offset=".65" className="sky-bottom" /><stop offset="1" className="sky-low" /></linearGradient>
        <filter id={`glow-${id}`}><feGaussianBlur stdDeviation="4" /></filter>
        <pattern id={`brick-${id}`} width="12" height="8" patternUnits="userSpaceOnUse"><path d="M0 0H12 M0 8H12 M6 0V4 M0 4H12 M0 4V8 M12 4V8" className="brick-lines" /></pattern>
      </defs>
      <rect width="390" height="844" fill={`url(#${skyId})`} />
      <g className="stars">{Array.from({length: 26}, (_, i) => <circle key={i} cx={(i * 73 + 21) % 390} cy={(i * 37 + 22) % 310} r={i % 4 === 0 ? 1.5 : .7} />)}</g>
      <circle cx="334" cy="100" r="25" className="celestial-halo" filter={`url(#glow-${id})`} /><circle cx="334" cy="100" r="17" className="celestial" />
      <path d="M-30 435 Q75 255 163 332 Q249 203 426 291 L430 844 H-30Z" className="hill far-hill" />
      <path d="M-30 530 Q83 319 185 414 Q285 256 429 332 L430 844 H-30Z" className="hill middle-hill" />
      <path d="M-30 594 Q90 368 172 477 Q290 330 430 398 L430 844 H-30Z" className="hill near-hill" />
      <path d="M397 414 C288 468 350 523 211 591 S126 715 45 844" className="river-bank" />
      <path d="M397 414 C288 468 350 523 211 591 S126 715 45 844" className="river" />
      <path d="M-20 603 Q84 580 182 503 T410 427 M-20 723 Q94 700 213 625 T411 541" className="street-line" />
      <g>{homes.map(([x,y,w], i) => <g key={i} transform={`translate(${x},${y})`} className={`brick-house house-tone-${i%3}`}>
        <path d={`M-3 0 L${w/2} -10 L${w+3} 0Z`} className="roof" />
        <rect width={w} height={w*.9} rx="1" className="house-wall" /><rect width={w} height={w*.9} fill={`url(#brick-${id})`} />
        <rect x={w*.16} y={w*.18} width={w*.21} height={w*.27} rx="1" className={i%3 === 0 ? 'window lit' : 'window'} />
        <rect x={w*.61} y={w*.18} width={w*.2} height={w*.27} rx="1" className={i%4 === 0 ? 'window lit' : 'window'} />
        <rect x={w*.41} y={w*.56} width={w*.2} height={w*.34} className="door" />
      </g>)}</g>
      <g className="cable-line"><path d="M-30 293 Q195 348 425 246" /><path d="M51 303V438 M338 279V355" /><g className="cable-car"><path d="M223 318v11" /><rect x="213" y="328" width="22" height="21" rx="5" /><path d="M217 332h14v8h-14z" className="cable-window" /></g></g>
      <Umbrella x={59} y={398} scale={.85} variant="violet" /><Umbrella x={338} y={376} scale={.9} /><Umbrella x={203} y={520} scale={1.15} variant="violet" />
      <path d="M-30 772 Q85 646 193 728 Q295 656 420 734 L420 880 H-30Z" className="foreground-hill" />
      <path d="M-30 824 Q167 702 430 781" className="courtyard-path" />
      <Umbrella x={47} y={683} scale={1.5} /><Umbrella x={372} y={648} scale={1.3} variant="violet" />
      <g className="scene-foliage">{Array.from({length: 18}, (_,i) => <path key={i} d={`M${i*27-20} 855 Q${i*27-42} ${750-i%3*19} ${i*27-8} ${766-i%3*18} Q${i*27+26} ${731-i%3*20} ${i*27+9} 855Z`} />)}</g>
      {courtyard && <g transform="translate(35 -190) scale(.8)" className={`courtyard seed-${courtyard.semilla.replaceAll(' ', '-')} mood-${courtyard.estadoDia ?? 'none'}`}>
        <ellipse cx="198" cy="683" rx="92" ry="22" className="courtyard-ground" />
        <path d="M195 681 Q204 632 192 570 M196 624L166 596 M199 608L226 584" className="personal-trunk" />
        {courtyard.semilla === 'palma de cera' ? <g className="personal-leaves"><path d="M192 570Q153 528 128 565Q170 555 192 570 M192 570Q229 524 255 560Q212 551 192 570 M192 570Q179 521 169 523 M192 570Q202 519 217 520" /></g> : <g className="personal-leaves"><ellipse cx="190" cy="566" rx={courtyard.semilla === 'ceiba' ? 53 : 42} ry="32" /><ellipse cx="162" cy="585" rx="29" ry="24" /><ellipse cx="222" cy="580" rx="30" ry="26" /></g>}
        <path d="M205 617v26h14" className="lamp-hook" />
        <g className="tree-lamp"><rect x="213" y="638" width="14" height="19" rx="5" />{courtyard.estadoDia === 'Energía' ? <path d="m220 641 2 5 4 1-3 3v4l-3-2-3 2v-4l-2-3 4-1z" /> : courtyard.estadoDia === 'Cuidado' ? <path d="M220 642q-8 10 0 11q8-1 0-11" /> : courtyard.estadoDia === 'Compañía' ? <><circle cx="217" cy="648" r="3"/><circle cx="223" cy="648" r="3"/></> : <circle cx="220" cy="648" r="4" />}</g>
        {courtyard.deseos.length > 0 && <g className="bench"><path d="M119 676h34v8h-34z M122 684v9 M149 684v9 M119 667h34v6h-34z" /></g>}
        {courtyard.companeros.includes('un perro') && <g className="animal dog"><path d="M243 682h21v-9l7 3v8h-6v11h-4v-10h-13v10h-4v-10l-8-8" /></g>}
        {courtyard.companeros.includes('un gato') && <g className="animal cat"><path d="M278 690q-5-12 1-18l3 4 4-4 2 7q4 10-3 13h-8q-11-2-7-13" /></g>}
        {courtyard.companeros.includes('otro animal') && <g className="animal"><path d="M147 651q8-9 15 0q7-8 15 0q-12-2-15 7q-3-7-15-7" /></g>}
        {(courtyard.companeros.includes('mi huerta') || courtyard.companeros.includes('mis matas')) && <g className="garden"><path d="M96 688h18l-4 14h-10z" /><path d="M105 689v-21q-13-10-12 0q0 9 12 10q12-18 15-10q2 9-15 14" /></g>}
        {courtyard.personas.map((p,i) => <g key={i} transform={`translate(${74+i*48} ${728+(i%2)*9})`} className={`personal-house ring-${p.anillo}`}><path d="M-3 0L17-15 37 0" /><rect width="34" height="35" rx="2" /><rect x="12" y="9" width="10" height="15" className={`personal-window ${courtyard.espora.destinatario === p.nombre ? 'lit pulse-window' : ''}`} /></g>)}
        {!courtyard.personas.length && <g className="street-lamp"><path d="M286 731v-42h-14" /><circle cx="270" cy="690" r="6" /></g>}
      </g>}
      <g className="mist"><path d="M-40 456Q100 425 236 463T460 443" /><path d="M-40 566Q160 545 295 572T460 558" /></g>
      {weather === 'lluvia' && <g className="rain">{Array.from({length: 40}, (_,i) => <path key={i} d={`m${i*47%410} ${i*71%830} -7 22`} />)}</g>}
    </svg>
    <img key={image} className={`scene-photo ${imageReady ? 'ready' : ''}`} src={image} alt="" onLoad={() => { setImageReady(true); onBackground?.(true); }} onError={() => { setImageReady(false); onBackground?.(false); }} />
    <div className="scene-grain" />
  </div>;
}
