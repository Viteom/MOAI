import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Reglas del prototipo cero (AGENTS.md y CLAUDE.md): todo vive en memoria y
// no hay solicitudes a otros dominios ni almacenamiento persistente.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' ? [] : sourceFiles(path);
    return /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}
const files = sourceFiles('src');

describe('Privacidad del prototipo', () => {
  it('no usa almacenamiento persistente del navegador', () => {
    const forbidden = /(localStorage|sessionStorage|indexedDB|document\.cookie)/;
    expect(files.filter(f => forbidden.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
  it('no hace solicitudes de red desde el código', () => {
    const forbidden = /(\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource)/;
    expect(files.filter(f => forbidden.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
  it('no referencia dominios externos', () => {
    const external = /(https?:)?\/\/(?!www\.w3\.org)[a-z0-9-]+\.[a-z]{2,}/i;
    expect(files.filter(f => external.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
});
