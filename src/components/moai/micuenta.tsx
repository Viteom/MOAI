// Mi cuenta (Ley 1581: conocer y suprimir, sin costo y sin escribirle a nadie). Rediseño del 19 de octubre: tus datos,
// tu conversación con Brisa, avisos, privacidad y sesión, y borrar la cuenta aparte, lejos de lo demás.
// La descarga es un archivo que arma el navegador con lo que responde /api: no pasa por ningún otro sitio.
import { useState } from 'react';
import { Bell, Download, LogOut, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Api, Perfil } from '@/lib/api';
import { Diario, type Ir } from './diario';
import { Fila } from './interna';

export function MiCuenta({ perfil, api, ir, onSalir, onBorrada }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void; onBorrada: () => void }) {
  const [descarga, setDescarga] = useState('');
  const [conversacion, setConversacion] = useState('');
  const [confirmarConversacion, setConfirmarConversacion] = useState(false);
  const [borrarAbierto, setBorrarAbierto] = useState(false);
  const [entiendo, setEntiendo] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState('');
  const nombre = perfil.nombre.split(' ')[0];

  async function descargar() {
    setDescarga('Preparando tu archivo…');
    const r = await api.misDatos();
    if (!r.ok) { setDescarga(r.error); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(r.datos, null, 2)], { type: 'application/json' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'mis-datos-moai.json';
    enlace.click();
    URL.revokeObjectURL(url);
    setDescarga('Listo. El archivo «mis-datos-moai.json» quedó en tus descargas: tu cuenta, autorizaciones, lugares, planes, mensajes, Moais, tarjeta, Moai interno, conversación con Brisa y test, si lo guardaste.');
  }
  async function borrar() {
    setBorrando(true);
    const r = await api.borrarCuenta();
    setBorrando(false);
    if (r.ok) onBorrada(); else setError(r.error);
  }

  return <Diario titulo="Mi cuenta" imagen="cuenta" ir={ir} volver={{ texto: 'Volver', ruta: 'atras' }} onSalir={onSalir}>
    <section className="panel perfil-tarjeta" aria-label="Tu perfil">
      <span className="inicial grande" aria-hidden="true">{nombre.charAt(0).toLocaleUpperCase('es')}</span>
      <div><strong>{perfil.nombre}</strong><span>Tus datos están bajo tu control.</span></div>
    </section>

    <section aria-labelledby="datos-titulo" className="grupo-filas">
      <h2 id="datos-titulo">Mis datos</h2>
      <div className="panel filas">
        <Fila icono={<Download/>} onClick={() => void descargar()}>Descargar mis datos</Fila>
      </div>
      {descarga && <p className="campo-ayuda" role="status">{descarga}</p>}
    </section>

    <section aria-labelledby="conversacion-titulo" className="grupo-filas">
      <h2 id="conversacion-titulo">Mi conversación con Brisa</h2>
      <p className="dato-suave">Brisa guarda lo que hablan, cifrado y solo para ti, durante 90 días. Puedes borrarlo cuando quieras.</p>
      <div className="panel filas">
        {confirmarConversacion
          ? <div className="confirmar"><span>¿Borrar todo lo que has hablado con Brisa?</span>
            <Button className="boton-secundario peligro" onClick={() => void api.borrarHistorial().then(r => { setConversacion(r.ok ? 'Listo, borré nuestra conversación.' : r.error); setConfirmarConversacion(false); })}>Sí, borrar</Button>
            <Button className="boton-secundario" onClick={() => setConfirmarConversacion(false)}>No</Button></div>
          : <Fila icono={<MessageCircle/>} onClick={() => setConfirmarConversacion(true)}>Borrar conversación</Fila>}
      </div>
      {conversacion && <p className="campo-ayuda" role="status">{conversacion}</p>}
    </section>

    <div className="panel filas">
      <Fila icono={<Bell/>} onClick={() => ir('/avisos')}>Avisos</Fila>
      <Fila icono={<ShieldCheck/>} onClick={() => ir('/privacidad')}>Privacidad y términos</Fila>
    </div>
    <div className="panel filas">
      <Fila icono={<LogOut/>} onClick={onSalir}>Cerrar sesión</Fila>
    </div>

    {/* Lo destructivo va aparte, al final, y pide confirmar. */}
    <section aria-labelledby="borrar-titulo" className="zona-peligro">
      <h2 id="borrar-titulo" className="solo-lectores">Eliminar mi cuenta</h2>
      {!borrarAbierto ? <button type="button" className="boton-peligro" onClick={() => setBorrarAbierto(true)}><Trash2 aria-hidden="true"/>Eliminar mi cuenta</button>
      : <div className="panel peligro">
        <p><strong>Se borra todo de inmediato y no se puede deshacer:</strong></p>
        <ul>
          <li>Tu cuenta, tus lugares, tus planes y tus mensajes en planes y Moais.</li>
          <li>Tu tarjeta, tu Moai interno, el test de cuidado, tu invierno y tu conversación con Brisa.</li>
          <li>Tus reportes y bloqueos. Los Moais siguen para quienes quedan, sin ti.</li>
        </ul>
        <p className="dato-suave">Si quieres, descarga tus datos antes. Siempre puedes volver a crear una cuenta.</p>
        <label className="opcion"><input type="checkbox" checked={entiendo} onChange={e => setEntiendo(e.target.checked)}/><span>Entiendo que no se puede deshacer</span></label>
        {error && <p className="campo-error" role="alert">{error}</p>}
        <div className="acciones-fila">
          <Button className="boton-peligro" disabled={!entiendo || borrando} onClick={() => void borrar()}>{borrando ? 'Borrando…' : 'Borrar mi cuenta'}</Button>
          <Button className="boton-secundario" onClick={() => { setBorrarAbierto(false); setEntiendo(false); }}>Cancelar</Button>
        </div>
      </div>}
    </section>
  </Diario>;
}
