import { describe, expect, it } from 'vitest';
import { climas, horaDe, momentos, timeOfDay } from './state';

describe('H6 · Panel de demostración', () => {
  it('cada momento del día vuelve a sí mismo al pasar por su hora', () => {
    for (const m of momentos) expect(timeOfDay(horaDe(m.id))).toBe(m.id);
  });
  it('ofrece los cuatro momentos y los tres climas de la especificación', () => {
    expect(momentos.map(m => m.label)).toEqual(['Amanecer', 'Día', 'Atardecer', 'Noche']);
    expect(climas.map(c => c.label)).toEqual(['Despejado', 'Nublado', 'Lluvia']);
  });
});
