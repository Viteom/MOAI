import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { entenderDia, entenderHora, entenderPlan, InicioBrisa } from './brisa';
import type { Api, Perfil } from '@/lib/api';

const casa = { id: 'l1', nombre: 'Casa', ciudad: '05001', barrio: '1108', zona: 'Laureles, Medellín', activo: true };
const perfil: Perfil = { nombre: 'Rosa Pérez', nacimientoPendiente: false, comunidad: 'completed', lugar: casa };
const ok = <T,>(datos: T) => vi.fn(async () => ({ ok: true as const, datos }));
const api = (extra: Partial<Api> = {}) => ({ cartas: ok([]), cartaVista: ok([]), planes: ok([]), cuidado: ok({ letras: null, guardado: false }), crearPlan: ok([]), responderCuidado: ok({ letras: ['A'], guardado: true }), estado: ok({ invierno: false, puertaAbierta: false, contadoA: [] }), invierno: ok({ invierno: true, puertaAbierta: false, contadoA: [] }), interno: ok([{ id: 'p1', nombre: 'Laura', relacion: '', pendiente: false }]), gente: ok({ encuentros: [], conocidos: [], moais: [], invitaciones: [], pausa: false }), perfilPublico: ok({ frase: '', gustos: [], comparte: '', aprender: '', visible: false }), guardarPerfilPublico: ok({ frase: '', gustos: [], comparte: '', aprender: '', visible: true }), ...extra }) as unknown as Api;
const elegir = (texto: string) => fireEvent.click(screen.getByRole('button', { name: texto }));
// Después de la primera vez, Brisa espera cerrada: se abre al tocarla.
const abrirBrisa = () => fireEvent.click(screen.getByRole('button', { name: 'Hablar con Brisa' }));
// Las opciones llegan cuando Brisa termina de hablar: se esperan.
const escribirABrisa = (t: string) => { fireEvent.change(screen.getByLabelText('Escríbele a Brisa'), { target: { value: t } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar' })); };
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
    expect(await screen.findByText(/Soy Brisa, tu compañera en MOAI/)).toBeInTheDocument();
    expect(screen.getByText('IA')).toBeInTheDocument();
    expect(screen.getByText('No soy una persona: soy una inteligencia artificial.')).toBeInTheDocument();
    expect(a.cartaVista).toHaveBeenCalledWith('brisa:presentada');
    // Sin menú de entrada: una pregunta directa para conocerse, y las opciones a un toque.
    expect(await screen.findByText('¿Qué haces normalmente un domingo en la tarde?')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /./ }).filter(b => b.closest('.brisa-opciones'))).toHaveLength(1);
  });

  it('las cartas pendientes llegan de a una, y después la pregunta', async () => {
    const carta = { clave: 'c1', tipo: 'gente' as const, texto: 'Alguien te invitó a su Moai' };
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ cartas: ok([carta, { ...carta, clave: 'c2', texto: 'Tienes un saludo' }]) })} ir={vi.fn()} onSalir={vi.fn()}/>);
    abrirBrisa();
    expect(await screen.findByText('Antes, algo que quería contarte:')).toBeInTheDocument();
    expect(screen.queryByText('Y otra cosa:')).toBeNull();
    expect(screen.queryByText('¿Qué te provoca hoy?')).toBeNull();
  });

  it('arma un plan conversando y lo publica', async () => {
    const crearPlan = ok([]);
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ crearPlan })} ir={vi.fn()} onSalir={vi.fn()}/>);
    abrirBrisa();
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
    abrirBrisa();
    await elegirCuandoAparezca('Mejor otra cosa');
    elegir('Cómo estoy');
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
    abrirBrisa();
    fireEvent.change(screen.getByLabelText('Escríbele a Brisa'), { target: { value: 'ya no aguanto más' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(screen.getByText('123')).toBeInTheDocument();
  });
});

