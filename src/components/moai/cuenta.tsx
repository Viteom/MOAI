// Crear cuenta, iniciar sesión y escribir el código de verificación.
// REVISIÓN HUMANA: datos personales y consentimiento. Los textos legales son borradores pendientes de abogado.
import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buscarMunicipios, municipioPorCodigo, paises, EDAD_MINIMA, WHATSAPP_DISPONIBLE, type Canal, type EntradaRegistro, type Errores } from '@/lib/registro';
import type { Contacto, Envio, Respuesta } from '@/lib/api';
import { Marco } from './marco';

const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function Hoja({ titulo, bajada, onVolver, children }: { titulo: string; bajada?: string; onVolver: () => void; children: ReactNode }) {
  return <Marco className="cuenta">
    <section className="cuenta-hoja" aria-labelledby="cuenta-titulo">
      <Button className="cuenta-volver" onClick={onVolver}><ArrowLeft/>Volver</Button>
      <h1 id="cuenta-titulo" tabIndex={-1}>{titulo}</h1>
      {bajada && <p className="cuenta-bajada">{bajada}</p>}
      {children}
    </section>
  </Marco>;
}

function Campo({ etiqueta, error, children, ayuda }: { etiqueta: string; error?: string; ayuda?: string; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId();
  const nota = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;
  return <div className="campo">
    <label htmlFor={id}>{etiqueta}</label>
    {children(id, nota)}
    {error ? <p id={nota} className="campo-error" role="alert">{error}</p> : ayuda && <p id={nota} className="campo-ayuda">{ayuda}</p>}
  </div>;
}

function Contactos({ canal, onCanal, destino, onDestino, pais, onPais, error }: {
  canal: Canal; onCanal: (c: Canal) => void; destino: string; onDestino: (d: string) => void; pais: string; onPais: (p: string) => void; error?: string;
}) {
  const lista = useMemo(() => paises(), []);
  return <>
    <div className="canal" role="radiogroup" aria-label="¿Cómo te enviamos el código?">
      {(['correo', 'whatsapp'] as const).map(valor => {
        const apagado = valor === 'whatsapp' && !WHATSAPP_DISPONIBLE;
        return <button key={valor} type="button" role="radio" aria-checked={canal === valor} disabled={apagado} className="canal-opcion" onClick={() => onCanal(valor)}>
          {valor === 'correo' ? 'Correo' : 'WhatsApp'}{apagado && <span className="canal-pronto"> · muy pronto</span>}
        </button>;
      })}
    </div>
    {canal === 'correo'
      ? <Campo etiqueta="Tu correo electrónico" error={error}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!error} className="cuenta-campo" type="email" autoComplete="email" value={destino} onChange={e => onDestino(e.target.value)}/>}</Campo>
      : <div className="telefono">
          <Campo etiqueta="País">{id => <select id={id} className="cuenta-campo" value={pais} onChange={e => onPais(e.target.value)}>
            {lista.map(p => <option key={p.codigo} value={p.codigo}>{p.nombre} ({p.prefijo})</option>)}
          </select>}</Campo>
          <Campo etiqueta="Tu número de WhatsApp" error={error}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!error} className="cuenta-campo" type="tel" inputMode="tel" autoComplete="tel-national" value={destino} onChange={e => onDestino(e.target.value)}/>}</Campo>
        </div>}
  </>;
}

function Ciudad({ valor, onValor, error }: { valor: string; onValor: (codigo: string) => void; error?: string }) {
  const elegida = municipioPorCodigo(valor);
  const [texto, setTexto] = useState(elegida ? `${elegida.nombre}, ${elegida.departamento}` : '');
  const [abierta, setAbierta] = useState(false);
  const opciones = abierta && !elegida ? buscarMunicipios(texto) : [];
  const lista = useId();
  return <Campo etiqueta="Tu ciudad" error={error} ayuda="Por ahora, municipios de Colombia.">{(id, d) => <div className="ciudad">
    <input id={id} aria-describedby={d} aria-invalid={!!error} className="cuenta-campo" role="combobox" aria-expanded={opciones.length > 0} aria-controls={lista} aria-autocomplete="list" autoComplete="off"
      value={texto} onChange={e => { setTexto(e.target.value); setAbierta(true); if (valor) onValor(''); }} onBlur={() => window.setTimeout(() => setAbierta(false), 150)}/>
    {opciones.length > 0 && <ul id={lista} role="listbox" className="ciudad-opciones">
      {opciones.map(m => <li key={m.codigo} role="option" aria-selected={false} onMouseDown={e => e.preventDefault()} onClick={() => { onValor(m.codigo); setTexto(`${m.nombre}, ${m.departamento}`); setAbierta(false); }}>
        <strong>{m.nombre}</strong><span>{m.departamento}</span>
      </li>)}
    </ul>}
  </div>}</Campo>;
}

