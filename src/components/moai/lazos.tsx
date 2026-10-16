// Mi gente (decisión de Mateo, 15 de octubre: Mi gente y Mis lazos son un solo lugar). Tu red: tú al centro, tus grupos
// y, en un arco, cada persona. El color y el grosor de cada hilo dicen cómo está el vínculo (vivo, tibio, dormido);
// nunca un número (regla 5). La familia (raíz) no se marchita: su hilo se mantiene firme y solo el punto recuerda.
// En el teléfono, la misma red como lista. Al lado, un panel de vidrio: lo que espera respuesta (de a una cosa) y,
// al tocar a alguien, lo que puedes hacer (saludar, formar un Moai, reportar, agregar a tu familia).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { Api, Gente, GrupoLazo, Lazos, Perfil, PersonaLazo, Respuesta } from '@/lib/api';
import { textoDe } from '@/lib/lazos';
import { MAX_MOAI } from '@/lib/moai';
import { textoSaludo, type Saludo } from '@/lib/perfil';
import { Barra, type Ir } from './diario';
import { Campo } from './cuenta';
import { AgregarInterno, Pausa, ReportarPersona } from './gente';

const rango: Record<GrupoLazo['tipo'], string> = { raiz: 'Raíz', interno: 'Tronco', moai: 'Tronco · Moai', rama: 'Rama' };
const sobreGrupo: Record<GrupoLazo['tipo'], string> = {
  raiz: 'Tu familia. Las raíces no se marchitan, aunque pase el tiempo; aquí solo te recuerdo cuándo hace falta una llamada.',
  interno: 'Quienes te nutren y te recargan. Cuidar estos vínculos también es cuidarte.',
  moai: 'Tu Moai: un grupo pequeño que se cuida y se ve seguido.',
  rama: 'Personas con las que te viste en persona. De aquí puede nacer un Moai.',
};
const SALUDOS: Saludo[] = ['buenos-dias', 'pienso', 'tinto'];
const fechaCorta = (iso: string) => new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));

// Lo que espera tu respuesta, de a una cosa: una invitación a un Moai o «¿Te viste con…?» después de un plan.
function ParaResponder({ gente, api, usar }: { gente: Gente; api: Api; usar: (r: Respuesta<Gente>) => void }) {
  const i = gente.invitaciones[0];
  if (i) return <div className="lazo-detalle para-responder">
    <p className="lazo-rango">Para responder</p>
    <p>{i.tipo === 'nuevo' ? <><strong>{i.de}</strong> te propone formar un Moai: «{i.nombre}».</>
      : i.tipo === 'entrar' ? <>Te invitan a «{i.nombre}», el Moai de {i.miembros.join(', ')}.</>
      : <><strong>{i.de}</strong> quiere sumar a <strong>{i.persona}</strong> a «{i.nombre}». Entra solo si todos están de acuerdo, y nadie sabrá quién dijo qué.</>}</p>
    <div className="plan-acciones">
      <Button className="diario-boton principal" onClick={() => void api.responderInvitacion(i.id, true).then(usar)}>{i.tipo === 'aprobar' ? 'Sí, que entre' : 'Sí, me sumo'}</Button>
      <Button className="diario-boton" onClick={() => void api.responderInvitacion(i.id, false).then(usar)}>{i.tipo === 'aprobar' ? 'Prefiero que no' : 'Ahora no'}</Button>
    </div>
  </div>;
  const e = gente.encuentros[0];
  if (e) return <div className="lazo-detalle para-responder">
    <p className="lazo-rango">Para responder</p>
    <h2>¿Te viste con…?</h2>
    <p>{e.titulo} · {fechaCorta(e.ocurrencia)}</p>
    <p className="campo-ayuda">Solo si las dos personas lo confirman, después podrán formar un Moai. Nadie ve lo que respondes.</p>
    <ul className="personas">
      {e.personas.map(p => <li key={p.ref}><strong>{p.nombre}</strong>
        <div className="plan-acciones">
          <Button className="diario-boton principal" onClick={() => void api.nosVimos({ planId: e.planId, ocurrencia: e.ocurrencia, ref: p.ref, si: true }).then(usar)}>Sí, nos vimos</Button>
          <Button className="diario-boton" onClick={() => void api.nosVimos({ planId: e.planId, ocurrencia: e.ocurrencia, ref: p.ref, si: false }).then(usar)}>No coincidimos</Button>
        </div>
      </li>)}
    </ul>
  </div>;
  return null;
}

