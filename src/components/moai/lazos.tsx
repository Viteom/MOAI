// Mi gente: categorías personales y pertenencias compartidas son dimensiones independientes.
// Las órbitas ordenan contactos; no puntúan afecto ni representan relaciones ajenas.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ChevronRight, CircleHelp, Leaf, Plus, Search, SlidersHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Api, Gente, Lazos, Perfil, PersonaLazo, Respuesta } from '@/lib/api';
import { MAX_MOAI } from '@/lib/moai';
import { textoSaludo, type Saludo } from '@/lib/perfil';
import { Barra, type Ir } from './diario';
import { Imagen } from './interna';
import { Campo } from './cuenta';
import { AgregarInterno, Pausa, ReportarPersona } from './gente';
import { categoriaDe, categorias, descripcionContacto, filtrarPersonas, nombreCategoria, type CategoriaVinculo, type FiltroMoai } from '@/lib/vinculos';
import { RedGente } from './red-gente';
import { FichaContacto, MiPresentacion, PanelGente } from './ficha-gente';
import './mi-gente.css';

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

type Panel = { tipo: 'nada' } | { tipo: 'agregar'; familia: boolean } | { tipo: 'propio' };

function Detalle({ persona, gente, api, ir, alCambiar, usar }: {
  persona: PersonaLazo; gente: Gente | null; api: Api; ir: Ir;
  alCambiar: () => void; usar: (r: Respuesta<Gente>) => void;
}) {
  const [aviso, setAviso] = useState('');
  const [accion, setAccion] = useState<'saludar' | 'moai' | 'reportar' | 'quitar' | null>(null);
  useEffect(() => { setAviso(''); setAccion(null); }, [persona.id]);
  const a = persona.accion;
  const conocido = a.tipo === 'saludo' ? gente?.conocidos.find(c => c.ref === a.ref) : undefined;
  return <div className="lazo-detalle">
    <h3>Otras formas de acercarte</h3>
    {persona.puerta && <p className="puerta-abierta">Dejó su puerta abierta esta semana</p>}
    {aviso && <p className="campo-ayuda" role="status">{aviso}</p>}
    {a.tipo === 'interno' && <div className="plan-acciones">
      <Button className="diario-boton principal" onClick={() => void api.hablamos(a.id).then(r => { setAviso(r.ok ? 'Contacto actualizado.' : r.error); alCambiar(); })}>Ya hablamos</Button>
      <a className="diario-boton enlace-boton" href={`whatsapp://send?text=${encodeURIComponent(`Hola, ${persona.nombre}. Me acordé de ti.`)}`}>Escribirle por WhatsApp</a>
      {accion === 'quitar'
        ? <><span>¿Quitar a {persona.nombre} de tu red?</span>
          <Button className="diario-boton" onClick={() => void api.quitarInterno(a.id).then(r => { if (r.ok) alCambiar(); else setAviso(r.error); })}>Sí, quitar</Button>
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
          : conocido && <Button className="diario-boton principal" disabled={gente?.pausa} onClick={() => setAccion('moai')}>Formar un Moai</Button>}
        {conocido && <Button className="diario-boton" onClick={() => setAccion('saludar')}>Saludar de lejos</Button>}
        <button type="button" className="brisa-enlace" onClick={() => setAccion('reportar')}>Reportar o bloquear</button>
      </div>}
    </>}
  </div>;
}


