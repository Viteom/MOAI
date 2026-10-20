import { describe, expect, it } from 'vitest';
import { esDuda, esFamilia, gustosEn, limpiarNombre, sinRespuesta, PREGUNTAS, preguntaDelDia, preguntasHechas, reaccionar, responderDuda, saludoDeVuelta } from './conversacion';

describe('Matriz conversacional de Brisa', () => {
  it('primero las preguntas para conocerse, en orden; después rota sin repetir', () => {
    const hoy = new Date('2026-10-19T12:00:00Z');
    expect(preguntaDelDia(new Set(), hoy)?.clave).toBe('domingo');
    expect(preguntaDelDia(new Set(['domingo']), hoy)?.clave).toBe('apoyo'); // la red de apoyo, en los primeros días
    expect(preguntaDelDia(new Set(['domingo', 'apoyo']), hoy)?.clave).toBe('despues');
    const conocidas = new Set(PREGUNTAS.slice(0, 6).map(p => p.clave));
    const a = preguntaDelDia(conocidas, hoy)!;
    expect(PREGUNTAS.slice(6)).toContainEqual(a);
    expect(preguntaDelDia(new Set([...conocidas, a.clave]), hoy)?.clave).not.toBe(a.clave);
    expect(preguntaDelDia(new Set(PREGUNTAS.map(p => p.clave)), hoy)).toBeNull();
  });

  it('sabe qué preguntó por lo que dijo antes', () => {
    expect([...preguntasHechas(['Hola', '¿Qué haces normalmente un domingo en la tarde?'])]).toEqual(['domingo']);
  });

  it('reconoce gustos y reacciona a lo que le cuentan', () => {
    expect(gustosEn('Salgo a caminar y tomo tinto con mi vecina')).toEqual(['caminar', 'tinto']);
    expect(gustosEn('Veo novelas')).toEqual([]);
    expect(reaccionar(null, 'Cocino sancocho para mis nietos')).toMatch(/familia|Cocinar/);
    expect(reaccionar(PREGUNTAS.find(p => p.clave === 'sabes')!, 'Arreglo radios')).toMatch(/regalo para el barrio/);
  });

  it('distingue dudas y responde las que conoce', () => {
    expect(esDuda('¿Qué es un Moai?')).toBe(true);
    expect(esDuda('como borro mi cuenta')).toBe(true);
    expect(esDuda('Me gusta el café')).toBe(false);
    expect(responderDuda('¿Eres una persona?')?.[0]).toMatch(/inteligencia artificial/);
    expect(responderDuda('¿Cómo borro mi cuenta?')?.[0]).toMatch(/Mi cuenta/);
    expect(responderDuda('¿Cuál es la capital de Francia?')).toBeNull();
  });
});

describe('saludos de vuelta', () => {
  it('cambian con la hora y con el tiempo sin hablar, y no se repiten al recargar', () => {
    const tarde = new Date(2026, 9, 19, 16);
    expect(saludoDeVuelta(tarde, new Date(2026, 9, 19, 9))).toBe('Buenas tardes de nuevo. Aquí sigo.');
    expect(saludoDeVuelta(new Date(2026, 9, 19, 8), new Date(2026, 9, 18, 20))).toMatch(/^Buenos días\. .*desde ayer/);
    expect(saludoDeVuelta(new Date(2026, 9, 19, 21), new Date(2026, 9, 1))).toMatch(/^Buenas noches\. Hacía días/);
    expect(saludoDeVuelta(tarde)).toBe(saludoDeVuelta(tarde));
    expect(saludoDeVuelta(tarde)).not.toBe(saludoDeVuelta(new Date(2026, 9, 20, 16)));
  });
});

describe('red de apoyo', () => {
  it('reconoce la familia, limpia el nombre y entiende un «ahora no»', () => {
    expect(esFamilia('Es mi hermana')).toBe(true);
    expect(esFamilia('mi tía')).toBe(true);
    expect(esFamilia('una amiga del trabajo')).toBe(false);
    expect(limpiarNombre('se llama ana.')).toBe('Ana');
    expect(sinRespuesta('Ahora no')).toBe(true);
    expect(sinRespuesta('No sé.')).toBe(true);
    expect(sinRespuesta('Nos conocimos en el colegio')).toBe(false);
  });
});
