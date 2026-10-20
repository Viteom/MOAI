import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Avisos, MiComunidad, MisLugares, NuevoPlan, PlanDetalle } from './comunidad';
import { Permisos } from './diario';
import type { Api, Lugar, Perfil, Plan } from '@/lib/api';

const casa: Lugar = { id: 'l1', nombre: 'Casa', ciudad: '05001', barrio: null, zona: 'Medellín', activo: true };
const perfil: Perfil = { nombre: 'Rosa Prueba', nacimientoPendiente: false, comunidad: 'completed', lugar: casa };
const caminata: Plan = { id: 'p1', titulo: 'Caminata por el parque', descripcion: '', cuando: '2026-10-13T15:00:00.000Z', lugarPublico: 'Parque de los Deseos',
  zona: 'Medellín', franja: 'En tu ciudad', alcance: 'ciudad', tipo: 'caminar', repite: null, diaRepite: null, autor: 'Luis', mio: false, voy: false, lleno: false, costo: 'gratis' };
const ok = <T,>(datos: T) => vi.fn(async () => ({ ok: true as const, datos }));
const api = (extra: Partial<Api> = {}) => ({ planes: ok([caminata]), irAPlan: ok([{ ...caminata, voy: true }]), lugares: ok([casa]), cartas: ok([]), cartaVista: ok([]), mapa: ok({ disponible: false }), zona: ok([]), perfilPublico: ok({ frase: '', gustos: [], comparte: '', aprender: '', visible: false }), ...extra }) as unknown as Api;

