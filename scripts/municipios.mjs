// Genera src/lib/colombia/municipios.json a partir de la DIVIPOLA del DANE.
// Fuente: https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=5000
// Uso: node scripts/municipios.mjs ruta/divipola.json
// Se descartan las coordenadas a propósito (regla 1: ninguna base guarda coordenadas).
import { readFileSync, writeFileSync } from 'node:fs';

const menores = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en']);
const titulo = texto => texto.toLocaleLowerCase('es').split(/(\s+|-|\()/).map((parte, i) => {
  if (/^[a-záéíóúñü]\.[a-z.]*$/i.test(parte)) return parte.toLocaleUpperCase('es');
  if (i > 0 && menores.has(parte)) return parte;
  return parte.charAt(0).toLocaleUpperCase('es') + parte.slice(1);
}).join('');

const filas = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const municipios = filas
  .map(f => [f.cod_mpio, titulo(f.nom_mpio), titulo(f.dpto)])
  .sort((a, b) => a[1].localeCompare(b[1], 'es') || a[2].localeCompare(b[2], 'es'));
writeFileSync('src/lib/colombia/municipios.json', JSON.stringify(municipios) + '\n');
console.log(`${municipios.length} municipios`);
