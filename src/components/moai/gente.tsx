// Mi gente (con quién te has visto, invitaciones y tus Moais), cada Moai con su conversación, y reportar o bloquear.
// Decisión de Mateo (14 de octubre de 2026): un Moai nace entre dos personas que se vieron y crece por invitación,
// hasta 5. Nada de contadores ni calificaciones visibles (regla 5): reportar es privado y nunca dice quién fue.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { Api, Gente, Mensaje, MoaiResumen, Respuesta } from '@/lib/api';
import { MAX_DETALLE_REPORTE, MAX_MOAI, motivosReporte, type MotivoReporte } from '@/lib/moai';
import { Diario, type Ir } from './diario';
import { Campo } from './cuenta';

// Reportar o bloquear a una persona. No se le avisa, y nunca sabrá quién fue.
export function ReportarPersona({ referencia, nombre, api, onListo }: { referencia: string; nombre: string; api: Api; onListo: (g?: Gente) => void }) {
  const [motivo, setMotivo] = useState<MotivoReporte | null>(null);
  const [detalle, setDetalle] = useState('');
  const [bloquear, setBloquear] = useState(true);
  const [error, setError] = useState('');
  const [hecho, setHecho] = useState<string | null>(null);
  const terminar = (r: Respuesta<Gente>, texto: string) => {
    if (r.ok) setHecho(texto); else setError(r.error);
    if (r.ok) onListo(r.datos);
  };
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!motivo) { setError('Elige qué pasó.'); return; }
    terminar(await api.reportar({ ref: referencia, motivo, detalle, bloquear }),
      `Gracias por contarnos. ${nombre} no sabrá que fuiste tú.${bloquear ? ` Ya no verás sus planes y ${nombre} no verá los tuyos.` : ''}`);
  }
  if (hecho) return <div className="diario-aviso" role="status"><p>{hecho}</p></div>;
  return <form className="cuenta-form diario-form reportar" onSubmit={enviar} noValidate>
    <fieldset className="campo">
      <legend>¿Qué pasó con {nombre}?</legend>
      {motivosReporte.map(m => <label key={m.id} className="alcance">
        <input type="radio" name={`motivo-${referencia}`} checked={motivo === m.id} onChange={() => { setMotivo(m.id); setError(''); }}/>
        <span>{m.nombre}</span>
      </label>)}
    </fieldset>
    {motivo === 'peligro' && <p className="diario-aviso">Si estás en peligro ahora, llama a la línea de emergencias <strong>123</strong>. MOAI no es un servicio de emergencias.</p>}
    <Campo etiqueta="Cuéntanos un poco más (opcional)" ayuda="Lo lee una persona del equipo. Nadie más.">{(id, d) =>
      <textarea id={id} aria-describedby={d} className="cuenta-campo diario-textarea" maxLength={MAX_DETALLE_REPORTE} value={detalle} onChange={e => setDetalle(e.target.value)}/>}</Campo>
    <label className="alcance"><input type="checkbox" checked={bloquear} onChange={e => setBloquear(e.target.checked)}/>
      <span><strong>Bloquear también</strong> · ya no verás sus planes, no verá los tuyos y no podrá invitarte a un Moai</span></label>
    {error && <p className="campo-error" role="alert">{error}</p>}
    <div className="plan-acciones">
      <Button type="submit" className="diario-boton principal">Enviar reporte</Button>
      <Button type="button" className="diario-boton" onClick={async () => terminar(await api.bloquear(referencia), `Listo. Ya no verás los planes de ${nombre} y ${nombre} no verá los tuyos. No le avisamos.`)}>Solo bloquear</Button>
      <Button type="button" className="diario-boton" onClick={() => onListo()}>Cancelar</Button>
    </div>
  </form>;
}

const Pausa = () => <div className="diario-aviso" role="status"><p>Tu cuenta está en pausa mientras revisamos un reporte. Puedes seguir viendo planes y sumarte, pero por ahora no puedes proponer planes, escribir ni invitar.</p></div>;

function useGente(api: Api) {
  const [gente, setGente] = useState<Gente | null>(null);
  const [error, setError] = useState('');
  const usar = useCallback((r: Respuesta<Gente>) => { if (r.ok) { setGente(r.datos); setError(''); } else setError(r.error); }, []);
  useEffect(() => { void api.gente().then(usar); }, [api, usar]);
  return { gente, error, usar, setGente };
}

const fechaCorta = (iso: string) => new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));

