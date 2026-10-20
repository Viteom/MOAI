import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Search, Sparkles } from 'lucide-react';
import type { Api, Perfil } from '@/lib/api';
import { diasBrisa, describirCriterios, VERSION_MEMORIA, type MemoriaBrisa, type PreferenciasBrisa, type PropuestaBrisa, type ResultadoBrisa } from '@/lib/brisa-intenciones';
import { plantillas } from '@/lib/lugares';
import type { Ir } from './diario';
import './brisa-intenciones.css';

const fecha = (s: string) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(s));
const vacia: PreferenciasBrisa = { tipos: [], dias: [], soloGratis: false, anticipar: false, duracion: 30 };

export function EditorMemoriaBrisa({ api, memoria, alCambiar }: { api: Api; memoria: MemoriaBrisa | null; alCambiar: (m: MemoriaBrisa | null) => void }) {
  const [datos, setDatos] = useState<PreferenciasBrisa>(memoria ?? vacia);
  const [autorizo, setAutorizo] = useState(false);
  const [ocupada, setOcupada] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [olvidar, setOlvidar] = useState(false);
  const bloqueo = useRef(false);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  useEffect(() => { setDatos(memoria ?? vacia); }, [memoria]);
  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (bloqueo.current || !autorizo) return;
    bloqueo.current = true; setOcupada(true); setError(''); setMensaje('');
    const r = await api.guardarMemoriaBrisa({ ...datos, autorizo: true, version: VERSION_MEMORIA });
    if (!vivo.current) return;
    bloqueo.current = false; setOcupada(false);
    if (!r.ok) { setError(r.error); return; }
    alCambiar(r.datos.memoria); setAutorizo(false); setMensaje('Preferencias guardadas. Puedes corregirlas u olvidarlas aquí.');
  }
  async function borrar() {
    if (bloqueo.current) return;
    bloqueo.current = true; setOcupada(true); setError(''); setMensaje('');
    const r = await api.borrarMemoriaBrisa();
    if (!vivo.current) return;
    bloqueo.current = false; setOcupada(false);
    if (!r.ok) { setError(r.error); return; }
    setDatos(vacia); setAutorizo(false); setOlvidar(false); alCambiar(null); setMensaje('Olvidé estas preferencias y descartes. Las propuestas pendientes quedaron anuladas.');
  }
  return <div className="memoria-brisa">
    <p>Solo recuerdo lo que autorices aquí: actividades, días y si prefieres planes gratis. Se guarda cifrado, para ti; no se añade a tu presentación.</p>
    {memoria && <p className="intencion-nota">Autorizaste el {fecha(memoria.autorizadaEn)}. Se olvida el {fecha(memoria.venceEn)}.</p>}
    <form onSubmit={e => void guardar(e)}>
      <fieldset disabled={ocupada}>
        <legend>Qué te gusta hacer</legend>
        <div className="intencion-elecciones">{plantillas.map(p => <label key={p.tipo}><input type="checkbox" checked={datos.tipos.includes(p.tipo)} onChange={e => setDatos(d => ({ ...d, tipos: e.target.checked ? [...d.tipos, p.tipo] : d.tipos.filter(t => t !== p.tipo) }))}/>{p.nombre}</label>)}</div>
      </fieldset>
      <fieldset disabled={ocupada}>
        <legend>Qué días te sirven</legend><p className="intencion-nota">Opcional. Si no eliges, busco cualquier día.</p>
        <div className="intencion-elecciones">{diasBrisa.map((d, i) => <label key={d}><input type="checkbox" checked={datos.dias.includes(i)} onChange={e => setDatos(v => ({ ...v, dias: e.target.checked ? [...v.dias, i] : v.dias.filter(n => n !== i) }))}/>{d}</label>)}</div>
      </fieldset>
      <label className="intencion-check"><input type="checkbox" disabled={ocupada} checked={datos.soloGratis} onChange={e => setDatos(d => ({ ...d, soloGratis: e.target.checked }))}/>Buscar solo planes gratis</label>
      <label className="intencion-check"><input type="checkbox" disabled={ocupada} checked={datos.anticipar} onChange={e => setDatos(d => ({ ...d, anticipar: e.target.checked }))}/>Mostrar propuestas con estas preferencias al abrir «Buscar un plan». No envía avisos ni te suma.</label>
      <label className="intencion-duracion">Recordar durante<select disabled={ocupada} value={datos.duracion} onChange={e => setDatos(d => ({ ...d, duracion: Number(e.target.value) as 30 | 90 }))}><option value={30}>30 días</option><option value={90}>90 días</option></select></label>
      <label className="intencion-check"><input type="checkbox" disabled={ocupada} required checked={autorizo} onChange={e => setAutorizo(e.target.checked)}/>Autorizo guardar y usar estas preferencias para buscar planes durante el plazo elegido. Puedo corregirlas o borrarlas aquí y en Mi cuenta.</label>
      <button className="boton-principal" disabled={ocupada || !autorizo || !datos.tipos.length} type="submit">{ocupada ? 'Guardando…' : memoria ? 'Actualizar memoria' : 'Autorizar y recordar'}</button>
    </form>
    {memoria && (olvidar ? <div className="intencion-confirmacion"><p>¿Olvidar estas preferencias? También anula las propuestas pendientes. La conversación y las asistencias ya confirmadas se conservan.</p><button type="button" disabled={ocupada} onClick={() => void borrar()}>Sí, olvidar preferencias</button><button type="button" disabled={ocupada} onClick={() => setOlvidar(false)}>Cancelar</button></div> : <button type="button" disabled={ocupada} onClick={() => setOlvidar(true)}>Olvidar preferencias</button>)}
    {error && <p role="alert" className="campo-error">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
  </div>;
}

