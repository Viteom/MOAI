// Mi barrio (antes «Mi comunidad», P08: mapa, lista y vecinos), Mis lugares, Proponer un plan, el plan con su
// conversación y Avisos (docs/09, apartado 9).
// Uso cotidiano: superficie más sobria que el bosque; lo importante es leer y actuar.
// Nunca se inventan planes, personas ni distancias; nada de contadores (regla 5).
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { alcances, costos, hayBarrios, validarPlan, MAX_LUGARES, nombresSugeridos, plantillas, type Alcance, type Costo, type EntradaPlan, type ErroresLugar, type ErroresPlan, type Tipo } from '@/lib/lugares';
import type { Api, Lugar, Mapa, Perfil, Plan, Preferencias, Respuesta } from '@/lib/api';
import { Building2, CalendarDays, ChevronRight, Coffee, Coins, Flag, Footprints, HandHeart, Home, List, Map, MapPin, MessagesSquare, Navigation, Plus, Puzzle, Repeat, Scissors, Search, ShoppingBag, Sparkles, Sprout, Trash2, Users, Wallet, X } from 'lucide-react';
import { claseDePlan, cuandoCorto, EscenaBarrio, imagenDePlan, quienPropone } from './barrio-escena';
import { Imagen } from './interna';
import { FondoCiudad } from './fondo-ciudad';
import { SelectorLugar } from './selector-lugar';
import { nombreCiudad } from '@/lib/fondos-ciudad';
import { MAX_CUPO_CONVOCATORIA, MAX_CUPO_PLAN, nombreTipoOrganizacion } from '@/lib/organizaciones';
import { BarrioCampo, Campo, Ciudad } from './cuenta';
import { Barra, Diario, type Ir } from './diario';
import { Vecinos } from './zona';
import { MAX_DETALLE_REPORTE, motivosReporte, type MotivoReporte } from '@/lib/moai';
import { Conversacion } from './conversacion';
import './barrio.css';

const capital = (texto: string) => texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1);
const fecha = (iso: string) => capital(new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)));
const horaDe = (iso: string) => new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const cuandoPlan = (plan: Plan) => plan.repite ? `Todos los ${plan.diaRepite} a las ${horaDe(plan.cuando)} · próxima vez: ${fecha(plan.cuando).toLocaleLowerCase('es')}` : fecha(plan.cuando);

function AccionesPlan({ plan, onIr, onNoIr, onCancelar }: { plan: Plan; onIr: () => void; onNoIr: () => void; onCancelar: () => void }) {
  return <div className="plan-acciones">
    {plan.mio ? <Button className="diario-boton" onClick={onCancelar}>Cancelar plan</Button>
      : plan.voy ? <><span className="plan-voy">Vas a ir</span><Button className="diario-boton" onClick={onNoIr}>Ya no voy</Button></>
      : plan.lleno ? <span className="plan-voy">Completo</span>
      : <Button className="diario-boton principal" onClick={onIr}>Me sumo</Button>}
  </div>;
}


// La tarjeta de un plan elegido en el escenario: en el teléfono es una hoja inferior; en el escritorio, flota abajo.
function TarjetaElegida({ plan, ir, acciones, onCerrar, error }: { plan: Plan; ir: Ir; acciones: { onIr: () => void; onNoIr: () => void; onCancelar: () => void }; onCerrar: () => void; error: string }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const anterior = document.activeElement;
    titulo.current?.focus({ preventScroll: true });
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCerrar(); } };
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus({ preventScroll: true });
    };
  }, [onCerrar]);
  return <section className="tarjeta-plan hoja-plan" aria-labelledby="plan-elegido">
    <button type="button" className="hoja-plan-cerrar" aria-label="Cerrar" onClick={onCerrar}><X aria-hidden="true"/></button>
    <p className="hoja-plan-etiqueta">Un plan para encontrarse</p>
    <div className="tarjeta-plan-cuerpo">
      <Imagen nombre={imagenDePlan(plan)} clase="tarjeta-plan-imagen"/>
      <div className="tarjeta-plan-texto">
        <h2 id="plan-elegido" ref={titulo} tabIndex={-1}>{plan.titulo}</h2>
        <p className="dato"><CalendarDays aria-hidden="true"/>{cuandoCorto(plan)}</p>
        <p className="dato"><MapPin aria-hidden="true"/>{plan.lugarPublico}</p>
        <p className="dato-suave">{plan.franja} · {quienPropone(plan)}</p>
      </div>
    </div>
    {error && <p className="barrio-error" role="alert">{error}</p>}
    <div className="tarjeta-plan-acciones" aria-live="polite">
      <AccionesPlan plan={plan} {...acciones}/>
      <Button className="boton-secundario" onClick={() => ir(`/planes/${plan.id}`)}>Ver plan</Button>
    </div>
  </section>;
}

