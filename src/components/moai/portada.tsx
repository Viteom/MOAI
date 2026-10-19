import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api as apiReal, type Api, type Contacto, type Envio, type Perfil, type Respuesta } from '@/lib/api';
import { resolverRuta, rutaDeMoai, rutaDePlan, useRuta, type Sesion } from '@/lib/rutas';
import type { EntradaRegistro } from '@/lib/registro';
import { Acceso, Codigo, Menor, PasoComunidad, PasoNacimiento, Registro, TextoLegal, registroVacio } from './cuenta';
import { Bienvenida } from './bienvenida';
import { Avisos, MiComunidad, MisLugares, NuevoPlan, PlanDetalle } from './comunidad';
import { MoaiDetalle } from './gente';
import { Equipo } from './equipo';
import { InicioBrisa } from './brisa';
import { MiGente } from './lazos';
import { Permisos } from './diario';
import { Marco } from './marco';
import { MiCuenta } from './micuenta';

// P01 · Portada pública (horizontal): una ciudad de fondo y texto mínimo.
export function Portada({ onCrear, onEntrar, aviso }: { onCrear: () => void; onEntrar: () => void; aviso?: string }) {
  return <Marco>
    <section className="portada-texto">
      <h1 tabIndex={-1}>MOAI</h1>
      {aviso && <p className="portada-aviso" role="status">{aviso}</p>}
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
  const [aviso, setAviso] = useState('');
  const [menor, setMenor] = useState(false);
  const [errorSalida, setErrorSalida] = useState('');

  const consultar = useCallback(() => {
    setSesion({ estado: 'cargando' });
    void api.sesion().then(r => setSesion(
      r.ok ? { estado: 'activa', perfil: r.datos } : r.status === 401 ? { estado: 'anonima' } : { estado: 'error' }));
  }, [api]);
  useEffect(consultar, [consultar]);
  const activa = (perfil: Perfil) => setSesion({ estado: 'activa', perfil }); // el resolvedor lleva al siguiente paso

  // Una sola decisión de navegación (docs/09, apartado 5).
  useEffect(() => {
    if (menor) return;
    const siguiente = resolverRuta(ruta, sesion, destino);
    if (siguiente) navegar(siguiente, { reemplazar: true });
    else if (ruta === '/verificar' && sesion.estado === 'anonima' && !desafio) {
      // El desafío no se guarda en el navegador: al recargar se vuelve a pedir el código.
      setAviso('Por seguridad, vuelve a pedir tu código.');
      navegar(conDestino('/acceso', destino), { reemplazar: true });
    }
  }, [ruta, sesion, destino, desafio, navegar, menor]);

  // Al cambiar de pantalla, el foco va al título (accesibilidad).
  useEffect(() => { document.querySelector<HTMLElement>('main h1')?.focus(); }, [ruta, sesion.estado, menor]);

  if (sesion.estado === 'cargando') return <Abriendo/>;
  if (sesion.estado === 'error') return <Abriendo onReintentar={consultar}/>;
  if (menor) return <Menor onPortada={() => { setMenor(false); navegar('/', { reemplazar: true }); }}/>;

  const ir = (a: string) => { setAviso(''); navegar(a); };
  const atras = () => (window.history.length > 1 ? window.history.back() : ir('/'));

  if (ruta === '/terminos' || ruta === '/privacidad') return <TextoLegal texto={ruta === '/terminos' ? 'terminos' : 'privacidad'} onVolver={atras}/>;
  if (ruta === '/bienvenida') return <Bienvenida onContinuar={() => ir('/registro')} onYaTengoCuenta={() => ir('/acceso')}/>;
  if (ruta === '/registro') return <Registro entrada={entrada} onCambio={cambio => setEntrada(actual => ({ ...actual, ...cambio }))}
    enviar={api.registrar} onVolver={() => ir('/bienvenida')} onIniciarSesion={() => ir('/acceso')} onLegal={texto => ir(`/${texto}`)}
    onEnviado={(contacto, envio) => { setDesafio({ contacto, envio, nuevo: true, reenviar: () => api.registrar(entrada) }); ir('/verificar'); }}/>;
  if (ruta === '/acceso') return <Acceso enviar={api.pedirAcceso} onVolver={() => ir('/')} onCrearCuenta={() => ir('/bienvenida')}
    aviso={aviso || (destino ? 'Tu sesión terminó. Vuelve a entrar para continuar.' : undefined)}
    onEnviado={(contacto, envio) => { setDesafio({ contacto, envio, nuevo: false, reenviar: () => api.pedirAcceso(contacto) }); ir(conDestino('/verificar', destino)); }}/>;
  if (ruta === '/verificar' && desafio) return <Codigo envio={desafio.envio} reenviar={desafio.reenviar}
    onCambiarCorreo={() => ir(desafio.nuevo ? '/registro' : conDestino('/acceso', destino))}
    comprobar={async codigo => {
      const respuesta = await api.verificar({ ...desafio.contacto, codigo });
      if (respuesta.ok) { setDesafio(null); setEntrada(registroVacio()); activa(respuesta.datos); }
      return respuesta;
    }}/>;
  if (sesion.estado === 'activa') {
    const { perfil } = sesion;
    if (ruta === '/configuracion/nacimiento') return <PasoNacimiento nombre={perfil.nombre} guardar={api.guardarNacimiento} onGuardado={activa}
      onMenor={() => { setMenor(true); setSesion({ estado: 'anonima' }); }}/>;
    if (ruta === '/configuracion/comunidad') return <PasoComunidad guardar={api.guardarComunidad} onGuardado={activa}/>;
    // Revisión de Codex: solo se muestra la portada cuando el servidor confirmó que cerró la sesión.
    const salir = async () => {
      const r = await api.salir();
      if (!r.ok) { setErrorSalida('No pudimos cerrar tu sesión. Revisa tu conexión e inténtalo de nuevo.'); return; }
      setErrorSalida(''); setSesion({ estado: 'anonima' }); navegar('/', { reemplazar: true });
    };
    const refrescar = () => void api.sesion().then(r => { if (r.ok) activa(r.datos); });
    const privada = (() => {
      if (ruta === '/inicio') return <InicioBrisa key={window.location.search} perfil={perfil} api={api} ir={ir} onSalir={salir} empezar={(['plan', 'perfil', 'estado'] as const).find(e => new URLSearchParams(window.location.search).has(e))}/>;
      // Tres lugares: Brisa (/inicio), Mi barrio (/comunidad; /zona abre Vecinos) y Mi gente (/gente; /lazos, el nombre anterior).
      if (ruta === '/comunidad' || ruta === '/zona') return <MiComunidad key={ruta} perfil={perfil} api={api} ir={ir} onSalir={salir} onCambio={refrescar} inicial={ruta === '/zona' ? 'vecinos' : 'planes'}/>;
      if (ruta === '/lugares') return <MisLugares api={api} ir={ir} onSalir={salir} onCambio={() => void api.sesion().then(r => { if (r.ok) activa(r.datos); })}/>;
      if (ruta === '/planes/nuevo') return <NuevoPlan perfil={perfil} api={api} ir={ir} onSalir={salir}/>;
      if (ruta === '/avisos') return <Avisos api={api} ir={ir} onSalir={salir}/>;
      if (ruta === '/gente' || ruta === '/lazos') return <MiGente perfil={perfil} api={api} ir={ir} onSalir={salir}/>;
      if (ruta === '/cuenta') return <MiCuenta perfil={perfil} api={api} ir={ir} onSalir={salir}
        onBorrada={() => { setSesion({ estado: 'anonima' }); navegar('/', { reemplazar: true }); setAviso('Borramos tu cuenta y tus datos. Gracias por haber estado aquí.'); }}/>;
      if (ruta === '/equipo') return <Equipo api={api} ir={ir} onSalir={salir} permitido={!!perfil.equipo}/>;
      const moaiId = rutaDeMoai.exec(ruta)?.[1];
      if (moaiId) return <MoaiDetalle key={moaiId} id={moaiId} api={api} ir={ir} onSalir={salir}/>;
      const planId = rutaDePlan.exec(ruta)?.[1];
      if (planId) return <PlanDetalle key={planId} id={planId} api={api} ir={ir} onSalir={salir}/>;
      return null;
    })();
    // La barra única necesita saber si la persona es del equipo o responde por una entidad («Más»).
    if (privada) return <Permisos.Provider value={{ equipo: perfil.equipo, organizaciones: !!perfil.organizaciones?.length }}>{privada}{errorSalida && <p className="aviso-flotante" role="alert">{errorSalida}</p>}</Permisos.Provider>;
  }
  if (ruta === '/') return <Portada onCrear={() => ir('/bienvenida')} onEntrar={() => ir('/acceso')} aviso={aviso}/>;
  return <Abriendo/>; // mientras el resolvedor redirige
}
