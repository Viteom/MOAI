import { useState } from 'react';
import { fondoDeCiudad } from '@/lib/fondos-ciudad';
import './fondo-ciudad.css';

// Un cambio de paquete reinicia carga y respaldo; nunca conserva el arte de otra ciudad.
export function FondoCiudad({ ciudad, clase = '' }: { ciudad?: string; clase?: string }) {
  const fondo = fondoDeCiudad(ciudad);
  return <Ilustracion key={fondo.id} id={fondo.id} clase={clase}/>;
}

function Ilustracion({ id, clase }: { id: string; clase: string }) {
  const [formato, setFormato] = useState<'avif' | 'webp'>('avif');
  const [respaldo, setRespaldo] = useState(false);
  const [plano, setPlano] = useState(false);
  const [lista, setLista] = useState(false);
  const generica = id === 'generico' || respaldo;
  const base = `/backgrounds/ciudades/${id}`;
  const error = () => {
    setLista(false);
    if (generica) setPlano(true);
    else if (formato === 'avif') setFormato('webp');
    else setRespaldo(true);
  };
  return <div className={`fondo-ciudad ${clase}${generica ? ' fondo-generico' : ''}`} data-fondo-ciudad={id} data-carga={plano ? 'error' : lista ? 'lista' : 'cargando'}>
    {!plano && (generica ? <img className="fondo-ciudad-imagen" src="/backgrounds/internas/barrio-1586.webp" alt="" aria-hidden="true" onLoad={() => setLista(true)} onError={error}/>
      : <picture key={formato} aria-hidden="true">
        {formato === 'avif' && <source media="(max-aspect-ratio: 1/1)" type="image/avif" srcSet={`${base}-movil.avif`}/>}
        <source media="(max-aspect-ratio: 1/1)" type="image/webp" srcSet={`${base}-movil.webp`}/>
        {formato === 'avif' && <source type="image/avif" srcSet={`${base}-escritorio.avif`}/>}
        <img className="fondo-ciudad-imagen" src={`${base}-escritorio.webp`} alt="" fetchPriority="high" decoding="async" onLoad={() => setLista(true)} onError={error}/>
      </picture>)}
    {(generica || plano) && <p className="fondo-ciudad-aviso" role="status">{plano ? 'Ilustración no disponible · puedes seguir usando Lista' : respaldo ? 'No pudimos cargar esta ciudad · ilustración genérica' : 'Ilustración genérica de MOAI'}</p>}
  </div>;
}
