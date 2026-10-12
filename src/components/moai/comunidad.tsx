// Mi comunidad (P08), Mis lugares y Proponer un plan (docs/09, apartado 9).
// Uso cotidiano: superficie más sobria que el bosque; lo importante es leer y actuar.
// Nunca se inventan planes, personas ni distancias; nada de contadores (regla 5).
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { alcances, hayBarrios, MAX_LUGARES, nombresSugeridos, type Alcance, type EntradaPlan, type ErroresLugar, type ErroresPlan } from '@/lib/lugares';
import type { Api, Lugar, Perfil, Plan, Respuesta } from '@/lib/api';
import { BarrioCampo, Campo, Ciudad } from './cuenta';
import { OrbeBrisa } from './bosque';

type Ir = (ruta: string) => void;

function Diario({ titulo, bajada, ir, actual, onSalir, children }: { titulo: string; bajada?: ReactNode; ir: Ir; actual: string; onSalir: () => void; children: ReactNode }) {
  const enlaces: [string, string][] = [['/comunidad', 'Mi comunidad'], ['/lugares', 'Mis lugares'], ['/ciudad', 'Mi ciudad']];
  return <div className="diario">
    <header className="diario-cabecera">
      <span className="diario-marca">MOAI</span>
      <nav aria-label="Secciones">
        {enlaces.map(([ruta, nombre]) => <button key={ruta} type="button" aria-current={actual === ruta ? 'page' : undefined} onClick={() => ir(ruta)}>{nombre}</button>)}
        <button type="button" onClick={onSalir}>Cerrar sesión</button>
      </nav>
    </header>
    <main className="diario-contenido">
      <h1 tabIndex={-1}>{titulo}</h1>
      {bajada && <p className="diario-bajada">{bajada}</p>}
      {children}
    </main>
  </div>;
}

const fecha = (iso: string) => {
  const texto = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
  return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1); // «Martes, 13 de octubre…»
};

function TarjetaPlan({ plan, onIr, onNoIr, onCancelar }: { plan: Plan; onIr: () => void; onNoIr: () => void; onCancelar: () => void }) {
  return <article className="plan">
    <p className="plan-cuando">{fecha(plan.cuando)}</p>
    <h3>{plan.titulo}</h3>
    {plan.descripcion && <p>{plan.descripcion}</p>}
    <p className="plan-donde">{plan.lugarPublico} · {plan.zona} · {plan.franja}</p>
    <p className="plan-autor">{plan.mio ? 'Lo propusiste tú' : `Lo propone ${plan.autor}`}</p>
    {plan.mio && plan.asistentes && <p className="plan-autor">{plan.asistentes.length ? `Van: ${plan.asistentes.join(', ')}` : 'Todavía nadie se ha apuntado.'}</p>}
    <div className="plan-acciones">
      {plan.mio ? <Button className="diario-boton" onClick={onCancelar}>Cancelar plan</Button>
        : plan.voy ? <><span className="plan-voy">Vas a ir</span><Button className="diario-boton" onClick={onNoIr}>Ya no voy</Button></>
        : plan.lleno ? <span className="plan-voy">Completo</span>
        : <Button className="diario-boton principal" onClick={onIr}>Me apunto</Button>}
    </div>
  </article>;
}

export function MiComunidad({ perfil, api, ir, onSalir }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void }) {
  const [planes, setPlanes] = useState<Plan[] | null>(null);
  const [error, setError] = useState('');
  const [ayuda, setAyuda] = useState(false);
  const usar = useCallback((r: Respuesta<Plan[]>) => { if (r.ok) { setPlanes(r.datos); setError(''); } else setError(r.error); }, []);
  useEffect(() => { if (perfil.lugar) void api.planes().then(usar); }, [api, perfil.lugar, usar]);
  const nombre = perfil.nombre.split(' ')[0];
  return <Diario titulo={`Hola, ${nombre}. Este es tu espacio.`} bajada="Puedes empezar por algo que disfrutas o proponiendo un plan." ir={ir} actual="/comunidad" onSalir={onSalir}>
    {perfil.lugar
      ? <p className="diario-lugar">Estás en <strong>{perfil.lugar.nombre}</strong> · {perfil.lugar.zona} <button type="button" onClick={() => ir('/lugares')}>Cambiar</button></p>
      : <div className="diario-aviso"><p>Elige dónde vives para ver planes cerca de ti.</p><Button className="diario-boton principal" onClick={() => ir('/lugares')}>Elegir mi lugar</Button></div>}

    <section className="brisa-tarjeta" aria-label="Brisa">
      <OrbeBrisa/>
      <div>
        <p><strong>Estoy aquí para orientarte.</strong> Soy Brisa, una inteligencia artificial.</p>
        {ayuda && <p>Aquí no hace falta pedir nada: cualquiera propone un plan en un lugar público y quien quiera se apunta. Si coincides varias veces con las mismas personas, les preguntaré si quieren formar un Moai.</p>}
        <button type="button" className="brisa-enlace" aria-expanded={ayuda} onClick={() => setAyuda(a => !a)}>{ayuda ? 'Entendido' : 'Ver cómo empezar'}</button>
      </div>
    </section>

    <div className="diario-acciones">
      <Button className="diario-boton principal" onClick={() => ir('/planes/nuevo')}>Proponer un plan</Button>
      <Button className="diario-boton" onClick={() => ir('/ciudad')}>Ver mi ciudad</Button>
    </div>

    <section aria-labelledby="planes-titulo">
      <h2 id="planes-titulo">Planes cerca de ti</h2>
      {error && <p className="campo-error" role="alert">{error}</p>}
      {perfil.lugar && planes === null && !error && <p role="status">Buscando planes…</p>}
      {planes?.length === 0 && <p>Aún no hay planes cerca. ¿Y si propones el primero?</p>}
      <div className="planes">
        {planes?.map(plan => <TarjetaPlan key={plan.id} plan={plan}
          onIr={() => void api.irAPlan(plan.id).then(usar)} onNoIr={() => void api.noIrAPlan(plan.id).then(usar)} onCancelar={() => void api.cancelarPlan(plan.id).then(usar)}/>)}
      </div>
    </section>
  </Diario>;
}

