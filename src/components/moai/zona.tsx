// Mi zona: vecinos que aprobaron mostrar su tarjeta, sin foto ni ubicación, y el saludo de lejos (decisión de Mateo, 15 de octubre).
// El saludo usa frases ya escritas: no abre un chat ni compromete a nada. Si es mutuo, Brisa sugiere coincidir en algo.
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Api, Respuesta, Vecino } from '@/lib/api';
import type { EntradaPerfil, Saludo } from '@/lib/perfil';
import { textoSaludo } from '@/lib/perfil';
import { plantillas } from '@/lib/lugares';
import { Diario, type Ir } from './diario';
import { ReportarPersona } from './gente';

const nombreGusto = (g: string) => plantillas.find(p => p.tipo === g)?.nombre.toLowerCase() ?? g;
const SALUDOS_ZONA: Saludo[] = ['buenos-dias', 'bonito', 'en-comun'];

function TarjetaVecino({ vecino, api }: { vecino: Vecino; api: Api }) {
  const [enviado, setEnviado] = useState(vecino.saludado ? 'Ya le mandaste un saludo esta semana.' : '');
  const [reportar, setReportar] = useState(false);
  const saludar = async (s: Saludo) => {
    const r = await api.saludar(vecino.ref, s);
    setEnviado(r.ok ? `Le mandaste: «${textoSaludo(s)}». Si te responde, Brisa te cuenta.` : r.error);
  };
  return <li className={`vecino${vecino.puertaAbierta ? ' puerta' : ''}`}>
    <div className="vecino-cabeza">
      <span className="vecino-inicial" aria-hidden="true">{vecino.nombre.charAt(0)}</span>
      <div><strong>{vecino.nombre}</strong><span>{vecino.franja}</span></div>
      {vecino.puertaAbierta && <span className="puerta-abierta">Puerta abierta</span>}
    </div>
    {vecino.frase && <p className="frase">«{vecino.frase}»</p>}
    {vecino.comparte && <p>Comparte: {vecino.comparte}</p>}
    {vecino.gustos.length > 0 && <p>Le gusta: {vecino.gustos.map(nombreGusto).join(', ')}</p>}
    {vecino.enComun.length > 0 && <p className="en-comun">Tienen en común: {vecino.enComun.map(nombreGusto).join(', ')}</p>}
    {enviado ? <p className="campo-ayuda" role="status">{enviado}</p> : <div className="plan-acciones" role="group" aria-label={`Saludar de lejos a ${vecino.nombre}`}>
      {SALUDOS_ZONA.filter(s => s !== 'en-comun' || vecino.enComun.length).map(s => <Button key={s} className="diario-boton" onClick={() => void saludar(s)}>{textoSaludo(s)}</Button>)}
    </div>}
    <button type="button" className="brisa-enlace" aria-expanded={reportar} onClick={() => setReportar(r => !r)}>Reportar o bloquear</button>
    {reportar && <ReportarPersona referencia={vecino.ref} nombre={vecino.nombre} api={api} onListo={g => { if (!g) setReportar(false); }}/>}
  </li>;
}

export function MiZona({ api, ir, onSalir }: { api: Api; ir: Ir; onSalir: () => void }) {
  const [vecinos, setVecinos] = useState<Vecino[] | null>(null);
  const [mio, setMio] = useState<EntradaPerfil | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void api.zona().then((r: Respuesta<Vecino[]>) => r.ok ? setVecinos(r.datos) : setError(r.error));
    void api.perfilPublico().then(r => r.ok && setMio(r.datos));
  }, [api]);
  return <Diario titulo="Mi zona" bajada="Vecinos de tu zona que quisieron mostrarse. Nadie ve dónde vive nadie: solo si está cerca o en tu zona." ir={ir} actual="/zona" onSalir={onSalir}>
    {mio && !mio.visible && <div className="diario-aviso">
      <p>Tu tarjeta no se muestra todavía. Cuéntale a Brisa un poco de ti y decide si quieres que tus vecinos te vean.</p>
      <Button className="diario-boton principal" onClick={() => ir('/inicio?perfil=1')}>Contarle a Brisa</Button>
    </div>}
    {error && <p className="campo-error" role="alert">{error}</p>}
    {vecinos === null && !error && <p role="status">Buscando vecinos…</p>}
    {vecinos?.length === 0 && <p>Todavía nadie de tu zona ha mostrado su tarjeta. Cuando alguien lo haga, aparecerá aquí.</p>}
    <ul className="vecinos">{vecinos?.map(v => <TarjetaVecino key={v.ref} vecino={v} api={api}/>)}</ul>
  </Diario>;
}