// «Formar un Moai» con alguien con quien ya te viste: solo el nombre del grupo.
function ProponerMoai({ referencia, nombre, api, usar, alCancelar }: { referencia: string; nombre: string; api: Api; usar: (r: Respuesta<Gente>) => void; alCancelar: () => void }) {
  const [nombreMoai, setNombreMoai] = useState('');
  const [error, setError] = useState('');
  async function enviar(e: FormEvent) {
    e.preventDefault();
    const r = await api.proponerMoai(referencia, nombreMoai);
    if (r.ok) { usar(r); alCancelar(); } else setError(r.errores?.nombre ?? r.error);
  }
  return <form className="cuenta-form diario-form" onSubmit={e => void enviar(e)} noValidate>
    <Campo etiqueta="¿Cómo se llamaría su Moai?" error={error} ayuda={`Si ${nombre} acepta, nace su Moai. Luego pueden sumar a más gente, hasta ${MAX_MOAI}.`}>{(id, d) =>
      <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={40} placeholder="Por ejemplo, Los del parque" value={nombreMoai} onChange={e => setNombreMoai(e.target.value)}/>}</Campo>
    <div className="plan-acciones">
      <Button type="submit" className="diario-boton principal">Proponer</Button>
      <Button type="button" className="diario-boton" onClick={alCancelar}>Cancelar</Button>
    </div>
  </form>;
}

type Panel = { tipo: 'nada' } | { tipo: 'agregar'; familia: boolean };

function Detalle({ persona, grupo, gente, api, ir, alCambiar, usar, agregar }: {
  persona: PersonaLazo | null; grupo: GrupoLazo | null; gente: Gente | null; api: Api; ir: Ir;
  alCambiar: () => void; usar: (r: Respuesta<Gente>) => void; agregar: (familia: boolean) => void;
}) {
  const [aviso, setAviso] = useState('');
  const [accion, setAccion] = useState<'saludar' | 'moai' | 'reportar' | 'quitar' | null>(null);
  useEffect(() => { setAviso(''); setAccion(null); }, [persona?.id, grupo?.id]);
  if (persona) {
    const a = persona.accion;
    const conocido = a.tipo === 'saludo' ? gente?.conocidos.find(c => c.ref === a.ref) : undefined;
    return <div className="lazo-detalle">
      <p className="lazo-rango">{grupo ? `${rango[grupo.tipo]} · ${grupo.nombre}` : ''}</p>
      <h2>{persona.nombre}</h2>
      {persona.detalle && <p className="plan-donde">{persona.detalle}</p>}
      <p className={`lazo-estado estado-${persona.estado}`}><span aria-hidden="true"/>{textoDe(persona.estado, persona.grupo === 'raiz')}</p>
      {persona.puerta && <p className="puerta-abierta">Dejó su puerta abierta esta semana</p>}
      {aviso && <p className="campo-ayuda" role="status">{aviso}</p>}
      {a.tipo === 'interno' && <div className="plan-acciones">
        <Button className="diario-boton principal" onClick={() => void api.hablamos(a.id).then(r => { setAviso(r.ok ? 'Qué bueno. Ese hilo se aviva.' : r.error); alCambiar(); })}>Ya hablamos</Button>
        <a className="diario-boton enlace-boton" href={`whatsapp://send?text=${encodeURIComponent(`Hola, ${persona.nombre}. Me acordé de ti.`)}`}>Escribirle por WhatsApp</a>
        {accion === 'quitar'
          ? <><span>¿Quitar a {persona.nombre} de tu red?</span>
            <Button className="diario-boton" onClick={() => void api.quitarInterno(a.id).then(() => alCambiar())}>Sí, quitar</Button>
            <Button className="diario-boton" onClick={() => setAccion(null)}>No</Button></>
          : <button type="button" className="brisa-enlace" onClick={() => setAccion('quitar')}>Quitar de mi red</button>}
      </div>}
      {a.tipo === 'moai' && <div className="plan-acciones"><Button className="diario-boton principal" onClick={() => ir(`/moais/${a.moaiId}`)}>Abrir el Moai</Button></div>}
      {a.tipo === 'saludo' && <>
        {accion === 'moai' ? <ProponerMoai referencia={a.ref} nombre={persona.nombre} api={api} usar={r => { usar(r); alCambiar(); }} alCancelar={() => setAccion(null)}/>
        : accion === 'saludar' ? <div className="plan-acciones" role="group" aria-label={`Saludar de lejos a ${persona.nombre}`}>
          {SALUDOS.map(s => <Button key={s} className="diario-boton" onClick={() => void api.saludar(a.ref, s).then(r => { setAviso(r.ok ? `Le mandaste: «${textoSaludo(s)}».` : r.error); setAccion(null); alCambiar(); })}>{textoSaludo(s)}</Button>)}
        </div>
        : accion === 'reportar' ? <ReportarPersona referencia={a.ref} nombre={persona.nombre} api={api} onListo={g => { if (g) { usar({ ok: true, datos: g }); alCambiar(); } else setAccion(null); }}/>
        : <div className="plan-acciones">
          {conocido?.propuesta ? <span className="plan-voy">Propuesta de Moai pendiente</span>
            : <Button className="diario-boton principal" disabled={gente?.pausa} onClick={() => setAccion('moai')}>Formar un Moai</Button>}
          <Button className="diario-boton" onClick={() => setAccion('saludar')}>Saludar de lejos</Button>
          <button type="button" className="brisa-enlace" onClick={() => setAccion('reportar')}>Reportar o bloquear</button>
        </div>}
      </>}
    </div>;
  }
  if (grupo) return <div className="lazo-detalle">
    <p className="lazo-rango">{rango[grupo.tipo]}</p>
    <h2>{grupo.nombre}</h2>
    <p>{sobreGrupo[grupo.tipo]}</p>
    {grupo.moaiId && <Button className="diario-boton principal" onClick={() => ir(`/moais/${grupo.moaiId}`)}>Abrir el Moai</Button>}
    {(grupo.tipo === 'raiz' || grupo.tipo === 'interno') && <Button className="diario-boton" onClick={() => agregar(grupo.tipo === 'raiz')}>Agregar a alguien</Button>}
  </div>;
  return <div className="lazo-detalle">
    <p className="lazo-rango">Tu red</p>
    <p>Cada hilo es una persona. Su color te dice cómo está el vínculo, sin números: solo para que sepas a quién buscar.</p>
    <ul className="lazo-leyenda">
      <li><span className="estado-vivo"/>En contacto</li>
      <li><span className="estado-tibio"/>Hace un tiempo</li>
      <li><span className="estado-dormido"/>Dormido: un saludo lo despierta</li>
      <li><span className="puerta"/>Puerta abierta</li>
    </ul>
    <Button className="diario-boton" onClick={() => agregar(true)}>Agregar a mi red</Button>
  </div>;
}