function Nacimiento({ valor, onValor, error, hoy }: { valor: string; onValor: (fecha: string) => void; error?: string; hoy: Date }) {
  const [anio, mes, dia] = valor ? valor.split('-') : ['', '', ''];
  const [partes, setPartes] = useState({ dia: dia ?? '', mes: mes ?? '', anio: anio ?? '' });
  const cambiar = (cambio: Partial<typeof partes>) => {
    const nuevas = { ...partes, ...cambio };
    setPartes(nuevas);
    onValor(nuevas.dia && nuevas.mes && nuevas.anio ? `${nuevas.anio}-${nuevas.mes}-${nuevas.dia}` : '');
  };
  const ultimo = hoy.getUTCFullYear() - EDAD_MINIMA;
  const anios = Array.from({ length: 100 }, (_, i) => String(ultimo - i));
  const nota = `${useId()}-nota`;
  return <fieldset className="campo nacimiento" aria-describedby={error ? nota : undefined}>
    <legend>Fecha de nacimiento</legend>
    <div className="nacimiento-partes">
      <select aria-label="Día" className="cuenta-campo" value={partes.dia} onChange={e => cambiar({ dia: e.target.value })}>
        <option value="">Día</option>{Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => <option key={d} value={d}>{Number(d)}</option>)}
      </select>
      <select aria-label="Mes" className="cuenta-campo" value={partes.mes} onChange={e => cambiar({ mes: e.target.value })}>
        <option value="">Mes</option>{meses.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
      </select>
      <select aria-label="Año" className="cuenta-campo" value={partes.anio} onChange={e => cambiar({ anio: e.target.value })}>
        <option value="">Año</option>{anios.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
    {error && <p id={nota} className="campo-error" role="alert">{error}</p>}
  </fieldset>;
}

function Casilla({ marcada, onCambio, error, children }: { marcada: boolean; onCambio: (v: boolean) => void; error?: string; children: ReactNode }) {
  const id = useId();
  return <div className="casilla">
    <input id={id} type="checkbox" checked={marcada} onChange={e => onCambio(e.target.checked)} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}/>
    <label htmlFor={id}>{children}</label>
    {error && <p id={`${id}-error`} className="campo-error" role="alert">{error}</p>}
  </div>;
}

export const registroVacio = (): EntradaRegistro => ({ nombre: '', canal: 'correo', destino: '', pais: 'CO', ciudad: '', fechaNacimiento: '', aceptaTerminos: false, aceptaDatos: false });

function Pie({ texto, accion, onClick }: { texto: string; accion: string; onClick: () => void }) {
  return <p className="cuenta-pie">{texto} <button type="button" onClick={onClick}>{accion}</button></p>;
}

// P03 · Crear cuenta. Los datos viven en Plataforma: volver a Brisa y regresar no los borra.
export function Registro({ entrada, onCambio, enviar, onEnviado, onVolver, onIniciarSesion, hoy = new Date() }: {
  entrada: EntradaRegistro; onCambio: (cambio: Partial<EntradaRegistro>) => void;
  enviar: (entrada: EntradaRegistro) => Promise<Respuesta<Envio>>; onEnviado: (contacto: Contacto, envio: Envio) => void;
  onVolver: () => void; onIniciarSesion: () => void; hoy?: Date;
}) {
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const cambiar = onCambio;
  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true); setError('');
    const respuesta = await enviar(entrada);
    setEnviando(false);
    if (respuesta.ok) onEnviado({ canal: entrada.canal, destino: entrada.destino, pais: entrada.pais }, respuesta.datos);
    else { setErrores(respuesta.errores ?? {}); setError(respuesta.errores ? '' : respuesta.error); }
  }
  return <Hoja titulo="Empecemos por conocernos" bajada="Te enviaremos un código a tu correo para confirmar que eres tú. No usamos contraseñas." onVolver={onVolver}>
    <form className="cuenta-form" onSubmit={alEnviar} noValidate>
      <Campo etiqueta="¿Cómo te llamas?" error={errores.nombre} ayuda="Tu nombre o como prefieras que te llamemos.">{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errores.nombre} className="cuenta-campo" autoComplete="given-name" maxLength={60} value={entrada.nombre} onChange={e => cambiar({ nombre: e.target.value })}/>}</Campo>
      <Contactos canal={entrada.canal} onCanal={canal => cambiar({ canal, destino: '' })} destino={entrada.destino} onDestino={destino => cambiar({ destino })} pais={entrada.pais ?? 'CO'} onPais={pais => cambiar({ pais })} error={errores.destino}/>
      <Ciudad valor={entrada.ciudad} onValor={ciudad => cambiar({ ciudad })} error={errores.ciudad}/>
      <Nacimiento valor={entrada.fechaNacimiento} onValor={fechaNacimiento => cambiar({ fechaNacimiento })} error={errores.fechaNacimiento} hoy={hoy}/>
      <div className="consentimientos">
        <Casilla marcada={entrada.aceptaTerminos} onCambio={aceptaTerminos => cambiar({ aceptaTerminos })} error={errores.aceptaTerminos}>Acepto los términos de uso de MOAI.</Casilla>
        <Casilla marcada={entrada.aceptaDatos} onCambio={aceptaDatos => cambiar({ aceptaDatos })} error={errores.aceptaDatos}>
          Autorizo el tratamiento de mi nombre, contacto, ciudad y fecha de nacimiento para crear y cuidar mi cuenta, según la Ley 1581 de 2012. Puedo conocer, corregir o borrar mis datos cuando quiera.
        </Casilla>
        <p className="campo-ayuda">Textos provisionales: están en revisión legal.</p>
      </div>
      {error && <p className="campo-error" role="alert">{error}</p>}
      <Button type="submit" className="portada-boton principal" disabled={enviando}>{enviando ? 'Enviando código…' : 'Crear mi cuenta'}</Button>
      <Pie texto="¿Ya tienes cuenta?" accion="Iniciar sesión" onClick={onIniciarSesion}/>
    </form>
  </Hoja>;
}

