import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Plataforma } from './portada';

describe('Portada', () => {
  it('explica MOAI y ofrece crear cuenta o iniciar sesión', () => {
    render(<Plataforma />);
    expect(screen.getByRole('img', { name: 'MOAI' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear mi cuenta/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
  it('avisa que no hay cuentas y que nada se guarda', () => {
    render(<Plataforma />);
    expect(screen.getByText(/todavía no hay cuentas/)).toBeInTheDocument();
    expect(screen.getByText(/Lo que escribas no se guarda/)).toBeInTheDocument();
  });
  it.each([/Crear mi cuenta/, 'Iniciar sesión'])('«%s» lleva al primer día', name => {
    render(<Plataforma />);
    fireEvent.click(screen.getByRole('button', { name }));
    expect(screen.getByLabelText('Tu nombre o apodo')).toBeInTheDocument();
  });
});