// Un plan en la lista: la misma tarjeta, sin hoja.
function TarjetaLista({ plan, ir }: { plan: Plan; ir: Ir }) {
  return <li className={`tarjeta-plan ${claseDePlan(plan)}`}>
    <button type="button" className="tarjeta-plan-cuerpo tarjeta-plan-enlace" onClick={() => ir(`/planes/${plan.id}`)}>
      <Imagen nombre={imagenDePlan(plan)} clase="tarjeta-plan-imagen"/>
      <span className="tarjeta-plan-texto">
        <strong>{plan.titulo}</strong>
        <span className="dato"><CalendarDays aria-hidden="true"/>{cuandoCorto(plan)}</span>
        <span className="dato"><MapPin aria-hidden="true"/>{plan.lugarPublico}</span>
        <span className="dato-suave">{plan.franja} · {quienPropone(plan)}</span>
      </span>
      <ChevronRight className="tarjeta-plan-flecha" aria-hidden="true"/>
    </button>
    {(plan.voy || plan.mio) && <span className="plan-voy">{plan.mio ? 'Lo propusiste tú' : 'Vas a ir'}</span>}
  </li>;
}

type PropsBarrio = { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void; onCambio?: (lugar: Lugar | null) => void; inicial?: 'mapa' | 'lista' | 'vecinos' };

export function MiComunidad(props: PropsBarrio) {
  const [modo, setModo] = useState(props.inicial ?? 'mapa');
  const clave = `${props.perfil.lugar?.id ?? 'sin-lugar'}:${props.perfil.lugar?.ciudad ?? ''}`;
  const anterior = useRef(clave);
  useEffect(() => {
    if (anterior.current !== clave) document.querySelector<HTMLButtonElement>('.barrio .selector-lugar')?.focus({ preventScroll: true });
    anterior.current = clave;
  }, [clave]);
  // El contexto se reemplaza de forma completa: nunca se renderizan planes ni selección anteriores.
  return <BarrioActual key={clave} {...props} modo={modo} setModo={setModo}/>;
}

function BarrioActual({ perfil, api, ir, onSalir, onCambio = () => {}, modo, setModo }: PropsBarrio & { modo: 'mapa' | 'lista' | 'vecinos'; setModo: (modo: 'mapa' | 'lista' | 'vecinos') => void }) {
  const [planes, setPlanes] = useState<Plan[] | null>(null);
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [errorMapa, setErrorMapa] = useState('');
  const [intento, setIntento] = useState(0);
  const vivo = useRef(true);
  const ciudad = nombreCiudad(perfil.lugar);
  const cerrarPlan = useCallback(() => setElegido(null), []);
  const usar = useCallback((r: Respuesta<Plan[]>) => {
    if (!vivo.current) return;
    if (r.ok) { setPlanes(r.datos); setError(''); } else setError(r.error);
  }, []);
  const lugarId = perfil.lugar?.id;
  useEffect(() => {
    vivo.current = true;
    let vigente = true;
    if (lugarId) {
      setPlanes(null); setMapa(null); setError(''); setErrorMapa(''); setElegido(null);
      void api.planes().then(r => { if (vigente) usar(r); });
      void api.mapa().then(r => { if (vigente) { if (r.ok) setMapa(r.datos); else setErrorMapa(r.error); } });
    }
    return () => { vigente = false; vivo.current = false; };
  }, [api, lugarId, usar, intento]);
  const acciones = (id: string) => ({
    onIr: () => void api.irAPlan(id).then(usar),
    onNoIr: () => void api.noIrAPlan(id).then(usar),
    onCancelar: () => void api.cancelarPlan(id).then(r => { usar(r); if (vivo.current) setElegido(null); }),
  });
  const conMapa = mapa?.disponible === true;
  const verMapa = modo === 'mapa' && !!perfil.lugar;
  const planElegido = planes?.find(p => p.id === elegido) ?? null;
  const contar = <Button className="boton-principal barrio-contar" onClick={() => ir('/planes/nuevo')}><Plus aria-hidden="true"/>Contar qué voy a hacer</Button>;
  const cargando = !!perfil.lugar && (planes === null && !error || mapa === null && !errorMapa);
  const errores = (error || errorMapa) && <div className="barrio-error"><p role="alert">{error || errorMapa}</p><button type="button" className="boton-secundario" onClick={() => setIntento(n => n + 1)}>Reintentar cargar planes y mapa</button></div>;
  const sinMapa = mapa?.disponible === false;

  return <div className={`comunidad barrio${verMapa ? ' con-escena' : ''}${modo === 'lista' ? ' vista-lista' : ''}`}>
    <Barra ir={ir} onSalir={onSalir} actual="barrio"/>
    {verMapa ? <EscenaBarrio ciudad={perfil.lugar?.ciudad} mapa={conMapa ? mapa : undefined} planes={planes ?? []} elegido={elegido} onElegir={setElegido}/>
      : perfil.lugar && <FondoCiudad ciudad={perfil.lugar.ciudad} clase="barrio-fondo-lista"/>}
    <div className="barrio-controles" data-reserva-barrio>
      <h1 className="solo-lectores" tabIndex={-1}>Mi barrio</h1>
      <SelectorLugar perfil={perfil} api={api} ir={ir} onCambio={onCambio}/>
      <div className="modo" role="group" aria-label="Ver">
        {perfil.lugar && <button type="button" aria-pressed={modo === 'mapa'} onClick={() => { cerrarPlan(); setModo('mapa'); }}><Map aria-hidden="true"/>Mapa</button>}
        <button type="button" aria-pressed={modo === 'lista' || !perfil.lugar && modo === 'mapa'} onClick={() => { cerrarPlan(); setModo('lista'); }}><List aria-hidden="true"/>Lista</button>
      </div>
      <button type="button" className="barrio-vecinos" aria-pressed={modo === 'vecinos'} onClick={() => { cerrarPlan(); setModo('vecinos'); }}><Users aria-hidden="true"/><span>Vecinos</span></button>
    </div>
    <p className="contexto-ciudad-aviso" role="status">Explorando {ciudad}</p>
    {modo === 'vecinos' ? <main className="interna-contenido"><Vecinos key={lugarId} api={api} ir={ir}/></main>
    : verMapa ? <main className="barrio-sobre-escena" data-reserva-barrio aria-busy={cargando}>
      <p className="escena-nota">Escenario ilustrado · no es el lugar exacto</p>
      {planElegido ? <TarjetaElegida key={planElegido.id} plan={planElegido} ir={ir} acciones={acciones(planElegido.id)} onCerrar={cerrarPlan} error={error}/>
        : <div className="barrio-accion">
          {cargando && <p className="barrio-mensaje" role="status">Cargando planes de {ciudad}…</p>}
          {errores}
          {sinMapa && !error && <div className="barrio-mensaje"><p>Este escenario de {ciudad} es ilustrativo. Puedes consultar los planes en Lista.</p><button type="button" className="boton-secundario" onClick={() => setModo('lista')}>Ver planes en Lista</button></div>}
          {!cargando && !sinMapa && planes?.length === 0 && !error && <p className="escena-vacia">Todavía no hay planes cerca. ¿Y si cuentas el tuyo?</p>}
          {contar}
        </div>}
    </main>
    : <main className="interna-contenido barrio-lista" aria-busy={cargando}>
      {!perfil.lugar && <div className="aviso-panel"><p>Elige dónde vives para ver planes cerca de ti.</p><Button className="boton-principal" onClick={() => ir('/lugares')}>Elegir mi lugar</Button></div>}
      <h2>Planes cerca de ti</h2>
      {errores}
      {cargando && <p role="status">Cargando planes de {ciudad}…</p>}
      {planes?.length === 0 && !cargando && !error && <p>Aún no hay planes cerca. ¿Y si cuentas qué vas a hacer?</p>}
      <ul className="lista-planes">{planes?.map(plan => <TarjetaLista key={plan.id} plan={plan} ir={ir}/>)}</ul>
      {perfil.lugar && contar}
    </main>}
  </div>;
}

