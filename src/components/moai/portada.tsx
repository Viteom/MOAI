import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api as apiReal, type Api, type Contacto, type Envio, type Respuesta } from '@/lib/api';
import { resolverRuta, useRuta, type Sesion } from '@/lib/rutas';
import type { EntradaRegistro } from '@/lib/registro';
import { MoaiApp } from './app';
import { Acceso, Codigo, Registro, registroVacio } from './cuenta';
import { Bienvenida } from './bienvenida';
import { Marco } from './marco';

// P01 · Portada pública (horizontal): una ciudad de fondo y texto mínimo.
export function Portada({ onCrear, onEntrar }: { onCrear: () => void; onEntrar: () => void }) {
  return <Marco>
    <section className="portada-texto">
      <h1 tabIndex={-1}>MOAI</h1>
      <p className="portada-sub">Ciudades del cuidado</p>
      <p className="portada-lema">Conecta. Comparte. Cuida.</p>
      <div className="portada-acciones">
        <Button className="portada-boton principal" onClick={onCrear}>Crear cuenta</Button>
        <Button className="portada-boton" onClick={onEntrar}>Iniciar sesión</Button>
      </div>
    </section>
  </Marco>;
}

// P00 · Mientras se consulta la sesión no se muestra ni la portada ni contenido privado.
function Abriendo({ onReintentar }: { onReintentar?: () => void }) {
  return <main className="abriendo" aria-busy={!onReintentar}>
    <h1 tabIndex={-1}>MOAI</h1>
    {onReintentar
      ? <><p role="alert">No pudimos conectarnos. Revisa tu internet.</p><Button className="portada-boton principal" onClick={onReintentar}>Reintentar</Button></>
      : <p role="status">Estamos abriendo tu espacio…</p>}
  </main>;
}

type Desafio = { contacto: Contacto; envio: Envio; nuevo: boolean; reenviar: () => Promise<Respuesta<Envio>> };
const conDestino = (ruta: string, destino: string | null) => destino ? `${ruta}?destino=${encodeURIComponent(destino)}` : ruta;

export function Plataforma({ api = apiReal }: { api?: Api }) {
  const { ruta, destino, navegar } = useRuta();
  const [sesion, setSesion] = useState<Sesion>({ estado: 'cargando' });
  const [entrada, setEntrada] = useState<EntradaRegistro>(registroVacio);
  const [desafio, setDesafio] = useState<Desafio | null>(null);
  const [recienCreada, setRecienCreada] = useState(false);
  const [aviso, setAviso] = useState('');

  const consultar = useCallback(() => {
    setSesion({ estado: 'cargando' });
    void api.sesion().then(r => setSesion(
      r.ok ? { estado: 'activa', nombre: r.datos.nombre } : r.status === 401 ? { estado: 'anonima' } : { estado: 'error' }));
  }, [api]);
  useEffect(consultar, [consultar]);

  // Una sola decisión de navegación (docs/09, apartado 5).
  useEffect(() => {
    const siguiente = resolverRuta(ruta, sesion, destino);
    if (siguiente) navegar(siguiente, { reemplazar: true });
    else if (ruta === '/verificar' && sesion.estado === 'anonima' && !desafio) {
      // El desafío no se guarda en el navegador: al recargar se vuelve a pedir el código.
      setAviso('Por seguridad, vuelve a pedir tu código.');
      navegar(conDestino('/acceso', destino), { reemplazar: true });
    }
  }, [ruta, sesion, destino, desafio, navegar]);

  // Al cambiar de pantalla, el foco va al título (accesibilidad).
  useEffect(() => { document.querySelector<HTMLElement>('main h1')?.focus(); }, [ruta, sesion.estado]);

  if (sesion.estado === 'cargando') return <Abriendo/>;
  if (sesion.estado === 'error') return <Abriendo onReintentar={consultar}/>;

  const ir = (a: string) => { setAviso(''); navegar(a); };

  if (ruta === '/bienvenida') return <Bienvenida onContinuar={() => ir('/registro')} onYaTengoCuenta={() => ir('/acceso')}/>;
  if (ruta === '/registro') return <Registro entrada={entrada} onCambio={cambio => setEntrada(actual => ({ ...actual, ...cambio }))}
    enviar={api.registrar} onVolver={() => ir('/bienvenida')} onIniciarSesion={() => ir('/acceso')}
    onEnviado={(contacto, envio) => { setDesafio({ contacto, envio, nuevo: true, reenviar: () => api.registrar(entrada) }); ir('/verificar'); }}/>;
  if (ruta === '/acceso') return <Acceso enviar={api.pedirAcceso} onVolver={() => ir('/')} onCrearCuenta={() => ir('/bienvenida')}
    aviso={aviso || (destino ? 'Tu sesión terminó. Vuelve a entrar para continuar.' : undefined)}
    onEnviado={(contacto, envio) => { setDesafio({ contacto, envio, nuevo: false, reenviar: () => api.pedirAcceso(contacto) }); ir(conDestino('/verificar', destino)); }}/>;
  if (ruta === '/verificar' && desafio) return <Codigo envio={desafio.envio} reenviar={desafio.reenviar}
    onCambiarCorreo={() => ir(desafio.nuevo ? '/registro' : conDestino('/acceso', destino))}
    comprobar={async codigo => {
      const respuesta = await api.verificar({ ...desafio.contacto, codigo });
      if (respuesta.ok) {
        setDesafio(null); setEntrada(registroVacio()); setRecienCreada(desafio.nuevo);
        setSesion({ estado: 'activa', nombre: respuesta.datos.nombre }); // el resolvedor lleva al destino
      }
      return respuesta;
    }}/>;
  if (ruta === '/ciudad' && sesion.estado === 'activa') return <MoaiApp
    // Provisional hasta P06–P08: una cuenta nueva empieza su primer día; quien vuelve entra a su ciudad.
    inicio={recienCreada ? 2 : 'home'} estadoInicial={{ nombre: sesion.nombre }}
    cuenta={{ onSalir: async () => { await api.salir(); setRecienCreada(false); setSesion({ estado: 'anonima' }); navegar('/', { reemplazar: true }); } }}/>;
  if (ruta === '/') return <Portada onCrear={() => ir('/bienvenida')} onEntrar={() => ir('/acceso')}/>;
  return <Abriendo/>; // mientras el resolvedor redirige
}
