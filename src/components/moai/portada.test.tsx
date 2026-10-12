import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Plataforma } from './portada';
import { enmascarar, normalizarDestino, validarRegistro } from '@/lib/registro';
import type { Api } from '@/lib/api';

// API de mentira con las mismas reglas de validación que el servidor; el código correcto es 123456.
function apiFalsa(sesion: 'activa' | 'anonima' | 'sin-red' = 'anonima'): Api {
  const envio = (canal: 'correo' | 'whatsapp', destino: string, pais?: string) =>
    ({ ok: true as const, datos: { canal, destinoVisible: enmascarar(canal, normalizarDestino(canal, destino, pais) ?? destino) } });
  return {
    registrar: vi.fn(async entrada => {
      const r = validarRegistro(entrada, new Date());
      return r.ok ? envio(entrada.canal, entrada.destino, entrada.pais) : { ok: false as const, error: '', errores: r.errores, status: 400 };
    }),
    pedirAcceso: vi.fn(async c => envio(c.canal, c.destino, c.pais)),
    verificar: vi.fn(async c => c.codigo === '123456'
      ? { ok: true as const, datos: { nombre: 'Rosa', ciudad: '05001' } }
      : { ok: false as const, error: 'Ese código no coincide o ya venció. Revísalo o pide uno nuevo.', status: 400 }),
    sesion: vi.fn(async () => sesion === 'activa' ? { ok: true as const, datos: { nombre: 'Rosa', ciudad: '05001' } }
      : sesion === 'sin-red' ? { ok: false as const, error: 'Sin conexión', status: 0 } : { ok: false as const, error: 'Sin sesión.', status: 401 }),
    salir: vi.fn(async () => ({ ok: true as const, datos: { ok: true as const } })),
  };
}

beforeEach(() => window.history.replaceState(null, '', '/'));
const escribir = (etiqueta: string | RegExp, valor: string) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
const clic = (nombre: string | RegExp) => fireEvent.click(screen.getByRole('button', { name: nombre }));
// La pantalla de carga (P00) también dice MOAI: la portada está lista cuando aparece «Crear cuenta».
const portadaLista = () => screen.findByRole('button', { name: 'Crear cuenta' });
const titulo = (nombre: string | RegExp) => screen.findByRole('heading', { level: 1, name: nombre });

function llenarRegistro() {
  escribir('¿Cómo te llamas?', 'Rosa');
  escribir('Tu correo electrónico', 'rosa@ejemplo.co');
  escribir('Tu ciudad', 'medel');
  fireEvent.click(screen.getByRole('option', { name: /Medellín/ }));
  escribir('Día', '02');
  escribir('Mes', '03');
  escribir('Año', '1950');
  fireEvent.click(screen.getByLabelText(/términos de uso/));
  fireEvent.click(screen.getByLabelText(/Ley 1581/));
}

