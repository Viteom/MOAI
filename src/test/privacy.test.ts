import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Reglas de privacidad del frontend (AGENTS.md y CLAUDE.md): nada se guarda en el navegador,
// no hay solicitudes a otros dominios y la única llamada de red es a /api del mismo origen.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' ? [] : sourceFiles(path);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}
const files = sourceFiles('src');
const API = join('src', 'lib', 'api.ts');

describe('Privacidad del frontend', () => {
  it('no usa almacenamiento persistente del navegador', () => {
    const forbidden = /(localStorage|sessionStorage|indexedDB|document\.cookie)/;
    expect(files.filter(f => forbidden.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
  it('solo src/lib/api.ts hace solicitudes de red', () => {
    const forbidden = /(\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource)/;
    expect(files.filter(f => f !== API && forbidden.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
  it('src/lib/api.ts solo llama a /api del mismo origen', () => {
    const codigo = readFileSync(API, 'utf8');
    const destinos = [...codigo.matchAll(/fetch\s*\(\s*`([^`]*)`/g)].map(m => m[1]);
    expect(destinos).toEqual(['/api/${ruta}']);
    expect(codigo).toMatch(/credentials: 'same-origin'/);
  });
  it('no pide ubicación, contactos, cámara ni sensores del teléfono', () => {
    const forbidden = /(geolocation|getCurrentPosition|watchPosition|navigator\.contacts|getUserMedia|DeviceMotion|DeviceOrientation|bluetooth)/i;
    expect(files.filter(f => forbidden.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
  it('no referencia dominios externos', () => {
    const external = /(https?:)?\/\/(?!www\.w3\.org)[a-z0-9-]+\.[a-z]{2,}/i;
    expect(files.filter(f => external.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
});