// Reportar un plan entero (rediseño del 19 de octubre): el mismo cuidado que reportar a una persona.
function ReportarPlan({ plan, api, onListo }: { plan: Plan; api: Api; onListo: () => void }) {
  const [motivo, setMotivo] = useState<MotivoReporte | null>(null);
  const [detalle, setDetalle] = useState('');
  const [bloquear, setBloquear] = useState(false);
  const [error, setError] = useState('');
  const [hecho, setHecho] = useState('');
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!motivo) { setError('Elige qué pasó.'); return; }
    const r = await api.reportarPlan(plan.id, { motivo, detalle, bloquear });
    if (r.ok) setHecho(`Gracias por contarnos. Lo revisa una persona del equipo; ${plan.autor} no sabrá que fuiste tú.`); else setError(r.error);
  }
  if (hecho) return <p className="aviso-panel" role="status">{hecho}</p>;
  return <form className="panel formulario" onSubmit={e => void enviar(e)} noValidate>
    <fieldset className="campo">
      <legend>¿Qué pasa con este plan?</legend>
      {motivosReporte.map(m => <label key={m.id} className="opcion"><input type="radio" name="motivo-plan" checked={motivo === m.id} onChange={() => { setMotivo(m.id); setError(''); }}/><span>{m.nombre}</span></label>)}
    </fieldset>
    {motivo === 'peligro' && <p className="aviso-panel">Si estás en peligro ahora, llama a la línea de emergencias <strong>123</strong>. MOAI no es un servicio de emergencias.</p>}
    <Campo etiqueta="Cuéntanos un poco más (opcional)" ayuda="Lo lee una persona del equipo, que también ve el plan tal como se publicó.">{(id, d) =>
      <textarea id={id} aria-describedby={d} className="cuenta-campo diario-textarea" maxLength={MAX_DETALLE_REPORTE} value={detalle} onChange={e => setDetalle(e.target.value)}/>}</Campo>
    <label className="opcion"><input type="checkbox" checked={bloquear} onChange={e => setBloquear(e.target.checked)}/><span><strong>Bloquear también a {plan.autor}</strong> · ya no verás sus planes ni verá los tuyos</span></label>
    {error && <p className="campo-error" role="alert">{error}</p>}
    <div className="acciones-fila">
      <Button type="submit" className="boton-principal">Enviar reporte</Button>
      <Button type="button" className="boton-secundario" onClick={onListo}>Cancelar</Button>
    </div>
  </form>;
}

