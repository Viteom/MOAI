// Genera src/lib/colombia/barrios-medellin.json desde la capa «Límite Barrio Vereda Catastral» de Medellín
// (GeoMedellín, Alcaldía de Medellín), descargada en GeoJSON con coordenadas WGS84.
// Uso: node scripts/barrios-medellin.mjs ruta/barrios.geojson
// Se guarda solo código, nombre, comuna y la celda H3 (resolución 8, ~1 km) del centro del barrio.
// Los polígonos y las coordenadas se descartan (regla 1).
// Licencia: confirmar en el portal de GeoMedellín antes de publicar (pendiente de revisión legal).
import { readFileSync, writeFileSync } from 'node:fs';
import { latLngToCell } from 'h3-js';

const RESOLUCION = 8;
const menores = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en']);
const titulo = texto => String(texto ?? '').trim().toLocaleLowerCase('es').split(/(\s+|-|\(|\.)/).map((parte, i) => {
  if (/^[ivx]+$/i.test(parte) && parte.length <= 4 && i > 0) return parte.toUpperCase(); // números romanos: Belén II
  if (i > 0 && menores.has(parte)) return parte;
  return parte.charAt(0).toLocaleUpperCase('es') + parte.slice(1);
}).join('');

// Centroide por área del anillo exterior más grande (suficiente para elegir la celda del barrio).
function centroide(geometria) {
  const poligonos = geometria.type === 'MultiPolygon' ? geometria.coordinates : [geometria.coordinates];
  let mejor = null;
  for (const [anillo] of poligonos) {
    let a = 0, x = 0, y = 0;
    for (let i = 0; i < anillo.length - 1; i++) {
      const [x0, y0] = anillo[i], [x1, y1] = anillo[i + 1];
      const f = x0 * y1 - x1 * y0;
      a += f; x += (x0 + x1) * f; y += (y0 + y1) * f;
    }
    if (a === 0) continue;
    const area = Math.abs(a / 2);
    if (!mejor || area > mejor.area) mejor = { area, lng: x / (3 * a), lat: y / (3 * a) };
  }
  return mejor;
}

const datos = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const barrios = [];
for (const { properties: p, geometry } of datos.features) {
  const centro = geometry && centroide(geometry);
  if (!centro || !p.codigo || !p.nombre_barrio) continue;
  barrios.push([String(p.codigo), titulo(p.nombre_barrio), titulo(p.nombre_comuna), latLngToCell(centro.lat, centro.lng, RESOLUCION)]);
}
barrios.sort((a, b) => a[1].localeCompare(b[1], 'es') || a[2].localeCompare(b[2], 'es'));
writeFileSync('src/lib/colombia/barrios-medellin.json', JSON.stringify(barrios) + '\n');
console.log(`${barrios.length} barrios y veredas`);
