import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MoaiApp } from '@/components/moai/app';

describe('Primera pantalla', () => {
  it('no muestra «Volver» cuando no hay a dónde volver', () => {
    render(<MoaiApp />);
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
  });
  it('muestra el nombre MOAI y el aviso de prototipo', () => {
    render(<MoaiApp />);
    expect(screen.getByRole('heading', { name: 'MOAI' })).toBeInTheDocument();
    expect(screen.getByText('Esto es un prototipo. Lo que escribas no se guarda.')).toBeInTheDocument();
  });
  it('permite avanzar y volver una vez que hay historial', () => {
    render(<MoaiApp />);
    fireEvent.change(screen.getByLabelText('Tu nombre o apodo'), { target: { value: 'Sol' } });
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    expect(screen.getByText('Mucho gusto, Sol.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByLabelText('Tu nombre o apodo')).toBeInTheDocument();
  });
});