export function MisLugares({ api, ir, onSalir, onCambio }: { api: Api; ir: Ir; onSalir: () => void; onCambio: () => void }) {
  const [lugares, setLugares] = useState<Lugar[] | null>(null);
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState({ nombre: '', ciudad: '', barrio: '' });
  const [errores, setErrores] = useState<ErroresLugar>({});
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const usar = (r: Respuesta<Lugar[]>, despues?: () => void) => {
    if (r.ok) { setLugares(r.datos); setError(''); setErrores({}); despues?.(); onCambio(); }
    else { setErrores((r.errores ?? {}) as ErroresLugar); setError(r.errores ? '' : r.error); }
  };
  useEffect(() => { void api.lugares().then(r => r.ok ? setLugares(r.datos) : setError(r.error)); }, [api]);
  async function agregar(e: FormEvent) {
    e.preventDefault();
    usar(await api.crearLugar({ nombre: nuevo.nombre, ciudad: nuevo.ciudad, barrio: nuevo.barrio || null }), () => setNuevo({ nombre: '', ciudad: '', barrio: '' }));
  }
  const lleno = (lugares?.length ?? 0) >= MAX_LUGARES;
  return <Diario titulo="Mis lugares" bajada="Como en Uber: guarda tu casa, la de tus papás o tu trabajo, y elige dónde estás. Nadie más ve tus lugares." ir={ir} actual="/lugares" onSalir={onSalir}>
    {error && <p className="campo-error" role="alert">{error}</p>}
    <ul className="lugares">
      {lugares?.map(l => <li key={l.id} className={l.activo ? 'activo' : undefined}>
        <div><strong>{l.nombre}</strong><span>{l.zona}</span></div>
        {l.activo ? <span className="plan-voy">Estás aquí</span> : <Button className="diario-boton" onClick={() => void api.activarLugar(l.id).then(r => usar(r))}>Estoy aquí</Button>}
        {porBorrar === l.id
          ? <><Button className="diario-boton" onClick={() => void api.borrarLugar(l.id).then(r => usar(r, () => setPorBorrar(null)))}>Sí, borrar</Button><Button className="diario-boton" onClick={() => setPorBorrar(null)}>No</Button></>
          : <Button className="diario-boton" onClick={() => setPorBorrar(l.id)}>Borrar</Button>}
      </li>)}
    </ul>
    {lugares?.length === 0 && <p>Todavía no tienes lugares. Empieza por tu casa.</p>}
    {lleno ? <p>Tienes {MAX_LUGARES} lugares, el máximo. Borra uno para agregar otro.</p> : <form className="cuenta-form diario-form" onSubmit={agregar} noValidate>
      <h2>Agregar un lugar</h2>
      <Campo etiqueta="¿Cómo lo llamas?" error={errores.nombre}>{(id, d) => <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={30} placeholder="Por ejemplo, Donde mis papás" value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))}/>}</Campo>
      <div className="sugerencias">{nombresSugeridos.map(s => <button key={s} type="button" onClick={() => setNuevo(n => ({ ...n, nombre: s }))}>{s}</button>)}</div>
      <Ciudad key={`ciudad-${lugares?.length}`} valor={nuevo.ciudad} onValor={ciudad => setNuevo(n => ({ ...n, ciudad, barrio: '' }))} error={errores.ciudad}/>
      {hayBarrios(nuevo.ciudad) && <BarrioCampo key={`barrio-${lugares?.length}`} valor={nuevo.barrio} onValor={barrio => setNuevo(n => ({ ...n, barrio }))} error={errores.barrio} etiqueta="Barrio"/>}
      <Button type="submit" className="diario-boton principal">Guardar lugar</Button>
    </form>}
  </Diario>;
}