const nombreCosto = (c: Costo) => costos.find(x => x.id === c)?.nombre ?? 'Gratis';
const inicial = (t: string) => t.trim().charAt(0).toLocaleUpperCase('es') || '·';

// El plan: qué, cuándo, lugar público, distancia aproximada y costo; la acción para sumarse y su conversación.
export function PlanDetalle({ id, api, ir, onSalir }: { id: string; api: Api; ir: Ir; onSalir: () => void }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState('');
  const [reportar, setReportar] = useState(false);
  const cargar = useCallback(() => void api.plan(id).then(r => r.ok ? setPlan(r.datos) : setError(r.error)), [api, id]);
  useEffect(cargar, [cargar]);
  const puede = !!plan && (plan.mio || plan.voy);
  const despues = (r: Respuesta<Plan[]>) => { if (r.ok) cargar(); };
  const volver = plan?.moai ? { texto: plan.moai.nombre, ruta: `/moais/${plan.moai.id}` } : { texto: 'Mi barrio', ruta: '/comunidad' };
  return <Diario titulo={plan?.titulo ?? (error ? 'Este plan ya no está' : 'Abriendo el plan…')} imagen={plan ? imagenDePlan(plan) : 'plan'} ir={ir} actual="barrio" volver={volver} onSalir={onSalir}>
    {error && <div className="panel"><p>{error}</p><Button className="boton-secundario" onClick={() => ir('/comunidad')}>Volver a Mi barrio</Button></div>}
    {plan && <>
      <section className="panel plan-ficha" aria-label="Datos del plan">
        {plan.moai && <p className="etiqueta">Solo para tu Moai «{plan.moai.nombre}»</p>}
        <p className="dato"><CalendarDays aria-hidden="true"/>{cuandoPlan(plan)}</p>
        <p className="dato"><MapPin aria-hidden="true"/>{plan.lugarPublico}</p>
        <p className="dato"><Navigation aria-hidden="true"/>{plan.franja}</p>
        <p className="dato"><Coins aria-hidden="true"/>{nombreCosto(plan.costo)}</p>
        {plan.descripcion && <p className="plan-descripcion">{plan.descripcion}</p>}
        <p className="quien"><span className="inicial" aria-hidden="true">{inicial(plan.organizacion?.nombre ?? plan.autor)}</span>{quienPropone(plan)}</p>
        {plan.mio && plan.asistentes && <p className="dato-suave">{plan.asistentes.length ? `Van: ${plan.asistentes.join(', ')}` : 'Si alguien se suma, te lo contaré aquí.'}</p>}
        <AccionesPlan plan={plan} onIr={() => void api.irAPlan(id).then(despues)} onNoIr={() => void api.noIrAPlan(id).then(despues)} onCancelar={() => void api.cancelarPlan(id).then(() => ir('/comunidad'))}/>
      </section>
      <section className="panel" aria-labelledby="conversacion-titulo">
        <h2 id="conversacion-titulo" className="titulo-icono"><MessagesSquare aria-hidden="true"/>Conversación del plan</h2>
        {!puede ? <p>Al sumarte podrás coordinar el encuentro aquí: «llego 5 minutos tarde», «nos vemos en la entrada».</p>
          : <Conversacion tipo="plan" id={id} api={api} nota="Solo la ven quienes van al plan. Antes de enviar, MOAI revisa que no haya frases que lastimen; nadie más la lee, salvo que alguien reporte un mensaje. Se borra a los 30 días."/>}
      </section>
      {!plan.mio && (reportar ? <ReportarPlan plan={plan} api={api} onListo={() => setReportar(false)}/>
        : <button type="button" className="enlace-discreto" onClick={() => setReportar(true)}><Flag aria-hidden="true"/>Reportar este plan</button>)}
    </>}
  </Diario>;
}

