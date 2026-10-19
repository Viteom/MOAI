// Mi barrio (antes «Mi comunidad», P08: mapa, lista y vecinos), Mis lugares, Proponer un plan, el plan con su
// conversación y Avisos (docs/09, apartado 9).
// Uso cotidiano: superficie más sobria que el bosque; lo importante es leer y actuar.
// Nunca se inventan planes, personas ni distancias; nada de contadores (regla 5).
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { alcances, hayBarrios, MAX_LUGARES, nombresSugeridos, plantillas, type Alcance, type EntradaPlan, type ErroresLugar, type ErroresPlan, type Tipo } from '@/lib/lugares';
import type { Api, Carta, Lugar, Mapa, Perfil, Plan, Preferencias, Respuesta } from '@/lib/api';
import { ChevronDown, Pencil, X } from 'lucide-react';
import { claseDePlan, cuandoCorto, MapaTinta, quienPropone, Sello, Vineta } from './postales';
import { MAX_CUPO_CONVOCATORIA, MAX_CUPO_PLAN, nombreTipoOrganizacion } from '@/lib/organizaciones';
import { BarrioCampo, Campo, Ciudad } from './cuenta';
import { OrbeBrisa } from './bosque';
import { ConversacionBrisa } from './brisa';
import { Barra, Diario, type Ir } from './diario';
import { Vecinos } from './zona';
import { ReportarPersona } from './gente';
import { Conversacion } from './conversacion';

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

function DatosPlan({ plan }: { plan: Plan }) {
  return <>
    <p className="plan-cuando">{cuandoPlan(plan)}</p>
    {plan.descripcion && <p>{plan.descripcion}</p>}
    <p className="plan-donde">{plan.lugarPublico} · {plan.zona} · {plan.franja}</p>
    <p className={`plan-autor${plan.organizacion ? ' convoca' : ''}`}>{quienPropone(plan)}</p>
    {plan.mio && plan.asistentes && <p className="plan-autor">{plan.asistentes.length ? `Van: ${plan.asistentes.join(', ')}` : 'Si alguien se suma, te lo contaré aquí.'}</p>}
  </>;
}

// Lo que Brisa cuenta: «fuiste por tu cuenta» (sin culpas) o una recomendación que la persona pidió, con su motivo.
function CartaBrisa({ carta, onListo, onRepetir, onSumarme, onGente }: { carta: Carta; onListo: () => void; onRepetir: () => void; onSumarme: () => void; onGente: () => void }) {
  const [porque, setPorque] = useState(false);
  const motivo = carta.tipo === 'sugerencia' || carta.tipo === 'gente' ? carta.motivo : undefined;
  return <div className="carta-brisa" role="status">
    <p>{carta.texto}</p>
    {motivo && porque && <p className="carta-motivo">{motivo}</p>}
    <div className="plan-acciones">
      {carta.tipo === 'solo' && carta.repetir && <Button className="diario-boton principal" onClick={onRepetir}>Sí, cada semana</Button>}
      {carta.tipo === 'sugerencia' && <Button className="diario-boton principal" onClick={onSumarme}>Me sumo</Button>}
      {carta.tipo === 'gente' && <Button className="diario-boton principal" onClick={onGente}>Ir a Mi gente</Button>}
      <Button className="diario-boton" onClick={onListo}>{carta.tipo === 'solo' ? (carta.repetir ? 'No, así está bien' : 'Entendido') : carta.tipo === 'gente' ? 'Ahora no' : 'No, gracias'}</Button>
      {motivo && <button type="button" className="brisa-enlace" aria-expanded={porque} onClick={() => setPorque(p => !p)}>¿Por qué veo esto?</button>}
    </div>
  </div>;
}