export function MemoriaEnCuenta({ api, ir }: { api: Api; ir: Ir }) {
  const [memoria, setMemoria] = useState<MemoriaBrisa | null | undefined>();
  const [error, setError] = useState('');
  const [acciones, setAcciones] = useState<Awaited<ReturnType<Api['accionesBrisa']>> | null>(null);
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vivo = true; setError('');
    void api.memoriaBrisa().then(r => { if (vivo) { if (r.ok) setMemoria(r.datos.memoria); else setError(r.error); } });
    void api.accionesBrisa().then(r => { if (vivo) setAcciones(r); });
    return () => { vivo = false; };
  }, [api, intento]);
  return <section className="panel intencion-cuenta" aria-labelledby="memoria-titulo"><h2 id="memoria-titulo">Lo que Brisa recuerda</h2>
    {error && <p role="alert">{error}</p>}
    {memoria === undefined ? <button type="button" onClick={() => setIntento(i => i + 1)}>Volver a cargar la memoria</button> : <details><summary>{memoria ? 'Revisar y corregir preferencias' : 'Elegir qué puede recordar'}</summary><EditorMemoriaBrisa api={api} memoria={memoria} alCambiar={setMemoria}/></details>}
    <details><summary>Acciones que confirmaste con Brisa</summary><p>Últimos 90 días. Solo se ejecutan cuando confirmas.</p>
      {acciones?.ok ? acciones.datos.length ? <ul>{acciones.datos.map((a, i) => <li key={i}><strong>{a.accion}</strong><p>{fecha(a.confirmadaEn)} · Plan del {fecha(a.cuando)}</p><p>{a.motivo}</p><button type="button" onClick={() => ir(`/planes/${a.planId}`)}>Abrir plan</button></li>)}</ul> : <p>Todavía no hay acciones confirmadas.</p> : <p role="status">{acciones && !acciones.ok ? acciones.error : 'Cargando acciones…'}</p>}
    </details>
  </section>;
}