// Mis lugares: los lugares guardados, cuál está activo y uno nuevo.
export function MisLugares({ api, ir, onSalir, onCambio }: { api: Api; ir: Ir; onSalir: () => void; onCambio: (lugar: Lugar | null) => void }) {
  const [lugares, setLugares] = useState<Lugar[] | null>(null);
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState({ nombre: '', ciudad: '', barrio: '' });
  const [errores, setErrores] = useState<ErroresLugar>({});
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const bloqueoLugar = useRef(false);
  const [agregando, setAgregando] = useState(false);
  const usar = (r: Respuesta<Lugar[]>, despues?: () => void) => {
    if (r.ok) { setLugares(r.datos); setError(''); setErrores({}); despues?.(); onCambio(r.datos.find(l => l.activo) ?? null); }
    else { setErrores((r.errores ?? {}) as ErroresLugar); setError(r.errores ? '' : r.error); }
  };
  useEffect(() => { void api.lugares().then(r => r.ok ? setLugares(r.datos) : setError(r.error)); }, [api]);
  async function agregar(e: FormEvent) {
    e.preventDefault();
    usar(await api.crearLugar({ nombre: nuevo.nombre, ciudad: nuevo.ciudad, barrio: nuevo.barrio || null }), () => { setNuevo({ nombre: '', ciudad: '', barrio: '' }); setAgregando(false); });
  }
  async function activarLugar(id: string) {
    if (bloqueoLugar.current) return;
    bloqueoLugar.current = true; setCambiando(true);
    const r = await api.activarLugar(id);
    bloqueoLugar.current = false; setCambiando(false); usar(r);
  }
  const lleno = (lugares?.length ?? 0) >= MAX_LUGARES;
  return <Diario titulo="Mis lugares" bajada="Elige dónde quieres conectar. Guardamos tu zona, no tu dirección. Nadie más ve tus lugares." imagen="lugares" ir={ir} volver={{ texto: 'Volver', ruta: 'atras' }} onSalir={onSalir}>
    {error && <p className="campo-error" role="alert">{error}</p>}
    <ul className="lista-lugares" aria-busy={cambiando}>
      {lugares?.map(l => <li key={l.id} className={`panel lugar${l.activo ? ' activo' : ''}`}>
        <span className="lugar-icono" aria-hidden="true">{/casa/i.test(l.nombre) ? <Home/> : <Building2/>}</span>
        <div className="lugar-texto">
          <strong>{l.nombre}</strong><span>{l.zona}</span>
          {l.activo ? <span className="plan-voy">Lugar activo</span>
            : <Button className="boton-secundario" disabled={cambiando} onClick={() => void activarLugar(l.id)}>Usar este lugar</Button>}
        </div>
        <Imagen nombre={/casa/i.test(l.nombre) ? 'lugares' : 'crear'} clase="lugar-imagen"/>
        <div className="lugar-borrar">
          {porBorrar === l.id
            ? <><span>¿Borrar «{l.nombre}»?</span><Button className="boton-secundario peligro" onClick={() => void api.borrarLugar(l.id).then(r => usar(r, () => setPorBorrar(null)))}>Sí, borrar</Button><Button className="boton-secundario" onClick={() => setPorBorrar(null)}>No</Button></>
            : <button type="button" className="enlace-discreto" disabled={cambiando} aria-label={`Borrar ${l.nombre}`} onClick={() => setPorBorrar(l.id)}><Trash2 aria-hidden="true"/>Borrar</button>}
        </div>
      </li>)}
    </ul>
    {lugares?.length === 0 && <p>Todavía no tienes lugares. Empieza por tu casa.</p>}
    {lleno ? <p className="dato-suave">Tienes {MAX_LUGARES} lugares, el máximo. Borra uno para agregar otro.</p>
    : !agregando ? <Button className="boton-secundario ancho" disabled={cambiando} onClick={() => setAgregando(true)}><Plus aria-hidden="true"/>Agregar un lugar</Button>
    : <form className="panel formulario" onSubmit={agregar} noValidate>
      <h2>Agregar un lugar</h2>
      <Campo etiqueta="¿Cómo lo llamas?" error={errores.nombre}>{(id, d) => <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={30} placeholder="Por ejemplo, Donde mis papás" value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))}/>}</Campo>
      <div className="chips">{nombresSugeridos.map(s => <button key={s} type="button" className="chip" aria-pressed={nuevo.nombre === s} onClick={() => setNuevo(n => ({ ...n, nombre: s }))}>{s}</button>)}</div>
      <Ciudad key={`ciudad-${lugares?.length}`} valor={nuevo.ciudad} onValor={ciudad => setNuevo(n => ({ ...n, ciudad, barrio: '' }))} error={errores.ciudad}/>
      {hayBarrios(nuevo.ciudad) && <BarrioCampo key={`barrio-${lugares?.length}`} valor={nuevo.barrio} onValor={barrio => setNuevo(n => ({ ...n, barrio }))} error={errores.barrio} etiqueta="Barrio"/>}
      <div className="acciones-fila">
        <Button type="submit" className="boton-principal">Guardar lugar</Button>
        <Button type="button" className="boton-secundario" onClick={() => setAgregando(false)}>Cancelar</Button>
      </div>
    </form>}
  </Diario>;
}

const ICONOS_TIPO: Record<string, typeof Footprints> = { caminar: Footprints, tinto: Coffee, huerta: Sprout, ajedrez: Puzzle, tejer: Scissors, mandados: ShoppingBag, voluntariado: HandHeart };

