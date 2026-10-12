// Genera la maqueta de cada hexágono (public/maqueta/{celda}.json) a partir de datos de OpenStreetMap.
// Uso: node scripts/maqueta.mjs datos-osm.json [celda-centro anillos]
//   Sin celda: procesa todas las celdas de los barrios de Medellín y sus dos anillos.
// Datos © colaboradores de OpenStreetMap (ODbL): la atribución se muestra en el mapa.
// Cada archivo trae solo formas en metros relativos al centro de su hexágono (x hacia el este, y hacia el norte):
// edificios con su altura, zonas verdes, agua, quebradas y vías. Nada de nombres, direcciones ni personas.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cellToBoundary, cellToLatLng, gridDisk } from 'h3-js';

const [entrada, centro, anillos = '2'] = process.argv.slice(2);
const osm = JSON.parse(readFileSync(entrada, 'utf8'));
const celdas = centro ? gridDisk(centro, Number(anillos))
  : [...new Set(JSON.parse(readFileSync('src/lib/colombia/barrios-medellin.json', 'utf8')).flatMap(b => gridDisk(b[3], 2)))];

const r1 = v => Math.round(v * 2) / 2; // medio metro basta
const ANCHO_VIA = { trunk: 14, primary: 13, secondary: 11, tertiary: 9, residential: 7, unclassified: 6, living_street: 5, pedestrian: 5, service: 4, footway: 2.5, path: 2 };
const ANCHO_AGUA = { river: 14, canal: 7, stream: 4 };
const PISOS = { house: 2, residential: 3, detached: 2, apartments: 6, commercial: 3, retail: 2, school: 2, church: 3, hospital: 5, university: 4, industrial: 2, warehouse: 2, garage: 1, roof: 1, kiosk: 1, shed: 1 };

function tipoDe(t) {
  if (t.building) return 'edificio';
  if (t.waterway) return 'quebrada';
  if (t.highway) return 'via';
  if (t.natural === 'water') return 'agua';
  if (t.leisure === 'pitch') return 'cancha';
  if (t.landuse === 'forest' || t.natural === 'wood') return 'bosque';
  return 'verde';
}
function pisosDe(t) {
  const niveles = Number(t['building:levels']);
  if (niveles > 0) return Math.min(Math.round(niveles), 30);
  const altura = parseFloat(t.height);
  if (altura > 0) return Math.min(Math.max(Math.round(altura / 3), 1), 30);
  return PISOS[t.building] ?? 2;
}
function area(puntos) {
  let a = 0;
  for (let i = 0; i < puntos.length; i++) { const [x1, y1] = puntos[i], [x2, y2] = puntos[(i + 1) % puntos.length]; a += x1 * y2 - x2 * y1; }
  return Math.abs(a / 2);
}
// Simplificación Douglas-Peucker (en metros).
function simplificar(puntos, tolerancia) {
  if (puntos.length < 4) return puntos;
  const dist = ([x, y], [x1, y1], [x2, y2]) => { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; if (!l) return Math.hypot(x - x1, y - y1); const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l)); return Math.hypot(x - x1 - t * dx, y - y1 - t * dy); };
  let max = 0, idx = 0;
  for (let i = 1; i < puntos.length - 1; i++) { const d = dist(puntos[i], puntos[0], puntos.at(-1)); if (d > max) { max = d; idx = i; } }
  if (max <= tolerancia) return [puntos[0], puntos.at(-1)];
  return [...simplificar(puntos.slice(0, idx + 1), tolerancia).slice(0, -1), ...simplificar(puntos.slice(idx), tolerancia)];
}

mkdirSync('public/maqueta', { recursive: true });
let total = 0;
for (const celda of celdas) {
  const [lat0, lng0] = cellToLatLng(celda);
  const kx = 111_320 * Math.cos(lat0 * Math.PI / 180), ky = 110_574;
  const aMetros = ({ lat, lon }) => [(lon - lng0) * kx, (lat - lat0) * ky];
  const borde = cellToBoundary(celda).map(([lat, lon]) => aMetros({ lat, lon }));
  const radio = Math.max(...borde.map(([x, y]) => Math.hypot(x, y)));
  const dentroDelCirculo = ([x, y], margen = 0) => Math.hypot(x, y) <= radio + margen;
  const dentroDelHex = ([x, y]) => { // punto en polígono convexo
    let signo = 0;
    for (let i = 0; i < borde.length; i++) {
      const [x1, y1] = borde[i], [x2, y2] = borde[(i + 1) % borde.length];
      const c = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1);
      if (c !== 0) { if (signo && Math.sign(c) !== signo) return false; signo = Math.sign(c); }
    }
    return true;
  };
  const salida = { v: 1, celda, edificios: [], verdes: [], agua: [], quebradas: [], vias: [] };
  for (const e of osm.elements) {
    if (!e.geometry?.length) continue;
    const t = e.tags ?? {}, tipo = tipoDe(t);
    let puntos = e.geometry.map(aMetros);
    if (!puntos.some(p => dentroDelCirculo(p, 150))) continue; // lejos de este hexágono
    const plano = pts => pts.flatMap(([x, y]) => [r1(x), r1(y)]);
    if (tipo === 'edificio') {
      const anillo = puntos.slice(0, -1);
      const cx = anillo.reduce((s, p) => s + p[0], 0) / anillo.length, cy = anillo.reduce((s, p) => s + p[1], 0) / anillo.length;
      if (anillo.length < 3 || area(anillo) < 25 || !dentroDelHex([cx, cy])) continue; // cada edificio, en un solo hexágono
      salida.edificios.push([pisosDe(t), ...plano(simplificar(anillo, 0.8))]);
    } else if (tipo === 'via' || tipo === 'quebrada') {
      const linea = plano(simplificar(puntos, 1.5));
      if (tipo === 'via') salida.vias.push([ANCHO_VIA[t.highway] ?? 5, ...linea]);
      else salida.quebradas.push([ANCHO_AGUA[t.waterway] ?? 4, ...linea]);
    } else {
      const anillo = simplificar(puntos.slice(0, -1), 2);
      if (anillo.length < 3) continue;
      if (tipo === 'agua') salida.agua.push(plano(anillo));
      else salida.verdes.push([tipo, ...plano(anillo)]);
    }
  }
  writeFileSync(`public/maqueta/${celda}.json`, JSON.stringify(salida));
  total += salida.edificios.length;
}
console.log(`${celdas.length} hexágonos, ${total} edificios`);