// Un tablero mínimo: tu zona en el centro y una celda vecina al norte con el plan de Luis.
const hex = (x: number, y: number, anillo: number, barrio?: string) => ({ x, y, anillo, barrio, puntos: [[x - 500, y], [x - 250, y - 430], [x + 250, y - 430], [x + 500, y], [x + 250, y + 430], [x - 250, y + 430]] as [number, number][] });
// Un día que siempre está por venir: el formulario valida igual que el servidor.
const pasadoManana = () => { const d = new Date(Date.now() + 2 * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const mapa = { disponible: true as const, celdas: [hex(0, 0, 0, 'Laureles'), hex(0, -860, 1, 'Lorena')], planes: [{ id: 'p1', x: 0, y: -860 }] };

describe('Mi barrio', () => {
  it('saluda, dice dónde está la persona y muestra los planes cercanos con distancia por franjas', async () => {
    render(<MiComunidad perfil={perfil} api={api()} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(screen.getByRole('heading', { level: 1, name: 'Mi barrio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Estás en/ })).toHaveTextContent('Estás en: Casa · Medellín');
    expect(await screen.findByText('Caminata por el parque')).toBeInTheDocument();
    expect(screen.getByText('Parque de los Deseos')).toBeInTheDocument();
    expect(screen.getByText('En tu ciudad · Lo propone Luis')).toBeInTheDocument();
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

  it('sin planes invita a contar qué vas a hacer, sin inventar nada', async () => {
    const ir = vi.fn();
    render(<MiComunidad perfil={perfil} api={api({ planes: ok([]) })} ir={ir} onSalir={vi.fn()}/>);
    expect(await screen.findByText('Aún no hay planes cerca. ¿Y si cuentas qué vas a hacer?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Contar qué voy a hacer' }));
    expect(ir).toHaveBeenCalledWith('/planes/nuevo');
  });

  it('sin lugar pide elegir uno', () => {
    const ir = vi.fn();
    render(<MiComunidad perfil={{ ...perfil, lugar: null }} api={api()} ir={ir} onSalir={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Elegir mi lugar' }));
    expect(ir).toHaveBeenCalledWith('/lugares');
  });
});

describe('Mi barrio sobre el escenario ilustrado (19 de octubre)', () => {
  it('cada plan es una luz, con una nota de que el escenario es ilustrado y como mucho dos burbujas', async () => {
    render(<MiComunidad perfil={perfil} api={api({ mapa: ok(mapa) })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByRole('button', { name: /^Caminata por el parque\. .*Lo propone Luis$/ })).toBeInTheDocument();
    expect(screen.getByText('Escenario ilustrado · no es el lugar exacto')).toBeInTheDocument();
    // Ni barrios ni calles inventadas sobre la ilustración; tampoco personas.
    expect(screen.queryByText('Lorena')).toBeNull();
    expect(document.querySelectorAll('.burbuja-invitacion').length).toBeLessThanOrEqual(2);
    expect(screen.getByRole('button', { name: 'Contar qué voy a hacer' })).toBeInTheDocument();
  });

  it('tocar una luz abre su tarjeta en lugar del botón, y desde ahí uno se suma', async () => {
    const a = api({ mapa: ok(mapa) });
    render(<MiComunidad perfil={perfil} api={a} ir={vi.fn()} onSalir={vi.fn()}/>);
    const luz = await screen.findByRole('button', { name: /^Caminata por el parque\. / });
    fireEvent.click(luz);
    expect(luz).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Caminata por el parque' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Contar qué voy a hacer' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Me sumo' }));
    expect(await screen.findByText('Vas a ir')).toBeInTheDocument();
    expect(a.irAPlan).toHaveBeenCalledWith('p1');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(luz).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Contar qué voy a hacer' })).toBeInTheDocument();
  });

  it('Mapa y Lista siempre a mano', async () => {
    const ir = vi.fn();
    render(<MiComunidad perfil={perfil} api={api({ mapa: ok(mapa) })} ir={ir} onSalir={vi.fn()}/>);
    await screen.findByRole('button', { name: /^Caminata por el parque\. / });
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Planes cerca de ti' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Caminata por el parque/ }));
    expect(ir).toHaveBeenCalledWith('/planes/p1');
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }));
    expect(screen.getByText('Escenario ilustrado · no es el lugar exacto')).toBeInTheDocument();
  });

  it('la hoja recibe foco y Escape lo devuelve a la luz que la abrió', async () => {
    render(<MiComunidad perfil={perfil} api={api({ mapa: ok(mapa) })} ir={vi.fn()} onSalir={vi.fn()}/>);
    const luz = await screen.findByRole('button', { name: /^Caminata por el parque\. / });
    luz.focus();
    fireEvent.click(luz);
    expect(screen.getByRole('heading', { name: caminata.titulo })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: caminata.titulo })).toBeNull();
    expect(luz).toHaveFocus();
  });

  it('un error al sumarse se puede leer en la hoja del mapa sin perder las acciones', async () => {
    const irAPlan = vi.fn(async () => ({ ok: false as const, error: 'El plan ya está completo.', status: 409 }));
    render(<MiComunidad perfil={perfil} api={api({ mapa: ok(mapa), irAPlan })} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: /^Caminata por el parque\. / }));
    fireEvent.click(screen.getByRole('button', { name: 'Me sumo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El plan ya está completo.');
    expect(screen.getByRole('region', { name: caminata.titulo })).toContainElement(screen.getByRole('alert'));
    expect(screen.getByRole('button', { name: 'Ver plan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Contar qué voy a hacer' })).toBeNull();
  });

  it('sin barrio no hay escenario: quedan los planes en lista y lo explica', async () => {
    render(<MiComunidad perfil={perfil} api={api()} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText(/El mapa llega cuando tu lugar tiene barrio/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mapa' })).toBeNull();
    expect(screen.getByText('Caminata por el parque')).toBeInTheDocument();
  });
});

describe('Proponer un plan', () => {
  it('en Medellín se elige el barrio y por defecto llega muy cerca', () => {
    render(<NuevoPlan perfil={perfil} api={api()} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(screen.getByLabelText('Barrio del lugar')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Muy cerca/ })).toBeChecked();
  });

  it('sin barrios en la ciudad llega a toda la ciudad; se revisa antes de publicar y lleva el costo', async () => {
    const crearPlan = ok([caminata]);
    const ir = vi.fn();
    const bogota = { ...perfil, lugar: { ...casa, ciudad: '11001', zona: 'Bogotá, D.C.' } };
    render(<NuevoPlan perfil={bogota} api={api({ crearPlan })} ir={ir} onSalir={vi.fn()}/>);
    expect(screen.getByRole('radio', { name: /Mi ciudad/ })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /Muy cerca/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Caminar' }));
    expect(screen.getByLabelText('Tu invitación')).toHaveValue('Voy a caminar, ¿alguien viene?');
    fireEvent.change(screen.getByLabelText('Repetición'), { target: { value: 'semanal' } });
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: pasadoManana() } });
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Lugar público'), { target: { value: 'Parque de los Deseos' } });
    expect(screen.getByRole('radio', { name: 'Gratis' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Cada quien paga lo suyo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar mi plan' }));
    expect(screen.getByText('Cada quien paga lo suyo')).toBeInTheDocument();
    expect(crearPlan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    await vi.waitFor(() => expect(ir).toHaveBeenCalledWith('/comunidad'));
    expect(crearPlan).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Voy a caminar, ¿alguien viene?', tipo: 'caminar', repite: 'semanal', ciudad: '11001', alcance: 'ciudad', cupo: null, costo: 'cada_quien', moai: null }));
  });

  it('desde un Moai, el encuentro es solo para ese Moai y vuelve a él', async () => {
    window.history.pushState({}, '', '/planes/nuevo?moai=m1');
    const crearPlan = ok([caminata]);
    const ir = vi.fn();
    const gente = ok({ encuentros: [], conocidos: [], invitaciones: [], pausa: false, moais: [{ id: 'm1', nombre: 'Tinto de los jueves', frase: '', miembros: [], esperando: [] }] });
    render(<NuevoPlan perfil={perfil} api={api({ crearPlan, gente })} ir={ir} onSalir={vi.fn()}/>);
    expect(await screen.findByText('Un encuentro solo para tu Moai «Tinto de los jueves».')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Un tinto' }));
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: pasadoManana() } });
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Lugar público'), { target: { value: 'Café del parque' } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar mi plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    await vi.waitFor(() => expect(ir).toHaveBeenCalledWith('/moais/m1'));
    expect(crearPlan).toHaveBeenCalledWith(expect.objectContaining({ moai: 'm1', alcance: 'ciudad', organizacion: null }));
    window.history.pushState({}, '', '/');
  });

  it('si el Moai no carga, no hay formulario: el encuentro nunca se vuelve público', async () => {
    window.history.pushState({}, '', '/planes/nuevo?moai=m1');
    const crearPlan = ok([caminata]);
    const gente = vi.fn(async () => ({ ok: false as const, error: 'Sin conexión.', status: 0 }));
    render(<NuevoPlan perfil={perfil} api={api({ crearPlan, gente } as Partial<Api>)} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText('Sin conexión.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revisar mi plan' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
    expect(crearPlan).not.toHaveBeenCalled();
    window.history.pushState({}, '', '/');
  });

  it('en Medellín sin barrio, el error de «Más opciones» se ve antes de publicar', () => {
    const crearPlan = ok([caminata]);
    render(<NuevoPlan perfil={perfil} api={api({ crearPlan })} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Caminar' }));
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: pasadoManana() } });
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Lugar público'), { target: { value: 'Parque de los Deseos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar mi plan' }));
    expect(screen.getByText('Falta algo en «Más opciones». Lo abrimos para que lo veas.')).toBeInTheDocument();
    expect(screen.getByText('Elige el barrio del lugar para que llegue a quienes viven cerca.')).toBeInTheDocument();
    expect(document.querySelector('details.mas-opciones')).toHaveAttribute('open');
    expect(screen.queryByRole('button', { name: 'Publicar' })).toBeNull();
    expect(crearPlan).not.toHaveBeenCalled();
  });
});

describe('Mis lugares', () => {
  it('lista los lugares y pide confirmar antes de borrar', async () => {
    const borrarLugar = ok([]);
    render(<MisLugares api={api({ borrarLugar })} ir={vi.fn()} onSalir={vi.fn()} onCambio={vi.fn()}/>);
    expect(await screen.findByText('Lugar activo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Borrar Casa' }));
    expect(borrarLugar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, borrar' }));
    await vi.waitFor(() => expect(borrarLugar).toHaveBeenCalledWith('l1'));
  });
});

describe('Detalle del plan', () => {
  it('solo aparece la conversación para quien va, y envía mensajes', async () => {
    const enviarMensaje = ok([{ id: '1', autor: 'Tú', mio: true, texto: 'Llego 5 minutos tarde', creado: '2026-10-12T12:00:00Z' }]);
    render(<PlanDetalle id="p1" api={api({ plan: ok({ ...caminata, voy: true }), mensajes: ok([]), enviarMensaje })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText(/Solo la ven quienes van al plan/)).toBeInTheDocument();
    expect(screen.getByText('Gratis')).toBeInTheDocument();
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
    expect(await screen.findByText(/Al sumarte podrás coordinar el encuentro aquí/)).toBeInTheDocument();
    expect(mensajes).not.toHaveBeenCalled();
  });

  it('un plan ajeno se puede reportar, en privado, y bloquear a quien lo propuso', async () => {
    const reportarPlan = ok({ ok: true as const });
    render(<PlanDetalle id="p1" api={api({ plan: ok(caminata), mensajes: ok([]), reportarPlan } as Partial<Api>)} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Reportar este plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));
    expect(screen.getByText('Elige qué pasó.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Me sentí en peligro' }));
    expect(screen.getByText(/línea de emergencias/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Bloquear también a Luis/));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));
    expect(await screen.findByText(/Luis no sabrá que fuiste tú/)).toBeInTheDocument();
    expect(reportarPlan).toHaveBeenCalledWith('p1', { motivo: 'peligro', detalle: '', bloquear: true });
  });

  it('mis propios planes no tienen «Reportar»', async () => {
    render(<PlanDetalle id="p1" api={api({ plan: ok({ ...caminata, mio: true, asistentes: [] }), mensajes: ok([]) })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByRole('button', { name: 'Cancelar plan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reportar este plan' })).toBeNull();
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
