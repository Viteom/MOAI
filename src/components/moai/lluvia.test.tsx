import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MoaiApp } from './app';
import { ayudaUrgente, confirmo, luzDeVentana, respuestaLluvia } from '@/lib/moai/demo';

const abrir = (ciudad: 'medellin' | 'nyc' = 'medellin') => {
  const view = render(<MoaiApp inicio="demo" estadoInicial={{ nombre: 'Sol', hora: 12, ciudad }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Simular una lluvia fuerte' }));
  return view;
};

describe('H5 · Lluvia fuerte', () => {
  it('quién confirmó tiene luz de vela y quién no, luz tenue', () => {
    expect(confirmo('bien')).toBe(true);
    expect(confirmo('escriban')).toBe(true);
    expect(confirmo('noDecir')).toBe(false);
    expect(confirmo(null)).toBe(false);
    expect(luzDeVentana(true)).toBe('vela');
    expect(luzDeVentana(false)).toBe('tenue');
  });
  it('ninguna respuesta promete rescate ni dice que alguien está en peligro', () => {
    for (const c of ['bien', 'escriban', 'noDecir'] as const) expect(respuestaLluvia(c)).not.toMatch(/rescat|peligro|emergencia|alarma/i);
  });
  it('la ayuda urgente nombra la línea solo donde está verificada', () => {
    expect(ayudaUrgente('Medellín')).toMatch(/123/);
    expect(ayudaUrgente('Nueva York')).not.toMatch(/\d/);
    expect(ayudaUrgente('Nueva York')).toMatch(/no es un servicio de emergencias/);
  });
  it('Brisa cambia de tono, se presenta como IA y pone la lluvia', () => {
    const { container } = abrir();
    expect(screen.getByText('Hoy llovió muy fuerte en Medellín. ¿Cómo estás?')).toBeInTheDocument();
    expect(screen.getByText(/una inteligencia artificial/)).toBeInTheDocument();
    expect(container.querySelector('.scene')).toHaveClass('weather-lluvia');
  });
  it('ofrece las tres respuestas de la especificación', () => {
    abrir();
    for (const label of ['Estoy bien', 'Necesito que alguien me escriba', 'Prefiero no decir']) expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  });
  it('«Estoy bien» deja la ventana propia con luz de vela y nunca usa rojo', () => {
    const { container } = abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Estoy bien' }));
    const ventanas = Array.from(container.querySelectorAll('.house-window')).map(el => el.getAttribute('aria-label'));
    expect(ventanas).toEqual(['Ventana con luz de vela', 'Ventana con luz de vela', 'Ventana con luz tenue', 'Ventana con luz de vela']);
    expect(container.innerHTML).not.toMatch(/red|rojo|alarma/i);
  });
  it('«Prefiero no decir» deja la propia con luz tenue', () => {
    const { container } = abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Prefiero no decir' }));
    expect(Array.from(container.querySelectorAll('.house-window')).at(-1)).toHaveAttribute('aria-label', 'Ventana con luz tenue');
  });
});
