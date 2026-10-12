// Crear cuenta, iniciar sesión y escribir el código de verificación.
// REVISIÓN HUMANA: datos personales y consentimiento. Los textos legales son borradores pendientes de abogado.
import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buscarMunicipios, municipioPorCodigo, paises, EDAD_MINIMA, type Canal, type EntradaRegistro, type Errores } from '@/lib/registro';
import type { Contacto, Envio, Respuesta } from '@/lib/api';
import { Marco } from './marco';

const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function Hoja({ titulo, bajada, onVolver, children }: { titulo: string; bajada?: string; onVolver: () => void; children: ReactNode }) {
  return <Marco className="cuenta">
    <section className="cuenta-hoja" aria-labelledby="cuenta-titulo">
      <Button className="cuenta-volver" onClick={onVolver}><ArrowLeft/>Volver</Button>
      <h1 id="cuenta-titulo">{titulo}</h1>
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
      {(['correo', 'whatsapp'] as const).map(valor => <button key={valor} type="button" role="radio" aria-checked={canal === valor} className="canal-opcion" onClick={() => onCanal(valor)}>
        {valor === 'correo' ? 'Correo' : 'WhatsApp'}
      </button>)}
    </div>
    {canal === 'correo'
      ? <Campo etiqueta="Tu correo" error={error}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!error} className="cuenta-campo" type="email" autoComplete="email" value={destino} onChange={e => onDestino(e.target.value)}/>}</Campo>
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

export function Registro({ enviar, onEnviado, onVolver, hoy = new Date() }: {
  enviar: (entrada: EntradaRegistro) => Promise<Respuesta<Envio>>; onEnviado: (contacto: Contacto, envio: Envio, entrada: EntradaRegistro) => void; onVolver: () => void; hoy?: Date;
}) {
  const [entrada, setEntrada] = useState<EntradaRegistro>({ nombre: '', canal: 'correo', destino: '', pais: 'CO', ciudad: '', fechaNacimiento: '', aceptaTerminos: false, aceptaDatos: false });
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const cambiar = (cambio: Partial<EntradaRegistro>) => setEntrada(actual => ({ ...actual, ...cambio }));
  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true); setError('');
    const respuesta = await enviar(entrada);
    setEnviando(false);
    if (respuesta.ok) onEnviado({ canal: entrada.canal, destino: entrada.destino, pais: entrada.pais }, respuesta.datos, entrada);
    else { setErrores(respuesta.errores ?? {}); setError(respuesta.errores ? '' : respuesta.error); }
  }
  return <Hoja titulo="Crea tu cuenta" bajada="Te enviaremos un código para confirmar que eres tú. No usamos contraseñas." onVolver={onVolver}>
    <form className="cuenta-form" onSubmit={alEnviar} noValidate>
      <Campo etiqueta="Tu nombre" error={errores.nombre} ayuda="Como te gusta que te llamen.">{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errores.nombre} className="cuenta-campo" autoComplete="given-name" value={entrada.nombre} onChange={e => cambiar({ nombre: e.target.value })}/>}</Campo>
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
      <Button type="submit" className="portada-boton principal" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviarme el código'}</Button>
    </form>
  </Hoja>;
}

export function Acceso({ enviar, onEnviado, onVolver }: {
  enviar: (contacto: Contacto) => Promise<Respuesta<Envio>>; onEnviado: (contacto: Contacto, envio: Envio) => void; onVolver: () => void;
}) {
  const [contacto, setContacto] = useState<Contacto>({ canal: 'correo', destino: '', pais: 'CO' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true); setError('');
    const respuesta = await enviar(contacto);
    setEnviando(false);
    if (respuesta.ok) onEnviado(contacto, respuesta.datos); else setError(respuesta.error);
  }
  return <Hoja titulo="Qué bueno verte" bajada="Escribe tu correo o tu WhatsApp y te enviamos un código para entrar." onVolver={onVolver}>
    <form className="cuenta-form" onSubmit={alEnviar} noValidate>
      <Contactos canal={contacto.canal} onCanal={canal => setContacto(c => ({ ...c, canal, destino: '' }))} destino={contacto.destino} onDestino={destino => setContacto(c => ({ ...c, destino }))} pais={contacto.pais ?? 'CO'} onPais={pais => setContacto(c => ({ ...c, pais }))} error={error || undefined}/>
      <Button type="submit" className="portada-boton principal" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviarme el código'}</Button>
    </form>
  </Hoja>;
}

export function Codigo({ envio, comprobar, reenviar, onVolver }: {
  envio: Envio; comprobar: (codigo: string) => Promise<Respuesta<unknown>>; reenviar: () => Promise<Respuesta<Envio>>; onVolver: () => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function alEnviar(e: FormEvent) {
    e.preventDefault();
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
  const donde = envio.canal === 'correo' ? 'a tu correo' : 'a tu WhatsApp';
  return <Hoja titulo="Revisa tu mensaje" bajada={`Te enviamos un código de 6 dígitos ${donde} ${envio.destinoVisible}. Vence en 10 minutos.`} onVolver={onVolver}>
    <form className="cuenta-form" onSubmit={alEnviar} noValidate>
      <Campo etiqueta="Código" error={error || undefined}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!error} className="cuenta-campo codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
        value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}/>}</Campo>
      {aviso && <p className="campo-ayuda" role="status">{aviso}</p>}
      <Button type="submit" className="portada-boton principal" disabled={enviando || codigo.length !== 6}>{enviando ? 'Verificando…' : 'Entrar'}</Button>
      <Button type="button" className="cuenta-enlace" onClick={otraVez}>No me llegó: enviar otro código</Button>
    </form>
  </Hoja>;
}
