import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TreeView } from './tree';
import { initialState } from '@/lib/moai/state';

const base = { ...initialState(7), nombre: 'Sol', semilla: 'ceiba' };

describe('H2 · Tu árbol', () => {
  it('muestra la copa, los anillos, las raíces y el subsuelo', () => {
    render(<TreeView state={base} />);
    expect(screen.getByRole('heading', { name: 'Tu árbol.' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /copa, tronco con anillos y lámpara/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /raíces con la luz de un ancestro/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bajo la tierra' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /micelio que une las casas/ })).toBeInTheDocument();
  });
  it('dice que la luz del día y la del ancestro son solo de la persona', () => {
    render(<TreeView state={{ ...base, estadoDia: 'Calma' }} />);
    expect(screen.getByText(/Tu luz de hoy: Calma/)).toBeInTheDocument();
    expect(screen.getByText(/La ves solo tú/)).toBeInTheDocument();
    expect(screen.getByText(/Solo tú la ves y se queda en tu teléfono/)).toBeInTheDocument();
  });
  it('sin estado del día, la lámpara descansa y no se infiere nada', () => {
    render(<TreeView state={base} />);
    expect(screen.getByText(/La lámpara descansa/)).toBeInTheDocument();
  });
  it('dibuja una casa en el subsuelo por cada persona, sin números', () => {
    const state = { ...base, personas: [{ nombre: 'Mamá', anillo: 'raiz' as const }, { nombre: 'Luis', anillo: 'tronco' as const }] };
    const { container } = render(<TreeView state={state} />);
    expect(container.querySelectorAll('.mycelium-house')).toHaveLength(2);
    expect(container.querySelectorAll('.tree-node')).toHaveLength(2);
    expect(container.textContent).not.toMatch(/\d/);
  });
  it('sin personas, el subsuelo espera sin inventar a nadie', () => {
    const { container } = render(<TreeView state={base} />);
    expect(container.querySelectorAll('.mycelium-house')).toHaveLength(0);
    expect(screen.getByText(/el micelio espera/)).toBeInTheDocument();
  });
});
