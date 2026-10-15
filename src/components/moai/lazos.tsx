// Mis lazos (referente de Mateo, 15 de octubre): tú al centro, tus grupos y, en un arco, cada persona.
// El color y el grosor de cada hilo dicen cómo está el vínculo (vivo, tibio, dormido); nunca un número (regla 5).
// La familia (raíz) no se marchita: su hilo se mantiene firme y solo el punto cambia de color para recordarte.
// En el teléfono, la misma red como lista. Al tocar a alguien, un panel de vidrio con qué puedes hacer.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Api, GrupoLazo, Lazos, Perfil, PersonaLazo } from '@/lib/api';
import { textoDe } from '@/lib/lazos';
import { textoSaludo, type Saludo } from '@/lib/perfil';
import { MenuMas, type Ir } from './diario';

const rango: Record<GrupoLazo['tipo'], string> = { raiz: 'Raíz', interno: 'Tronco', moai: 'Tronco · Moai', rama: 'Rama' };
const sobreGrupo: Record<GrupoLazo['tipo'], string> = {
  raiz: 'Tu familia. Las raíces no se marchitan, aunque pase el tiempo; aquí solo te recuerdo cuándo hace falta una llamada.',
  interno: 'Quienes te nutren y te recargan. Cuidar estos vínculos también es cuidarte.',
  moai: 'Tu Moai: un grupo pequeño que se cuida y se ve seguido.',
  rama: 'Personas con las que te viste en persona. De aquí puede nacer un Moai.',
};
const SALUDOS: Saludo[] = ['buenos-dias', 'pienso', 'tinto'];

function Detalle({ persona, grupo, api, ir, alCambiar }: { persona: PersonaLazo | null; grupo: GrupoLazo | null; api: Api; ir: Ir; alCambiar: () => void }) {
  const [aviso, setAviso] = useState('');
  useEffect(() => setAviso(''), [persona?.id, grupo?.id]);
  if (persona) {
    const a = persona.accion;
    return <div className="lazo-detalle">
      <p className="lazo-rango">{grupo ? `${rango[grupo.tipo]} · ${grupo.nombre}` : ''}</p>
      <h2>{persona.nombre}</h2>
      {persona.detalle && <p className="plan-donde">{persona.detalle}</p>}
      <p className={`lazo-estado estado-${persona.estado}`}><span aria-hidden="true"/>{textoDe(persona.estado, persona.grupo === 'raiz')}</p>
      {persona.puerta && <p className="puerta-abierta">Dejó su puerta abierta esta semana</p>}
      {aviso && <p className="campo-ayuda" role="status">{aviso}</p>}
      <div className="plan-acciones">
        {a.tipo === 'interno' && <>
          <Button className="diario-boton principal" onClick={() => void api.hablamos(a.id).then(r => { setAviso(r.ok ? 'Qué bueno. Ese hilo se aviva.' : r.error); alCambiar(); })}>Ya hablamos</Button>
          <a className="diario-boton enlace-boton" href={`whatsapp://send?text=${encodeURIComponent(`Hola, ${persona.nombre}. Me acordé de ti.`)}`}>Escribirle por WhatsApp</a>
        </>}
        {a.tipo === 'moai' && <Button className="diario-boton principal" onClick={() => ir(`/moais/${a.moaiId}`)}>Abrir el Moai</Button>}
        {a.tipo === 'saludo' && SALUDOS.map(s => <Button key={s} className="diario-boton" onClick={() => void api.saludar(a.ref, s).then(r => { setAviso(r.ok ? `Le mandaste: «${textoSaludo(s)}».` : r.error); alCambiar(); })}>{textoSaludo(s)}</Button>)}
      </div>
    </div>;
  }
  if (grupo) return <div className="lazo-detalle">
    <p className="lazo-rango">{rango[grupo.tipo]}</p>
    <h2>{grupo.nombre}</h2>
    <p>{sobreGrupo[grupo.tipo]}</p>
    {grupo.moaiId && <Button className="diario-boton principal" onClick={() => ir(`/moais/${grupo.moaiId}`)}>Abrir el Moai</Button>}
    {(grupo.tipo === 'raiz' || grupo.tipo === 'interno') && <Button className="diario-boton" onClick={() => ir('/gente')}>Agregar a alguien</Button>}
  </div>;
  return <div className="lazo-detalle">
    <p className="lazo-rango">Tu red</p>
    <h2>Mis lazos</h2>
    <p>Cada hilo es una persona. Su color te dice cómo está el vínculo, sin números: solo para que sepas a quién buscar.</p>
    <ul className="lazo-leyenda">
      <li><span className="estado-vivo"/>En contacto</li>
      <li><span className="estado-tibio"/>Hace un tiempo</li>
      <li><span className="estado-dormido"/>Dormido: un saludo lo despierta</li>
      <li><span className="puerta"/>Puerta abierta</li>
    </ul>
    <Button className="diario-boton" onClick={() => ir('/gente')}>Agregar a mi familia o a quien me nutre</Button>
  </div>;
}

