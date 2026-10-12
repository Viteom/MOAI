import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api as apiReal, type Api, type Contacto, type Envio, type Respuesta } from '@/lib/api';
import { MoaiApp } from './app';
import { Acceso, Codigo, Registro } from './cuenta';
import { Marco } from './marco';

// Portada web (horizontal): una ciudad de fondo y texto mínimo.
export function Portada({ onCrear, onEntrar }: { onCrear: () => void; onEntrar: () => void }) {
  return <Marco>
    <section className="portada-texto">
      <h1>MOAI</h1>
      <p className="portada-sub">Ciudades del cuidado</p>
      <p className="portada-lema">Conecta. Comparte. Cuida.</p>
      <div className="portada-acciones">
        <Button className="portada-boton principal" onClick={onCrear}>Crear cuenta</Button>
        <Button className="portada-boton" onClick={onEntrar}>Iniciar sesión</Button>
      </div>
    </section>
  </Marco>;
}

type Paso =
  | { tipo: 'portada' } | { tipo: 'registro' } | { tipo: 'acceso' }
  | { tipo: 'codigo'; contacto: Contacto; envio: Envio; nuevo: boolean; reenviar: () => Promise<Respuesta<Envio>> }
  | { tipo: 'app'; nombre: string; nuevo: boolean };

export function Plataforma({ api = apiReal }: { api?: Api }) {
  const [paso, setPaso] = useState<Paso>({ tipo: 'portada' });
  useEffect(() => {
    let vigente = true;
    api.sesion().then(r => { if (vigente && r.ok) setPaso(actual => actual.tipo === 'portada' ? { tipo: 'app', nombre: r.datos.nombre, nuevo: false } : actual); });
    return () => { vigente = false; };
  }, [api]);
  const portada = () => setPaso({ tipo: 'portada' });

  if (paso.tipo === 'registro') return <Registro enviar={api.registrar} onVolver={portada}
    onEnviado={(contacto, envio, entrada) => setPaso({ tipo: 'codigo', contacto, envio, nuevo: true, reenviar: () => api.registrar(entrada) })}/>;
  if (paso.tipo === 'acceso') return <Acceso enviar={api.pedirAcceso} onVolver={portada}
    onEnviado={(contacto, envio) => setPaso({ tipo: 'codigo', contacto, envio, nuevo: false, reenviar: () => api.pedirAcceso(contacto) })}/>;
  if (paso.tipo === 'codigo') return <Codigo envio={paso.envio} reenviar={paso.reenviar}
    onVolver={() => setPaso({ tipo: paso.nuevo ? 'registro' : 'acceso' })}
    comprobar={async codigo => {
      const respuesta = await api.verificar({ ...paso.contacto, codigo });
      if (respuesta.ok) setPaso({ tipo: 'app', nombre: respuesta.datos.nombre, nuevo: paso.nuevo });
      return respuesta;
    }}/>;
  if (paso.tipo === 'app') return <MoaiApp
    // Una cuenta nueva empieza su primer día con el nombre que ya dio; quien vuelve entra a su ciudad.
    inicio={paso.nuevo ? 2 : 'home'} estadoInicial={{ nombre: paso.nombre }}
    cuenta={{ onSalir: async () => { await api.salir(); portada(); } }}/>;
  return <Portada onCrear={() => setPaso({ tipo: 'registro' })} onEntrar={() => setPaso({ tipo: 'acceso' })}/>;
}
