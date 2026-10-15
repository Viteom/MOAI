// Mi comunidad (P08), Mis lugares, Proponer un plan, el plan con su conversación y Avisos (docs/09, apartado 9).
// Uso cotidiano: superficie más sobria que el bosque; lo importante es leer y actuar.
// Nunca se inventan planes, personas ni distancias; nada de contadores (regla 5).
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { alcances, hayBarrios, MAX_LUGARES, nombresSugeridos, plantillas, type Alcance, type EntradaPlan, type ErroresLugar, type ErroresPlan, type Tipo } from '@/lib/lugares';
import type { Api, Carta, Lugar, Mapa, Mensaje, Perfil, Plan, Preferencias, Respuesta } from '@/lib/api';
import { ChevronDown, Menu as Menu2, Pencil } from 'lucide-react';
import { quienPropone, TarjetaMapa } from './mapa';
import { MAX_CUPO_CONVOCATORIA, MAX_CUPO_PLAN, nombreTipoOrganizacion } from '@/lib/organizaciones';
import { BarrioIlustrado } from './barrio';
import { BarrioCampo, Campo, Ciudad } from './cuenta';
import { OrbeBrisa } from './bosque';
import { Diario, type Ir } from './diario';
import { ReportarPersona } from './gente';

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

function TarjetaPlan({ plan, ir, acciones }: { plan: Plan; ir: Ir; acciones: { onIr: () => void; onNoIr: () => void; onCancelar: () => void } }) {
  return <article className="plan">
    <h3><button type="button" className="plan-titulo" onClick={() => ir(`/planes/${plan.id}`)}>{plan.titulo}</button></h3>
    <DatosPlan plan={plan}/>
    <AccionesPlan plan={plan} {...acciones}/>
    {(plan.mio || plan.voy) && <button type="button" className="brisa-enlace plan-conversar" onClick={() => ir(`/planes/${plan.id}`)}>Hablar con quienes van</button>}
  </article>;
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

function Menu({ ir, onSalir, equipo }: { ir: Ir; onSalir: () => void; equipo?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  return <div className="selector-lugar-caja">
    <button type="button" className="menu-boton" aria-expanded={abierto} aria-label="Más opciones" onClick={() => setAbierto(a => !a)}><Menu2 aria-hidden="true"/></button>
    {abierto && <ul className="selector-lugar-lista menu-lista">
      <li><button type="button" onClick={() => ir('/gente')}>Mi gente</button></li>
      <li><button type="button" onClick={() => ir('/lugares')}>Mis lugares</button></li>
      <li><button type="button" onClick={() => ir('/avisos')}>Avisos</button></li>
      <li><button type="button" onClick={() => ir('/ciudad')}>Mi ciudad</button></li>
      {equipo && <li><button type="button" onClick={() => ir('/equipo')}>Equipo de MOAI</button></li>}
      <li><button type="button" onClick={onSalir}>Cerrar sesión</button></li>
    </ul>}
  </div>;
}

export function MiComunidad({ perfil, api, ir, onSalir, onCambio = () => {} }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void; onCambio?: () => void }) {
  const [planes, setPlanes] = useState<Plan[] | null>(null);
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const [modo, setModo] = useState<'mapa' | 'lista'>('mapa');
  const [elegido, setElegido] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [ayuda, setAyuda] = useState(false);
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
  const verMapa = modo === 'mapa' && conMapa;
  const planElegido = planes?.find(p => p.id === elegido) ?? null;
  const fueraDelMapa = conMapa && planes ? planes.filter(p => !mapa.planes.some(l => l.id === p.id)) : [];
  const nombre = perfil.nombre.split(' ')[0];
  const mensajeBrisa = cartas[0]?.texto ?? (planes?.length ? 'Hay planes cerca esta semana. ¿Te muestro?' : 'Todavía no hay planes cerca. ¿Y si cuentas qué vas a hacer esta semana?');

  return <div className={`comunidad${verMapa ? ' en-mapa' : ''}`}>
    {/* Capa 4 · controles: cada pieza marcada con data-reserva para que las burbujas nunca queden debajo. */}
    <header className="comunidad-cabecera" data-reserva>
      <span className="diario-marca">MOAI</span>
      <h1 tabIndex={-1}>Mi comunidad</h1>
      <SelectorLugar perfil={perfil} api={api} ir={ir} onCambio={onCambio}/>
      {conMapa && <div className="modo" role="group" aria-label="Ver como">
        <button type="button" aria-pressed={modo === 'mapa'} onClick={() => setModo('mapa')}>Mapa</button>
        <button type="button" aria-pressed={modo === 'lista'} onClick={() => setModo('lista')}>Lista</button>
      </div>}
      <Menu ir={ir} onSalir={onSalir} equipo={perfil.equipo}/>
    </header>

    {perfil.lugar && mapa === null && modo === 'mapa' ? <p className="mapa-abriendo" role="status">Abriendo el mapa…</p>
    : verMapa ? <div className="comunidad-mapa">
      {/* Escenario ilustrado, con planes reales en una capa independiente. */}
      <BarrioIlustrado mapa={mapa} planes={planes ?? []} elegido={elegido} onElegir={setElegido}/>
      <button type="button" className="mapa-brisa" data-reserva onClick={() => cartas.length ? setModo('lista') : planes?.[0] && setElegido(mapa.planes[0]?.id ?? null)}>
        <OrbeBrisa/><span className="mapa-brisa-globo">{mensajeBrisa}</span>
      </button>
      {!planElegido && <div className="mapa-controles" data-reserva>
        <ul className="mapa-leyenda" aria-label="Qué significa cada luz">
          <li><span className="luz-semana"/>Esta semana</li><li><span className="luz-semanal"/>Cada semana</li><li><span className="luz-mia"/>Ya me sumé</li>
          {planes?.some(p => p.organizacion) && <li><span className="luz-ciudad"/>Convocatorias</li>}
          {fueraDelMapa.length > 0 && <li><button type="button" className="mapa-mas" onClick={() => setModo('lista')}>Más en tu ciudad · Ver lista</button></li>}
        </ul>
        <Button className="diario-boton principal mapa-contar" onClick={() => ir('/planes/nuevo')}><Pencil aria-hidden="true"/>Contar qué voy a hacer</Button>
      </div>}
      {planElegido && <TarjetaMapa plan={planElegido} onCerrar={() => setElegido(null)} onAbrir={() => ir(`/planes/${planElegido.id}`)} {...acciones(planElegido.id)}/>}
    </div> : <main className="diario-contenido">
      <p className="diario-bajada comunidad-saludo">Hola, {nombre}. Puedes sumarte a algo que disfrutas o contar qué vas a hacer, por si alguien quiere acompañarte.</p>
      {!perfil.lugar && <div className="diario-aviso"><p>Elige dónde vives para ver planes cerca de ti.</p><Button className="diario-boton principal" onClick={() => ir('/lugares')}>Elegir mi lugar</Button></div>}
      {perfil.lugar && mapa?.disponible === false && <p className="campo-ayuda">El mapa de hexágonos llega cuando tu lugar tiene barrio (por ahora, en Medellín). Mientras tanto, aquí tienes la lista.</p>}

      <section className="brisa-tarjeta" aria-label="Brisa">
        <OrbeBrisa/>
        <div className="brisa-tarjeta-cuerpo">
          {cartas.length === 0 && <>
            <p><strong>Estoy aquí para orientarte.</strong> Soy Brisa, una inteligencia artificial.</p>
            {ayuda && <p>Aquí no hace falta pedir nada: cuentas qué vas a hacer (caminar, un tinto, la huerta) y quien quiera se suma. Después de cada plan te preguntaré con quién te viste: con esas personas puedes formar un Moai, aunque sean solo dos.</p>}
            <button type="button" className="brisa-enlace" aria-expanded={ayuda} onClick={() => setAyuda(a => !a)}>{ayuda ? 'Entendido' : 'Ver cómo empezar'}</button>
          </>}
          {cartas.map(c => <CartaBrisa key={c.clave} carta={c}
            onListo={() => void api.cartaVista(c.clave).then(usarCartas)}
            onRepetir={() => c.tipo === 'solo' && void api.repetirPlan(c.planId).then(r => { usar(r); void api.cartaVista(c.clave).then(usarCartas); })}
            onSumarme={() => c.tipo === 'sugerencia' && void api.irAPlan(c.planId).then(r => { usar(r); void api.cartaVista(c.clave).then(usarCartas); })}
            onGente={() => void api.cartaVista(c.clave).then(() => ir('/gente'))}/>)}
        </div>
      </section>

      <div className="diario-acciones">
        <Button className="diario-boton principal" onClick={() => ir('/planes/nuevo')}>Contar qué voy a hacer</Button>
        <Button className="diario-boton" onClick={() => ir('/ciudad')}>Ver mi ciudad</Button>
      </div>

      <section aria-labelledby="planes-titulo">
        <h2 id="planes-titulo">Planes cerca de ti</h2>
        {error && <p className="campo-error" role="alert">{error}</p>}
        {perfil.lugar && planes === null && !error && <p role="status">Buscando planes…</p>}
        {planes?.length === 0 && <p>Aún no hay planes cerca. ¿Y si cuentas qué vas a hacer esta semana?</p>}
        <div className="planes">{planes?.map(plan => <TarjetaPlan key={plan.id} plan={plan} ir={ir} acciones={acciones(plan.id)}/>)}</div>
      </section>
    </main>}
  </div>;
}

// El plan y su conversación, solo para quien lo propuso y quienes se sumaron.
export function PlanDetalle({ id, api, ir, onSalir }: { id: string; api: Api; ir: Ir; onSalir: () => void }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[] | null>(null);
  const [texto, setTexto] = useState('');
  const [errorMensaje, setErrorMensaje] = useState('');
  const [reportar, setReportar] = useState(false);
  const final = useRef<HTMLDivElement>(null);
  const cargar = useCallback(() => void api.plan(id).then(r => r.ok ? setPlan(r.datos) : setError(r.error)), [api, id]);
  useEffect(cargar, [cargar]);
  const puede = !!plan && (plan.mio || plan.voy);
  useEffect(() => {
    if (!puede) { setMensajes(null); return; }
    const traer = () => void api.mensajes(id).then(r => { if (r.ok) setMensajes(r.datos); });
    traer();
    const intervalo = window.setInterval(traer, 15000); // sin tiempo real: revisar cada 15 s basta para coordinar
    return () => window.clearInterval(intervalo);
  }, [api, id, puede]);
  useEffect(() => { final.current?.scrollIntoView?.({ block: 'end' }); }, [mensajes]);
  const despues = (r: Respuesta<Plan[]>) => { if (r.ok) cargar(); };
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const r = await api.enviarMensaje(id, texto);
    if (r.ok) { setMensajes(r.datos); setTexto(''); setErrorMensaje(''); } else setErrorMensaje(r.error);
  }
  return <Diario titulo={plan?.titulo ?? (error ? 'Este plan ya no está' : 'Abriendo el plan…')} ir={ir} actual="" onSalir={onSalir}>
    {error && <><p>{error}</p><Button className="diario-boton" onClick={() => ir('/comunidad')}>Volver a Mi comunidad</Button></>}
    {plan && <>
      <article className="plan"><DatosPlan plan={plan}/>
        <AccionesPlan plan={plan} onIr={() => void api.irAPlan(id).then(despues)} onNoIr={() => void api.noIrAPlan(id).then(despues)} onCancelar={() => void api.cancelarPlan(id).then(() => ir('/comunidad'))}/>
        {plan.autorRef && <button type="button" className="brisa-enlace" aria-expanded={reportar} onClick={() => setReportar(r => !r)}>Reportar o bloquear a {plan.autor}</button>}
        {plan.autorRef && reportar && <ReportarPersona referencia={plan.autorRef} nombre={plan.autor} api={api} onListo={g => { if (!g) setReportar(false); }}/>}
      </article>
      <section className="conversacion" aria-labelledby="conversacion-titulo">
        <h2 id="conversacion-titulo">Conversación del plan</h2>
        {!puede ? <p>Cuando te sumes, podrás hablar con quienes van: «llego 5 minutos tarde», «nos vemos en la entrada».</p> : <>
          <p className="campo-ayuda">Solo la ven quienes van al plan. Brisa no lee estos mensajes y se borran 30 días después.</p>
          <div className="mensajes" aria-live="polite">
            {mensajes?.length === 0 && <p>Todavía no hay mensajes. Puedes saludar o contar cómo te reconocen.</p>}
            {mensajes?.map(m => <p key={m.id} className={`mensaje${m.mio ? ' mio' : ''}`}><strong>{m.autor}</strong> {m.texto}</p>)}
            <div ref={final}/>
          </div>
          <form className="mensaje-form" onSubmit={enviar}>
            <label htmlFor="mensaje" className="solo-lectores">Escribe un mensaje</label>
            <input id="mensaje" className="cuenta-campo" maxLength={500} placeholder="Escribe un mensaje" value={texto} onChange={e => setTexto(e.target.value)}/>
            <Button type="submit" className="diario-boton principal">Enviar</Button>
          </form>
          {errorMensaje && <p className="campo-error" role="alert">{errorMensaje}</p>}
        </>}
      </section>
      <Button className="diario-boton" onClick={() => ir('/comunidad')}>Volver a Mi comunidad</Button>
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
  return <Diario titulo={convoca ? `Convocar a nombre de ${convoca.nombre}` : 'Contar qué voy a hacer'} bajada={convoca ? 'Cuenta qué necesitan y cuántas personas buscan. Se verá con el nombre de la entidad.' : 'Algo que harías de todas formas, cerca y sin mucha logística. Si alguien se suma, mejor; si no, igual lo disfrutas.'} ir={ir} actual="/planes/nuevo" onSalir={onSalir}>
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
  return <Diario titulo="Avisos" bajada="Tú decides si Brisa te cuenta de planes y cómo. Todo viene apagado hasta que lo actives." ir={ir} actual="/avisos" onSalir={onSalir}>
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
