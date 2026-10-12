import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Avisos, MiComunidad, MisLugares, NuevoPlan, PlanDetalle } from './comunidad';
import type { Api, Carta, Lugar, Perfil, Plan } from '@/lib/api';

const casa: Lugar = { id: 'l1', nombre: 'Casa', ciudad: '05001', barrio: null, zona: 'Medellín', activo: true };
const perfil: Perfil = { nombre: 'Rosa Prueba', nacimientoPendiente: false, comunidad: 'completed', lugar: casa };
const caminata: Plan = { id: 'p1', titulo: 'Caminata por el parque', descripcion: '', cuando: '2026-10-13T15:00:00.000Z', lugarPublico: 'Parque de los Deseos',
  zona: 'Medellín', franja: 'En tu ciudad', alcance: 'ciudad', tipo: 'caminar', repite: null, diaRepite: null, autor: 'Luis', mio: false, voy: false, lleno: false };
const ok = <T,>(datos: T) => vi.fn(async () => ({ ok: true as const, datos }));
const api = (extra: Partial<Api> = {}) => ({ planes: ok([caminata]), irAPlan: ok([{ ...caminata, voy: true }]), lugares: ok([casa]), cartas: ok([]), cartaVista: ok([]), ...extra }) as unknown as Api;

describe('Mi comunidad', () => {
  it('saluda, dice dónde está la persona y muestra los planes cercanos con distancia por franjas', async () => {
    render(<MiComunidad perfil={perfil} api={api()} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(screen.getByRole('heading', { level: 1, name: 'Hola, Rosa. Este es tu espacio.' })).toBeInTheDocument();
    expect(screen.getByText(/Estás en/)).toHaveTextContent('Estás en Casa · Medellín');
    expect(await screen.findByText('Caminata por el parque')).toBeInTheDocument();
    expect(screen.getByText('Parque de los Deseos · Medellín · En tu ciudad')).toBeInTheDocument();
    expect(screen.getByText(/inteligencia artificial/)).toBeInTheDocument();
  });

  it('«Me sumo» se refleja con lo que responde el servidor', async () => {
    const a = api();
    render(<MiComunidad perfil={perfil} api={a} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Me sumo' }));
    expect(await screen.findByText('Vas a ir')).toBeInTheDocument();
    expect(a.irAPlan).toHaveBeenCalledWith('p1');
  });

  it('sin planes invita a proponer el primero, sin inventar nada', async () => {
    render(<MiComunidad perfil={perfil} api={api({ planes: ok([]) })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText('Aún no hay planes cerca. ¿Y si cuentas qué vas a hacer esta semana?')).toBeInTheDocument();
  });

  it('sin lugar pide elegir uno', () => {
    const ir = vi.fn();
    render(<MiComunidad perfil={{ ...perfil, lugar: null }} api={api()} ir={ir} onSalir={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Elegir mi lugar' }));
    expect(ir).toHaveBeenCalledWith('/lugares');
  });
});

describe('Proponer un plan', () => {
  it('en Medellín se elige el barrio y por defecto llega muy cerca', () => {
    render(<NuevoPlan perfil={perfil} api={api()} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(screen.getByLabelText('Barrio del lugar')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Muy cerca/ })).toBeChecked();
  });

  it('sin barrios en la ciudad, la invitación llega a toda la ciudad', async () => {
    const crearPlan = ok([caminata]);
    const ir = vi.fn();
    const bogota = { ...perfil, lugar: { ...casa, ciudad: '11001', zona: 'Bogotá, D.C.' } };
    render(<NuevoPlan perfil={bogota} api={api({ crearPlan })} ir={ir} onSalir={vi.fn()}/>);
    expect(screen.getByRole('radio', { name: /Mi ciudad/ })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /Muy cerca/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Caminar' }));
    expect(screen.getByLabelText('¿Qué vas a hacer?')).toHaveValue('Voy a caminar, ¿alguien viene?');
    fireEvent.click(screen.getByLabelText(/Repetir cada semana/));
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: '2026-10-13' } });
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('¿Dónde? Un lugar público'), { target: { value: 'Parque de los Deseos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    await vi.waitFor(() => expect(ir).toHaveBeenCalledWith('/comunidad'));
    expect(crearPlan).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Voy a caminar, ¿alguien viene?', tipo: 'caminar', repite: 'semanal', ciudad: '11001', alcance: 'ciudad', cupo: null }));
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

describe('Brisa en Mi comunidad', () => {
  it('cuenta sin culpas que fuiste por tu cuenta y ofrece repetirlo cada semana', async () => {
    const repetirPlan = ok([]);
    const cartaVista = ok([]);
    const cartas = ok([{ clave: 'solo:p1', tipo: 'solo', planId: 'p1', repetir: true, texto: 'Esta vez fuiste por tu cuenta a «Voy a caminar». ¿Lo repetimos cada domingo?' }] as Carta[]);
    render(<MiComunidad perfil={perfil} api={api({ cartas, repetirPlan, cartaVista })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText(/Esta vez fuiste por tu cuenta/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cada semana' }));
    await vi.waitFor(() => expect(repetirPlan).toHaveBeenCalledWith('p1'));
    await vi.waitFor(() => expect(cartaVista).toHaveBeenCalledWith('solo:p1'));
  });

  it('una recomendación siempre dice por qué la ves', async () => {
    const cartas = ok([{ clave: 'sug:p1', tipo: 'sugerencia', planId: 'p1', plan: caminata, texto: 'Luis invita los domingos a las 8:00 a. m. en el Parque de Laureles: «Voy a caminar». ¿Te sumas?', motivo: 'Porque me pediste que te contara de planes de caminar.' }] as Carta[]);
    render(<MiComunidad perfil={perfil} api={api({ cartas })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText(/Luis invita los domingos/)).toBeInTheDocument();
    expect(screen.queryByText(/Porque me pediste/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '¿Por qué veo esto?' }));
    expect(screen.getByText('Porque me pediste que te contara de planes de caminar.')).toBeInTheDocument();
  });
});

describe('Conversación del plan', () => {
  it('solo aparece para quien va, y envía mensajes', async () => {
    const enviarMensaje = ok([{ id: '1', autor: 'Tú', mio: true, texto: 'Llego 5 minutos tarde', creado: '2026-10-12T12:00:00Z' }]);
    render(<PlanDetalle id="p1" api={api({ plan: ok({ ...caminata, voy: true }), mensajes: ok([]), enviarMensaje })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText(/Solo la ven quienes van al plan/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Escribe un mensaje'), { target: { value: 'Llego 5 minutos tarde' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Llego 5 minutos tarde')).toBeInTheDocument();
    expect(enviarMensaje).toHaveBeenCalledWith('p1', 'Llego 5 minutos tarde');
  });

  it('quien no se ha sumado no ve la conversación', async () => {
    const mensajes = ok([]);
    render(<PlanDetalle id="p1" api={api({ plan: ok(caminata), mensajes })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText(/Cuando te sumes, podrás hablar con quienes van/)).toBeInTheDocument();
    expect(mensajes).not.toHaveBeenCalled();
  });
});

describe('Avisos', () => {
  it('todo viene apagado y los gustos solo aparecen al activar las recomendaciones', async () => {
    const guardarPreferencias = vi.fn(async (p: unknown) => ({ ok: true as const, datos: p }));
    render(<Avisos api={api({ preferencias: ok({ sugerencias: false, gustos: [], resumenSemanal: false }), guardarPreferencias } as Partial<Api>)} ir={vi.fn()} onSalir={vi.fn()}/>);
    const recomendaciones = await screen.findByLabelText(/Que Brisa me cuente de planes/);
    expect(recomendaciones).not.toBeChecked();
    expect(screen.getByLabelText(/Un correo a la semana/)).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Caminar' })).toBeNull();
    fireEvent.click(recomendaciones);
    fireEvent.click(await screen.findByRole('button', { name: 'Caminar' }));
    await vi.waitFor(() => expect(guardarPreferencias).toHaveBeenLastCalledWith({ sugerencias: true, gustos: ['caminar'], resumenSemanal: false }));
  });
});