export function MiGente({ perfil, api, ir, onSalir }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void }) {
  const [lazos, setLazos] = useState<Lazos | null>(null);
  const [gente, setGente] = useState<Gente | null>(null);
  const [error, setError] = useState('');
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [moaiId, setMoaiId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>({ tipo: 'nada' });
  const [vista, setVista] = useState<'lista' | 'red'>(() => new URLSearchParams(window.location.search).get('vista') === 'lista' ? 'lista' : 'red');
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState<FiltroMoai>('todas');
  const [categoria, setCategoria] = useState<CategoriaVinculo | 'todas'>('todas');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [nombrePropio, setNombrePropio] = useState(perfil.nombre);
  const cabecera = useRef<HTMLElement>(null);
  const [altoCabecera, setAltoCabecera] = useState(220);
  useLayoutEffect(() => {
    const el = cabecera.current; if (!el) return;
    const medir = () => setAltoCabecera(el.getBoundingClientRect().height);
    medir(); if (typeof ResizeObserver === 'undefined') return;
    const o = new ResizeObserver(medir); o.observe(el); return () => o.disconnect();
  }, []);
  const cargar = useCallback(() => void api.lazos().then(r => { if (r.ok) { setLazos(r.datos); setError(''); } else setError(r.error); }), [api]);
  const usar = useCallback((r: Respuesta<Gente>) => { if (r.ok) setGente(r.datos); else setError(r.error); }, []);
  useEffect(cargar, [cargar]);
  useEffect(() => { void api.gente().then(usar); void api.perfilPublico().then(r => { if (r.ok && r.datos.nombrePreferido) setNombrePropio(r.datos.nombrePreferido); }); }, [api, usar]);
  const cambiarVista = (v: 'lista' | 'red') => {
    setVista(v);
    const q = new URLSearchParams(window.location.search); q.set('vista', v);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${q}${window.location.hash}`);
  };
  const cerrar = useCallback(() => { setPersonaId(null); setMoaiId(null); setPanel({ tipo: 'nada' }); }, []);
  const agregar = (familia = false) => { setPanel({ tipo: 'agregar', familia }); setPersonaId(null); setMoaiId(null); };
  const elegirPersona = (id: string) => { setPersonaId(id); setPanel({ tipo: 'nada' }); };
  const elegirMoai = (id: string) => { setMoaiId(id); setPersonaId(null); setPanel({ tipo: 'nada' }); };
  const recargar = () => { cargar(); void api.gente().then(usar); };
  const persona = lazos?.personas.find(p => p.id === personaId) ?? null;
  const visibles = useMemo(() => filtrarPersonas(lazos?.personas ?? [], buscar, filtro, categoria), [lazos, buscar, filtro, categoria]);
  const moais = useMemo(() => (lazos?.grupos ?? []).flatMap(g => g.tipo === 'moai' && g.moaiId ? [{ id: g.moaiId, nombre: g.nombre }] : []), [lazos]);
  const moaisVisibles = useMemo(() => !buscar && filtro === 'todas' && categoria === 'todas' ? moais
    : moais.filter(m => visibles.some(p => p.moais?.some(c => c.id === m.id))), [buscar, filtro, categoria, moais, visibles]);
  const moai = moais.find(m => m.id === moaiId);
  const pendiente = !!gente && (gente.invitaciones.length > 0 || gente.encuentros.length > 0);
  const hayRed = !!lazos && (!!lazos.personas.length || !!moais.length);
  const sinResultados = hayRed && !visibles.length && !moaisVisibles.length;
  const fila = (p: PersonaLazo) => <button key={p.id} type="button" className={`gente-fila${personaId === p.id ? ' seleccionada' : ''}`} aria-pressed={personaId === p.id} onClick={() => elegirPersona(p.id)}>
    <span className={`gente-luz estado-${p.estado}`} aria-hidden="true"/><span className="gente-fila-texto"><strong>{p.nombre}</strong>
      <small>{nombreCategoria(p)}{p.detalle ? ` · ${p.detalle}` : ''}</small><span className="solo-lectores">{descripcionContacto[p.estado]}</span>
      {!!p.moais?.length && <span className="gente-distintivo"><Users aria-hidden="true"/>Compartimos Moai</span>}
    </span><ChevronRight aria-hidden="true"/>
  </button>;
  return <div className={`lazos interna gente-pagina vista-${vista}`} style={{ ['--gente-cabecera' as string]: `${altoCabecera}px` }}>
    <div className="gente-botanica" aria-hidden="true"><Imagen nombre="gente" prioridad/></div>
    <Barra ir={ir} onSalir={onSalir} actual="gente"/>
    <header className="gente-cabecera" ref={cabecera}>
      <p className="gente-marca"><Leaf aria-hidden="true"/>MOAI</p>
      <div className="gente-titulo-fila"><div><h1 tabIndex={-1}>Mi gente</h1><p>Las personas con las que compartes la vida</p></div>
        <div className="gente-controles-principales">
          <div className="gente-vistas" role="group" aria-label="Ver como"><button type="button" aria-pressed={vista === 'lista'} onClick={() => cambiarVista('lista')}>Lista</button><button type="button" aria-pressed={vista === 'red'} onClick={() => cambiarVista('red')}>Red</button></div>
          <button type="button" className="gente-agregar boton-secundario" onClick={() => agregar()}><Plus aria-hidden="true"/>Agregar a mi red</button>
        </div>
      </div>
      <div className="gente-filtros">
        <label className="gente-buscar"><Search aria-hidden="true"/><input type="search" aria-label="Buscar por nombre" placeholder="Buscar por nombre" value={buscar} onChange={e => setBuscar(e.target.value)}/></label>
        <button type="button" className="gente-filtrar" aria-expanded={filtrosAbiertos} aria-controls="gente-filtros-opciones" aria-label={filtrosAbiertos ? 'Ocultar filtros' : 'Mostrar filtros'} onClick={() => setFiltrosAbiertos(a => !a)}><SlidersHorizontal aria-hidden="true"/>Filtros</button>
        <div id="gente-filtros-opciones" className={`gente-filtros-opciones${filtrosAbiertos ? ' abiertos' : ''}`}>
        <label className="gente-filtro"><span className="solo-lectores">Pertenencia compartida</span><select aria-label="Pertenencia compartida" value={filtro} onChange={e => setFiltro(e.target.value as FiltroMoai)}><option value="todas">Todas las personas</option><option value="compartimos">Compartimos Moai</option><option value="sin-compartir">Sin Moai compartido</option></select></label>
        <label className="gente-filtro gente-filtro-categoria"><span className="solo-lectores">Categoría del vínculo</span><select aria-label="Categoría del vínculo" value={categoria} onChange={e => setCategoria(e.target.value as CategoriaVinculo | 'todas')}><option value="todas">Todas las categorías</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
        </div>
      </div>
    </header>
    <main className="gente-contenido">
      {error && <p className="gente-error" role="alert">{error}</p>}
      {gente?.pausa && <Pausa/>}
      {pendiente && gente && <section className="gente-pendiente"><ParaResponder gente={gente} api={api} usar={r => { usar(r); cargar(); }}/></section>}
      {!lazos && !error && <p className="gente-cargando" role="status">Abriendo tu red…</p>}
      {lazos && !hayRed && <section className="gente-vacia"><button type="button" className="gente-presentacion-vacia" aria-label={`Mi presentación: ${nombrePropio}`} onClick={() => setPanel({ tipo: 'propio' })}><span className="gente-orbe" aria-hidden="true"/><span>Mi presentación</span></button><h2>Tu gente empieza aquí</h2><p>Puedes agregar a tu familia y a quienes te nutren, aunque no usen MOAI. Cuando compartas encuentros, también aparecerán aquí.</p><p>Empieza con «Agregar a mi red».</p></section>}
      {sinResultados && <div className="gente-vacia" role="status"><h2>No encontramos coincidencias</h2><p>Prueba otro nombre o cambia los filtros.</p><button type="button" className="boton-secundario" onClick={() => { setBuscar(''); setFiltro('todas'); setCategoria('todas'); }}>Limpiar búsqueda y filtros</button></div>}
      {hayRed && !sinResultados && (vista === 'red' ? <RedGente personas={visibles} moais={moaisVisibles} nombre={nombrePropio} personaId={personaId} moaiId={moaiId} onPersona={elegirPersona} onMoai={elegirMoai} onPropio={() => { setPanel({ tipo: 'propio' }); setPersonaId(null); }}/>
        : <div className="gente-lista" aria-label="Vista Lista">
          {categorias.map(c => {
            const ps = visibles.filter(p => categoriaDe(p) === c.id);
            return ps.length > 0 && <section key={c.id} className={`gente-tarjeta categoria-${c.id}`} aria-label={c.nombre}>
              <p className="gente-sobretitulo">{c.nombre}</p><h2>{c.titulo}</h2><p className="gente-descripcion">{c.descripcion}</p><div className="gente-filas">{ps.map(fila)}</div>
            </section>;
          })}
          {moaisVisibles.length > 0 && <section className="gente-tarjeta gente-mis-moais" aria-label="Mis Moais"><p className="gente-sobretitulo"><Users aria-hidden="true"/>Lo que compartimos</p><h2>Mis Moais</h2><p className="gente-descripcion">Grupos elegidos para encontrarse.</p><div className="gente-filas">{moaisVisibles.map(m => <button type="button" className="gente-fila" key={m.id} onClick={() => elegirMoai(m.id)}><span className="gente-simbolo-moai" aria-hidden="true"><i/><i/><i/></span><span className="gente-fila-texto"><strong>{m.nombre}</strong><small>Abrir sus opciones</small></span><ChevronRight aria-hidden="true"/></button>)}</div></section>}
        </div>)}
      {lazos && <details className="gente-explicacion"><summary><CircleHelp aria-hidden="true"/>Cómo leer mi red</summary><div>
        <p>Las órbitas ayudan a ordenar la vista: no miden afecto ni cercanía emocional. Cada conexión une tu nodo con un contacto; no dibujamos relaciones entre otras personas.</p>
        <p>La categoría del vínculo es independiente de compartir un Moai. Solo ves los grupos de los que formas parte; «Sin Moai compartido» no significa que esa persona no pertenezca a otros.</p>
        <ul><li><span className="gente-luz estado-vivo" aria-hidden="true"/>En contacto</li><li><span className="gente-luz estado-tibio" aria-hidden="true"/>Hace un tiempo</li><li><span className="gente-luz estado-dormido" aria-hidden="true"/>Dormido: sin contacto reciente registrado</li></ul>
        <p>Estos estados recuerdan el último contacto conocido por MOAI. No describen emociones, salud ni la calidad de una relación. «Puerta abierta» solo se muestra cuando la persona lo declaró y tienes permiso para verlo.</p>
      </div></details>}
    </main>
    {(persona || panel.tipo !== 'nada' || moai) && <PanelGente titulo={panel.tipo === 'agregar' ? 'Agregar a mi red' : panel.tipo === 'propio' ? 'Mi presentación' : persona?.nombre ?? moai!.nombre} cerrar={cerrar}>
      {panel.tipo === 'agregar' ? <AgregarInterno api={api} familia={panel.familia} alListo={() => { cerrar(); recargar(); }} alCancelar={cerrar}/>
        : panel.tipo === 'propio' ? <MiPresentacion api={api} onGuardado={p => setNombrePropio(p.nombrePreferido || perfil.nombre)}/>
        : persona ? <FichaContacto key={persona.id} persona={persona} api={api} gente={gente} ir={ir} onRed={setLazos} onGente={setGente}>
          <Detalle persona={persona} gente={gente} api={api} ir={ir} alCambiar={recargar} usar={usar}/>
        </FichaContacto>
        : moai ? <div className="gente-ficha"><p className="gente-sobretitulo">Moai que compartimos</p><h2>{moai.nombre}</h2><p>Sus integrantes visibles se resaltan en la red.</p><div className="gente-filas">{visibles.filter(p => p.moais?.some(m => m.id === moai.id)).map(fila)}</div><button type="button" className="boton-principal" onClick={() => ir(`/moais/${moai.id}`)}>Abrir el Moai</button></div> : null}
    </PanelGente>}
  </div>;
}