describe('Brisa acompaña', () => {
  it('arma la tarjeta conversando y la muestra solo si la persona quiere', async () => {
    const guardarPerfilPublico = vi.fn(async (p: object) => ({ ok: true as const, datos: p })) as unknown as Api['guardarPerfilPublico'];
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ guardarPerfilPublico })} ir={vi.fn()} onSalir={vi.fn()} empezar="perfil"/>);
    await screen.findByText('¿Qué haces normalmente un domingo en la tarde?');
    escribirABrisa('Salgo a caminar y riego la huerta');
    await screen.findByText('¿Qué sabes hacer que le podrías enseñar a alguien?');
    escribirABrisa('Enseño a tejer');
    await screen.findByText('¿Qué te gustaría aprender, aunque sea por gusto?');
    escribirABrisa('A bailar salsa');
    await screen.findByText('Si tus vecinos te conocieran por una frase, ¿cuál sería?');
    escribirABrisa('Me gusta madrugar a regar mis matas');
    expect(await screen.findByText('«Me gusta madrugar a regar mis matas»')).toBeInTheDocument();
    elegir('Sí, mostrarla');
    await vi.waitFor(() => expect(guardarPerfilPublico).toHaveBeenCalledWith({ frase: 'Me gusta madrugar a regar mis matas', gustos: ['caminar', 'huerta'], comparte: 'Enseño a tejer', aprender: 'A bailar salsa', visible: true }));
  });

  it('en invierno baja el ritmo y ofrece escribirle a alguien del Moai interno, sin enviar nada por su cuenta', async () => {
    const invierno = vi.fn(async () => ({ ok: true as const, datos: { invierno: true, puertaAbierta: false, contadoA: [] } }));
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ invierno })} ir={vi.fn()} onSalir={vi.fn()}/>);
    abrirBrisa();
    await elegirCuandoAparezca('Mejor otra cosa');
    elegir('Cómo estoy');
    elegir(await screen.findByRole('button', { name: 'En invierno' }).then(b => b.textContent!));
    expect(invierno).toHaveBeenCalledWith(true);
    elegir(await screen.findByRole('button', { name: 'Escribirle a Laura' }).then(b => b.textContent!));
    const enlace = screen.getByRole('link', { name: 'Abrir WhatsApp con este mensaje' });
    expect(enlace.getAttribute('href')).toMatch(/^whatsapp:\/\/send\?text=Hola%2C%20Laura/);
  });

  it('si no se pudo guardar el invierno, no promete bajar el ritmo', async () => {
    const invierno = vi.fn(async () => ({ ok: false as const, error: 'Sin conexión.', status: 0 }));
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ invierno })} ir={vi.fn()} onSalir={vi.fn()}/>);
    abrirBrisa();
    await elegirCuandoAparezca('Mejor otra cosa');
    elegir('Cómo estoy');
    await elegirCuandoAparezca('En invierno');
    expect(await screen.findByText(/No pude guardarlo: Sin conexión/)).toBeInTheDocument();
    expect(screen.queryByText(/Voy a bajar el ritmo/)).toBeNull();
  });
});

