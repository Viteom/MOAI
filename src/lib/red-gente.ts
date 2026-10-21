import type { PersonaLazo } from './api';
import { categoriaDe, type CategoriaVinculo } from './vinculos';

export type NodoRed = { id: string; tipo: 'persona' | 'moai'; x: number; y: number; ancho: number; alto: number };
type Caja = { x: number; y: number; ancho: number; alto: number };
export const seSuperponen = (a: Caja, b: Caja, margen = 12) => Math.abs(a.x - b.x) < (a.ancho + b.ancho) / 2 + margen && Math.abs(a.y - b.y) < (a.alto + b.alto) / 2 + margen;
// Reserva también el salto de palabras completas: contar solo caracteres subestima
// nombres compuestos como «María Alejandra de los Ángeles Rodríguez».
const lineasNombre = (nombre: string) => Math.max(1, Math.ceil([...nombre].reduce((n, c) => n + (/[MW@]/.test(c) || c.codePointAt(0)! > 0x2e80 ? 1.9 : /[iljt .,'|]/.test(c) ? .45 : 1), 0) / 14) + (nombre.length > 16 ? 1 : 0));
const altoNombre = (nombre: string, grupo = false) => Math.max(84, lineasNombre(nombre) * 24 + (grupo ? 64 : 48));

// Órbitas ilustrativas: ningún radio ni posición equivale a afecto, salud o puntuación.
// Los nombres tienen cajas de tamaño real, sin reducir la tipografía para hacerlos caber.
export function disponerRed(personas: PersonaLazo[], moais: { id: string; nombre: string }[], anchoMin = 1000, altoMin = 540, nombrePropio = '') {
  if (anchoMin < 600) {
    // En teléfono, las órbitas se recorren en vertical: no se empequeñecen los nombres.
    const ancho = Math.max(300, anchoMin), nodos: NodoRed[] = [];
    let arriba = -52, abajo = 110 + (lineasNombre(nombrePropio) - 1) * 24;
    for (const p of personas) {
      const alto = altoNombre(p.nombre, !!p.moais?.length);
      const raiz = categoriaDe(p) === 'raiz';
      nodos.push({ id: p.id, tipo: 'persona', x: ancho / 2 + (raiz ? -20 : 20), y: raiz ? arriba - alto / 2 : abajo + alto / 2, ancho: Math.min(220, ancho - 72), alto });
      if (raiz) arriba -= alto + 28; else abajo += alto + 28;
    }
    for (const m of moais) { const alto = altoNombre(m.nombre); nodos.push({ id: m.id, tipo: 'moai', x: ancho / 2 - 20, y: arriba - alto / 2, ancho: Math.min(220, ancho - 72), alto }); arriba -= alto + 28; }
    const cy = -arriba + 28, alto = Math.max(altoMin, cy + abajo + 24);
    return { ancho, alto, centro: { x: ancho / 2, y: cy }, nodos: nodos.map(n => ({ ...n, y: n.y + cy })), sectores: [] as { id: CategoriaVinculo; x: number; y: number; ancho: number; alto: number }[] };
  }
  const nodos: NodoRed[] = [];
  const sectores: { id: CategoriaVinculo; x: number; y: number; ancho: number; alto: number }[] = [];
  const extra = (lineasNombre(nombrePropio) - 1) * 24;
  const ocupados: Caja[] = [{ x: 0, y: 25 + extra / 2, ancho: 172, alto: 136 + extra }];
  const colocar = (id: string, tipo: NodoRed['tipo'], nombre: string, angulos: number[], grupo = false) => {
    const alto = altoNombre(nombre, grupo);
    for (let vuelta = 0; ; vuelta++) {
      for (const grados of angulos) {
        const a = grados * Math.PI / 180;
        const candidato = { id, tipo, x: Math.cos(a) * ((tipo === 'moai' ? 470 : 310) + vuelta * 200),
          y: Math.sin(a) * ((tipo === 'moai' ? 260 : 160) + vuelta * 130), ancho: 220, alto };
        if (!ocupados.some(o => seSuperponen(candidato, o))) { nodos.push(candidato); ocupados.push(candidato); return; }
      }
    }
  };
  for (const c of ['raiz', 'tronco', 'rama'] as const) {
    const ps = personas.filter(p => categoriaDe(p) === c);
    ps.forEach((p, i) => {
      const [desde, amplitud] = { raiz: [192, 80], tronco: [-92, 80], rama: [15, 150] }[c];
      const angulo = desde + (i + .5) / ps.length * amplitud;
      colocar(p.id, 'persona', p.nombre, [0, -15, 15, -30, 30].map(d => angulo + d), !!p.moais?.length);
    });
  }
  for (const m of moais) colocar(m.id, 'moai', m.nombre, [0, 180, 35, 145, -90, 90]);
  const ancho = Math.max(anchoMin, ...ocupados.map(n => 2 * (Math.abs(n.x) + n.ancho / 2 + 32)));
  const alto = Math.max(altoMin, ...ocupados.map(n => 2 * (Math.abs(n.y) + n.alto / 2 + 32)));
  return { ancho, alto, centro: { x: ancho / 2, y: alto / 2 },
    nodos: nodos.map(n => ({ ...n, x: n.x + ancho / 2, y: n.y + alto / 2 })),
    sectores: sectores.map(n => ({ ...n, x: n.x + ancho / 2, y: n.y + alto / 2 })) };
}