// Crear plan («Contar qué voy a hacer»): la invitación, el día y la hora, el lugar público, la repetición y el costo.
// Desde un Moai («Proponer un encuentro»), el plan es solo para sus miembros. Primero se revisa, después se publica.
export function NuevoPlan({ perfil, api, ir, onSalir }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void }) {
  const moaiId = new URLSearchParams(window.location.search).get('moai');
  const [moai, setMoai] = useState<{ id: string; nombre: string } | null>(null);
  // Revisión de Codex: un encuentro pedido para un Moai nunca se vuelve público. Hasta confirmar el Moai, no hay formulario.
  const [errorMoai, setErrorMoai] = useState('');
  const cargarMoai = useCallback(() => {
    if (!moaiId) return;
    setErrorMoai('');
    void api.gente().then(r => {
      const m = r.ok ? r.datos.moais.find(x => x.id === moaiId) : undefined;
      if (m) setMoai({ id: m.id, nombre: m.nombre });
      else setErrorMoai(r.ok ? 'No encontramos ese Moai entre los tuyos. Puede que hayas salido de él.' : r.error);
    });
  }, [api, moaiId]);
  useEffect(cargarMoai, [cargarMoai]);
  const [masAbierto, setMasAbierto] = useState(false);
  const [plan, setPlan] = useState({ titulo: '', descripcion: '', dia: '', hora: '', lugarPublico: '', ciudad: perfil.lugar?.ciudad ?? '', barrio: perfil.lugar?.barrio ?? '', alcance: 'cerca' as Alcance, cupo: '', tipo: 'otro' as Tipo, semanal: false, costo: 'gratis' as Costo, organizacion: '' });
  const organizaciones = perfil.organizaciones ?? [];
  const convoca = organizaciones.find(o => o.id === plan.organizacion);
  const [sugerenciaLugar, setSugerenciaLugar] = useState('Busca un parque, café o biblioteca');
  const [errores, setErrores] = useState<ErroresPlan>({});
  const [error, setError] = useState('');
  const [revisando, setRevisando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const cambiar = (c: Partial<typeof plan>) => setPlan(p => ({ ...p, ...c }));
  const conBarrios = hayBarrios(plan.ciudad);
  const volver = moaiId ? { texto: moai?.nombre ?? 'Mi gente', ruta: moai ? `/moais/${moai.id}` : '/gente' } : { texto: 'Mi barrio', ruta: '/comunidad' };
  // Un encuentro de Moai lo ven solo sus miembros: el alcance por celdas no aplica y no exige barrio.
  const entrada = (): EntradaPlan & { organizacion: string | null; moai: string | null } => ({ titulo: plan.titulo, descripcion: plan.descripcion,
    cuando: plan.dia && plan.hora ? new Date(`${plan.dia}T${plan.hora}`).toISOString() : '', lugarPublico: plan.lugarPublico, ciudad: plan.ciudad, barrio: plan.barrio || null,
    alcance: moaiId || !conBarrios ? 'ciudad' : plan.alcance, cupo: plan.cupo ? Number(plan.cupo) : null, tipo: plan.tipo, repite: plan.semanal ? 'semanal' : null, costo: plan.costo,
    organizacion: moaiId ? null : convoca?.id ?? null, moai: moaiId });
  const ocultos: (keyof ErroresPlan)[] = ['descripcion', 'ciudad', 'barrio', 'alcance', 'cupo'];
  const usarErrores = (e: ErroresPlan) => { setErrores(e); if (ocultos.some(k => e[k])) setMasAbierto(true); };
  function revisar(e: FormEvent) {
    e.preventDefault();
    // Las mismas reglas que el servidor, antes de mostrar la revisión.
    const r = validarPlan(entrada(), new Date(), { maxCupo: convoca ? MAX_CUPO_CONVOCATORIA : MAX_CUPO_PLAN });
    if (r.ok) { setErrores({}); setRevisando(true); } else usarErrores(r.errores);
  }
  async function publicar() {
    if (enviando || (moaiId && !moai)) return;
    setEnviando(true);
    const r = await api.crearPlan(entrada());
    setEnviando(false);
    if (r.ok) ir(volver.ruta); else { usarErrores((r.errores ?? {}) as ErroresPlan); setError(r.errores ? '' : r.error); setRevisando(false); }
  }
  const cuandoLegible = plan.dia && plan.hora ? capital(new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(`${plan.dia}T${plan.hora}`))) : '';

  return <Diario titulo={convoca ? `Convocar a nombre de ${convoca.nombre}` : '¿Qué vas a hacer?'} bajada={convoca ? 'Cuenta qué necesitan y cuántas personas buscan. Se verá con el nombre de la entidad.' : moai ? `Un encuentro solo para tu Moai «${moai.nombre}».` : 'Algo sencillo puede ser una oportunidad para encontrarse.'}
    imagen="crear" ir={ir} actual={moai ? 'gente' : 'barrio'} volver={volver} onSalir={onSalir}>
    {moaiId && !moai ? <div className="panel" role={errorMoai ? 'alert' : 'status'}>
      {errorMoai ? <><p>{errorMoai}</p><div className="acciones-fila"><Button className="boton-principal" onClick={cargarMoai}>Intentar de nuevo</Button><Button className="boton-secundario" onClick={() => ir('/gente')}>Volver a Mi gente</Button></div></>
        : <p>Abriendo tu Moai…</p>}
    </div>
    : revisando ? <section className="panel plan-ficha" aria-labelledby="revision-titulo">
      <h2 id="revision-titulo">Así lo verán {moai ? `en «${moai.nombre}»` : 'tus vecinos'}</h2>
      <p className="plan-titulo-revision">{plan.titulo}</p>
      <p className="dato"><CalendarDays aria-hidden="true"/>{plan.semanal ? `Cada semana · desde el ${cuandoLegible.toLocaleLowerCase('es')}` : cuandoLegible}</p>
      <p className="dato"><MapPin aria-hidden="true"/>{plan.lugarPublico}</p>
      <p className="dato"><Coins aria-hidden="true"/>{nombreCosto(plan.costo)}</p>
      {plan.descripcion && <p className="plan-descripcion">{plan.descripcion}</p>}
      <div className="acciones-fila">
        <Button className="boton-principal" disabled={enviando} onClick={() => void publicar()}>{enviando ? 'Publicando…' : 'Publicar'}</Button>
        <Button className="boton-secundario" onClick={() => setRevisando(false)}>Cambiar algo</Button>
      </div>
    </section>
    : <form className="panel formulario" onSubmit={revisar} noValidate>
      {organizaciones.length > 0 && !moaiId && <fieldset className="campo">
        <legend>Publicar como</legend>
        <label className="opcion"><input type="radio" name="publicar-como" checked={!convoca} onChange={() => cambiar({ organizacion: '' })}/><span><strong>Yo, {perfil.nombre.split(' ')[0]}</strong> · un plan entre vecinos</span></label>
        {organizaciones.map(o => <label key={o.id} className="opcion"><input type="radio" name="publicar-como" checked={plan.organizacion === o.id} onChange={() => cambiar({ organizacion: o.id })}/><span><strong>{o.nombre}</strong> · {nombreTipoOrganizacion(o.tipo)}</span></label>)}
      </fieldset>}
      <fieldset className="campo">
        <legend>Tipo de plan</legend>
        <div className="chips">{plantillas.map(p => { const Icono = ICONOS_TIPO[p.tipo] ?? Sparkles; return <button key={p.tipo} type="button" className="chip" aria-pressed={plan.tipo === p.tipo}
          onClick={() => { cambiar({ tipo: p.tipo, titulo: p.titulo }); setSugerenciaLugar(`Por ejemplo, ${p.lugar.toLocaleLowerCase('es')}`); }}><Icono aria-hidden="true"/>{p.nombre}</button>; })}</div>
      </fieldset>
      <Campo etiqueta={convoca ? '¿Qué necesitan?' : 'Tu invitación'} error={errores.titulo}>{(id, d) => <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={80} placeholder={convoca ? 'Por ejemplo, buscamos 5 personas para sembrar árboles' : 'Voy a caminar, ¿alguien viene?'} value={plan.titulo} onChange={e => cambiar({ titulo: e.target.value })}/>}</Campo>
      <div className="dos-campos">
        <Campo etiqueta="Día" error={errores.cuando}>{(id, d) => <input id={id} aria-describedby={d} type="date" className="cuenta-campo" value={plan.dia} onChange={e => cambiar({ dia: e.target.value })}/>}</Campo>
        <Campo etiqueta="Hora">{id => <input id={id} type="time" className="cuenta-campo" value={plan.hora} onChange={e => cambiar({ hora: e.target.value })}/>}</Campo>
      </div>
      <Campo etiqueta="Lugar público" error={errores.lugarPublico} ayuda="Un parque, una biblioteca, un café. Nunca la casa de nadie.">{(id, d) => <span className="campo-con-icono"><Search aria-hidden="true"/><input id={id} aria-describedby={d} className="cuenta-campo" maxLength={80} placeholder={sugerenciaLugar} value={plan.lugarPublico} onChange={e => cambiar({ lugarPublico: e.target.value })}/></span>}</Campo>
      <Campo etiqueta="Repetición">{id => <span className="campo-con-icono"><Repeat aria-hidden="true"/><select id={id} className="cuenta-campo" value={plan.semanal ? 'semanal' : 'una'} onChange={e => cambiar({ semanal: e.target.value === 'semanal' })}>
        <option value="una">Solo esta vez</option><option value="semanal">Cada semana</option></select></span>}</Campo>
      <fieldset className="campo">
        <legend>Costo</legend>
        <div className="segmentado">{costos.map(c => <label key={c.id} className={plan.costo === c.id ? 'elegido' : undefined}>
          <input type="radio" name="costo" value={c.id} checked={plan.costo === c.id} onChange={() => cambiar({ costo: c.id })}/>{c.id === 'gratis' ? <Coins aria-hidden="true"/> : <Wallet aria-hidden="true"/>}{c.nombre}</label>)}</div>
        <p className="campo-ayuda">MOAI no maneja dinero: si hay un gasto, cada quien paga lo suyo en el lugar.</p>
      </fieldset>
      <details className="mas-opciones" open={masAbierto} onToggle={e => setMasAbierto(e.currentTarget.open)}>
        <summary>{moaiId ? 'Más opciones: descripción, barrio y cupo' : 'Más opciones: barrio, alcance y cupo'}</summary>
        <Campo etiqueta="Cuéntalo un poco más (opcional)" error={errores.descripcion}>{(id, d) => <textarea id={id} aria-describedby={d} className="cuenta-campo diario-textarea" maxLength={400} value={plan.descripcion} onChange={e => cambiar({ descripcion: e.target.value })}/>}</Campo>
        <Ciudad valor={plan.ciudad} onValor={ciudad => cambiar({ ciudad, barrio: '' })} error={errores.ciudad}/>
        {conBarrios && <BarrioCampo valor={plan.barrio} onValor={barrio => cambiar({ barrio })} error={errores.barrio} etiqueta="Barrio del lugar"/>}
        {!moaiId && <fieldset className="campo">
          <legend>¿Hasta dónde llega la invitación?</legend>
          {(conBarrios ? alcances : alcances.filter(a => a.id === 'ciudad')).map(a => <label key={a.id} className="opcion">
            <input type="radio" name="alcance" value={a.id} checked={(conBarrios ? plan.alcance : 'ciudad') === a.id} onChange={() => cambiar({ alcance: a.id })}/>
            <span><strong>{a.nombre}</strong> · {a.detalle}</span>
          </label>)}
          {!conBarrios && <p className="campo-ayuda">En esta ciudad, por ahora, los planes llegan a toda la ciudad.</p>}
          {errores.alcance && <p className="campo-error" role="alert">{errores.alcance}</p>}
        </fieldset>}
        <Campo etiqueta="Cupo (opcional)" error={errores.cupo} ayuda={convoca ? `Cuántas personas buscan, hasta ${MAX_CUPO_CONVOCATORIA}. Si lo dejas vacío, puede ir quien quiera.` : 'Si lo dejas vacío, puede ir quien quiera.'}>{(id, d) => <input id={id} aria-describedby={d} type="number" min={2} max={convoca ? MAX_CUPO_CONVOCATORIA : MAX_CUPO_PLAN} inputMode="numeric" className="cuenta-campo diario-corto" value={plan.cupo} onChange={e => cambiar({ cupo: e.target.value })}/>}</Campo>
      </details>
      {ocultos.some(k => errores[k]) && <p className="campo-error" role="alert">Falta algo en «Más opciones». Lo abrimos para que lo veas.</p>}
      {error && <p className="campo-error" role="alert">{error}</p>}
      <Button type="submit" className="boton-principal ancho">Revisar mi plan</Button>
    </form>}
  </Diario>;
}

