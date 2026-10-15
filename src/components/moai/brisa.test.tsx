import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { entenderDia, entenderHora, entenderPlan, InicioBrisa } from './brisa';
import type { Api, Perfil } from '@/lib/api';

const casa = { id: 'l1', nombre: 'Casa', ciudad: '05001', barrio: '1108', zona: 'Laureles, Medellín', activo: true };
const perfil: Perfil = { nombre: 'Rosa Pérez', nacimientoPendiente: false, comunidad: 'completed', lugar: casa };
const ok = <T,>(datos: T) => vi.fn(async () => ({ ok: true as const, datos }));
const api = (extra: Partial<Api> = {}) => ({ cartas: ok([]), cartaVista: ok([]), planes: ok([]), cuidado: ok({ letras: null, guardado: false }), crearPlan: ok([]), responderCuidado: ok({ letras: ['A'], guardado: true }), estado: ok({ invierno: false, puertaAbierta: false, contadoA: [] }), invierno: ok({ invierno: true, puertaAbierta: false, contadoA: [] }), interno: ok([{ id: 'p1', nombre: 'Laura', relacion: '', pendiente: false }]), gente: ok({ encuentros: [], conocidos: [], moais: [], invitaciones: [], pausa: false }), perfilPublico: ok({ frase: '', gustos: [], comparte: '', aprender: '', visible: false }), guardarPerfilPublico: ok({ frase: '', gustos: [], comparte: '', aprender: '', visible: true }), ...extra }) as unknown as Api;
const elegir = (texto: string) => fireEvent.click(screen.getByRole('button', { name: texto }));
// Las opciones llegan cuando Brisa termina de hablar: se esperan.
const elegirCuandoAparezca = async (texto: string) => fireEvent.click(await screen.findByRole('button', { name: texto }));

describe('Brisa entiende', () => {
  it('días, horas y planes dichos con palabras', () => {
    const miercoles = new Date(2026, 9, 14, 10);
    expect(entenderDia('mañana', miercoles)?.getDate()).toBe(15);
    expect(entenderDia('el sábado', miercoles)?.getDate()).toBe(17);
    expect(entenderDia('el miércoles', miercoles)?.getDate()).toBe(21); // el próximo, no hoy
    expect(entenderDia('cuando sea', miercoles)).toBeNull();
    expect(entenderHora('4 pm')).toBe('16:00');
    expect(entenderHora('7:30')).toBe('07:30');
    expect(entenderHora('25')).toBeNull();
    expect(entenderPlan('Quiero caminar por la quebrada')).toEqual({ tipo: 'caminar', titulo: 'Voy a caminar por la quebrada, ¿alguien se suma?' });
    expect(entenderPlan('tengo ganas de un tinto').tipo).toBe('tinto');
  });
});

