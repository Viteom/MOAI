import { useEffect, useRef, useState } from 'react';
import type { Api } from '@/lib/api';
import { VERSION_LENGUAJE, type CapacidadLenguaje } from '@/lib/lenguaje-brisa';

export function AyudaLenguajeBrisa({ api, frase, deshabilitado, alInterpretar, alOcupar }: {
  api: Api; frase: string; deshabilitado: boolean; alInterpretar: (consulta: string) => void; alOcupar: (ocupada: boolean) => void;
}) {
  const [capacidad, setCapacidad] = useState<CapacidadLenguaje | null>(null);
  const [autorizo, setAutorizo] = useState(false);
  const [ocupada, setOcupada] = useState(false);
  const [error, setError] = useState('');
  const [reintento, setReintento] = useState(0);
  const bloqueo = useRef(false), vivo = useRef(true), turno = useRef(0);
  const detalle = useRef<HTMLDetailsElement>(null);
  useEffect(() => { setAutorizo(false); turno.current++; if (bloqueo.current) { bloqueo.current = false; setOcupada(false); alOcupar(false); } }, [frase, alOcupar]);
  useEffect(() => {
    let vigente = true; vivo.current = true; setError('');
    void api.modeloBrisa().then(r => { if (vigente) { if (r.ok) setCapacidad(r.datos); else setError(r.error); } });
    return () => { vigente = false; vivo.current = false; turno.current++; };
  }, [api, reintento]);
  async function interpretar() {
    if (!autorizo || !frase.trim() || bloqueo.current || deshabilitado || !capacidad?.disponible) return;
    bloqueo.current = true; setOcupada(true); alOcupar(true); setError('');
    const intento = ++turno.current;
    const r = await api.interpretarConBrisa({ frase, autorizo: VERSION_LENGUAJE, datosFicticios: true });
    if (!vivo.current || intento !== turno.current) return;
    bloqueo.current = false; setOcupada(false); alOcupar(false); setAutorizo(false);
    if (!r.ok) { setError(r.error); return; }
    if (detalle.current) detalle.current.open = false;
    alInterpretar(r.datos.consulta);
  }
  return <details ref={detalle} className="intencion-lenguaje"><summary>Entender mi idea con Gemini · beta</summary>
    {capacidad?.disponible ? <>
      <p>Gemini interpreta solo la frase escrita arriba. Después podrás revisarla y buscar planes.</p>
      <p className="intencion-nota">Solo texto ficticio. Evita nombres, contactos, direcciones y datos de salud o ánimo. No enviamos tu memoria, perfil, ciudad elegida ni conversaciones. Google aplica sus condiciones de tratamiento y retención.</p>
      <label className="intencion-check"><input type="checkbox" checked={autorizo} disabled={deshabilitado || ocupada} onChange={e => setAutorizo(e.target.checked)}/>Confirmo que esta frase es ficticia y autorizo enviarla a Google (Gemini) para esta interpretación.</label>
      <button type="button" disabled={!autorizo || !frase.trim() || deshabilitado || ocupada} onClick={() => void interpretar()}>{ocupada ? 'Interpretando…' : 'Interpretar frase ficticia'}</button>
      <p className="intencion-nota">No busca ni te suma a planes. Se conserva la fecha y versión de esta autorización durante 90 días, sin guardar la frase o respuesta en esta función.</p>
    </> : <p className="intencion-nota">{capacidad ? 'Esta ayuda aún no está activada. Puedes buscar directamente por actividad y día.' : 'Consultando disponibilidad…'}</p>}
    {error && <><p className="campo-error" role="alert">{error}</p>{!capacidad && <button type="button" onClick={() => setReintento(i => i + 1)}>Consultar disponibilidad otra vez</button>}</>}
  </details>;
}
