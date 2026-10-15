// Conversación de un plan o de un Moai (una sola pieza para las dos).
// Decisión de Mateo (15 de octubre): antes de enviar, MOAI revisa el mensaje sin IA. Lo grave no se envía, y ante lo
// riesgoso avisa a quien escribe, que puede cambiarlo o enviarlo igual. Cada mensaje ajeno se puede reportar: así lo
// ve el equipo. Nadie más lee la conversación.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { Api, Mensaje, Respuesta } from '@/lib/api';
import { ReportarPersona } from './gente';

export function Conversacion({ tipo, id, api, puedeEscribir = true, nota }: { tipo: 'plan' | 'moai'; id: string; api: Api; puedeEscribir?: boolean; nota: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[] | null>(null);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [reportando, setReportando] = useState<string | null>(null);
  const final = useRef<HTMLDivElement>(null);
  const traer = tipo === 'plan' ? api.mensajes : api.mensajesMoai;
  const mandar = tipo === 'plan' ? api.enviarMensaje : api.enviarMensajeMoai;

  useEffect(() => {
    const cargar = () => void traer(id).then(r => { if (r.ok) setMensajes(r.datos); });
    cargar();
    const intervalo = window.setInterval(cargar, 15000); // sin tiempo real: revisar cada 15 s basta para coordinar
    return () => window.clearInterval(intervalo);
  }, [traer, id]);
  useEffect(() => { final.current?.scrollIntoView?.({ block: 'end' }); }, [mensajes]);

  const enviar = async (confirmado: boolean) => {
    if (!texto.trim()) return;
    const r: Respuesta<Mensaje[]> = await mandar(id, texto, confirmado);
    if (r.ok) { setMensajes(r.datos); setTexto(''); setError(''); setAviso(''); return; }
    if (r.status === 409) { setAviso(r.error); setError(''); return; }
    setError(r.error); setAviso('');
  };
  const alEnviar = (e: FormEvent) => { e.preventDefault(); void enviar(false); };

  return <div className="conversacion-cuerpo">
    <p className="campo-ayuda">{nota}</p>
    <div className="mensajes" aria-live="polite">
      {mensajes?.length === 0 && <p>Todavía no hay mensajes. Puedes saludar o contar cómo te reconocen.</p>}
      {mensajes?.map(m => <div key={m.id} className={`mensaje${m.mio ? ' mio' : ''}`}>
        <p><strong>{m.autor}</strong> {m.texto}</p>
        {m.autorRef && reportando !== m.id && <button type="button" className="mensaje-reportar" onClick={() => setReportando(m.id)}>Reportar</button>}
        {m.autorRef && reportando === m.id && <ReportarPersona referencia={m.autorRef} nombre={m.autor} api={api} mensaje={{ tipo, id: m.id, texto: m.texto }}
          onListo={g => { if (!g) setReportando(null); }}/>}
      </div>)}
      <div ref={final}/>
    </div>
    {puedeEscribir && <form className="mensaje-form" onSubmit={alEnviar}>
      <label htmlFor={`mensaje-${tipo}`} className="solo-lectores">Escribe un mensaje</label>
      <input id={`mensaje-${tipo}`} className="cuenta-campo" maxLength={500} placeholder="Escribe un mensaje" value={texto} onChange={e => { setTexto(e.target.value); setAviso(''); }}/>
      <Button type="submit" className="diario-boton principal">Enviar</Button>
    </form>}
    {aviso && <div className="mensaje-aviso" role="alert">
      <p>{aviso}</p>
      <div className="plan-acciones">
        <Button className="diario-boton" onClick={() => setAviso('')}>Cambiarlo</Button>
        <Button className="diario-boton" onClick={() => void enviar(true)}>Enviar de todos modos</Button>
      </div>
    </div>}
    {error && <p className="campo-error" role="alert">{error}</p>}
  </div>;
}
