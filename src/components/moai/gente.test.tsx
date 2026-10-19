import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MiGente } from './lazos';
import { MoaiDetalle } from './gente';
import type { Api, Gente, Lazos, Perfil } from '@/lib/api';

const perfil: Perfil = { nombre: 'Rosa Pérez', nacimientoPendiente: false, comunidad: 'completed', lugar: null };
const ok = <T,>(datos: T) => vi.fn(async () => ({ ok: true as const, datos }));
const sinNada: Gente = { encuentros: [], conocidos: [], moais: [], invitaciones: [], pausa: false };
const red: Lazos = {
  grupos: [{ id: 'rama', tipo: 'rama', nombre: 'Personas con las que me vi' }],
  personas: [{ id: 'rama:r1', grupo: 'rama', nombre: 'Luis', detalle: '', estado: 'vivo', puerta: false, accion: { tipo: 'saludo', ref: 'r1' } }],
};
const api = (extra: Partial<Api> = {}) => ({ lazos: ok(red), gente: ok({ ...sinNada, conocidos: [{ ref: 'r1', nombre: 'Luis', moaiComun: false, propuesta: false }] }), ...extra }) as unknown as Api;

describe('Mi gente (con Mis lazos)', () => {
  it('lo que espera respuesta llega de a una cosa', async () => {
    const pendiente: Gente = { ...sinNada,
      invitaciones: [{ id: 'i1', tipo: 'nuevo', de: 'Marta', nombre: 'Los del parque' }],
      encuentros: [{ planId: 'p1', titulo: 'Caminata', ocurrencia: '2026-10-13T15:00:00.000Z', personas: [{ ref: 'r1', nombre: 'Luis' }] }] };
    const responderInvitacion = ok({ ...pendiente, invitaciones: [] });
    render(<MiGente perfil={perfil} api={api({ gente: ok(pendiente), responderInvitacion })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText(/te propone formar un Moai/)).toBeInTheDocument();
    expect(screen.queryByText('¿Te viste con…?')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, me sumo' }));
    expect(await screen.findByText('¿Te viste con…?')).toBeInTheDocument();
    expect(responderInvitacion).toHaveBeenCalledWith('i1', true);
  });

  it('sin red todavía, invita a agregar a la familia, aunque no use MOAI', async () => {
    const agregarInterno = ok([]);
    render(<MiGente perfil={perfil} api={api({ lazos: ok({ grupos: [], personas: [] }), gente: ok(sinNada), agregarInterno })} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Agregar a mi familia' }));
    fireEvent.change(screen.getByLabelText('¿Quién es?'), { target: { value: 'Laura' } });
    expect(screen.getByRole('checkbox', { name: /Es de mi familia/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await vi.waitFor(() => expect(agregarInterno).toHaveBeenCalledWith({ nombre: 'Laura', relacion: '', familia: true }));
  });

  it('con alguien con quien te viste puedes formar un Moai desde su panel', async () => {
    const proponerMoai = ok(sinNada);
    render(<MiGente perfil={perfil} api={api({ proponerMoai })} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: /^Luis/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Formar un Moai' }));
    fireEvent.change(screen.getByLabelText('¿Cómo se llamaría su Moai?'), { target: { value: 'Los del parque' } });
    fireEvent.click(screen.getByRole('button', { name: 'Proponer' }));
    await vi.waitFor(() => expect(proponerMoai).toHaveBeenCalledWith('r1', 'Los del parque'));
    expect(await screen.findByRole('button', { name: 'Reportar o bloquear' })).toBeInTheDocument();
  });
});

describe('Un Moai por dentro (19 de octubre)', () => {
  const moai = { id: 'm1', nombre: 'Tinto de los jueves', frase: 'Nuestro café de siempre', miembros: [{ ref: 'yo', nombre: 'Rosa', yo: true }, { ref: 'r1', nombre: 'Luis', yo: false }], esperando: [] };
  const conMoai = (extra: Partial<Api> = {}) => api({ gente: ok({ ...sinNada, moais: [moai] }), mensajesMoai: ok([]), ...extra });

  it('muestra quiénes están y propone un encuentro solo para el Moai', async () => {
    const ir = vi.fn();
    render(<MoaiDetalle id="m1" api={conMoai()} ir={ir} onSalir={vi.fn()}/>);
    expect(await screen.findByRole('heading', { level: 1, name: 'Tinto de los jueves' })).toBeInTheDocument();
    expect(screen.getByText('Nuestro café de siempre')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Luis' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Proponer un encuentro' }));
    expect(ir).toHaveBeenCalledWith('/planes/nuevo?moai=m1');
  });

  it('el nombre y la frase se cambian juntos, y salir del Moai pide confirmar', async () => {
    const renombrarMoai = ok({ ...sinNada, moais: [{ ...moai, frase: 'Los jueves a las 9' }] });
    const salirDeMoai = ok({ ...sinNada });
    render(<MoaiDetalle id="m1" api={conMoai({ renombrarMoai, salirDeMoai } as Partial<Api>)} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar el nombre o la frase' }));
    fireEvent.change(screen.getByLabelText(/Una frase/), { target: { value: 'Los jueves a las 9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Los jueves a las 9')).toBeInTheDocument();
    expect(renombrarMoai).toHaveBeenCalledWith('m1', 'Tinto de los jueves', 'Los jueves a las 9');
    fireEvent.click(screen.getByRole('button', { name: 'Salir del Moai' }));
    expect(salirDeMoai).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sí, salir' })).toBeInTheDocument();
  });
});