type Posicion = { x: number; y: number };

export function MiGente({ perfil, api, ir, onSalir }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void }) {
  const [lazos, setLazos] = useState<Lazos | null>(null);
  const [gente, setGente] = useState<Gente | null>(null);
  const [error, setError] = useState('');
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>({ tipo: 'nada' });
  const area = useRef<HTMLDivElement>(null);
  const aside = useRef<HTMLElement>(null);
  const [ancho, setAncho] = useState(1000);
  const cargar = useCallback(() => void api.lazos().then(r => r.ok ? setLazos(r.datos) : setError(r.error)), [api]);
  const usar = useCallback((r: Respuesta<Gente>) => { if (r.ok) setGente(r.datos); else setError(r.error); }, []);
  useEffect(cargar, [cargar]);
  useEffect(() => { void api.gente().then(usar); }, [api, usar]);
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
  const pendiente = !!gente && (gente.invitaciones.length > 0 || gente.encuentros.length > 0);

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
  const mirarPanel = () => { if (!red) aside.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); };
  const elegirPersona = (id: string) => { setPersonaId(id); setGrupoId(null); setPanel({ tipo: 'nada' }); mirarPanel(); };
  const elegirGrupo = (id: string) => { setGrupoId(g => g === id ? null : id); setPersonaId(null); setPanel({ tipo: 'nada' }); mirarPanel(); };
  const agregar = (familia: boolean) => { setPanel({ tipo: 'agregar', familia }); setPersonaId(null); setGrupoId(null); mirarPanel(); };
  const recargar = () => { cargar(); void api.gente().then(usar); };
  const activo = persona?.grupo ?? grupoId;
  const nadaElegido = !persona && !grupo;

  return <div className="lazos">
    <Barra ir={ir} onSalir={onSalir} actual="gente"/>
    <main className="lazos-cuerpo">
      <h1 className="solo-lectores" tabIndex={-1}>Mi gente</h1>
      <div className="lazos-red" ref={area}>
        {error && <p className="campo-error" role="alert">{error}</p>}
        {lazos && !lazos.grupos.length && <div className="lazo-vacio vidrio">
          <h2>Tu gente empieza aquí</h2>
          <p>Agrega a tu familia y a quienes te nutren, aunque no vivan cerca. Y cuando te veas con alguien en un plan, también aparecerá.</p>
          <Button className="diario-boton principal" onClick={() => agregar(true)}>Agregar a mi familia</Button>
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
      {/* Sin red y sin nada pendiente, el panel sobra: la invitación a empezar ya está a la vista.
          En el teléfono el panel sube cuando hay algo que responder o alguien elegido; si no, primero la red. */}
      <aside className={`panel-lazo vidrio${pendiente || !nadaElegido || panel.tipo === 'agregar' ? ' arriba' : ''}`} aria-live="polite" ref={aside} hidden={panel.tipo === 'nada' && nadaElegido && !pendiente && !gente?.pausa && !!lazos && !lazos.grupos.length}>
        {gente?.pausa && <Pausa/>}
        {panel.tipo === 'agregar'
          ? <AgregarInterno api={api} familia={panel.familia} alListo={() => { setPanel({ tipo: 'nada' }); recargar(); }} alCancelar={() => setPanel({ tipo: 'nada' })}/>
          : nadaElegido && pendiente && gente ? <ParaResponder gente={gente} api={api} usar={r => { usar(r); cargar(); }}/>
          : <Detalle persona={persona} grupo={grupo} gente={gente} api={api} ir={ir} alCambiar={recargar} usar={usar} agregar={agregar}/>}
      </aside>
    </main>
  </div>;
}