export function MiGente({ api, ir, onSalir }: { api: Api; ir: Ir; onSalir: () => void }) {
  const { gente, error, usar } = useGente(api);
  const [proponer, setProponer] = useState<string | null>(null);
  const [nombreMoai, setNombreMoai] = useState('');
  const [errorNombre, setErrorNombre] = useState('');
  const [reportar, setReportar] = useState<string | null>(null);
  async function enviarPropuesta(e: FormEvent, ref: string) {
    e.preventDefault();
    const r = await api.proponerMoai(ref, nombreMoai);
    if (r.ok) { usar(r); setProponer(null); setNombreMoai(''); setErrorNombre(''); }
    else setErrorNombre(r.errores?.nombre ?? r.error);
  }
  return <Diario titulo="Mi gente" bajada="Las personas con las que te has visto y tus Moais. Un Moai es un grupo pequeño, de 2 a 5 personas, que se cuida y se ve seguido." ir={ir} actual="/gente" onSalir={onSalir}>
    {error && <p className="campo-error" role="alert">{error}</p>}
    {gente === null && !error && <p role="status">Abriendo…</p>}
    {gente && <>
      {gente.pausa && <Pausa/>}

      {gente.invitaciones.length > 0 && <section aria-labelledby="invitaciones-titulo">
        <h2 id="invitaciones-titulo">Para responder</h2>
        {gente.invitaciones.map(i => <article key={i.id} className="plan">
          <p>{i.tipo === 'nuevo' ? <><strong>{i.de}</strong> te propone formar un Moai: «{i.nombre}».</>
            : i.tipo === 'entrar' ? <>Te invitan a «{i.nombre}», el Moai de {i.miembros.join(', ')}.</>
            : <><strong>{i.de}</strong> quiere sumar a <strong>{i.persona}</strong> a «{i.nombre}». Entra solo si todos están de acuerdo, y nadie sabrá quién dijo qué.</>}</p>
          <div className="plan-acciones">
            <Button className="diario-boton principal" onClick={() => void api.responderInvitacion(i.id, true).then(usar)}>{i.tipo === 'aprobar' ? 'Sí, que entre' : 'Sí, me sumo'}</Button>
            <Button className="diario-boton" onClick={() => void api.responderInvitacion(i.id, false).then(usar)}>{i.tipo === 'aprobar' ? 'Prefiero que no' : 'Ahora no'}</Button>
          </div>
        </article>)}
      </section>}

      {gente.encuentros.length > 0 && <section aria-labelledby="encuentros-titulo">
        <h2 id="encuentros-titulo">¿Te viste con…?</h2>
        <p className="campo-ayuda">Solo si las dos personas lo confirman, después podrán formar un Moai. Nadie ve lo que respondes.</p>
        {gente.encuentros.map(e => <article key={`${e.planId}-${e.ocurrencia}`} className="plan">
          <h3>{e.titulo}</h3>
          <p className="plan-cuando">{fechaCorta(e.ocurrencia)}</p>
          <ul className="personas">
            {e.personas.map(p => <li key={p.ref}><strong>{p.nombre}</strong>
              <div className="plan-acciones">
                <Button className="diario-boton principal" onClick={() => void api.nosVimos({ planId: e.planId, ocurrencia: e.ocurrencia, ref: p.ref, si: true }).then(usar)}>Sí, nos vimos</Button>
                <Button className="diario-boton" onClick={() => void api.nosVimos({ planId: e.planId, ocurrencia: e.ocurrencia, ref: p.ref, si: false }).then(usar)}>No coincidimos</Button>
              </div>
            </li>)}
          </ul>
        </article>)}
      </section>}

      <section aria-labelledby="moais-titulo">
        <h2 id="moais-titulo">Mis Moais</h2>
        {gente.moais.length === 0 && <p>Todavía no tienes un Moai. Nace cuando le propones a alguien con quien ya te viste que se sigan viendo.</p>}
        <ul className="lugares">
          {gente.moais.map(m => <li key={m.id}>
            <div><strong>{m.nombre}</strong><span>{m.miembros.map(x => x.nombre).join(', ')}</span></div>
            <Button className="diario-boton principal" onClick={() => ir(`/moais/${m.id}`)}>Abrir</Button>
          </li>)}
        </ul>
      </section>

      <section aria-labelledby="conocidos-titulo">
        <h2 id="conocidos-titulo">Personas con las que te has visto</h2>
        {gente.conocidos.length === 0 && <p>Aquí aparecerán las personas con las que coincidas en un plan, cuando las dos confirmen que se vieron. Puede ser un plan grande o un tinto entre dos.</p>}
        <ul className="personas">
          {gente.conocidos.map(c => <li key={c.ref}>
            <strong>{c.nombre}</strong>
            {proponer === c.ref ? <form className="cuenta-form diario-form" onSubmit={e => void enviarPropuesta(e, c.ref)} noValidate>
              <Campo etiqueta={`¿Cómo se llamaría su Moai?`} error={errorNombre} ayuda={`Si ${c.nombre} acepta, nace su Moai. Luego pueden sumar a más gente, hasta ${MAX_MOAI}.`}>{(id, d) =>
                <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={40} placeholder="Por ejemplo, Los del parque" value={nombreMoai} onChange={e => setNombreMoai(e.target.value)}/>}</Campo>
              <div className="plan-acciones">
                <Button type="submit" className="diario-boton principal">Proponer</Button>
                <Button type="button" className="diario-boton" onClick={() => setProponer(null)}>Cancelar</Button>
              </div>
            </form> : <div className="plan-acciones">
              {c.propuesta ? <span className="plan-voy">Propuesta de Moai pendiente</span>
                : <Button className="diario-boton principal" disabled={gente.pausa} onClick={() => { setProponer(c.ref); setNombreMoai(''); setErrorNombre(''); }}>Formar un Moai</Button>}
              <button type="button" className="brisa-enlace" aria-expanded={reportar === c.ref} onClick={() => setReportar(r => r === c.ref ? null : c.ref)}>Reportar o bloquear</button>
            </div>}
            {reportar === c.ref && <ReportarPersona referencia={c.ref} nombre={c.nombre} api={api} onListo={g => { if (g) usar({ ok: true, datos: g }); else setReportar(null); }}/>}
          </li>)}
        </ul>
      </section>
    </>}
  </Diario>;
}