describe('Inicio con Brisa', () => {
  it('se presenta como compañera, con sello IA y, la primera vez, aclara que no es una persona', async () => {
    const a = api();
    render(<InicioBrisa perfil={perfil} api={a} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(screen.getByRole('heading', { level: 1, name: 'Hola, Rosa' })).toBeInTheDocument();
    expect(screen.getByText(/Soy Brisa, tu compañera en MOAI/)).toBeInTheDocument();
    expect(screen.getByText('IA')).toBeInTheDocument();
    expect(screen.getByText('No soy una persona: soy una inteligencia artificial.')).toBeInTheDocument();
    expect(a.cartaVista).toHaveBeenCalledWith('brisa:presentada');
    // Pocas opciones a la vez: la primera vez, lo primero es contar de ti.
    expect(await screen.findByRole('button', { name: 'Cuéntame de ti' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /./ }).filter(b => b.closest('.brisa-opciones'))).toHaveLength(4);
  });

  it('las cartas pendientes llegan de a una, y después la pregunta', async () => {
    const carta = { clave: 'c1', tipo: 'gente' as const, texto: 'Alguien te invitó a su Moai' };
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ cartas: ok([carta, { ...carta, clave: 'c2', texto: 'Tienes un saludo' }]) })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText('Antes, algo que quería contarte:')).toBeInTheDocument();
    expect(screen.queryByText('Y otra cosa:')).toBeNull();
    expect(screen.queryByText('¿Qué te provoca hoy?')).toBeNull();
  });

  it('arma un plan conversando y lo publica', async () => {
    const crearPlan = ok([]);
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ crearPlan })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(screen.queryByText(/No soy una persona/)).toBeNull();
    fireEvent.change(screen.getByLabelText('Escríbele a Brisa'), { target: { value: 'Quiero caminar temprano' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    elegir('Sábado');
    elegir(new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, 7)));
    elegir('Un parque cercano');
    elegir('Sí, compartir');
    await vi.waitFor(() => expect(crearPlan).toHaveBeenCalledWith(expect.objectContaining({
      titulo: 'Voy a caminar temprano, ¿alguien se suma?', tipo: 'caminar', lugarPublico: 'Un parque cercano', ciudad: '05001', barrio: '1108', alcance: 'cerca', repite: null })));
    expect(await screen.findByText(/Ya lo pueden ver tus vecinos/)).toBeInTheDocument();
  });

  it('el test de cuidado: seis preguntas, resultado en palabras y se guarda solo si la persona quiere', async () => {
    const responderCuidado = ok({ letras: ['A' as const], guardado: true });
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ responderCuidado })} ir={vi.fn()} onSalir={vi.fn()}/>);
    await elegirCuandoAparezca('Cómo estoy');
    await elegirCuandoAparezca('Más o menos');
    elegir(await screen.findByRole('button', { name: 'Quiero cuidarme' }).then(b => b.textContent!));
    elegir(await screen.findByRole('button', { name: '¿Cómo cuido y cómo me cuido?' }).then(b => b.textContent!));
    elegir('Empezar');
    for (const opcion of ['Lo siento como si fuera mío', 'Su tristeza me desborda', 'Intento resolverlo, aunque me agote', 'Con mucho peso encima', 'Los entiendo, desde cierta distancia', 'Se me borran los límites']) elegir(opcion);
    expect(screen.getByText(/Conectas con mucha intensidad/)).toBeInTheDocument();
    expect(screen.getByText(/no es un diagnóstico/)).toBeInTheDocument();
    elegir('Sí, guárdalo');
    await vi.waitFor(() => expect(responderCuidado).toHaveBeenCalledWith(['A', 'A', 'A', 'A', 'B', 'A'], true));
  });

  it('ante señales de riesgo deriva a una persona y a la línea 123', () => {
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api()} ir={vi.fn()} onSalir={vi.fn()}/>);
    fireEvent.change(screen.getByLabelText('Escríbele a Brisa'), { target: { value: 'ya no aguanto más' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(screen.getByText('123')).toBeInTheDocument();
  });
});

describe('Brisa acompaña', () => {
  it('arma la tarjeta conversando y la muestra solo si la persona quiere', async () => {
    const guardarPerfilPublico = vi.fn(async (p: object) => ({ ok: true as const, datos: p })) as unknown as Api['guardarPerfilPublico'];
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ guardarPerfilPublico })} ir={vi.fn()} onSalir={vi.fn()}/>);
    await elegirCuandoAparezca('Otra cosa');
    elegir('Cuéntame de ti');
    elegir(await screen.findByRole('button', { name: 'La huerta' }).then(b => b.textContent!));
    elegir('Ver más');
    elegir('Tejer');
    elegir('Eso es todo');
    fireEvent.change(screen.getByLabelText('Escríbele a Brisa'), { target: { value: 'Enseño a tejer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    elegir('Por ahora nada');
    fireEvent.change(screen.getByLabelText('Escríbele a Brisa'), { target: { value: 'Me gusta madrugar a regar mis matas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(screen.getByText('«Me gusta madrugar a regar mis matas»')).toBeInTheDocument();
    elegir('Sí, mostrarla');
    await vi.waitFor(() => expect(guardarPerfilPublico).toHaveBeenCalledWith({ frase: 'Me gusta madrugar a regar mis matas', gustos: ['huerta', 'tejer'], comparte: 'Enseño a tejer', aprender: '', visible: true }));
  });

  it('en invierno baja el ritmo y ofrece escribirle a alguien del Moai interno, sin enviar nada por su cuenta', async () => {
    const invierno = vi.fn(async () => ({ ok: true as const, datos: { invierno: true, puertaAbierta: false, contadoA: [] } }));
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ invierno })} ir={vi.fn()} onSalir={vi.fn()}/>);
    await elegirCuandoAparezca('Cómo estoy');
    elegir(await screen.findByRole('button', { name: 'En invierno' }).then(b => b.textContent!));
    expect(invierno).toHaveBeenCalledWith(true);
    elegir(await screen.findByRole('button', { name: 'Escribirle a Laura' }).then(b => b.textContent!));
    const enlace = screen.getByRole('link', { name: 'Abrir WhatsApp con este mensaje' });
    expect(enlace.getAttribute('href')).toMatch(/^whatsapp:\/\/send\?text=Hola%2C%20Laura/);
  });
});
