import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Home } from 'lucide-react';
import type { Api, Lugar, Perfil } from '@/lib/api';
import { nombreCiudad } from '@/lib/fondos-ciudad';
import type { Ir } from './diario';
import './fondo-ciudad.css';

export function SelectorLugar({ perfil, api, ir, onCambio }: { perfil: Perfil; api: Api; ir: Ir; onCambio: (lugar: Lugar | null) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [lugares, setLugares] = useState<Lugar[] | null>(null);
  const [error, setError] = useState('');
  const [pendiente, setPendiente] = useState(false);
  const [intento, setIntento] = useState<string | null>(null);
  const bloqueo = useRef(false), caja = useRef<HTMLDivElement>(null), boton = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAbierto(false); boton.current?.focus(); } };
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('keydown', tecla); document.addEventListener('pointerdown', fuera);
    return () => { document.removeEventListener('keydown', tecla); document.removeEventListener('pointerdown', fuera); };
  }, [abierto]);
  async function cargar() {
    setError(''); setIntento(null); setLugares(null);
    const r = await api.lugares();
    if (r.ok) setLugares(r.datos); else setError(r.error);
  }
  async function activar(lugar: string) {
    if (bloqueo.current) return;
    bloqueo.current = true; setPendiente(true); setError(''); setIntento(lugar);
    const r = await api.activarLugar(lugar);
    bloqueo.current = false; setPendiente(false);
    if (!r.ok) { setError(r.error); return; }
    const activo = r.datos.find(l => l.activo);
    if (!activo) { setError('No pudimos confirmar el lugar activo. Intenta de nuevo.'); return; }
    setLugares(r.datos); setAbierto(false); setIntento(null); onCambio(activo); boton.current?.focus();
  }
  if (!perfil.lugar) return <button type="button" className="selector-lugar" onClick={() => ir('/lugares')}>Elige dónde estás</button>;
  return <div className="selector-lugar-caja" ref={caja}>
    <button ref={boton} type="button" className="selector-lugar" disabled={pendiente} aria-expanded={abierto} aria-controls={id} aria-label={`Estás en: ${perfil.lugar.nombre} · ${perfil.lugar.zona}`} onClick={() => { setAbierto(a => !a); if (!abierto) void cargar(); }}>
      <Home aria-hidden="true"/><span className="selector-lugar-texto"><strong>{perfil.lugar.nombre} · {perfil.lugar.zona.split(',')[0]}</strong><small>{nombreCiudad(perfil.lugar)}</small></span><ChevronDown aria-hidden="true"/>
    </button>
    {abierto && <div id={id} className="selector-lugar-opciones">
      {error && <div className="selector-lugar-error"><p role="alert">{error}</p><button type="button" disabled={pendiente} onClick={() => intento ? void activar(intento) : void cargar()}>{intento ? 'Reintentar cambio de lugar' : 'Reintentar cargar lugares'}</button></div>}
      <ul className="selector-lugar-lista" aria-busy={pendiente}>
      {!lugares && !error && <li className="selector-cargando" role="status">Abriendo tus lugares…</li>}
      {lugares?.map(l => <li key={l.id}><button type="button" disabled={pendiente} aria-current={perfil.lugar?.id === l.id || undefined} onClick={() => void activar(l.id)}><strong>{l.nombre}</strong><span>{l.zona}</span></button></li>)}
      {pendiente && <li className="selector-cargando" role="status">Confirmando tu nuevo lugar…</li>}
      <li><button type="button" disabled={pendiente} onClick={() => ir('/lugares')}>Administrar mis lugares</button></li>
      </ul>
    </div>}
  </div>;
}