export function NuevoPlan({ perfil, api, ir, onSalir }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void }) {
  const ciudadInicial = perfil.lugar?.ciudad ?? '';
  const [plan, setPlan] = useState({ titulo: '', descripcion: '', dia: '', hora: '', lugarPublico: '', ciudad: ciudadInicial, barrio: '', alcance: 'cerca' as Alcance, cupo: '' });
  const [errores, setErrores] = useState<ErroresPlan>({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const cambiar = (c: Partial<typeof plan>) => setPlan(p => ({ ...p, ...c }));
  const conBarrios = hayBarrios(plan.ciudad);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    const cuando = plan.dia && plan.hora ? new Date(`${plan.dia}T${plan.hora}`).toISOString() : '';
    const entrada: EntradaPlan = { titulo: plan.titulo, descripcion: plan.descripcion, cuando, lugarPublico: plan.lugarPublico, ciudad: plan.ciudad, barrio: plan.barrio || null,
      alcance: conBarrios ? plan.alcance : 'ciudad', cupo: plan.cupo ? Number(plan.cupo) : null };
    setEnviando(true);
    const r = await api.crearPlan(entrada);
    setEnviando(false);
    if (r.ok) ir('/comunidad'); else { setErrores((r.errores ?? {}) as ErroresPlan); setError(r.errores ? '' : r.error); }
  }
  return <Diario titulo="Proponer un plan" bajada="Una invitación abierta: tú propones, y quien quiera se apunta. Siempre en un lugar público." ir={ir} actual="/planes/nuevo" onSalir={onSalir}>
    <form className="cuenta-form diario-form" onSubmit={enviar} noValidate>
      <Campo etiqueta="¿Qué quieres hacer?" error={errores.titulo}>{(id, d) => <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={80} placeholder="Por ejemplo, caminar por el parque" value={plan.titulo} onChange={e => cambiar({ titulo: e.target.value })}/>}</Campo>
      <Campo etiqueta="Cuéntalo un poco más (opcional)" error={errores.descripcion}>{(id, d) => <textarea id={id} aria-describedby={d} className="cuenta-campo diario-textarea" maxLength={400} value={plan.descripcion} onChange={e => cambiar({ descripcion: e.target.value })}/>}</Campo>
      <div className="telefono">
        <Campo etiqueta="Día" error={errores.cuando}>{(id, d) => <input id={id} aria-describedby={d} type="date" className="cuenta-campo" value={plan.dia} onChange={e => cambiar({ dia: e.target.value })}/>}</Campo>
        <Campo etiqueta="Hora">{id => <input id={id} type="time" className="cuenta-campo" value={plan.hora} onChange={e => cambiar({ hora: e.target.value })}/>}</Campo>
      </div>
      <Campo etiqueta="¿Dónde? Un lugar público" error={errores.lugarPublico} ayuda="Un parque, una biblioteca, un café. Nunca la casa de nadie.">{(id, d) => <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={80} placeholder="Por ejemplo, Parque de los Deseos" value={plan.lugarPublico} onChange={e => cambiar({ lugarPublico: e.target.value })}/>}</Campo>
      <Ciudad valor={plan.ciudad} onValor={ciudad => cambiar({ ciudad, barrio: '' })} error={errores.ciudad}/>
      {conBarrios && <BarrioCampo valor={plan.barrio} onValor={barrio => cambiar({ barrio })} error={errores.barrio} etiqueta="Barrio del lugar"/>}
      <fieldset className="campo">
        <legend>¿Hasta dónde llega la invitación?</legend>
        {(conBarrios ? alcances : alcances.filter(a => a.id === 'ciudad')).map(a => <label key={a.id} className="alcance">
          <input type="radio" name="alcance" value={a.id} checked={(conBarrios ? plan.alcance : 'ciudad') === a.id} onChange={() => cambiar({ alcance: a.id })}/>
          <span><strong>{a.nombre}</strong> · {a.detalle}</span>
        </label>)}
        {!conBarrios && <p className="campo-ayuda">En esta ciudad, por ahora, los planes llegan a toda la ciudad.</p>}
        {errores.alcance && <p className="campo-error" role="alert">{errores.alcance}</p>}
      </fieldset>
      <Campo etiqueta="Cupo (opcional)" error={errores.cupo} ayuda="Si lo dejas vacío, puede ir quien quiera.">{(id, d) => <input id={id} aria-describedby={d} type="number" min={2} max={30} inputMode="numeric" className="cuenta-campo diario-corto" value={plan.cupo} onChange={e => cambiar({ cupo: e.target.value })}/>}</Campo>
      {error && <p className="campo-error" role="alert">{error}</p>}
      <div className="diario-acciones">
        <Button type="submit" className="diario-boton principal" disabled={enviando}>{enviando ? 'Publicando…' : 'Publicar plan'}</Button>
        <Button type="button" className="diario-boton" onClick={() => ir('/comunidad')}>Cancelar</Button>
      </div>
    </form>
  </Diario>;
}
