// Piezas de Mi gente: reportar o bloquear, agregar a tu red y cada Moai por dentro con su conversación.
// La red y lo que espera respuesta están en lazos.tsx (Mi gente y Mis lazos son un solo lugar desde el 15 de octubre).
// Decisión de Mateo (14 de octubre de 2026): un Moai nace entre dos personas que se vieron y crece por invitación,
// hasta 5. Nada de contadores ni calificaciones visibles (regla 5): reportar es privado y nunca dice quién fue.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { Api, Gente, MoaiResumen, PersonaInterna, Respuesta } from '@/lib/api';
import { MAX_INTERNO } from '@/lib/cuidado';
import { MAX_DETALLE_REPORTE, MAX_MOAI, motivosReporte, type MotivoReporte } from '@/lib/moai';
import { Diario, type Ir } from './diario';
import { Campo } from './cuenta';
import { Conversacion } from './conversacion';

// Reportar o bloquear a una persona. No se le avisa, y nunca sabrá quién fue.
export function ReportarPersona({ referencia, nombre, api, onListo, mensaje }: { referencia: string; nombre: string; api: Api; onListo: (g?: Gente) => void; mensaje?: { tipo: 'plan' | 'moai'; id: string; texto: string } }) {
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
    terminar(await api.reportar({ ref: referencia, motivo, detalle, bloquear, mensaje: mensaje && { tipo: mensaje.tipo, id: mensaje.id } }),
      `Gracias por contarnos. ${nombre} no sabrá que fuiste tú.${bloquear ? ` Ya no verás sus planes y ${nombre} no verá los tuyos.` : ''}`);
  }
  if (hecho) return <div className="diario-aviso" role="status"><p>{hecho}</p></div>;
  return <form className="cuenta-form diario-form reportar" onSubmit={enviar} noValidate>
    <fieldset className="campo">
      <legend>¿Qué pasó con {nombre}?</legend>
      {mensaje && <p className="reporte-cita">Mensaje: «{mensaje.texto}». El equipo verá este mensaje.</p>}
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

export const Pausa = () => <div className="diario-aviso" role="status"><p>Tu cuenta está en pausa mientras revisamos un reporte. Puedes seguir viendo planes y sumarte, pero por ahora no puedes proponer planes, escribir ni invitar.</p></div>;

function useGente(api: Api) {
  const [gente, setGente] = useState<Gente | null>(null);
  const [error, setError] = useState('');
  const usar = useCallback((r: Respuesta<Gente>) => { if (r.ok) { setGente(r.datos); setError(''); } else setError(r.error); }, []);
  useEffect(() => { void api.gente().then(usar); }, [api, usar]);
  return { gente, error, usar, setGente };
}

// Agregar a tu red a alguien de tu familia o que te nutre (Moai interno), aunque no use MOAI. Solo tú lo ves; se guarda cifrado.
export function AgregarInterno({ api, familia = false, alListo, alCancelar }: { api: Api; familia?: boolean; alListo: () => void; alCancelar: () => void }) {
  const [nueva, setNueva] = useState({ nombre: '', relacion: '', familia });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  async function agregar(e: FormEvent) {
    e.preventDefault();
    const r: Respuesta<PersonaInterna[]> = await api.agregarInterno(nueva);
    if (r.ok) { alListo(); return; }
    setErrores((r.errores ?? {}) as Record<string, string>);
    setError(r.errores ? '' : r.error);
  }
  return <form className="cuenta-form diario-form agregar-interno" onSubmit={e => void agregar(e)} noValidate>
    <h2>Agregar a mi red</h2>
    <p className="campo-ayuda">Tu familia y quienes te nutren, aunque no vivan cerca ni usen MOAI. Solo tú los ves. Brisa te recordará, como mucho una vez por semana, alimentar esos vínculos. Caben hasta {MAX_INTERNO} personas.</p>
    <Campo etiqueta="¿Quién es?" error={errores.nombre}>{(id, d) => <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={40} placeholder="Por ejemplo, Laura" value={nueva.nombre} onChange={e => setNueva(n => ({ ...n, nombre: e.target.value }))}/>}</Campo>
    <Campo etiqueta="¿Quién es para ti? (opcional)" error={errores.relacion}>{(id, d) => <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={40} placeholder="Mi hermana, mi amiga del colegio" value={nueva.relacion} onChange={e => setNueva(n => ({ ...n, relacion: e.target.value }))}/>}</Campo>
    <label className="alcance"><input type="checkbox" checked={nueva.familia} onChange={e => setNueva(n => ({ ...n, familia: e.target.checked }))}/>
      <span><strong>Es de mi familia</strong> · tu raíz: no hace falta que viva cerca ni que use MOAI</span></label>
    {error && <p className="campo-error" role="alert">{error}</p>}
    <div className="plan-acciones">
      <Button type="submit" className="diario-boton principal">Agregar</Button>
      <Button type="button" className="diario-boton" onClick={alCancelar}>Cancelar</Button>
    </div>
  </form>;
}

export function MoaiDetalle({ id, api, ir, onSalir }: { id: string; api: Api; ir: Ir; onSalir: () => void }) {
  const { gente, error, usar } = useGente(api);
  const moai: MoaiResumen | undefined = gente?.moais.find(m => m.id === id);
  const [invitar, setInvitar] = useState('');
  const [errorInvitar, setErrorInvitar] = useState('');
  const [renombrar, setRenombrar] = useState<string | null>(null);
  const [errorNombre, setErrorNombre] = useState('');
  const [saliendo, setSaliendo] = useState(false);
  const [reportar, setReportar] = useState<string | null>(null);
  const invitables = gente && moai ? gente.conocidos.filter(c => !moai.miembros.some(m => m.ref === c.ref) && !moai.esperando.includes(c.nombre)) : [];
  const lleno = moai ? moai.miembros.length + moai.esperando.length >= MAX_MOAI : true;
  return <Diario titulo={moai?.nombre ?? (gente ? 'Este Moai ya no está' : 'Abriendo…')} ir={ir} actual="gente" volver={{ texto: 'Mi gente', ruta: '/gente' }} onSalir={onSalir}>
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
        <Conversacion tipo="moai" id={id} api={api} puedeEscribir={!gente.pausa} nota="Solo la ven quienes están en el Moai. Antes de enviar, MOAI revisa que no haya frases que lastimen; nadie más la lee, salvo que alguien reporte un mensaje. Se guardan los últimos 90 días."/>
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
