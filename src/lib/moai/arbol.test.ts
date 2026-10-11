import { describe, expect, it } from 'vitest';
import { nodosDeCopa, nodosDeMicelio } from './arbol';

describe('Geometría del árbol', () => {
  it('no dibuja puntos sin personas', () => {
    expect(nodosDeCopa(0)).toEqual([]);
    expect(nodosDeMicelio(0)).toEqual([]);
  });
  it('limita a cinco personas, como el resto del producto', () => {
    expect(nodosDeCopa(9)).toHaveLength(5);
    expect(nodosDeMicelio(9)).toHaveLength(5);
  });
  it('mantiene los puntos dentro del ancho de 390', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      for (const p of [...nodosDeCopa(n), ...nodosDeMicelio(n)]) {
        expect(p.x).toBeGreaterThan(20);
        expect(p.x).toBeLessThan(370);
      }
    }
  });
  it('centra a una sola persona', () => {
    expect(nodosDeCopa(1)[0]!.x).toBe(195);
    expect(nodosDeMicelio(1)[0]!.x).toBe(195);
  });
});
