import { it, expect } from 'vitest';
import { coincideConIntencion, interpretarIntencion, type MemoriaBrisa } from './brisa-intenciones';
import type { Plan } from './api';
const ahora = new Date('2026-10-20T22:00:00Z');
const plan = (cuando: string, extra = {}) => ({ cuando, tipo: 'caminar', costo: 'gratis', mio: false, voy: false, lleno: false, ...extra }) as Plan;
it('prioriza la intención explícita; distingue disponibilidad recurrente y el sábado concreto en Colombia', () => {
  const memoria = { tipos: ['tinto'], dias: [0], soloGratis: false } as MemoriaBrisa;
  const r = interpretarIntencion('Busca caminar el sábado', memoria, ahora);
  expect(r.ok).toBe(true); if (!r.ok) return;
  expect(r.criterios).toMatchObject({ tipos: ['caminar'], fecha: '2026-10-24' });
  expect(coincideConIntencion(plan('2026-10-24T15:00:00Z'), r.criterios, ahora)).toBe(true);
  expect(coincideConIntencion(plan('2026-10-31T15:00:00Z'), r.criterios, ahora)).toBe(false);
  const recurrente = interpretarIntencion('Caminar los sábados', null, ahora);
  expect(recurrente.ok).toBe(true); if (!recurrente.ok) return;
  expect(coincideConIntencion(plan('2026-10-31T15:00:00Z'), recurrente.criterios, ahora)).toBe(true);
});
it('no convierte negaciones ni limitaciones de ritmo/horario en propuestas engañosas y deriva el riesgo', () => {
  for (const t of ['No quiero caminar', 'Caminar excepto el sábado', 'Caminar a las 7', 'Caminar tranquilo', 'Caminar por la tarde']) expect(interpretarIntencion(t, null, ahora).ok).toBe(false);
  const r = interpretarIntencion('No quiero vivir', null, ahora);
  expect(r.ok).toBe(false); if (!r.ok) expect(r.mensaje).toContain('123');
});
it('hoy/mañana usan fecha colombiana y la semana no se extiende a las siguientes', () => {
  const r = interpretarIntencion('Caminar mañana gratis', null, new Date('2026-10-21T02:00:00Z'));
  expect(r.ok).toBe(true); if (!r.ok) return;
  expect(r.criterios.fecha).toBe('2026-10-21');
  expect(coincideConIntencion(plan('2026-10-21T02:30:00Z'), r.criterios, ahora)).toBe(false); // aún es martes en Colombia
  expect(coincideConIntencion(plan('2026-10-21T15:00:00Z'), r.criterios, ahora)).toBe(true);
  expect(coincideConIntencion(plan('2026-10-21T15:00:00Z', { costo: 'cada_quien' }), r.criterios, ahora)).toBe(false);
  const semana = interpretarIntencion('Caminar esta semana', null, ahora);
  expect(semana.ok).toBe(true); if (!semana.ok) return;
  expect(coincideConIntencion(plan('2026-10-31T15:00:00Z'), semana.criterios, ahora)).toBe(false);
});
