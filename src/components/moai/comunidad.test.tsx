import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Avisos, MiComunidad, MisLugares, NuevoPlan, PlanDetalle } from './comunidad';
import { Permisos } from './diario';
import type { Api, Carta, Lugar, Perfil, Plan } from '@/lib/api';

const casa: Lugar = { id: 'l1', nombre: 'Casa', ciudad: '05001', barrio: null, zona: 'Medellín', activo: true };
const perfil: Perfil = { nombre: 'Rosa Prueba', nacimientoPendiente: false, comunidad: 'completed', lugar: casa };
const caminata: Plan = { id: 'p1', titulo: 'Caminata por el parque', descripcion: '', cuando: '2026-10-13T15:00:00.000Z', lugarPublico: 'Parque de los Deseos',
  zona: 'Medellín', franja: 'En tu ciudad', alcance: 'ciudad', tipo: 'caminar', repite: null, diaRepite: null, autor: 'Luis', mio: false, voy: false, lleno: false };
const ok = <T,>(datos: T) => vi.fn(async () => ({ ok: true as const, datos }));
const api = (extra: Partial<Api> = {}) => ({ planes: ok([caminata]), irAPlan: ok([{ ...caminata, voy: true }]), lugares: ok([casa]), cartas: ok([]), cartaVista: ok([]), mapa: ok({ disponible: false }), zona: ok([]), perfilPublico: ok({ frase: '', gustos: [], comparte: '', aprender: '', visible: false }), ...extra }) as unknown as Api;

describe('Mi barrio', () => {
  it('saluda, dice dónde está la persona y muestra los planes cercanos con distancia por franjas', async () => {
    render(<MiComunidad perfil={perfil} api={api()} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(screen.getByRole('heading', { level: 1, name: 'Mi barrio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Estás en/ })).toHaveTextContent('Estás en: Casa · Medellín');
    expect(await screen.findByText(/Hola, Rosa. Esto pasa cerca de ti/)).toBeInTheDocument();
    expect(await screen.findByText('Caminata por el parque')).toBeInTheDocument();
    expect(screen.getByText('Parque de los Deseos · Medellín · En tu ciudad')).toBeInTheDocument();
  });

  it('una sola barra: Brisa, Mi barrio y Mi gente, y lo demás en «Más»', async () => {
    const ir = vi.fn();
    const salir = vi.fn();
    render(<Permisos.Provider value={{ equipo: false, organizaciones: true }}><MiComunidad perfil={perfil} api={api()} ir={ir} onSalir={salir}/></Permisos.Provider>);
    const lugares = screen.getByRole('navigation', { name: 'Lugares' });
    expect(within(lugares).getByRole('button', { name: 'Mi barrio' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(within(lugares).getByRole('button', { name: 'Mi gente' }));
    expect(ir).toHaveBeenCalledWith('/gente');
    fireEvent.click(within(lugares).getByRole('button', { name: 'Más' }));
    expect(screen.getByRole('button', { name: 'Convocar como entidad' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Equipo de MOAI' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(salir).toHaveBeenCalled();
  });

  it('los vecinos son una pestaña de Mi barrio', async () => {
    render(<MiComunidad perfil={perfil} api={api()} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Vecinos' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Vecinos' })).toBeInTheDocument();
    expect(await screen.findByText(/Todavía nadie de tu zona ha mostrado su tarjeta/)).toBeInTheDocument();
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
    expect(await screen.findByText('Aún no hay planes cerca. ¿Y si le cuentas a Brisa qué tienes ganas de hacer?')).toBeInTheDocument();
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
    expect(enviarMensaje).toHaveBeenCalledWith('p1', 'Llego 5 minutos tarde', false);
  });

  it('ante un aviso, quien escribe decide: cambiarlo o enviarlo igual', async () => {
    const enviarMensaje = vi.fn(async (_id: string, _t: string, confirmado?: boolean) => confirmado
      ? { ok: true as const, datos: [{ id: '1', autor: 'Tú', mio: true, texto: 'Mi Nequi es…', creado: '2026-10-12T12:00:00Z' }] }
      : { ok: false as const, error: 'En MOAI no se pide ni se maneja dinero.', status: 409 });
    render(<PlanDetalle id="p1" api={api({ plan: ok({ ...caminata, voy: true }), mensajes: ok([]), enviarMensaje } as Partial<Api>)} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.change(await screen.findByLabelText('Escribe un mensaje'), { target: { value: 'Mi Nequi es…' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('En MOAI no se pide ni se maneja dinero.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar de todos modos' }));
    await vi.waitFor(() => expect(enviarMensaje).toHaveBeenLastCalledWith('p1', 'Mi Nequi es…', true));
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

describe('Mapa de la comunidad', () => {
  // Un tablero mínimo: tu zona en el centro y una vecina al norte, con la luz del plan de Luis.
  const hex = (x: number, y: number, anillo: number) => ({ x, y, anillo, puntos: [[x - 500, y], [x - 250, y - 430], [x + 250, y - 430], [x + 500, y], [x + 250, y + 430], [x - 250, y + 430]] as [number, number][] });
  const mapa = { disponible: true as const, celdas: [hex(0, 0, 0), hex(0, -860, 1)], planes: [{ id: 'p1', x: 0, y: -860 }] };

  it('muestra el mapa por defecto: tu zona, una luz por plan y su burbuja', async () => {
    render(<MiComunidad perfil={perfil} api={api({ mapa: ok(mapa) })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText('Tu zona')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mapa' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Caminata por el parque · .* · Parque de los Deseos · En tu ciudad/ })).toBeInTheDocument();
    expect(screen.getByText('caminata por el parque')).toBeInTheDocument(); // la burbuja: «Luis: caminata por el parque»
  });

  it('al tocar una luz se abre la tarjeta del plan con «Me sumo»', async () => {
    const irAPlan = ok([{ ...caminata, voy: true }]);
    render(<MiComunidad perfil={perfil} api={api({ mapa: ok(mapa), irAPlan })} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: /Caminata por el parque · / }));
    expect(screen.getByRole('heading', { level: 2, name: 'Caminata por el parque' })).toBeInTheDocument();
    expect(screen.getByText('Lugar público: Parque de los Deseos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Me sumo' }));
    expect(await screen.findByText('Vas a ir')).toBeInTheDocument();
  });

  it('se puede pasar a la lista', async () => {
    render(<MiComunidad perfil={perfil} api={api({ mapa: ok(mapa) })} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Planes cerca de ti' })).toBeInTheDocument();
  });

  it('sin barrio no hay mapa: queda la lista y lo explica', async () => {
    render(<MiComunidad perfil={perfil} api={api()} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText(/El mapa de hexágonos llega cuando tu lugar tiene barrio/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mapa' })).toBeNull();
  });
});
