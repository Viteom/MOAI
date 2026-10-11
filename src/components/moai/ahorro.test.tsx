import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MoaiApp } from './app';
import { estoyBienSiguiente } from '@/lib/moai/demo';

describe('H7 · Modo Ahorro', () => {
  it('«Estoy bien» se confirma en dos toques y no se puede saltar el segundo', () => {
    expect(estoyBienSiguiente('ninguno', 'avisar')).toBe('ninguno');
    expect(estoyBienSiguiente('ninguno', 'declarar')).toBe('declarado');
    expect(estoyBienSiguiente('declarado', 'avisar')).toBe('avisado');
    expect(estoyBienSiguiente('declarado', 'privado')).toBe('privado');
  });
  it('en Ajustes se activa: sin imagen de fondo, sin vidrio y con letra grande', () => {
    const { container } = render(<MoaiApp inicio="settings" estadoInicial={{ nombre: 'Sol', hora: 12 }} />);
    expect(container.querySelector('.scene-photo')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Modo Ahorro: apagado' }));
    expect(container.querySelector('.modo-ahorro')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.procedural-scene')).toBeNull();
    expect(screen.getByRole('button', { name: 'Modo Ahorro: activo' })).toBeTruthy();
  });
  it('desde la lluvia: dos toques y queda avisado, sin números', () => {
    const { container } = render(<MoaiApp inicio="demo" estadoInicial={{ nombre: 'Sol', hora: 12 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Simular una lluvia fuerte' }));
    fireEvent.click(screen.getByRole('button', { name: /Estoy bien/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Activar Modo Ahorro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Estoy bien' }));
    expect(screen.getByText('Dijiste: estoy bien.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, avisar a mi Moai' }));
    expect(screen.getByText(/Quedó avisado/)).toBeTruthy();
    // Lo único con dígitos es el número de la línea de ayuda, que no es un contador.
    expect((container.textContent ?? '').replace(/123/g, '')).not.toMatch(/\d/);
  });
  it('«Solo para mí» no avisa a nadie', () => {
    render(<MoaiApp inicio="demo" estadoInicial={{ nombre: 'Sol', hora: 12 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Simular una lluvia fuerte' }));
    fireEvent.click(screen.getByRole('button', { name: /Estoy bien/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Activar Modo Ahorro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Estoy bien' }));
    fireEvent.click(screen.getByRole('button', { name: 'Solo para mí' }));
    expect(screen.queryByText(/Quedó avisado/)).toBeNull();
    expect(screen.getByText('Queda solo contigo.')).toBeTruthy();
  });
});
