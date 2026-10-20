import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, LockKeyhole, Users, X } from 'lucide-react';
import type { Api, FichaVinculo, Gente, Lazos, PersonaLazo } from '@/lib/api';
import { categoriaDe, fichaVacia, nombreCategoria, type FichaPrivada } from '@/lib/vinculos';
import type { EntradaPerfil } from '@/lib/perfil';
import { plantillas, nombreTipo } from '@/lib/lugares';
import { MAX_MOAI } from '@/lib/moai';
import { Campo } from './cuenta';
import type { Ir } from './diario';

export function PanelGente({ titulo, cerrar, children }: { titulo: string; cerrar: () => void; children: ReactNode }) {
  const caja = useRef<HTMLElement>(null);
  useEffect(() => {
    const antes = document.activeElement;
    const h = caja.current?.querySelector('h2');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(); } };
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      if (antes instanceof HTMLElement && antes !== document.body && antes.isConnected) antes.focus({ preventScroll: true });
      else document.querySelector<HTMLButtonElement>('.gente-vistas button[aria-pressed="true"]')?.focus({ preventScroll: true });
    };
  }, [titulo, cerrar]);
  return <aside className="gente-panel" role="dialog" aria-label={titulo} ref={caja}>
    <button type="button" className="gente-panel-cerrar" aria-label="Cerrar ficha" onClick={cerrar}><X aria-hidden="true"/></button>
    {children}
  </aside>;
}