describe('Brisa conversa y recuerda (19 de octubre)', () => {
  it('retoma lo que hablaron y no repite la pregunta de ayer', async () => {
    const historial = ok([{ de: 'brisa' as const, texto: '¿Qué haces normalmente un domingo en la tarde?', fecha: '2026-10-18T15:00:00.000Z' }, { de: 'yo' as const, texto: 'Voy a misa y almuerzo con mis nietos', fecha: '2026-10-18T15:01:00.000Z' }]);
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ historial })} ir={vi.fn()} onSalir={vi.fn()}/>);
    abrirBrisa();
    expect(await screen.findByText('Voy a misa y almuerzo con mis nietos')).toBeInTheDocument();
    expect(await screen.findByText('¿Quién es una persona importante para ti, que te apoya, aunque no use MOAI?')).toBeInTheDocument();
    expect(screen.getAllByText('¿Qué haces normalmente un domingo en la tarde?')).toHaveLength(1);
  });

  it('reacciona a lo que le cuentan, pregunta antes de sumarlo a la tarjeta y guarda la conversación', async () => {
    const guardarPerfilPublico = vi.fn(async (p: object) => ({ ok: true as const, datos: p })) as unknown as Api['guardarPerfilPublico'];
    const guardarHistorial = ok({ ok: true as const });
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ guardarPerfilPublico, guardarHistorial })} ir={vi.fn()} onSalir={vi.fn()}/>);
    abrirBrisa();
    await screen.findByText('¿Qué haces normalmente un domingo en la tarde?');
    escribirABrisa('Salgo a caminar con mi perro');
    expect(await screen.findByText(/Caminar es de las mejores formas/)).toBeInTheDocument();
    await elegirCuandoAparezca('Sí, súmalo');
    await vi.waitFor(() => expect(guardarPerfilPublico).toHaveBeenCalledWith(expect.objectContaining({ gustos: ['caminar'], visible: false })));
    await vi.waitFor(() => expect(guardarHistorial).toHaveBeenCalledWith(expect.arrayContaining([{ de: 'yo', texto: 'Salgo a caminar con mi perro' }])), { timeout: 2000 });
  });

  it('responde dudas sobre la plataforma', async () => {
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api()} ir={vi.fn()} onSalir={vi.fn()}/>);
    abrirBrisa();
    await screen.findByText('¿Qué haces normalmente un domingo en la tarde?');
    escribirABrisa('¿Qué es un Moai?');
    expect(await screen.findByText(/grupo pequeño, de 2 a 5 personas/)).toBeInTheDocument();
    escribirABrisa('¿Ustedes ven mi dirección?');
    expect(await screen.findByText(/Nadie ve tu dirección/)).toBeInTheDocument();
  });
});

describe('Las cartas de Brisa (antes en Mi barrio, ahora en el inicio)', () => {
  it('cuenta sin culpas que fuiste por tu cuenta y ofrece repetirlo cada semana', async () => {
    const repetirPlan = ok([]);
    const cartaVista = ok([]);
    const cartas = ok([{ clave: 'solo:p1', tipo: 'solo', planId: 'p1', repetir: true, texto: 'Esta vez fuiste por tu cuenta a «Voy a caminar». ¿Lo repetimos cada domingo?' }]);
    render(<InicioBrisa perfil={perfil} api={api({ cartas, repetirPlan, cartaVista } as Partial<Api>)} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText(/Esta vez fuiste por tu cuenta/)).toBeInTheDocument();
    await elegirCuandoAparezca('Sí, cada semana');
    await vi.waitFor(() => expect(repetirPlan).toHaveBeenCalledWith('p1'));
    await vi.waitFor(() => expect(cartaVista).toHaveBeenCalledWith('solo:p1'));
  });

  it('una recomendación siempre dice por qué la ves', async () => {
    const plan = { id: 'p1', titulo: 'Voy a caminar', descripcion: '', cuando: '2026-10-25T13:00:00.000Z', lugarPublico: 'Parque de Laureles', zona: 'Laureles', franja: 'Muy cerca', alcance: 'cerca', tipo: 'caminar', repite: 'semanal', diaRepite: 'domingos', autor: 'Luis', mio: false, voy: false, lleno: false, costo: 'gratis' };
    const cartas = ok([{ clave: 'sug:p1', tipo: 'sugerencia', planId: 'p1', plan, texto: 'Luis invita los domingos a las 8:00 a. m. en el Parque de Laureles: «Voy a caminar». ¿Te sumas?', motivo: 'Porque me pediste que te contara de planes de caminar.' }]);
    render(<InicioBrisa perfil={perfil} api={api({ cartas } as Partial<Api>)} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText(/Luis invita los domingos/)).toBeInTheDocument();
    expect(screen.queryByText(/Porque me pediste/)).toBeNull();
    await elegirCuandoAparezca('¿Por qué veo esto?');
    expect(screen.getByText('Porque me pediste que te contara de planes de caminar.')).toBeInTheDocument();
  });
});