describe('Resolución de sesión (P00)', () => {
  it('no muestra la portada hasta saber si hay sesión', async () => {
    render(<Plataforma api={apiFalsa()} />);
    expect(screen.getByText('Estamos abriendo tu espacio…')).toBeInTheDocument();
    expect(await portadaLista()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('sin conexión ofrece reintentar en vez de cerrar la sesión', async () => {
    const api = apiFalsa('sin-red');
    render(<Plataforma api={api} />);
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    clic('Reintentar');
    expect(api.sesion).toHaveBeenCalledTimes(2);
  });

  it('con sesión entra directo a su ciudad, sin portada ni Brisa', async () => {
    render(<Plataforma api={apiFalsa('activa')} />);
    expect(await screen.findByText('Tu ciudad, Rosa.')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/ciudad');
  });

  it('una ruta privada sin sesión pide entrar y después vuelve a ella', async () => {
    window.history.replaceState(null, '', '/ciudad');
    render(<Plataforma api={apiFalsa()} />);
    expect(await screen.findByText('Tu sesión terminó. Vuelve a entrar para continuar.')).toBeInTheDocument();
    escribir('Tu correo electrónico', 'rosa@ejemplo.co');
    clic('Enviar código');
    await titulo('Revisa tu correo');
    escribir('Código de acceso', '123456');
    clic('Verificar y continuar');
    expect(await screen.findByText('Tu ciudad, Rosa.')).toBeInTheDocument();
  });

  it('recargar en /verificar vuelve a pedir el código', async () => {
    window.history.replaceState(null, '', '/verificar');
    render(<Plataforma api={apiFalsa()} />);
    expect(await screen.findByText('Por seguridad, vuelve a pedir tu código.')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/acceso');
  });
});

describe('Crear cuenta', () => {
  it('Brisa → registro → código → primer día', async () => {
    const api = apiFalsa();
    render(<Plataforma api={api} />);
    await portadaLista();
    clic('Crear cuenta');
    expect(await titulo('Hola, soy Brisa.')).toBeInTheDocument();
    expect(screen.getByText(/inteligencia artificial/)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/bienvenida');
    clic('Continuar');
    await titulo('Empecemos por conocernos');
    llenarRegistro();
    clic('Crear mi cuenta');
    expect(await titulo('Revisa tu correo')).toBeInTheDocument();
    expect(screen.getByText(/r•••@ejemplo\.co/)).toBeInTheDocument();
    expect(api.registrar).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Rosa', ciudad: '05001', fechaNacimiento: '1950-03-02', aceptaDatos: true }));
    escribir('Código de acceso', '123456');
    clic('Verificar y continuar');
    expect(await screen.findByText('Mucho gusto, Rosa.')).toBeInTheDocument();
    expect(screen.queryByText('Hola, soy Brisa.')).toBeNull(); // no hay segundo saludo
  });

  it('volver a Brisa y regresar conserva lo escrito', async () => {
    render(<Plataforma api={apiFalsa()} />);
    await portadaLista();
    clic('Crear cuenta');
    clic('Continuar');
    escribir('¿Cómo te llamas?', 'Rosa');
    clic('Volver');
    await titulo('Hola, soy Brisa.');
    clic('Continuar');
    expect(screen.getByLabelText('¿Cómo te llamas?')).toHaveValue('Rosa');
  });

  it('muestra los errores de cada campo y las casillas empiezan sin marcar', async () => {
    window.history.replaceState(null, '', '/registro');
    render(<Plataforma api={apiFalsa()} />);
    await titulo('Empecemos por conocernos');
    expect(screen.getByLabelText(/términos de uso/)).not.toBeChecked();
    expect(screen.getByLabelText(/Ley 1581/)).not.toBeChecked();
    clic('Crear mi cuenta');
    expect(await screen.findByText('Escribe tu nombre o cómo te gusta que te llamen.')).toBeInTheDocument();
    expect(screen.getByText('Elige tu ciudad de la lista.')).toBeInTheDocument();
    expect(screen.getByText('Necesitamos tu autorización para tratar tus datos.')).toBeInTheDocument();
  });

  it('WhatsApp aparece como «muy pronto» y no se puede elegir', async () => {
    window.history.replaceState(null, '', '/registro');
    render(<Plataforma api={apiFalsa()} />);
    await titulo('Empecemos por conocernos');
    expect(screen.getByRole('radio', { name: /WhatsApp.*muy pronto/ })).toBeDisabled();
  });

  it('desde Brisa, «Ya tengo cuenta» lleva a iniciar sesión', async () => {
    window.history.replaceState(null, '', '/bienvenida');
    render(<Plataforma api={apiFalsa()} />);
    await titulo('Hola, soy Brisa.');
    clic('Ya tengo cuenta');
    expect(await titulo('Qué bueno verte de nuevo')).toBeInTheDocument();
  });
});

describe('Iniciar sesión', () => {
  it('correo → código → su ciudad, sin pasar por Brisa', async () => {
    render(<Plataforma api={apiFalsa()} />);
    await portadaLista();
    clic('Iniciar sesión');
    await titulo('Qué bueno verte de nuevo');
    escribir('Tu correo electrónico', 'rosa@ejemplo.co');
    clic('Enviar código');
    await titulo('Revisa tu correo');
    escribir('Código de acceso', '000000');
    clic('Verificar y continuar');
    expect(await screen.findByText(/no coincide/)).toBeInTheDocument();
    escribir('Código de acceso', '123456');
    clic('Verificar y continuar');
    expect(await screen.findByText('Tu ciudad, Rosa.')).toBeInTheDocument();
  });

  it('«Cambiar correo» vuelve al formulario de acceso', async () => {
    render(<Plataforma api={apiFalsa()} />);
    await portadaLista();
    clic('Iniciar sesión');
    escribir('Tu correo electrónico', 'rosa@ejemplo.co');
    clic('Enviar código');
    await titulo('Revisa tu correo');
    clic('Cambiar correo');
    expect(await titulo('Qué bueno verte de nuevo')).toBeInTheDocument();
  });
});