// Avisos: las recomendaciones de Brisa vienen apagadas (regla 9) y el correo semanal es aparte.
export function Avisos({ api, ir, onSalir }: { api: Api; ir: Ir; onSalir: () => void }) {
  const [pref, setPref] = useState<Preferencias | null>(null);
  const [guardado, setGuardado] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { void api.preferencias().then(r => r.ok ? setPref(r.datos) : setError(r.error)); }, [api]);
  const guardar = async (nuevas: Preferencias) => {
    setPref(nuevas); setGuardado('');
    const r = await api.guardarPreferencias(nuevas);
    if (r.ok) { setPref(r.datos); setGuardado('Guardado.'); setError(''); } else setError(r.error);
  };
  const alternarGusto = (tipo: Tipo) => pref && void guardar({ ...pref, gustos: pref.gustos.includes(tipo) ? pref.gustos.filter(g => g !== tipo) : [...pref.gustos, tipo] });
  return <Diario titulo="Avisos" bajada="Tú decides si Brisa te cuenta de planes y cómo. Todo viene apagado hasta que lo actives." ir={ir} onSalir={onSalir}>
    {error && <p className="campo-error" role="alert">{error}</p>}
    {pref && <div className="cuenta-form diario-form">
      <label className="alcance"><input type="checkbox" checked={pref.sugerencias} onChange={e => void guardar({ ...pref, sugerencias: e.target.checked })}/>
        <span><strong>Que Brisa me cuente de planes que me pueden gustar</strong> · solo de lo que elijas aquí abajo, y siempre te dirá por qué</span></label>
      {pref.sugerencias && <fieldset className="campo">
        <legend>¿De qué planes te cuento?</legend>
        <div className="sugerencias">{plantillas.map(p => <button key={p.tipo} type="button" aria-pressed={pref.gustos.includes(p.tipo)} onClick={() => alternarGusto(p.tipo)}>{p.nombre}</button>)}</div>
      </fieldset>}
      <label className="alcance"><input type="checkbox" checked={pref.resumenSemanal} onChange={e => void guardar({ ...pref, resumenSemanal: e.target.checked })}/>
        <span><strong>Un correo a la semana con planes cerca</strong> · como mucho uno por semana, y solo si hay planes</span></label>
      {guardado && <p className="campo-ayuda" role="status">{guardado}</p>}
    </div>}
  </Diario>;
}