export function BuscarConBrisa({ api, perfil, ir, inicial = '', volver }: { api: Api; perfil: Perfil; ir: Ir; inicial?: string; volver: () => void }) {
  const [texto, setTexto] = useState(inicial);
  const [memoria, setMemoria] = useState<MemoriaBrisa | null | undefined>();
  const [usarMemoria, setUsarMemoria] = useState(true);
  const [resultado, setResultado] = useState<ResultadoBrisa | null>(null);
  const [seleccion, setSeleccion] = useState<PropuestaBrisa | null>(null);
  const [ocupada, setOcupada] = useState(false);
  const [error, setError] = useState('');
  const [hecha, setHecha] = useState<string | null>(null);
  const [reintento, setReintento] = useState(0);
  const vivo = useRef(true);
  const bloqueo = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const contador = useRef(0);
  const botonConfirmar = useRef<HTMLButtonElement>(null);
  const confirmada = useRef<HTMLDivElement>(null);
  const resultados = useRef<HTMLElement>(null);
  useEffect(() => { titulo.current?.focus(); }, []);
  useEffect(() => { if (seleccion) botonConfirmar.current?.focus(); }, [seleccion]);
  useEffect(() => { if (hecha) confirmada.current?.focus(); }, [hecha]);
  useEffect(() => { if (resultado) { resultados.current?.focus({ preventScroll: true }); resultados.current?.scrollIntoView?.({ block: 'start' }); } }, [resultado]);
  async function buscar(anticipar = false, m = memoria) {
    if (bloqueo.current || !perfil.lugar || m === undefined) return;
    bloqueo.current = true; setOcupada(true); setError(''); setResultado(null); setSeleccion(null); setHecha(null);
    const turno = ++contador.current;
    const r = await api.buscarConBrisa({ texto: anticipar ? '' : texto, lugarId: perfil.lugar.id, usarMemoria: anticipar || usarMemoria, anticipar });
    if (!vivo.current || turno !== contador.current) return;
    bloqueo.current = false; setOcupada(false);
    if (r.ok) setResultado(r.datos); else setError(r.error);
  }
  useEffect(() => {
    let vigente = true;
    vivo.current = true; setError('');
    void api.memoriaBrisa().then(r => {
      if (!vigente) return;
      if (!r.ok) { setError(r.error); return; }
      setMemoria(r.datos.memoria);
      if (inicial || r.datos.memoria?.anticipar) void buscar(!inicial, r.datos.memoria);
    });
    return () => { vigente = false; vivo.current = false; contador.current++; bloqueo.current = false; };
  }, [api, reintento]); // el lugar cambia desmontando la conversación desde Portada
  const alCambiar = (m: MemoriaBrisa | null) => { setMemoria(m); setResultado(null); setSeleccion(null); setHecha(null); };
  async function confirmar() {
    if (!seleccion || bloqueo.current) return;
    bloqueo.current = true; setOcupada(true); setError('');
    const r = await api.confirmarPropuestaBrisa(seleccion.id);
    if (!vivo.current) return;
    bloqueo.current = false; setOcupada(false);
    if (!r.ok) { setError(r.error); setSeleccion(null); return; }
    setHecha(r.datos.planId); setSeleccion(null); setResultado(null);
  }
  async function descartar(p: PropuestaBrisa) {
    if (bloqueo.current) return;
    bloqueo.current = true; setOcupada(true); setError('');
    const r = await api.descartarPropuestaBrisa(p.id);
    if (!vivo.current) return;
    bloqueo.current = false; setOcupada(false);
    if (!r.ok) { setError(r.error); return; }
    setResultado(a => a && ({ ...a, propuestas: a.propuestas.filter(v => v.id !== p.id), mensaje: a.propuestas.length === 1 ? 'Descartaste estas propuestas. Puedes cambiar la búsqueda o ir a Mi barrio.' : a.mensaje }));
  }
  return <section className="brisa-intencion" aria-labelledby="intencion-titulo">
    <button type="button" className="intencion-volver" onClick={volver}><ArrowLeft aria-hidden="true"/>Volver a la conversación</button>
    <h1 id="intencion-titulo" ref={titulo} tabIndex={-1}>Busquemos un plan</h1>
    <p className="intencion-zona"><Sparkles aria-hidden="true"/>{perfil.lugar?.zona ?? 'Elige un lugar para comenzar'}</p>
    <p>Cuéntame qué te provoca. Tú decides a qué plan sumarte.</p>
    {!perfil.lugar && <button type="button" onClick={() => ir('/lugares')}>Elegir mi lugar</button>}
    <form onSubmit={e => { e.preventDefault(); void buscar(); }}>
      <label htmlFor="intencion-texto">Qué te gustaría hacer</label>
      <textarea id="intencion-texto" rows={2} maxLength={300} value={texto} disabled={ocupada} onChange={e => { setTexto(e.target.value); setSeleccion(null); }} placeholder="Busca una caminata para el sábado"/>
      {memoria && <label className="intencion-check"><input type="checkbox" checked={usarMemoria} disabled={ocupada} onChange={e => { setUsarMemoria(e.target.checked); setSeleccion(null); }}/>Usar también mis preferencias autorizadas</label>}
      <button type="submit" className="boton-principal" disabled={ocupada || !perfil.lugar || memoria === undefined}><Search aria-hidden="true"/>{ocupada ? 'Un momento…' : 'Buscar planes'}</button>
    </form>
    {error && <p className="campo-error" role="alert">{error}</p>}
    {memoria === undefined && (error ? <button type="button" onClick={() => setReintento(i => i + 1)}>Volver a cargar preferencias</button> : <p role="status">Consultando tus preferencias…</p>)}
    {hecha && <div ref={confirmada} tabIndex={-1} className="intencion-confirmacion" role="status"><strong>Te sumaste al plan.</strong><p>La asistencia quedó confirmada. Puedes salir desde sus detalles si cambias de idea.</p><button type="button" onClick={() => ir(`/planes/${hecha}`)}>Ver mi plan</button></div>}
    {resultado && <section ref={resultados} tabIndex={-1} className="intencion-resultados" aria-label="Planes encontrados"><p role="status">{resultado.mensaje}</p><p className="intencion-nota">{describirCriterios(resultado.criterios)} · Próximos 30 días</p>
      {resultado.propuestas.map(p => <article className="intencion-plan" key={p.id}>
        <h3>{p.plan.titulo}</h3><p>{fecha(p.plan.cuando)} · Hora de Colombia</p><p>{p.plan.lugarPublico} · {p.plan.zona}</p><p>{p.plan.costo === 'gratis' ? 'Gratis' : 'Cada quien paga lo suyo'}</p>
        {p.plan.descripcion && <p>{p.plan.descripcion}</p>}
        <p className="intencion-motivo"><strong>Por qué te lo propongo</strong>{p.motivo}</p>
        <p className="intencion-nota">Propuesta válida hasta {fecha(p.venceEn)}. Al sumarte, quien publica ve tu primer nombre.</p>
        {seleccion?.id === p.id ? <div className="intencion-confirmacion" role="group" aria-label={`Confirmar asistencia a ${p.plan.titulo}`}><p>¿Confirmas sumarte a «{p.plan.titulo}» el {fecha(p.plan.cuando)} en {p.plan.lugarPublico}?</p><button ref={botonConfirmar} type="button" className="boton-principal" disabled={ocupada} onClick={() => void confirmar()}>Sí, confirmar asistencia</button><button type="button" disabled={ocupada} onClick={() => { setSeleccion(null); requestAnimationFrame(() => document.getElementById(`revisar-${p.id}`)?.focus()); }}>Cancelar</button></div>
          : <div className="intencion-acciones"><button id={`revisar-${p.id}`} type="button" disabled={ocupada} onClick={() => setSeleccion(p)}>Revisar para sumarme</button><button type="button" disabled={ocupada} onClick={() => ir(`/planes/${p.plan.id}`)}>Abrir plan</button><button type="button" disabled={ocupada} onClick={() => void descartar(p)}>No me interesa</button></div>}
      </article>)}
      {!resultado.propuestas.length && <button type="button" onClick={() => ir('/comunidad')}>Ir a Mi barrio</button>}
    </section>}
    {memoria !== undefined && <details className="intencion-memoria"><summary>Lo que Brisa puede recordar</summary><fieldset className="intencion-editor" disabled={ocupada}><EditorMemoriaBrisa api={api} memoria={memoria} alCambiar={alCambiar}/></fieldset></details>}
    <details className="intencion-memoria"><summary>Cómo busco y qué puedo hacer</summary><p className="intencion-nota">Por ahora entiendo actividades, días y «gratis» mediante reglas. Esta búsqueda no se guarda como conversación. Si escribes en el chat general, ese mensaje sí forma parte de su historial.</p><p className="intencion-nota">Puedo consultar y preparar. Para sumarte siempre necesito tu confirmación. No envío mensajes ni cambio de ciudad por ti.</p><p className="intencion-nota">«No me interesa» evita repetir esa ocurrencia durante 90 días. Olvidar preferencias borra también esos descartes.</p></details>
  </section>;
}
