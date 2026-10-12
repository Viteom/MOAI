import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Plataforma } from './portada';
import { enmascarar, normalizarDestino, validarRegistro } from '@/lib/registro';
import type { Api } from '@/lib/api';

// API de mentira con las mismas reglas de validación que el servidor; el código correcto es 123456.
function apiFalsa(conSesion = false): Api {
  const envio = (canal: 'correo' | 'whatsapp', destino: string, pais?: string) =>
    ({ ok: true as const, datos: { canal, destinoVisible: enmascarar(canal, normalizarDestino(canal, destino, pais) ?? destino) } });
  return {
    registrar: vi.fn(async entrada => {
      const r = validarRegistro(entrada, new Date());
      return r.ok ? envio(entrada.canal, entrada.destino, entrada.pais) : { ok: false as const, error: '', errores: r.errores };
    }),
    pedirAcceso: vi.fn(async c => envio(c.canal, c.destino, c.pais)),
    verificar: vi.fn(async c => c.codigo === '123456'
      ? { ok: true as const, datos: { nombre: 'Rosa', ciudad: '05001' } }
      : { ok: false as const, error: 'Ese código no coincide o ya venció. Revísalo o pide uno nuevo.' }),
    sesion: vi.fn(async () => conSesion ? { ok: true as const, datos: { nombre: 'Rosa', ciudad: '05001' } } : { ok: false as const, error: 'Sin sesión.' }),
    salir: vi.fn(async () => ({ ok: true as const, datos: { ok: true as const } })),
  };
}

const escribir = (etiqueta: string | RegExp, valor: string) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

function llenarRegistro() {
  escribir('Tu nombre', 'Rosa');
  escribir('Tu correo', 'rosa@ejemplo.co');
  escribir('Tu ciudad', 'medel');
  fireEvent.click(screen.getByRole('option', { name: /Medellín/ }));
  escribir('Día', '02');
  escribir('Mes', '03');
  escribir('Año', '1950');
  fireEvent.click(screen.getByLabelText(/términos de uso/));
  fireEvent.click(screen.getByLabelText(/Ley 1581/));
}

describe('Portada', () => {
  it('muestra MOAI y ofrece crear cuenta o iniciar sesión', () => {
    render(<Plataforma api={apiFalsa()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'MOAI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('con una sesión abierta entra directo a la ciudad', async () => {
    render(<Plataforma api={apiFalsa(true)} />);
    expect(await screen.findByText('Tu ciudad, Rosa.')).toBeInTheDocument();
  });
});

describe('Crear cuenta', () => {
  it('pide los datos, envía el código y al verificarlo empieza el primer día', async () => {
    const api = apiFalsa();
    render(<Plataforma api={api} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    llenarRegistro();
    fireEvent.click(screen.getByRole('button', { name: 'Enviarme el código' }));
    expect(await screen.findByText(/r•••@ejemplo\.co/)).toBeInTheDocument();
    expect(api.registrar).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Rosa', ciudad: '05001', fechaNacimiento: '1950-03-02', aceptaDatos: true }));

    escribir('Código', '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Mucho gusto, Rosa.')).toBeInTheDocument();
  });

  it('muestra los errores de cada campo', async () => {
    render(<Plataforma api={apiFalsa()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviarme el código' }));
    expect(await screen.findByText('Escribe tu nombre o cómo te gusta que te llamen.')).toBeInTheDocument();
    expect(screen.getByText('Elige tu ciudad de la lista.')).toBeInTheDocument();
    expect(screen.getByText('Necesitamos tu autorización para tratar tus datos.')).toBeInTheDocument();
  });

  it('las casillas de consentimiento empiezan sin marcar', () => {
    render(<Plataforma api={apiFalsa()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByLabelText(/términos de uso/)).not.toBeChecked();
    expect(screen.getByLabelText(/Ley 1581/)).not.toBeChecked();
  });

  it('con WhatsApp se elige el país, con Colombia primero', () => {
    render(<Plataforma api={apiFalsa()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    fireEvent.click(screen.getByRole('radio', { name: 'WhatsApp' }));
    const pais = screen.getByLabelText('País') as HTMLSelectElement;
    expect(pais.value).toBe('CO');
    expect(pais.options[0].textContent).toBe('Colombia (+57)');
  });
});

describe('Iniciar sesión', () => {
  it('pide un código y con el correcto entra a la ciudad', async () => {
    render(<Plataforma api={apiFalsa()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    fireEvent.click(screen.getByRole('radio', { name: 'WhatsApp' }));
    escribir('Tu número de WhatsApp', '300 123 4567');
    fireEvent.click(screen.getByRole('button', { name: 'Enviarme el código' }));
    expect(await screen.findByText(/\+57 •••• 4567/)).toBeInTheDocument();

    escribir('Código', '000000');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/no coincide/)).toBeInTheDocument();

    escribir('Código', '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Tu ciudad, Rosa.')).toBeInTheDocument();
  });
});
