import { describe, expect, it } from 'vitest';
import { addPerson, afterCompanions, initialState, timeOfDay, toggleChoice, type Person } from './state';
describe('MOAI first-day rules', () => {
  it('allows up to three oficios, and deselection makes room', () => {
    const chosen = ['escuchar', 'acompañar', 'cocinar para otros'];
    expect(toggleChoice(chosen, 'enseñar lo que sé', 3)).toEqual(chosen);
    expect(toggleChoice(chosen, 'escuchar', 3)).toEqual(['acompañar', 'cocinar para otros']);
  });
  it('allows up to five people', () => {
    let people: Person[] = [];
    for (const nombre of ['Ana','Luz','Sol','Juan','Teo','Eva']) people = addPerson(people, {nombre,anillo:'raiz'});
    expect(people.map(person => person.nombre)).toEqual(['Ana','Luz','Sol','Juan','Teo']);
  });
  it('routes an empty street to the solo branch instead of Espora', () => {
    expect(afterCompanions([])).toBe(11);
    expect(afterCompanions([{nombre:'Ana',anillo:'raiz'}])).toBe(12);
  });
  it('starts with fresh empty data on restart', () => {
    const state = initialState(20);
    state.personas.push({nombre:'Ana',anillo:'tronco'}); state.nombre = 'Sol';
    expect(initialState(20).personas).toEqual([]);
    expect(initialState(20).nombre).toBe('');
    expect(initialState(20).espora).toEqual({destinatario:'',intencion:''});
  });
  it('maps the chosen device hour to the scene time', () => {
    expect(timeOfDay(6)).toBe('dawn'); expect(timeOfDay(12)).toBe('day');
    expect(timeOfDay(17)).toBe('dusk'); expect(timeOfDay(21)).toBe('night');
  });
});