// «Estás en: Casa · Laureles ▾»: cambiar de lugar sin salir del mapa.
function SelectorLugar({ perfil, api, ir, onCambio }: { perfil: Perfil; api: Api; ir: Ir; onCambio: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [lugares, setLugares] = useState<Lugar[] | null>(null);
  const abrir = () => { setAbierto(a => !a); if (!lugares) void api.lugares().then(r => r.ok && setLugares(r.datos)); };
  if (!perfil.lugar) return <button type="button" className="selector-lugar" onClick={() => ir('/lugares')}>Elige dónde estás</button>;
  return <div className="selector-lugar-caja">
    <button type="button" className="selector-lugar" aria-expanded={abierto} onClick={abrir}>
      Estás en: <strong>{perfil.lugar.nombre} · {perfil.lugar.zona.split(',')[0]}</strong> <ChevronDown aria-hidden="true"/>
    </button>
    {abierto && <ul className="selector-lugar-lista">
      {lugares?.map(l => <li key={l.id}><button type="button" aria-current={l.activo || undefined}
        onClick={() => void api.activarLugar(l.id).then(r => { if (r.ok) { setLugares(r.datos); setAbierto(false); onCambio(); } })}>
        <strong>{l.nombre}</strong><span>{l.zona}</span></button></li>)}
      <li><button type="button" onClick={() => ir('/lugares')}>Administrar mis lugares</button></li>
    </ul>}
  </div>;
}


export function MiComunidad({ perfil, api, ir, onSalir, onCambio = () => {}, inicial = 'planes' }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void; onCambio?: () => void; inicial?: 'planes' | 'vecinos' }) {
  const [planes, setPlanes] = useState<Plan[] | null>(null);
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const [modo, setModo] = useState(inicial);
  // La hoja de postales: a media altura sobre el mapa, abierta con todos los planes o recogida para ver el mapa.
  const [hoja, setHoja] = useState<'media' | 'abierta' | 'recogida'>('media');
  const [elegido, setElegido] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [conBrisa, setConBrisa] = useState(false); // la conversación con Brisa, sobre el barrio
  const usar = useCallback((r: Respuesta<Plan[]>) => { if (r.ok) { setPlanes(r.datos); setError(''); } else setError(r.error); }, []);
  const usarCartas = useCallback((r: Respuesta<Carta[]>) => { if (r.ok) setCartas(r.datos); }, []);
  const lugarId = perfil.lugar?.id;
  useEffect(() => {
    if (!lugarId) return;
    void api.planes().then(usar);
    void api.cartas().then(usarCartas);
    void api.mapa().then(r => setMapa(r.ok ? r.datos : { disponible: false }));
  }, [api, lugarId, usar, usarCartas]);
  const acciones = (id: string) => ({
    onIr: () => void api.irAPlan(id).then(r => { usar(r); void api.cartas().then(usarCartas); }),
    onNoIr: () => void api.noIrAPlan(id).then(usar),
    onCancelar: () => void api.cancelarPlan(id).then(usar),
  });
  const conMapa = mapa?.disponible === true;
  const hora = new Date().getHours();
  const luz = hora >= 6 && hora < 18 ? 'de-dia' : 'de-noche'; // decisión de Mateo: la luz sigue la hora
  const mensajeBrisa = cartas[0]?.texto ?? (planes?.length ? 'Hay planes cerca esta semana. ¿Te cuento?' : 'Todavía no hay planes cerca. ¿Me cuentas qué tienes ganas de hacer?');
  // Al elegir un sello en el mapa, su postal sube a la vista; al elegir una postal, su sello se resalta en el mapa.
  const elegirDesdeMapa = (id: string) => {
    setElegido(id);
    if (hoja === 'recogida') setHoja('media');
    requestAnimationFrame(() => document.getElementById(`postal-${id}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }));
  };
  const siguienteHoja = { media: 'abierta', abierta: 'recogida', recogida: 'media' } as const;
  const textoHoja = { media: 'Ver todos los planes', abierta: 'Ver el mapa', recogida: 'Ver los planes' } as const;

  return <div className={`comunidad barrio ${luz}`}>
    <Barra ir={ir} onSalir={onSalir} actual="barrio"/>
    <div className="barrio-controles">
      <h1 tabIndex={-1}>Mi barrio</h1>
      <SelectorLugar perfil={perfil} api={api} ir={ir} onCambio={onCambio}/>
      <div className="modo" role="group" aria-label="Ver">
        <button type="button" aria-pressed={modo === 'planes'} onClick={() => setModo('planes')}>Planes</button>
        <button type="button" aria-pressed={modo === 'vecinos'} onClick={() => setModo('vecinos')}>Vecinos</button>
      </div>
    </div>

    {modo === 'vecinos' ? <main className="diario-contenido"><Vecinos api={api} ir={ir}/></main>
    : <main className={`barrio-planes hoja-${conMapa ? hoja : 'sola'}`}>
      {conMapa && <div className="barrio-mapa">
        <MapaTinta mapa={mapa} planes={planes ?? []} elegido={elegido} onElegir={elegirDesdeMapa}/>
        <button type="button" className="mapa-brisa" aria-expanded={conBrisa} aria-label={`Hablar con Brisa, una inteligencia artificial: ${mensajeBrisa}`} onClick={() => setConBrisa(true)}>
          <OrbeBrisa/><span className="sello-ia mapa-sello-ia" title="Brisa es una inteligencia artificial">IA</span>
        </button>
      </div>}
      {perfil.lugar && mapa === null && <p className="mapa-abriendo" role="status">Abriendo el mapa…</p>}

      <section className="hoja" aria-labelledby="hoja-titulo">
        <div className="hoja-cabeza">
          <h2 id="hoja-titulo">Esta semana, cerca</h2>
          {conMapa && <button type="button" className="hoja-alternar" onClick={() => setHoja(h => siguienteHoja[h])}>{textoHoja[hoja]}</button>}
          <Button className="diario-boton principal hoja-contar" onClick={() => ir('/inicio?plan=1')}><Pencil aria-hidden="true"/>Tengo ganas de…</Button>
        </div>
        {!perfil.lugar && <div className="diario-aviso"><p>Elige dónde vives para ver planes cerca de ti.</p><Button className="diario-boton principal" onClick={() => ir('/lugares')}>Elegir mi lugar</Button></div>}
        {perfil.lugar && mapa?.disponible === false && <p className="campo-ayuda">El mapa llega cuando tu lugar tiene barrio (por ahora, en Medellín). Mientras tanto, aquí están los planes.</p>}
        {error && <p className="campo-error" role="alert">{error}</p>}
        {perfil.lugar && planes === null && !error && <p role="status">Buscando planes…</p>}
        {planes?.length === 0 && <p className="hoja-vacia">Aún no hay planes cerca. ¿Y si le cuentas a Brisa qué tienes ganas de hacer?</p>}
        <ol className="postales">
          {planes?.map(plan => <li key={plan.id} id={`postal-${plan.id}`} className={`postal ${claseDePlan(plan)}${elegido === plan.id ? ' elegida' : ''}`}>
            <button type="button" className="postal-cara" aria-pressed={conMapa ? elegido === plan.id : undefined} onClick={() => conMapa ? setElegido(e => e === plan.id ? null : plan.id) : ir(`/planes/${plan.id}`)}>
              <span className="postal-vineta"><Vineta tipo={plan.tipo}/></span>
              <span className="postal-texto">
                <strong>{plan.titulo}</strong>
                <span className="postal-cuando">{cuandoCorto(plan)}</span>
                <span>{plan.lugarPublico} · {plan.franja}</span>
                <span className="postal-quien">{quienPropone(plan)}</span>
              </span>
            </button>
            <Sello plan={plan}/>
            <div className="postal-acciones">
              <AccionesPlan plan={plan} {...acciones(plan.id)}/>
              <button type="button" className="brisa-enlace" onClick={() => ir(`/planes/${plan.id}`)}>{plan.mio || plan.voy ? 'Hablar con quienes van' : 'Ver detalles'}</button>
            </div>
          </li>)}
        </ol>
        {/* Brisa solo aparece aquí si tiene algo que contar; para conversar está en la barra. */}
        {cartas.length > 0 && <div className="hoja-brisa"><p className="brisa-quien"><strong>Brisa</strong><span className="sello-ia" title="Brisa es una inteligencia artificial">IA</span></p>
          <CartaBrisa carta={cartas[0]}
            onListo={() => void api.cartaVista(cartas[0].clave).then(usarCartas)}
            onRepetir={() => cartas[0].tipo === 'solo' && void api.repetirPlan(cartas[0].planId).then(r => { usar(r); void api.cartaVista(cartas[0].clave).then(usarCartas); })}
            onSumarme={() => cartas[0].tipo === 'sugerencia' && void api.irAPlan(cartas[0].planId).then(r => { usar(r); void api.cartaVista(cartas[0].clave).then(usarCartas); })}
            onGente={() => void api.cartaVista(cartas[0].clave).then(() => ir('/gente'))}/></div>}
      </section>

      {conBrisa && <aside className="panel-brisa vidrio flotante" aria-label="Conversación con Brisa">
        <button type="button" className="panel-cerrar" aria-label="Cerrar la conversación" onClick={() => setConBrisa(false)}><X aria-hidden="true"/></button>
        <ConversacionBrisa perfil={perfil} api={api} ir={ir}/>
      </aside>}
    </main>}
  </div>;
}

// El plan y su conversación, solo para quien lo propuso y quienes se sumaron.
export function PlanDetalle({ id, api, ir, onSalir }: { id: string; api: Api; ir: Ir; onSalir: () => void }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState('');
  const [reportar, setReportar] = useState(false);
  const cargar = useCallback(() => void api.plan(id).then(r => r.ok ? setPlan(r.datos) : setError(r.error)), [api, id]);
  useEffect(cargar, [cargar]);
  const puede = !!plan && (plan.mio || plan.voy);
  const despues = (r: Respuesta<Plan[]>) => { if (r.ok) cargar(); };
  return <Diario titulo={plan?.titulo ?? (error ? 'Este plan ya no está' : 'Abriendo el plan…')} ir={ir} actual="barrio" volver={{ texto: 'Mi barrio', ruta: '/comunidad' }} onSalir={onSalir}>
    {error && <><p>{error}</p><Button className="diario-boton" onClick={() => ir('/comunidad')}>Volver a Mi barrio</Button></>}
    {plan && <>
      <article className="plan"><DatosPlan plan={plan}/>
        <AccionesPlan plan={plan} onIr={() => void api.irAPlan(id).then(despues)} onNoIr={() => void api.noIrAPlan(id).then(despues)} onCancelar={() => void api.cancelarPlan(id).then(() => ir('/comunidad'))}/>
        {plan.autorRef && <button type="button" className="brisa-enlace" aria-expanded={reportar} onClick={() => setReportar(r => !r)}>Reportar o bloquear a {plan.autor}</button>}
        {plan.autorRef && reportar && <ReportarPersona referencia={plan.autorRef} nombre={plan.autor} api={api} onListo={g => { if (!g) setReportar(false); }}/>}
      </article>
      <section className="conversacion" aria-labelledby="conversacion-titulo">
        <h2 id="conversacion-titulo">Conversación del plan</h2>
        {!puede ? <p>Cuando te sumes, podrás hablar con quienes van: «llego 5 minutos tarde», «nos vemos en la entrada».</p> : <>
          <Conversacion tipo="plan" id={id} api={api} nota="Solo la ven quienes van al plan. Antes de enviar, MOAI revisa que no haya frases que lastimen; nadie más la lee, salvo que alguien reporte un mensaje. Se borra a los 30 días."/>
        </>}
      </section>
      <Button className="diario-boton" onClick={() => ir('/comunidad')}>Volver a Mi barrio</Button>
    </>}
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
  return <Diario titulo="Mis lugares" bajada="Como en Uber: guarda tu casa, la de tus papás o tu trabajo, y elige dónde estás. Nadie más ve tus lugares." ir={ir} onSalir={onSalir}>
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

// Contar qué voy a hacer: plantillas de tres toques y la opción de repetirlo cada semana.
export function NuevoPlan({ perfil, api, ir, onSalir }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void }) {
  const ciudadInicial = perfil.lugar?.ciudad ?? '';
  const [plan, setPlan] = useState({ titulo: '', descripcion: '', dia: '', hora: '', lugarPublico: '', ciudad: ciudadInicial, barrio: '', alcance: 'cerca' as Alcance, cupo: '', tipo: 'otro' as Tipo, semanal: false, organizacion: '' });
  const organizaciones = perfil.organizaciones ?? [];
  const convoca = organizaciones.find(o => o.id === plan.organizacion);
  const [sugerenciaLugar, setSugerenciaLugar] = useState('Por ejemplo, Parque de los Deseos');
  const [errores, setErrores] = useState<ErroresPlan>({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const cambiar = (c: Partial<typeof plan>) => setPlan(p => ({ ...p, ...c }));
  const conBarrios = hayBarrios(plan.ciudad);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    const cuando = plan.dia && plan.hora ? new Date(`${plan.dia}T${plan.hora}`).toISOString() : '';
    const entrada: EntradaPlan & { organizacion: string | null } = { titulo: plan.titulo, descripcion: plan.descripcion, cuando, lugarPublico: plan.lugarPublico, ciudad: plan.ciudad, barrio: plan.barrio || null,
      alcance: conBarrios ? plan.alcance : 'ciudad', cupo: plan.cupo ? Number(plan.cupo) : null, tipo: plan.tipo, repite: plan.semanal ? 'semanal' : null, organizacion: convoca?.id ?? null };
    setEnviando(true);
    const r = await api.crearPlan(entrada);
    setEnviando(false);
    if (r.ok) ir('/comunidad'); else { setErrores((r.errores ?? {}) as ErroresPlan); setError(r.errores ? '' : r.error); }
  }
  return <Diario titulo={convoca ? `Convocar a nombre de ${convoca.nombre}` : 'Contar qué voy a hacer'} bajada={convoca ? 'Cuenta qué necesitan y cuántas personas buscan. Se verá con el nombre de la entidad.' : 'Algo que harías de todas formas, cerca y sin mucha logística. Si alguien se suma, mejor; si no, igual lo disfrutas.'} ir={ir} actual="barrio" volver={{ texto: 'Mi barrio', ruta: '/comunidad' }} onSalir={onSalir}>
    <form className="cuenta-form diario-form" onSubmit={enviar} noValidate>
      {organizaciones.length > 0 && <fieldset className="campo">
        <legend>Publicar como</legend>
        <label className="alcance"><input type="radio" name="publicar-como" checked={!convoca} onChange={() => cambiar({ organizacion: '' })}/><span><strong>Yo, {perfil.nombre.split(' ')[0]}</strong> · un plan entre vecinos</span></label>
        {organizaciones.map(o => <label key={o.id} className="alcance"><input type="radio" name="publicar-como" checked={plan.organizacion === o.id} onChange={() => cambiar({ organizacion: o.id })}/><span><strong>{o.nombre}</strong> · {nombreTipoOrganizacion(o.tipo)}</span></label>)}
      </fieldset>}
      <fieldset className="campo">
        <legend>Elige uno para empezar</legend>
        <div className="sugerencias">{plantillas.map(p => <button key={p.tipo} type="button" aria-pressed={plan.tipo === p.tipo}
          onClick={() => { cambiar({ tipo: p.tipo, titulo: p.titulo }); setSugerenciaLugar(`Por ejemplo, ${p.lugar.toLocaleLowerCase('es')}`); }}>{p.nombre}</button>)}</div>
      </fieldset>
      <Campo etiqueta={convoca ? '¿Qué necesitan?' : '¿Qué vas a hacer?'} error={errores.titulo}>{(id, d) => <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={80} placeholder={convoca ? 'Por ejemplo, buscamos 5 personas para sembrar árboles' : 'Por ejemplo, voy a caminar, ¿alguien viene?'} value={plan.titulo} onChange={e => cambiar({ titulo: e.target.value })}/>}</Campo>
      <Campo etiqueta="Cuéntalo un poco más (opcional)" error={errores.descripcion}>{(id, d) => <textarea id={id} aria-describedby={d} className="cuenta-campo diario-textarea" maxLength={400} value={plan.descripcion} onChange={e => cambiar({ descripcion: e.target.value })}/>}</Campo>
      <div className="telefono">
        <Campo etiqueta="Día" error={errores.cuando}>{(id, d) => <input id={id} aria-describedby={d} type="date" className="cuenta-campo" value={plan.dia} onChange={e => cambiar({ dia: e.target.value })}/>}</Campo>
        <Campo etiqueta="Hora">{id => <input id={id} type="time" className="cuenta-campo" value={plan.hora} onChange={e => cambiar({ hora: e.target.value })}/>}</Campo>
      </div>
      <label className="alcance"><input type="checkbox" checked={plan.semanal} onChange={e => cambiar({ semanal: e.target.checked })}/><span><strong>Repetir cada semana</strong> · los planes que se repiten suelen encontrar compañía</span></label>
      <Campo etiqueta="¿Dónde? Un lugar público" error={errores.lugarPublico} ayuda="Un parque, una biblioteca, un café. Nunca la casa de nadie.">{(id, d) => <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={80} placeholder={sugerenciaLugar} value={plan.lugarPublico} onChange={e => cambiar({ lugarPublico: e.target.value })}/>}</Campo>
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
      <Campo etiqueta="Cupo (opcional)" error={errores.cupo} ayuda={convoca ? `Cuántas personas buscan, hasta ${MAX_CUPO_CONVOCATORIA}. Si lo dejas vacío, puede ir quien quiera.` : 'Si lo dejas vacío, puede ir quien quiera.'}>{(id, d) => <input id={id} aria-describedby={d} type="number" min={2} max={convoca ? MAX_CUPO_CONVOCATORIA : MAX_CUPO_PLAN} inputMode="numeric" className="cuenta-campo diario-corto" value={plan.cupo} onChange={e => cambiar({ cupo: e.target.value })}/>}</Campo>
      {error && <p className="campo-error" role="alert">{error}</p>}
      <div className="diario-acciones">
        <Button type="submit" className="diario-boton principal" disabled={enviando}>{enviando ? 'Publicando…' : 'Publicar'}</Button>
        <Button type="button" className="diario-boton" onClick={() => ir('/comunidad')}>Cancelar</Button>
      </div>
    </form>
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
