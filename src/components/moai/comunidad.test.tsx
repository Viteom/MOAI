import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MiComunidad, MisLugares, NuevoPlan } from './comunidad';
import type { Api, Lugar, Perfil, Plan } from '@/lib/api';

const casa: Lugar = { id: 'l1', nombre: 'Casa', ciudad: '05001', barrio: null, zona: 'Medellín', activo: true };
const perfil: Perfil = { nombre: 'Rosa Prueba', nacimientoPendiente: false, comunidad: 'completed', lugar: casa };
const caminata: Plan = { id: 'p1', titulo: 'Caminata por el parque', descripcion: '', cuando: '2026-10-13T15:00:00.000Z', lugarPublico: 'Parque de los Deseos',
  zona: 'Medellín', franja: 'En tu ciudad', alcance: 'ciudad', autor: 'Luis', mio: false, voy: false, lleno: false };
const ok = <T,>(datos: T) => vi.fn(async () => ({ ok: true as const, datos }));
const api = (extra: Partial<Api> = {}) => ({ planes: ok([caminata]), irAPlan: ok([{ ...caminata, voy: true }]), lugares: ok([casa]), ...extra }) as unknown as Api;

describe('Mi comunidad', () => {
  it('saluda, dice dónde está la persona y muestra los planes cercanos con distancia por franjas', async () => {
    render(<MiComunidad perfil={perfil} api={api()} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(screen.getByRole('heading', { level: 1, name: 'Hola, Rosa. Este es tu espacio.' })).toBeInTheDocument();
    expect(screen.getByText(/Estás en/)).toHaveTextContent('Estás en Casa · Medellín');
    expect(await screen.findByText('Caminata por el parque')).toBeInTheDocument();
    expect(screen.getByText('Parque de los Deseos · Medellín · En tu ciudad')).toBeInTheDocument();
    expect(screen.getByText(/inteligencia artificial/)).toBeInTheDocument();
  });

  it('«Me apunto» se refleja con lo que responde el servidor', async () => {
    const a = api();
    render(<MiComunidad perfil={perfil} api={a} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Me apunto' }));
    expect(await screen.findByText('Vas a ir')).toBeInTheDocument();
    expect(a.irAPlan).toHaveBeenCalledWith('p1');
  });

  it('sin planes invita a proponer el primero, sin inventar nada', async () => {
    render(<MiComunidad perfil={perfil} api={api({ planes: ok([]) })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText('Aún no hay planes cerca. ¿Y si propones el primero?')).toBeInTheDocument();
  });

  it('sin lugar pide elegir uno', () => {
    const ir = vi.fn();
    render(<MiComunidad perfil={{ ...perfil, lugar: null }} api={api()} ir={ir} onSalir={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Elegir mi lugar' }));
    expect(ir).toHaveBeenCalledWith('/lugares');
  });
});

describe('Proponer un plan', () => {
  it('sin barrios en la ciudad, la invitación llega a toda la ciudad', async () => {
    const crearPlan = ok([caminata]);
    const ir = vi.fn();
    render(<NuevoPlan perfil={perfil} api={api({ crearPlan })} ir={ir} onSalir={vi.fn()}/>);
    expect(screen.getByRole('radio', { name: /Mi ciudad/ })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /Muy cerca/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('¿Qué quieres hacer?'), { target: { value: 'Caminata por el parque' } });
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: '2026-10-13' } });
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('¿Dónde? Un lugar público'), { target: { value: 'Parque de los Deseos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar plan' }));
    await vi.waitFor(() => expect(ir).toHaveBeenCalledWith('/comunidad'));
    expect(crearPlan).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Caminata por el parque', ciudad: '05001', alcance: 'ciudad', cupo: null }));
  });
});

describe('Mis lugares', () => {
  it('lista los lugares y pide confirmar antes de borrar', async () => {
    const borrarLugar = ok([]);
    render(<MisLugares api={api({ borrarLugar })} ir={vi.fn()} onSalir={vi.fn()} onCambio={vi.fn()}/>);
    expect(await screen.findByText('Estás aquí')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(borrarLugar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, borrar' }));
    await vi.waitFor(() => expect(borrarLugar).toHaveBeenCalledWith('l1'));
  });
});
