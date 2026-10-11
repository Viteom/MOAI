import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MoaiApp } from './app';
import { engrosar } from '@/lib/moai/demo';

describe('H4 · Tu Moai de ejemplo', () => {
  it('engrosar sube un escalón y se queda en el más grueso', () => {
    expect(engrosar('fino')).toBe('medio');
    expect(engrosar('medio')).toBe('grueso');
    expect(engrosar('grueso')).toBe('grueso');
  });
  it('muestra la carta de Brisa con el turno de Luis, sin números', () => {
    const { container } = render(<MoaiApp inicio="moai" estadoInicial={{ nombre: 'Sol', hora: 12 }} />);
    expect(screen.getByText(/Hace un tiempo que tu Moai no se reúne/)).toBeInTheDocument();
    expect(screen.getByText(/Esta vez le toca proponer a Luis\./)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d/);
  });
  it('«Mandar un abrazo corto» avisa que es simulado y no se repite', () => {
    render(<MoaiApp inicio="moai" estadoInicial={{ nombre: 'Sol', hora: 12 }} />);
    fireEvent.click(screen.getByRole('button', { name: /Mandar un abrazo corto/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Es una simulación');
    expect(screen.getByRole('button', { name: /Abrazo enviado/ })).toBeDisabled();
  });
  it('«Ya nos vimos» engruesa los hilos y cambia la carta', () => {
    const { container } = render(<MoaiApp inicio="moai" estadoInicial={{ nombre: 'Sol', hora: 12 }} />);
    expect(container.querySelector('.moai-threads')).toHaveClass('hilo-fino');
    fireEvent.click(screen.getByRole('button', { name: 'Ya nos vimos' }));
    expect(container.querySelector('.moai-threads')).toHaveClass('hilo-medio');
    expect(screen.getByText(/Qué bueno que se vieron/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gracias por contarlo/ })).toBeDisabled();
  });
  it('se llega desde el panel de demostración', () => {
    render(<MoaiApp inicio="demo" estadoInicial={{ nombre: 'Sol', hora: 12 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver un Moai de ejemplo' }));
    expect(screen.getByRole('heading', { name: 'Tu Moai.' })).toBeInTheDocument();
  });
});
