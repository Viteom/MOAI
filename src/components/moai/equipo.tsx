// Equipo de MOAI: revisar reportes y dar de alta entidades que convocan. Solo para los correos de EQUIPO_CORREOS.
// REVISIÓN HUMANA: aquí se ven correos de personas reportadas y lo que contaron quienes reportaron.
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { Api, CasoReporte, Decision, EntradaOrganizacion, OrganizacionEquipo, Respuesta } from '@/lib/api';
import { motivosReporte } from '@/lib/moai';
import { nombreTipoOrganizacion, tiposOrganizacion } from '@/lib/organizaciones';
import { Diario, type Ir } from './diario';
import { Campo } from './cuenta';

const fecha = (iso: string) => new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const motivo = (id: string) => motivosReporte.find(m => m.id === id)?.nombre ?? id;
const decisiones: Record<string, string> = { sin_medidas: 'Cerrado sin medidas', suspender: 'Cuenta suspendida' };

function Caso({ caso, onDecidir }: { caso: CasoReporte; onDecidir: (d: Decision) => void }) {
  const [confirmar, setConfirmar] = useState(false);
  return <article className="plan caso">
    <h3>{caso.nombre}</h3>
    <p className="plan-donde">{caso.correo}</p>
    <p className="caso-estado">
      {caso.suspendida ? <span className="plan-voy">Suspendida</span> : caso.pausa ? <span className="plan-voy">En pausa</span> : null}
      {caso.pendientes > 0 ? <span>{caso.pendientes === 1 ? 'Un reporte sin revisar' : `${caso.pendientes} reportes sin revisar`}</span> : <span>Revisado</span>}
    </p>
    <ul className="reportes">
      {caso.reportes.map(r => <li key={r.id} className={r.revisado ? 'revisado' : undefined}>
        <p><strong>{motivo(r.motivo)}</strong> · reportó {r.de} · {fecha(r.fecha)}{r.decision ? ` · ${decisiones[r.decision] ?? r.decision}` : ''}</p>
        {r.detalle && <p className="reporte-detalle">«{r.detalle}»</p>}
      </li>)}
    </ul>
    <div className="plan-acciones">
      {caso.pendientes > 0 && !confirmar && <>
        <Button className="diario-boton" onClick={() => onDecidir('sin_medidas')}>Cerrar sin medidas</Button>
        <Button className="diario-boton" onClick={() => setConfirmar(true)}>Suspender la cuenta</Button>
      </>}
      {confirmar && <>
        <span>¿Suspender a {caso.nombre}? No podrá entrar y sus planes dejarán de verse. Escríbele a {caso.correo} para contarle por qué.</span>
        <Button className="diario-boton principal" onClick={() => { setConfirmar(false); onDecidir('suspender'); }}>Sí, suspender</Button>
        <Button className="diario-boton" onClick={() => setConfirmar(false)}>Cancelar</Button>
      </>}
      {caso.suspendida && <Button className="diario-boton" onClick={() => onDecidir('reactivar')}>Reactivar la cuenta</Button>}
    </div>
  </article>;
}

function Reportes({ api }: { api: Api }) {
  const [casos, setCasos] = useState<CasoReporte[] | null>(null);
  const [error, setError] = useState('');
  const usar = (r: Respuesta<CasoReporte[]>) => { if (r.ok) { setCasos(r.datos); setError(''); } else setError(r.error); };
  useEffect(() => { void api.casos().then(usar); }, [api]);
  return <section aria-labelledby="reportes-titulo">
    <h2 id="reportes-titulo">Reportes</h2>
    <p className="campo-ayuda">Una cuenta queda en pausa cuando dos personas distintas la reportan en 90 días. Cerrar un caso sin medidas levanta la pausa. La persona reportada nunca ve quién la reportó.</p>
    {error && <p className="campo-error" role="alert">{error}</p>}
    {casos === null && !error && <p role="status">Buscando reportes…</p>}
    {casos?.length === 0 && <p>No hay reportes por revisar.</p>}
    <div className="planes">{casos?.map(c => <Caso key={c.cuenta} caso={c} onDecidir={d => void api.decidirCaso(c.cuenta, d).then(usar)}/>)}</div>
  </section>;
}

