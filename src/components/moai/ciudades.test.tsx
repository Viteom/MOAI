import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Api, Lugar, Perfil, Plan, Respuesta } from '@/lib/api';
import { FondoCiudad } from './fondo-ciudad';
import { SelectorLugar } from './selector-lugar';
import { MiComunidad } from './comunidad';

const medellin: Lugar = { id: 'med', nombre: 'Casa', ciudad: '05001', barrio: '1104', zona: 'Laureles, Medellín', activo: true };
const bogota: Lugar = { id: 'bog', nombre: 'Mi hermana', ciudad: '11001', barrio: null, zona: 'Bogotá, D.C.', activo: false };
const perfil: Perfil = { nombre: 'Sol', nacimientoPendiente: false, comunidad: 'completed', presentada: true, lugar: medellin };
const plan: Plan = { id: 'p1', titulo: 'Caminar en Medellín', descripcion: '', cuando: '2027-01-01T16:00:00Z', lugarPublico: 'Parque', zona: 'Medellín', franja: 'En tu ciudad', alcance: 'ciudad', tipo: 'caminar', repite: null, diaRepite: null, autor: 'Luis', mio: false, voy: false, lleno: false, costo: 'gratis' };
const ok = <T,>(datos: T) => vi.fn(async () => ({ ok: true as const, datos }));
const api = (extra: Partial<Api> = {}) => ({ lugares: ok([medellin, bogota]), planes: ok([plan]), mapa: ok({ disponible: false }), ...extra }) as unknown as Api;
function diferida<T>() { let resolver!: (valor: T) => void; const promesa = new Promise<T>(r => { resolver = r; }); return { promesa, resolver }; }

describe('Fondos y contexto de ciudad', () => {
  it('cada ciudad resuelve sus dos composiciones y reinicia su respaldo al cambiar', () => {
    const { container, rerender } = render(<FondoCiudad ciudad="05001"/>);
    expect(container.querySelector('source[media]')).toHaveAttribute('srcset', '/backgrounds/ciudades/medellin-movil.avif');
    expect(container.querySelector('img')).toHaveAttribute('src', '/backgrounds/ciudades/medellin-escritorio.webp');
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('source[type="image/avif"]')).toBeNull();
    fireEvent.error(container.querySelector('img')!);
    expect(screen.getByRole('status')).toHaveTextContent(/ilustración genérica/);
    rerender(<FondoCiudad ciudad="11001"/>);
    expect(container.querySelector('img')).toHaveAttribute('src', '/backgrounds/ciudades/bogota-escritorio.webp');
    expect(container.querySelector('source[media]')).toHaveAttribute('srcset', '/backgrounds/ciudades/bogota-movil.avif');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('una ciudad sin arte tiene respaldo identificado y una ruta nunca sale del catálogo', () => {
    const { container, rerender } = render(<FondoCiudad ciudad="13001"/>);
    expect(screen.getByRole('status')).toHaveTextContent('Ilustración genérica de MOAI');
    rerender(<FondoCiudad ciudad="../../otra-ciudad"/>);
    expect(container.querySelector('img')).toHaveAttribute('src', '/backgrounds/internas/barrio-1586.webp');
    rerender(<FondoCiudad ciudad="toString"/>);
    expect(container.querySelector('img')).toHaveAttribute('src', '/backgrounds/internas/barrio-1586.webp');
    fireEvent.error(container.querySelector('img')!);
    expect(screen.getByRole('status')).toHaveTextContent('Ilustración no disponible');
  });

  it('una activación fallida conserva el contexto, evita duplicados y ofrece un reintento real', async () => {
    const espera = diferida<Respuesta<Lugar[]>>();
    const activarLugar = vi.fn().mockReturnValueOnce(espera.promesa).mockResolvedValueOnce({ ok: true, datos: [{ ...medellin, activo: false }, { ...bogota, activo: true }] });
    const onCambio = vi.fn();
    render(<SelectorLugar perfil={perfil} api={api({ activarLugar })} ir={vi.fn()} onCambio={onCambio}/>);
    fireEvent.click(screen.getByRole('button', { name: /Estás en/ }));
    const opcion = await screen.findByRole('button', { name: /Mi hermana/ });
    fireEvent.click(opcion); fireEvent.click(opcion);
    expect(activarLugar).toHaveBeenCalledTimes(1);
    expect(opcion).toBeDisabled();
    expect(onCambio).not.toHaveBeenCalled();
    await act(async () => espera.resolver({ ok: false, error: 'No se pudo confirmar Bogotá.', status: 503 }));
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo confirmar Bogotá.');
    expect(screen.getByRole('button', { name: /Estás en/ })).toHaveAccessibleName(/Laureles, Medellín/);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar cambio de lugar' }));
    await waitFor(() => expect(onCambio).toHaveBeenCalledWith({ ...bogota, activo: true }));
    expect(activarLugar).toHaveBeenCalledTimes(2);
  });

  it('elimina datos del lugar anterior e ignora una respuesta que llega después de cambiar', async () => {
    const med = diferida<Respuesta<Plan[]>>(), bog = diferida<Respuesta<Plan[]>>();
    const planes = vi.fn().mockReturnValueOnce(med.promesa).mockReturnValueOnce(bog.promesa);
    const a = api({ planes });
    const { container, rerender } = render(<MiComunidad perfil={perfil} api={a} ir={vi.fn()} onSalir={vi.fn()}/>);
    await waitFor(() => expect(planes).toHaveBeenCalledTimes(1));
    rerender(<MiComunidad perfil={{ ...perfil, lugar: bogota }} api={a} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(container.querySelector('[data-fondo-ciudad]')).toHaveAttribute('data-fondo-ciudad', 'bogota');
    expect(screen.getByText('Cargando planes de Bogotá…')).toBeInTheDocument();
    await act(async () => med.resolver({ ok: true, datos: [plan] }));
    expect(screen.queryByText(plan.titulo)).toBeNull();
    await act(async () => bog.resolver({ ok: true, datos: [{ ...plan, id: 'p2', titulo: 'Caminar en Bogotá' }] }));
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByText('Caminar en Bogotá')).toBeInTheDocument();
    expect(screen.queryByText(plan.titulo)).toBeNull();
  });

  it('distingue error de mapa y falta de cobertura y permite reintentar', async () => {
    const mapa = vi.fn().mockResolvedValueOnce({ ok: false, error: 'Mapa sin conexión.', status: 503 }).mockResolvedValue({ ok: true, datos: { disponible: false } });
    render(<MiComunidad perfil={perfil} api={api({ mapa })} ir={vi.fn()} onSalir={vi.fn()}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Mapa sin conexión.');
    expect(screen.queryByText(/Este escenario de Medellín es ilustrativo/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar cargar planes y mapa' }));
    expect(await screen.findByText(/Este escenario de Medellín es ilustrativo/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