describe('Brisa espera (19 de octubre)', () => {
  it('después de la primera vez no se abre sola; se abre al tocarla y se cierra con la X sin volver a saludar', async () => {
    const a = api();
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={a} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(screen.getByRole('heading', { level: 1, name: 'Hola, Rosa' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Escríbele a Brisa')).toBeNull();
    abrirBrisa();
    expect(await screen.findByText(/^Buen(os|as) (días|tardes|noches)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar la conversación' }));
    expect(screen.getByRole('button', { name: 'Hablar con Brisa' })).toBeInTheDocument();
    abrirBrisa();
    expect(screen.getAllByText(/^Buen(os|as) (días|tardes|noches)/)).toHaveLength(1);
  });

  it('si hay algo pendiente, lo dice sin abrir la conversación', async () => {
    const cartas = ok([{ clave: 'c1', tipo: 'gente' as const, texto: 'Alguien te invitó a su Moai' }]);
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ cartas } as Partial<Api>)} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByText('Tengo algo que contarte cuando quieras.')).toBeInTheDocument();
    expect(screen.queryByText('Alguien te invitó a su Moai')).toBeNull();
  });
});

describe('Brisa pregunta por la red de apoyo (20 de octubre)', () => {
  const historial = ok([{ de: 'brisa' as const, texto: '¿Qué haces normalmente un domingo en la tarde?', fecha: '2026-10-18T15:00:00.000Z' }]);
  it('guarda a la persona en el Moai interno y lo que cuentan en su ficha privada, una pregunta a la vez', async () => {
    const agregarInterno = vi.fn(async () => ({ ok: true as const, datos: [{ id: 'i9', nombre: 'Ana', relacion: 'mi hermana', pendiente: false }] }));
    const guardarFichaVinculo = vi.fn(async () => ({ ok: true as const, datos: {} }));
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ historial, agregarInterno, guardarFichaVinculo } as unknown as Partial<Api>)} ir={vi.fn()} onSalir={vi.fn()}/>);
    abrirBrisa();
    expect(await screen.findByText('¿Quién es una persona importante para ti, que te apoya, aunque no use MOAI?')).toBeInTheDocument();
    expect(screen.getByText('Lo guardo cifrado y solo tú lo ves. No le escribo ni le aviso a nadie.')).toBeInTheDocument();
    escribirABrisa('Se llama Ana');
    expect(await screen.findByText('¿Qué es Ana para ti? Por ejemplo, tu hermana, una amiga o un vecino.')).toBeInTheDocument();
    escribirABrisa('mi hermana');
    expect(await screen.findByText('¿Cómo se conocieron?')).toBeInTheDocument();
    escribirABrisa('Crecimos juntas');
    expect(await screen.findByText('¿Hay algo que compartan o que les guste hacer juntos?')).toBeInTheDocument();
    escribirABrisa('Cocinar los domingos');
    expect(await screen.findByText(/Guardé a Ana en tu red de apoyo, en Raíz, con tu familia/)).toBeInTheDocument();
    expect(agregarInterno).toHaveBeenCalledWith({ nombre: 'Ana', relacion: 'mi hermana', familia: true });
    expect(guardarFichaVinculo).toHaveBeenCalledWith('interno:i9', { comoNosConocemos: 'Crecimos juntas', algoCompartimos: 'Cocinar los domingos', nota: '' });
    expect(screen.getByRole('button', { name: 'Agregar a alguien más' })).toBeInTheDocument();
  });

  it('«Ahora no» no guarda nada', async () => {
    const agregarInterno = vi.fn();
    render(<InicioBrisa perfil={{ ...perfil, presentada: true }} api={api({ historial, agregarInterno } as Partial<Api>)} ir={vi.fn()} onSalir={vi.fn()}/>);
    abrirBrisa();
    await elegirCuandoAparezca('Ahora no');
    expect(await screen.findByText('Está bien. Cuando quieras me cuentas.')).toBeInTheDocument();
    expect(agregarInterno).not.toHaveBeenCalled();
  });
});