function Entidades({ api }: { api: Api }) {
  const [lista, setLista] = useState<OrganizacionEquipo[] | null>(null);
  const [nueva, setNueva] = useState<EntradaOrganizacion>({ nombre: '', tipo: '', responsable: '' });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const usar = (r: Respuesta<OrganizacionEquipo[]>, despues?: () => void) => {
    if (r.ok) { setLista(r.datos); setErrores({}); setError(''); despues?.(); }
    else { setErrores((r.errores ?? {}) as Record<string, string>); setError(r.errores ? '' : r.error); }
  };
  useEffect(() => { void api.organizaciones().then(r => usar(r)); }, [api]);
  async function crear(e: FormEvent) {
    e.preventDefault();
    usar(await api.crearOrganizacion(nueva), () => setNueva({ nombre: '', tipo: '', responsable: '' }));
  }
  return <section aria-labelledby="entidades-titulo">
    <h2 id="entidades-titulo">Entidades que convocan</h2>
    <p className="campo-ayuda">Entidades públicas, empresas u organizaciones comunitarias que publican convocatorias («Buscamos 5 personas para sembrar árboles»). Solo el equipo las da de alta. La persona responsable publica desde su propia cuenta, eligiendo «Publicar como».</p>
    {error && <p className="campo-error" role="alert">{error}</p>}
    <ul className="lugares">
      {lista?.map(o => <li key={o.id} className={o.activa ? undefined : 'pausada'}>
        <div><strong>{o.nombre}</strong><span>{nombreTipoOrganizacion(o.tipo)} · {o.responsables.join(', ') || 'sin responsable'}{o.activa ? '' : ' · en pausa'}</span></div>
        <Button className="diario-boton" onClick={() => void api.activarOrganizacion(o.id, !o.activa).then(r => usar(r))}>{o.activa ? 'Pausar' : 'Reactivar'}</Button>
      </li>)}
    </ul>
    {lista?.length === 0 && <p>Todavía no hay entidades.</p>}
    <form className="cuenta-form diario-form" onSubmit={crear} noValidate>
      <h3>Dar de alta una entidad</h3>
      <Campo etiqueta="Nombre" error={errores.nombre}>{(id, d) => <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={80} placeholder="Por ejemplo, Secretaría de Medio Ambiente" value={nueva.nombre} onChange={e => setNueva(n => ({ ...n, nombre: e.target.value }))}/>}</Campo>
      <Campo etiqueta="Tipo" error={errores.tipo}>{(id, d) => <select id={id} aria-describedby={d} className="cuenta-campo" value={nueva.tipo} onChange={e => setNueva(n => ({ ...n, tipo: e.target.value as EntradaOrganizacion['tipo'] }))}>
        <option value="">Elige el tipo</option>
        {tiposOrganizacion.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
      </select>}</Campo>
      <Campo etiqueta="Correo de la persona responsable" error={errores.responsable} ayuda="Debe tener ya una cuenta en MOAI.">{(id, d) => <input id={id} aria-describedby={d} type="email" className="cuenta-campo" value={nueva.responsable} onChange={e => setNueva(n => ({ ...n, responsable: e.target.value }))}/>}</Campo>
      <Button type="submit" className="diario-boton principal">Dar de alta</Button>
    </form>
  </section>;
}

export function Equipo({ api, ir, onSalir, permitido }: { api: Api; ir: Ir; onSalir: () => void; permitido: boolean }) {
  const [vista, setVista] = useState<'reportes' | 'entidades'>('reportes');
  return <Diario titulo="Equipo de MOAI" bajada="Revisar reportes y dar de alta entidades. Lo que ves aquí es confidencial." ir={ir} actual="/equipo" onSalir={onSalir}>
    {!permitido ? <p>Esta sección es solo para el equipo de MOAI.</p> : <>
      <div className="modo" role="group" aria-label="Sección">
        <button type="button" aria-pressed={vista === 'reportes'} onClick={() => setVista('reportes')}>Reportes</button>
        <button type="button" aria-pressed={vista === 'entidades'} onClick={() => setVista('entidades')}>Entidades</button>
      </div>
      {vista === 'reportes' ? <Reportes api={api}/> : <Entidades api={api}/>}
    </>}
  </Diario>;
}