export function FichaContacto({ persona, api, gente, ir, onRed, onGente, children }: {
  persona: PersonaLazo; api: Api; gente: Gente | null; ir: Ir; onRed: (lazos: Lazos) => void; onGente: (gente: Gente) => void; children: ReactNode;
}) {
  const [ficha, setFicha] = useState<FichaVinculo | null>(null);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(false);
  const [privada, setPrivada] = useState<FichaPrivada>({ ...fichaVacia });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [ocupada, setOcupada] = useState(false);
  const [aviso, setAviso] = useState('');
  const [categoria, setCategoria] = useState(categoriaDe(persona));
  const [invitar, setInvitar] = useState('');
  const cargar = useCallback(() => {
    setError('');
    void api.fichaVinculo(persona.id).then(r => {
      if (r.ok) { setFicha(r.datos); setPrivada(r.datos.privada); } else setError(r.error);
    });
  }, [api, persona.id]);
  useEffect(cargar, [cargar]);
  const compartidos = persona.moais ?? [];
  const personal = persona.accion.tipo === 'interno';
  const ref = persona.referencia ?? (persona.accion.tipo === 'saludo' ? persona.accion.ref : undefined);
  const conocido = gente?.conocidos.find(p => p.ref === ref);
  const invitables = conocido && !gente?.pausa ? gente?.moais.filter(m => !compartidos.some(c => c.id === m.id)
    && m.miembros.length + m.esperando.length < MAX_MOAI && !m.esperando.includes(persona.nombre)) ?? [] : [];
  const iniciales = persona.nombre.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('');
  return <div className="gente-ficha">
    <div className="gente-ficha-cabecera"><span className="gente-iniciales" aria-hidden="true">{iniciales}</span>
      <div><p className="gente-sobretitulo">{nombreCategoria(persona)}</p><h2>{persona.nombre}</h2>
        {(persona.origen || personal) && <span className="gente-etiqueta">{personal ? 'Contacto personal' : 'Usa MOAI'}</span>}
      </div>
    </div>
    {error && <p className="gente-error" role="alert">{error}</p>}
    {!ficha && !error && <p role="status">Abriendo la ficha…</p>}
    {!ficha && error && <button type="button" className="boton-secundario" onClick={cargar}>Intentar de nuevo</button>}
    {ficha && <>
      {!personal && <section className="gente-ficha-seccion" aria-label="Información compartida por el contacto">
        <h3>Lo que comparte contigo</h3>
        {ficha.compartida ? <>
          {ficha.compartida.frase && <p>{ficha.compartida.frase}</p>}
          {!!ficha.compartida.gustos.length && <ul className="gente-intereses">{ficha.compartida.gustos.map(g => <li key={g}>{nombreTipo(g)}</li>)}</ul>}
          {ficha.compartida.comparte && <p>Comparte: {ficha.compartida.comparte}</p>}
          {ficha.compartida.aprender && <p>Quiere aprender: {ficha.compartida.aprender}</p>}
          <p className="gente-ayuda">Esta presentación la comparte esa persona. Solo ella puede editarla.</p>
        </> : <p className="gente-ayuda">No ha compartido una presentación con su red.</p>}
      </section>}
      <section className="gente-ficha-seccion" aria-label="Moais que compartimos"><h3>Moais que compartimos</h3>
        {compartidos.length ? <div className="gente-grupos-compartidos">{compartidos.map(m => <button type="button" key={m.id} onClick={() => ir(`/moais/${m.id}`)}><Users aria-hidden="true"/>{m.nombre}<ChevronRight aria-hidden="true"/></button>)}</div>
          : <p className="gente-ayuda">Aún no compartís un Moai.</p>}
      </section>
      <section className="gente-ficha-seccion gente-privada" aria-label="Mi ficha personal, solo para ti">
        <p className="gente-sobretitulo"><LockKeyhole aria-hidden="true"/>Solo para ti</p><h3>Mi ficha personal</h3>
        <p className="gente-ayuda">Estas notas se guardan cifradas. No se añaden a ningún perfil compartido ni se envían al contacto.</p>
        {editando ? <form className="formulario" noValidate onSubmit={async e => {
          e.preventDefault(); if (ocupada) return; setOcupada(true); setError(''); setErrores({});
          const r = await api.guardarFichaVinculo(persona.id, privada); setOcupada(false);
          if (r.ok) { setFicha({ ...ficha, privada: r.datos }); setEditando(false); setAviso('Ficha privada guardada.'); }
          else { setError(r.error); setErrores((r.errores ?? {}) as Record<string, string>); }
        }}>
          <Campo etiqueta="Cómo nos conocemos" error={errores.comoNosConocemos}>{(id, d) => <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={160} value={privada.comoNosConocemos} onChange={e => setPrivada(p => ({ ...p, comoNosConocemos: e.target.value }))}/>}</Campo>
          <Campo etiqueta="Algo que compartimos" error={errores.algoCompartimos}>{(id, d) => <input id={id} aria-describedby={d} className="cuenta-campo" maxLength={160} value={privada.algoCompartimos} onChange={e => setPrivada(p => ({ ...p, algoCompartimos: e.target.value }))}/>}</Campo>
          <Campo etiqueta="Nota breve" error={errores.nota}>{(id, d) => <textarea id={id} aria-describedby={d} className="cuenta-campo" maxLength={500} rows={3} value={privada.nota} onChange={e => setPrivada(p => ({ ...p, nota: e.target.value }))}/>}</Campo>
          <div className="acciones-fila"><button type="submit" className="boton-principal" disabled={ocupada}>Guardar mi ficha</button><button type="button" className="boton-secundario" disabled={ocupada} onClick={() => { setPrivada(ficha.privada); setEditando(false); }}>Cancelar</button></div>
        </form> : <>
          {Object.values(ficha.privada).some(Boolean) ? <dl className="gente-notas">
            {([['comoNosConocemos', 'Cómo nos conocemos'], ['algoCompartimos', 'Algo que compartimos'], ['nota', 'Nota breve']] as const).map(([k, titulo]) => ficha.privada[k] && <div key={k}><dt>{titulo}</dt><dd>{ficha.privada[k]}</dd></div>)}
          </dl> : <p className="gente-ayuda">Todavía no has escrito una nota personal.</p>}
          <button type="button" className="boton-secundario" onClick={() => { setEditando(true); setAviso(''); }}>Editar mi ficha personal</button>
        </>}
      </section>
      <details className="gente-opciones"><summary>Cambiar categoría</summary>
        {personal ? <form className="formulario" onSubmit={async e => {
          e.preventDefault(); if (ocupada) return; setOcupada(true); const r = await api.categoriaVinculo(persona.id, categoria); setOcupada(false);
          if (r.ok) { onRed(r.datos); setAviso('Categoría actualizada.'); } else setError(r.error);
        }}><label>Este contacto es de<select className="cuenta-campo" value={categoria} onChange={e => setCategoria(e.target.value as 'raiz' | 'tronco')}><option value="raiz">Raíz · Familia</option><option value="tronco">Tronco · Quienes me nutren</option></select></label>
          <button className="boton-secundario" disabled={ocupada} type="submit">Guardar categoría</button></form>
          : <p className="gente-ayuda">Cambiar la categoría entre cuentas requiere confirmación mutua. Ese flujo todavía no está disponible. Compartir un Moai no cambia la categoría.</p>}
      </details>
      <details className="gente-opciones"><summary>Conversar e invitar</summary>
        <p className="gente-ayuda">No hay mensajes directos en MOAI. Si compartís un Moai, puedes conversar dentro de ese grupo.</p>
        {invitables.length && ref ? <form className="formulario" onSubmit={async e => {
          e.preventDefault(); if (!invitar || ocupada) return; setOcupada(true); const r = await api.invitarAMoai(invitar, ref); setOcupada(false);
          if (r.ok) { onGente(r.datos); setInvitar(''); setAviso('Invitación enviada. Solo habrá pertenencia cuando se complete la aceptación de todas las personas.'); } else setError(r.error);
        }}><label>Invitar a un Moai<select className="cuenta-campo" value={invitar} onChange={e => setInvitar(e.target.value)}><option value="">Elige un Moai</option>{invitables.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label>
          <button type="submit" className="boton-secundario" disabled={!invitar || ocupada}>Enviar invitación</button>
        </form> : <p className="gente-ayuda">Para invitar hace falta un encuentro confirmado, un Moai tuyo con espacio y la aceptación de sus miembros y de la persona invitada.</p>}
      </details>
    </>}
    {aviso && <p className="gente-aviso" role="status">{aviso}</p>}
    {children}
  </div>;
}

export function MiPresentacion({ api, onGuardado }: { api: Api; onGuardado: (perfil: EntradaPerfil) => void }) {
  const [perfil, setPerfil] = useState<EntradaPerfil | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupada, setOcupada] = useState(false);
  useEffect(() => { void api.perfilPublico().then(r => r.ok ? setPerfil(r.datos) : setError(r.error)); }, [api]);
  return <div className="gente-ficha"><p className="gente-sobretitulo">Lo que eliges compartir</p><h2>Mi presentación</h2>
    <p className="gente-ayuda">Tu presentación es independiente de las notas privadas que escribes sobre tus vínculos.</p>
    {error && <p className="gente-error" role="alert">{error}</p>}
    {!perfil && !error && <p role="status">Abriendo tu presentación…</p>}
    {perfil && <form className="formulario" noValidate onSubmit={async e => {
      e.preventDefault(); if (ocupada) return; setOcupada(true); setError('');
      const r = await api.guardarPerfilPublico({ ...perfil, nombrePreferido: perfil.nombrePreferido ?? '', visibleEnRed: perfil.visibleEnRed ?? false }); setOcupada(false);
      if (r.ok) { setPerfil(r.datos); onGuardado(r.datos); setAviso('Tu presentación se guardó con la visibilidad que elegiste.'); } else setError(r.error);
    }}>
      <Campo etiqueta="Nombre preferido">{(id, d) => <input className="cuenta-campo" id={id} aria-describedby={d} maxLength={40} value={perfil.nombrePreferido ?? ''} onChange={e => setPerfil(p => p && { ...p, nombrePreferido: e.target.value })}/>}</Campo>
      <Campo etiqueta="Presentación breve">{(id, d) => <textarea className="cuenta-campo" id={id} aria-describedby={d} rows={3} maxLength={140} value={perfil.frase} onChange={e => setPerfil(p => p && { ...p, frase: e.target.value })}/>}</Campo>
      <fieldset className="campo"><legend>Intereses que quiero compartir</legend><div className="gente-intereses-elegir">{plantillas.map(g => <label key={g.tipo}><input type="checkbox" checked={perfil.gustos.includes(g.tipo)} onChange={e => setPerfil(p => p && { ...p, gustos: e.target.checked ? [...p.gustos, g.tipo] : p.gustos.filter(x => x !== g.tipo) })}/>{g.nombre}</label>)}</div></fieldset>
      <label className="opcion"><input type="checkbox" checked={perfil.visibleEnRed ?? false} onChange={e => setPerfil(p => p && { ...p, visibleEnRed: e.target.checked })}/><span>Compartir mi presentación con mis vínculos en MOAI</span></label>
      <label className="opcion"><input type="checkbox" checked={perfil.visible} onChange={e => setPerfil(p => p && { ...p, visible: e.target.checked })}/><span>Mostrar también mi tarjeta en Vecinos</span></label>
      <p className="gente-ayuda">Compartir con tu red viene apagado. Activarlo no comparte tus notas ni muestra Moais privados.</p>
      <button type="submit" className="boton-principal" disabled={ocupada}>Guardar presentación</button>
      {aviso && <p className="gente-aviso" role="status">{aviso}</p>}
    </form>}
  </div>;
}
