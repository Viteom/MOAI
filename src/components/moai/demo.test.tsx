import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MoaiApp } from './app';

const abrirDemo = () => {
  render(<MoaiApp inicio="settings" estadoInicial={{ nombre: 'Sol', hora: 12 }} />);
  fireEvent.click(screen.getByRole('button', { name: /Para quien presenta/ }));
};

describe('H6 · Panel de demostración', () => {
  it('se abre desde Ajustes y deja volver', () => {
    abrirDemo();
    expect(screen.getByRole('heading', { name: '¿Qué cielo quieres ver?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByRole('heading', { name: 'Ajustes.' })).toBeInTheDocument();
  });
  it('cambia ciudad, hora y clima', () => {
    const { container } = render(<MoaiApp inicio="demo" estadoInicial={{ nombre: 'Sol', hora: 12 }} />);
    fireEvent.click(screen.getByRole('button', { name: /Bogotá/ }));
    fireEvent.click(screen.getByRole('button', { name: /Noche/ }));
    fireEvent.click(screen.getByRole('button', { name: /Lluvia/ }));
    const escena = container.querySelector('.scene')!;
    expect(escena).toHaveClass('city-bogota', 'scene-night', 'weather-lluvia');
  });
  it('avisa claramente que el fondo es provisional cuando no hay imagen', () => {
    render(<MoaiApp inicio="demo" estadoInicial={{ nombre: 'Sol', hora: 12 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Fondo provisional');
  });
});
