// Mi cuenta: descargar mis datos y borrar la cuenta (Ley 1581: conocer y suprimir, sin costo y sin escribirle a nadie).
// La descarga es un archivo que arma el navegador con lo que responde /api: no pasa por ningún otro sitio.
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Api, Perfil } from '@/lib/api';
import { Diario, type Ir } from './diario';

export function MiCuenta({ perfil, api, ir, onSalir, onBorrada }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void; onBorrada: () => void }) {
  const [descarga, setDescarga] = useState('');
  const [entiendo, setEntiendo] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState('');

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
    setDescarga('Listo. El archivo «mis-datos-moai.json» quedó en tus descargas.');
  }

  async function borrar() {
    setBorrando(true);
    const r = await api.borrarCuenta();
    setBorrando(false);
    if (r.ok) onBorrada(); else setError(r.error);
  }

  return <Diario titulo="Mi cuenta" bajada={`${perfil.nombre}. Tus datos son tuyos: puedes llevártelos o borrarlos cuando quieras.`} ir={ir} onSalir={onSalir}>
    <section aria-labelledby="datos-titulo" className="cuenta-seccion">
      <h2 id="datos-titulo">Descargar mis datos</h2>
      <p>Un archivo con todo lo que MOAI tiene de ti: tu cuenta, tus autorizaciones, lugares, planes, mensajes, Moais, tu tarjeta, tu Moai interno y el resultado del test, si lo guardaste. De otras personas solo aparece su primer nombre.</p>
      <Button className="diario-boton principal" onClick={() => void descargar()}>Descargar mis datos</Button>
      {descarga && <p className="campo-ayuda" role="status">{descarga}</p>}
    </section>

    <section aria-labelledby="borrar-titulo" className="cuenta-seccion zona-borrar">
      <h2 id="borrar-titulo">Borrar mi cuenta</h2>
      <p>Se borra todo de inmediato y no se puede deshacer:</p>
      <ul>
        <li>Tu cuenta, tus lugares, tus planes y tus mensajes en planes y Moais.</li>
        <li>Tu tarjeta, tu Moai interno, el test de cuidado y tu invierno.</li>
        <li>Tus reportes y bloqueos. Los Moais siguen para quienes quedan, sin ti.</li>
      </ul>
      <p className="campo-ayuda">Si quieres, descarga tus datos antes. Siempre puedes volver a crear una cuenta.</p>
      <label className="alcance"><input type="checkbox" checked={entiendo} onChange={e => setEntiendo(e.target.checked)}/>
        <span>Entiendo que no se puede deshacer</span></label>
      {error && <p className="campo-error" role="alert">{error}</p>}
      <Button className="diario-boton boton-borrar" disabled={!entiendo || borrando} onClick={() => void borrar()}>{borrando ? 'Borrando…' : 'Borrar mi cuenta'}</Button>
    </section>
  </Diario>;
}
