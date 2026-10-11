import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MoaiApp } from './app';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

const encender = () => {
  const view = render(<MoaiApp inicio="demo" estadoInicial={{ nombre: 'Sol', hora: 12 }} />);
  fireEvent.click(screen.getByRole('button', { name: /Simular que alguien de tu tronco está cerca/ }));
  return view;
};

describe('H3 · Radar simulado', () => {
  it('enciende el borde con el color del anillo y no dice quién es', () => {
    const { container } = encender();
    expect(container.querySelector('.radar-edge')).toHaveClass('ring-tronco');
    expect(screen.getByRole('button', { name: 'Alguien de tu tronco está cerca' })).toBeInTheDocument();
    expect(screen.queryByText(/Luis/)).toBeNull();
  });
  it('ofrece un saludo y solo revela el nombre cuando la otra persona acepta', () => {
    encender();
    fireEvent.click(screen.getByRole('button', { name: 'Alguien de tu tronco está cerca' }));
    expect(screen.getByText(/¿Quieres mandarle un saludo\?/)).toBeInTheDocument();
    expect(screen.queryByText(/Luis/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Mandar un saludo/ }));
    expect(screen.queryByText(/Luis/)).toBeNull();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText(/Era Luis\. También quiso saludarte\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Listo/ }));
    expect(document.querySelector('.radar-edge')).toBeNull();
  });
  it('«Ahora no» apaga el aviso', () => {
    encender();
    fireEvent.click(screen.getByRole('button', { name: 'Alguien de tu tronco está cerca' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(document.querySelector('.radar-edge')).toBeNull();
  });
  it('aclara que es una simulación y que no usa la ubicación', () => {
    encender();
    fireEvent.click(screen.getByRole('button', { name: 'Alguien de tu tronco está cerca' }));
    expect(screen.getByText(/no usamos tu ubicación/)).toBeInTheDocument();
  });
});