type Posicion = { x: number; y: number };

export function MisLazos({ perfil, api, ir, onSalir }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void }) {
  const [lazos, setLazos] = useState<Lazos | null>(null);
  const [error, setError] = useState('');
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(1000);
  const cargar = useCallback(() => void api.lazos().then(r => r.ok ? setLazos(r.datos) : setError(r.error)), [api]);
  useEffect(cargar, [cargar]);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth || 1000);
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const o = new ResizeObserver(medir);
    o.observe(el);
    return () => o.disconnect();
  }, [lazos]);

  const persona = lazos?.personas.find(p => p.id === personaId) ?? null;
  const grupo = lazos?.grupos.find(g => g.id === (persona?.grupo ?? grupoId)) ?? null;
  const red = ancho >= 760; // en pantallas angostas, la misma red como lista

  // Geometría: centro a la izquierda, grupos en una columna y personas en un arco que se abre a la derecha.
  const geo = useMemo(() => {
    if (!lazos) return null;
    const personas = lazos.grupos.flatMap(g => lazos.personas.filter(p => p.grupo === g.id));
    const alto = Math.max(520, personas.length * 48 + 120);
    const centro: Posicion = { x: 110, y: alto / 2 };
    const xGrupo = Math.min(300, ancho * 0.3);
    const grupos = new Map<string, Posicion>(lazos.grupos.map((g, i) => [g.id, { x: xGrupo, y: alto / 2 + (i - (lazos.grupos.length - 1) / 2) * 92 }]));
    const base = Math.min(ancho - 230, xGrupo + 250);
    const puntos = new Map<string, Posicion>(personas.map((p, k) => {
      const t = (k + 0.5) / personas.length;
      return [p.id, { x: base + Math.sin(Math.PI * t) * Math.min(140, ancho * 0.12), y: 60 + t * (alto - 120) }];
    }));
    return { alto, centro, grupos, puntos, personas };
  }, [lazos, ancho]);

  const hilo = (a: Posicion, b: Posicion, ancho0 = 96) => `M${a.x} ${a.y} C ${a.x + ancho0} ${a.y}, ${b.x - ancho0} ${b.y}, ${b.x} ${b.y}`;
  const elegirPersona = (id: string) => { setPersonaId(id); setGrupoId(null); };
  const elegirGrupo = (id: string) => { setGrupoId(g => g === id ? null : id); setPersonaId(null); };
  const activo = persona?.grupo ?? grupoId;

  return <div className="lazos">
    <header className="inicio-cabecera vidrio">
      <span className="diario-marca">MOAI</span>
      <nav aria-label="Secciones">
        <button type="button" onClick={() => ir('/inicio')}>Brisa</button>
        <button type="button" onClick={() => ir('/comunidad')}>Mapa</button>
        <button type="button" aria-current="page" onClick={() => ir('/lazos')}>Lazos</button>
      </nav>
      <MenuMas ir={ir} onSalir={onSalir} equipo={perfil.equipo} organizaciones={!!perfil.organizaciones?.length}/>
    </header>
    <main className="lazos-cuerpo">
      <h1 className="solo-lectores" tabIndex={-1}>Mis lazos</h1>
      <div className="lazos-red" ref={area}>
        {error && <p className="campo-error" role="alert">{error}</p>}
        {lazos && !lazos.grupos.length && <div className="lazo-vacio vidrio">
          <h2>Tus lazos empiezan aquí</h2>
          <p>Agrega a tu familia y a quienes te nutren, aunque no vivan cerca. Y cuando te veas con alguien en un plan, también aparecerá.</p>
          <Button className="diario-boton principal" onClick={() => ir('/gente')}>Agregar a mi familia</Button>
        </div>}
        {lazos && geo && lazos.grupos.length > 0 && (red ? <div className="red" style={{ height: geo.alto }}>
          <svg className="red-hilos" width={ancho} height={geo.alto} aria-hidden="true">
            {lazos.grupos.map(g => <path key={g.id} d={hilo(geo.centro, geo.grupos.get(g.id)!, 80)} className={`hilo-centro${activo && activo !== g.id ? ' apagado' : ''}`}/>)}
            {geo.personas.map(p => {
              const g = lazos.grupos.find(x => x.id === p.grupo)!;
              const desde = geo.grupos.get(g.id)!;
              return <path key={p.id} d={hilo({ x: desde.x + 190, y: desde.y }, geo.puntos.get(p.id)!)}
                className={`hilo estado-${p.estado}${g.tipo === 'raiz' ? ' raiz' : ''}${activo && activo !== g.id ? ' apagado' : ''}${personaId === p.id ? ' elegido' : ''}`}/>;
            })}
          </svg>
          <div className="red-centro" style={{ left: geo.centro.x, top: geo.centro.y }}>
            <span className="red-orbe" aria-hidden="true"/>
            <strong>{perfil.nombre.split(' ')[0]}</strong>
          </div>
          {lazos.grupos.map(g => { const p = geo.grupos.get(g.id)!; return <button key={g.id} type="button" className={`red-grupo vidrio tipo-${g.tipo}`} aria-pressed={grupoId === g.id}
            style={{ left: p.x, top: p.y }} onClick={() => elegirGrupo(g.id)}><span>{rango[g.tipo]}</span>{g.nombre}</button>; })}
          {geo.personas.map(p => { const q = geo.puntos.get(p.id)!; return <button key={p.id} type="button" className={`red-persona estado-${p.estado}${p.puerta ? ' con-puerta' : ''}`} aria-pressed={personaId === p.id}
            aria-label={`${p.nombre}: ${textoDe(p.estado, p.grupo === 'raiz')}${p.puerta ? '. Dejó su puerta abierta' : ''}`} style={{ left: q.x, top: q.y }} onClick={() => elegirPersona(p.id)}>
            <span className="punto" aria-hidden="true"/>{p.nombre}</button>; })}
        </div> : <div className="red-lista">
          <div className="red-centro lista"><span className="red-orbe" aria-hidden="true"/><strong>{perfil.nombre.split(' ')[0]}</strong></div>
          {lazos.grupos.map(g => <section key={g.id} className={`red-rama vidrio tipo-${g.tipo}`} aria-label={g.nombre}>
            <button type="button" className="red-rama-titulo" onClick={() => elegirGrupo(g.id)}><span>{rango[g.tipo]}</span>{g.nombre}</button>
            <ul>{lazos.personas.filter(p => p.grupo === g.id).map(p => <li key={p.id}>
              <button type="button" className={`red-persona lista estado-${p.estado}${p.puerta ? ' con-puerta' : ''}`} aria-pressed={personaId === p.id} onClick={() => elegirPersona(p.id)}>
                <span className="punto" aria-hidden="true"/>{p.nombre}<small>{textoDe(p.estado, p.grupo === 'raiz').split('.')[0]}</small></button>
            </li>)}</ul>
          </section>)}
        </div>)}
      </div>
      <aside className="panel-lazo vidrio" aria-live="polite">
        <Detalle persona={persona} grupo={grupo} api={api} ir={ir} alCambiar={cargar}/>
      </aside>
    </main>
  </div>;
}
