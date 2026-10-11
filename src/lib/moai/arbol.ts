// Geometría pura del árbol (H2). Sin estado ni efectos, para poder probarla.
export type Punto = { x: number; y: number };

// Puntos de la copa: uno por persona (máximo cinco), repartidos en arco.
export function nodosDeCopa(cantidad: number): Punto[] {
  const n = Math.min(Math.max(cantidad, 0), 5);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1..1
    return { x: Math.round(195 + t * 110), y: Math.round(128 - (1 - Math.abs(t)) * 22) };
  });
}

// Casas del subsuelo: una por persona, a lo ancho y a distintas profundidades.
export function nodosDeMicelio(cantidad: number): Punto[] {
  const n = Math.min(Math.max(cantidad, 0), 5);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    return { x: Math.round(195 + t * 140), y: 120 + (i % 2) * 52 };
  });
}
