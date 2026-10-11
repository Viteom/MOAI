import { describe, expect, it } from 'vitest';
import { nombreVisible, personaCercana, radarSiguiente, type EventoRadar, type Radar } from './demo';

describe('H3 · Radar simulado', () => {
  it('recorre el camino feliz: cerca, saludo, aceptación y nombre', () => {
    let etapa: Radar = 'apagado';
    for (const evento of ['simular', 'tocar', 'saludar', 'aceptar'] as EventoRadar[]) etapa = radarSiguiente(etapa, evento);
    expect(etapa).toBe('revelado');
  });
  it('no revela el nombre antes de que los dos acepten', () => {
    for (const etapa of ['apagado', 'cerca', 'ofrecido', 'enviado'] as Radar[]) expect(nombreVisible(etapa)).toBeNull();
    expect(nombreVisible('revelado')).toBe(personaCercana.nombre);
  });
  it('«Ahora no» apaga el aviso sin dejar rastro', () => {
    expect(radarSiguiente('ofrecido', 'ahoraNo')).toBe('apagado');
  });
  it('ignora eventos que no corresponden a la etapa', () => {
    expect(radarSiguiente('apagado', 'aceptar')).toBe('apagado');
    expect(radarSiguiente('cerca', 'aceptar')).toBe('cerca');
    expect(radarSiguiente('enviado', 'cerrar')).toBe('enviado');
  });
  it('la persona que aparece es del tronco', () => {
    expect(personaCercana.anillo).toBe('tronco');
  });
});