// P04 · Iniciar sesión. `aviso` explica por qué se llegó aquí (sesión vencida, recarga del código…).
export function Acceso({ enviar, onEnviado, onVolver, onCrearCuenta, aviso }: {
  enviar: (contacto: Contacto) => Promise<Respuesta<Envio>>; onEnviado: (contacto: Contacto, envio: Envio) => void;
  onVolver: () => void; onCrearCuenta: () => void; aviso?: string;
}) {
  const [contacto, setContacto] = useState<Contacto>({ canal: 'correo', destino: '', pais: 'CO' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true); setError('');
    const respuesta = await enviar(contacto);
    setEnviando(false);
    if (respuesta.ok) onEnviado(contacto, respuesta.datos); else setError(respuesta.error);
  }
  return <Hoja titulo="Qué bueno verte de nuevo" bajada={`Escribe tu correo${WHATSAPP_DISPONIBLE ? ' o tu WhatsApp' : ''} para recibir un código de acceso.`} onVolver={onVolver}>
    {aviso && <p className="cuenta-aviso" role="status">{aviso}</p>}
    <form className="cuenta-form" onSubmit={alEnviar} noValidate>
      <Contactos canal={contacto.canal} onCanal={canal => setContacto(c => ({ ...c, canal, destino: '' }))} destino={contacto.destino} onDestino={destino => setContacto(c => ({ ...c, destino }))} pais={contacto.pais ?? 'CO'} onPais={pais => setContacto(c => ({ ...c, pais }))} error={error || undefined}/>
      <Button type="submit" className="portada-boton principal" disabled={enviando}>{enviando ? 'Enviando código…' : 'Enviar código'}</Button>
      <Pie texto="¿Es tu primera vez?" accion="Crear cuenta" onClick={onCrearCuenta}/>
    </form>
  </Hoja>;
}

// P05 · Verificar. Los plazos y límites los decide el servidor; aquí solo se muestran sus mensajes.
export function Codigo({ envio, comprobar, reenviar, onCambiarCorreo }: {
  envio: Envio; comprobar: (codigo: string) => Promise<Respuesta<unknown>>; reenviar: () => Promise<Respuesta<Envio>>; onCambiarCorreo: () => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true); setError(''); setAviso('');
    const respuesta = await comprobar(codigo);
    setEnviando(false);
    if (!respuesta.ok) setError(respuesta.error);
  }
  async function otraVez() {
    setError(''); setAviso('');
    const respuesta = await reenviar();
    if (respuesta.ok) { setAviso('Te enviamos un código nuevo.'); setCodigo(''); } else setError(respuesta.error);
  }
  const titulo = envio.canal === 'correo' ? 'Revisa tu correo' : 'Revisa tu WhatsApp';
  return <Hoja titulo={titulo} bajada={`Escribe el código que enviamos a ${envio.destinoVisible}. Vence en 10 minutos.`} onVolver={onCambiarCorreo}>
    <form className="cuenta-form" onSubmit={alEnviar} noValidate>
      <Campo etiqueta="Código de acceso" error={error || undefined} ayuda={envio.canal === 'correo' ? 'Si no lo ves, revisa la carpeta de correo no deseado.' : undefined}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!error} className="cuenta-campo codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
        value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}/>}</Campo>
      {aviso && <p className="campo-ayuda" role="status">{aviso}</p>}
      <Button type="submit" className="portada-boton principal" disabled={enviando || codigo.length !== 6}>{enviando ? 'Verificando…' : 'Verificar y continuar'}</Button>
      <div className="cuenta-secundarias">
        <Button type="button" className="cuenta-enlace" onClick={otraVez}>Enviar otro código</Button>
        <Button type="button" className="cuenta-enlace" onClick={onCambiarCorreo}>Cambiar correo</Button>
      </div>
    </form>
  </Hoja>;
}
