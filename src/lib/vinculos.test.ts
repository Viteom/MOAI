import { describe, expect, it } from 'vitest';
import type { PersonaLazo } from './api';
import { filtrarPersonas, validarFicha } from './vinculos';
import { disponerRed, seSuperponen } from './red-gente';

const persona = (id: number, nombre: string, categoria: 'raiz' | 'tronco' | 'rama' = 'rama', moais: { id: string; nombre: string }[] = []): PersonaLazo => ({ id: `p${id}`, grupo: categoria, categoria, moais, nombre, detalle: '', estado: 'vivo', puerta: false, accion: { tipo: 'saludo', ref: `r${id}` } });
describe('Búsqueda y filtros comunes a Red y Lista', () => {
  const moai = { id: 'm1', nombre: 'El parque' };
  const personas = [persona(1, 'María José', 'raiz'), persona(2, 'Luis', 'rama', [moai]), persona(3, 'Ana', 'tronco')];
  it('busca sin depender de tildes, mayúsculas ni espacios al principio', () => {
    expect(filtrarPersonas(personas, '  MARIA ', 'todas', 'todas').map(p => p.id)).toEqual(['p1']);
  });
  it('combina pertenencia y categoría sin inferir pertenencias a grupos ajenos', () => {
    expect(filtrarPersonas(personas, '', 'compartimos', 'todas').map(p => p.id)).toEqual(['p2']);
    expect(filtrarPersonas(personas, '', 'sin-compartir', 'raiz').map(p => p.id)).toEqual(['p1']);
  });
});
describe('Ficha privada', () => {
  it('valida tipos y límites, admite borrar y no incorpora campos públicos o ajenos', () => {
    expect(validarFicha({ comoNosConocemos: '', algoCompartimos: '', nota: '', visible: true })).toEqual({ ok: true, ficha: { comoNosConocemos: '', algoCompartimos: '', nota: '' } });
    expect(validarFicha({ comoNosConocemos: [], algoCompartimos: '', nota: '' }).ok).toBe(false);
    expect(validarFicha({ comoNosConocemos: '', algoCompartimos: '', nota: 'x'.repeat(501) }).ok).toBe(false);
  });
});
describe('Órbitas legibles', () => {
  for (const cantidad of [0, 2, 48]) for (const ancho of [358, 1120]) it(`${cantidad} contactos con nombres largos, ancho ${ancho}: no repite ni superpone nodos`, () => {
    const personas = Array.from({ length: cantidad }, (_, i) => persona(i, `María Fernanda del Rosario ${i}`, (['raiz', 'tronco', 'rama'] as const)[i % 3]));
    const red = disponerRed(personas, [{ id: 'm', nombre: 'Los caminos de cada jueves' }], ancho, 480);
    expect(new Set(red.nodos.map(n => n.id)).size).toBe(cantidad + 1);
    for (let a = 0; a < red.nodos.length; a++) {
      const n = red.nodos[a];
      expect(n.x - n.ancho / 2).toBeGreaterThanOrEqual(0);
      expect(n.x + n.ancho / 2).toBeLessThanOrEqual(red.ancho);
      for (let b = a + 1; b < red.nodos.length; b++) expect(seSuperponen(n, red.nodos[b], 0)).toBe(false);
    }
  });
});