export function MoaiDetalle({ id, api, ir, onSalir }: { id: string; api: Api; ir: Ir; onSalir: () => void }) {
  const { gente, error, usar } = useGente(api);
  const moai: MoaiResumen | undefined = gente?.moais.find(m => m.id === id);
  const [mensajes, setMensajes] = useState<Mensaje[] | null>(null);
  const [texto, setTexto] = useState('');
  const [errorMensaje, setErrorMensaje] = useState('');
  const [invitar, setInvitar] = useState('');
  const [errorInvitar, setErrorInvitar] = useState('');
  const [renombrar, setRenombrar] = useState<string | null>(null);
  const [errorNombre, setErrorNombre] = useState('');
  const [saliendo, setSaliendo] = useState(false);
  const [reportar, setReportar] = useState<string | null>(null);
  const final = useRef<HTMLDivElement>(null);
  const esta = !!moai;
  useEffect(() => {
    if (!esta) return;
    const traer = () => void api.mensajesMoai(id).then(r => { if (r.ok) setMensajes(r.datos); });
    traer();
    const intervalo = window.setInterval(traer, 15000); // sin tiempo real: revisar cada 15 s basta
    return () => window.clearInterval(intervalo);
  }, [api, id, esta]);
  useEffect(() => { final.current?.scrollIntoView?.({ block: 'end' }); }, [mensajes]);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const r = await api.enviarMensajeMoai(id, texto);
    if (r.ok) { setMensajes(r.datos); setTexto(''); setErrorMensaje(''); } else setErrorMensaje(r.error);
  }
  const invitables = gente && moai ? gente.conocidos.filter(c => !moai.miembros.some(m => m.ref === c.ref) && !moai.esperando.includes(c.nombre)) : [];
  const lleno = moai ? moai.miembros.length + moai.esperando.length >= MAX_MOAI : true;
  return <Diario titulo={moai?.nombre ?? (gente ? 'Este Moai ya no está' : 'Abriendo…')} ir={ir} actual="" onSalir={onSalir}>
    {error && <p className="campo-error" role="alert">{error}</p>}
    {gente && !moai && <><p>Puede que hayas salido de este Moai.</p><Button className="diario-boton" onClick={() => ir('/gente')}>Volver a Mi gente</Button></>}
    {gente && moai && <>
      {gente.pausa && <Pausa/>}
      <section aria-labelledby="miembros-titulo">
        <h2 id="miembros-titulo">Quiénes están</h2>
        <ul className="personas">
          {moai.miembros.map(m => <li key={m.ref}>
            <strong>{m.nombre}</strong>
            {!m.yo && <button type="button" className="brisa-enlace" aria-expanded={reportar === m.ref} onClick={() => setReportar(r => r === m.ref ? null : m.ref)}>Reportar o bloquear</button>}
            {reportar === m.ref && <ReportarPersona referencia={m.ref} nombre={m.nombre} api={api} onListo={g => { if (g) usar({ ok: true, datos: g }); else setReportar(null); }}/>}
          </li>)}
        </ul>
        {moai.esperando.length > 0 && <p className="campo-ayuda">Invitación en curso: {moai.esperando.join(', ')}.</p>}
        {!lleno && !gente.pausa && <form className="cuenta-form diario-form" noValidate onSubmit={async e => {
          e.preventDefault();
          if (!invitar) { setErrorInvitar('Elige a quién invitar.'); return; }
          const r = await api.invitarAMoai(id, invitar);
          if (r.ok) { usar(r); setInvitar(''); setErrorInvitar(''); } else setErrorInvitar(r.error);
        }}>
          {invitables.length === 0 ? <p className="campo-ayuda">Puedes invitar a alguien con quien ya te hayas visto en un plan. Entra solo si todos aquí están de acuerdo.</p> : <>
            <Campo etiqueta="Invitar a alguien con quien ya te viste" error={errorInvitar} ayuda="Entra solo si todos aquí están de acuerdo. Nadie sabrá quién dijo qué.">{(cid, d) =>
              <select id={cid} aria-describedby={d} className="cuenta-campo" value={invitar} onChange={e => setInvitar(e.target.value)}>
                <option value="">Elige a alguien</option>
                {invitables.map(c => <option key={c.ref} value={c.ref}>{c.nombre}</option>)}
              </select>}</Campo>
            <Button type="submit" className="diario-boton principal">Invitar</Button>
          </>}
        </form>}
        {lleno && <p className="campo-ayuda">Este Moai ya tiene {MAX_MOAI} personas, el máximo.</p>}
      </section>

      <section className="conversacion" aria-labelledby="conversacion-moai">
        <h2 id="conversacion-moai">Conversación</h2>
        <p className="campo-ayuda">Solo la ven quienes están en el Moai. Brisa no la lee. Se guardan los mensajes de los últimos 90 días.</p>
        <div className="mensajes" aria-live="polite">
          {mensajes?.length === 0 && <p>Todavía no hay mensajes. ¿Cuándo se vuelven a ver?</p>}
          {mensajes?.map(m => <p key={m.id} className={`mensaje${m.mio ? ' mio' : ''}`}><strong>{m.autor}</strong> {m.texto}</p>)}
          <div ref={final}/>
        </div>
        <form className="mensaje-form" onSubmit={enviar}>
          <label htmlFor="mensaje-moai" className="solo-lectores">Escribe un mensaje</label>
          <input id="mensaje-moai" className="cuenta-campo" maxLength={500} placeholder="Escribe un mensaje" value={texto} onChange={e => setTexto(e.target.value)} disabled={gente.pausa}/>
          <Button type="submit" className="diario-boton principal" disabled={gente.pausa}>Enviar</Button>
        </form>
        {errorMensaje && <p className="campo-error" role="alert">{errorMensaje}</p>}
      </section>

      <section aria-labelledby="ajustes-moai">
        <h2 id="ajustes-moai">Su Moai</h2>
        {renombrar === null ? <div className="plan-acciones">
          <Button className="diario-boton" onClick={() => { setRenombrar(moai.nombre); setErrorNombre(''); }}>Cambiar el nombre</Button>
          {saliendo ? <>
            <span>¿Seguro? Te puedes volver a sumar si te invitan.</span>
            <Button className="diario-boton" onClick={() => void api.salirDeMoai(id).then(r => { if (r.ok) ir('/gente'); })}>Sí, salir</Button>
            <Button className="diario-boton" onClick={() => setSaliendo(false)}>No</Button>
          </> : <Button className="diario-boton" onClick={() => setSaliendo(true)}>Salir del Moai</Button>}
        </div> : <form className="cuenta-form diario-form" noValidate onSubmit={async e => {
          e.preventDefault();
          const r = await api.renombrarMoai(id, renombrar);
          if (r.ok) { usar(r); setRenombrar(null); } else setErrorNombre(r.errores?.nombre ?? r.error);
        }}>
          <Campo etiqueta="Nombre del Moai" error={errorNombre}>{(cid, d) => <input id={cid} aria-describedby={d} className="cuenta-campo" maxLength={40} value={renombrar} onChange={e => setRenombrar(e.target.value)}/>}</Campo>
          <div className="plan-acciones">
            <Button type="submit" className="diario-boton principal">Guardar</Button>
            <Button type="button" className="diario-boton" onClick={() => setRenombrar(null)}>Cancelar</Button>
          </div>
        </form>}
      </section>
      <Button className="diario-boton" onClick={() => ir('/gente')}>Volver a Mi gente</Button>
    </>}
  </Diario>;
}
