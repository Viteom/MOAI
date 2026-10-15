// Maqueta 3D de la comunidad (diseño de Mateo, 12 de octubre): cada hexágono es una isla elevada con el barrio
// real encima (datos © colaboradores de OpenStreetMap), con estilo de maqueta nocturna: techos de teja y
// terrazas verdes, ventanas encendidas, árboles frondosos, agua, faroles y neblina. Cámara inclinada y fija.
// Las luces son planes en lugares públicos, nunca personas. Las burbujas y la tarjeta van encima, derechas.
// Sin servicios externos: los archivos de cada hexágono están en /maqueta/{celda}.json (mismo origen).
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { archivoDeMaqueta, type Mapa, type Plan } from '@/lib/api';
import { cuandoCorto } from './mapa';

type Disponible = Extract<Mapa, { disponible: true }>;
type Celda = Disponible['celdas'][number];
type Archivo = { edificios: number[][]; verdes: (string | number)[][]; agua: number[][]; quebradas: number[][]; vias: number[][] };

const ALTO_PISO = 3 * 2.2;      // la maqueta exagera la altura para que se lea a esta escala
const SEPARACION = 1;           // terreno continuo: los hexágonos se tocan (segundo diseño de Mateo)
const ELEVACION = (50 * Math.PI) / 180;
const MAX_BURBUJAS = 3;
const TALLO = 64; // la línea que sube de la luz a su burbuja (px)

export function soportaWebGL() {
  if (typeof document === 'undefined') return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

// Azar con semilla: la misma celda siempre se ve igual.
function azarDe(texto: string) {
  let s = [...texto].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function texturaVentanas() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64);
  const azar = azarDe('ventanas');
  for (let fila = 0; fila < 4; fila++) for (let col = 0; col < 4; col++) {
    if (azar() < 0.42) continue; // no todas las ventanas están encendidas
    g.fillStyle = azar() < 0.8 ? '#ffc56b' : '#ffe2a6';
    g.fillRect(col * 16 + 5, fila * 16 + 4, 6, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 12, 1 / (ALTO_PISO * 4));
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texturaBrillo(color: string) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, '#ffffff'); r.addColorStop(0.18, color); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const pares = (plano: number[], desde = 0) => { const p: [number, number][] = []; for (let i = desde; i + 1 < plano.length; i += 2) p.push([plano[i], plano[i + 1]]); return p; };
// Coordenadas de los archivos: x al este, y al norte (metros desde el centro del hexágono).
// En la forma que se extruye y luego se acuesta: (x, y) se conserva y la altura queda hacia arriba.
const forma = (puntos: [number, number][]) => new THREE.Shape(puntos.map(([x, y]) => new THREE.Vector2(x, y)));
const acostar = (g: THREE.BufferGeometry) => g.rotateX(-Math.PI / 2);

// Cinta plana a lo largo de una línea (vías y quebradas).
function cinta(puntos: [number, number][], ancho: number, altura: number) {
  const pos: number[] = [];
  for (let i = 0; i + 1 < puntos.length; i++) {
    const [x1, y1] = puntos[i], [x2, y2] = puntos[i + 1];
    const l = Math.hypot(x2 - x1, y2 - y1) || 1, nx = (-(y2 - y1) / l) * ancho / 2, ny = ((x2 - x1) / l) * ancho / 2;
    const a = [x1 + nx, altura, -(y1 + ny)], b = [x1 - nx, altura, -(y1 - ny)], c = [x2 + nx, altura, -(y2 + ny)], d = [x2 - nx, altura, -(y2 - ny)];
    pos.push(...a, ...b, ...c, ...c, ...b, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function puntoEnPoligono(x: number, y: number, p: [number, number][]) {
  let dentro = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

// Paleta de ilustración a tinta y acuarela (segundo diseño de Mateo): tonos apagados y cálidos.
const PALETA = {
  pasto: '#4e5d3a', via: '#8a7658', sendero: '#b8a07a', parque: '#5d7444', cancha: '#6d8a4c',
  bosque: '#3a4f30', agua: '#3f9aa3', copa: ['#3f5a32', '#4c6a38', '#33492b', '#5a7740'], florecido: '#8d5a9e',
  techos: ['#9a5a3e', '#8a4e35', '#a86c48', '#76503a', '#6f7a4c'], muros: ['#d9c8a4', '#cdb48c', '#e2d4b6', '#c79f7b', '#bfae8e'],
  tinta: '#1e1a14', rejilla: '#e6edd5',
};

// Construye un hexágono con su barrio. Todo se recorta a la forma del hexágono (planos de recorte propios).
function construirIsla(celda: Celda, archivo: Archivo | null, recursos: { ventanas: THREE.Texture }) {
  const grupo = new THREE.Group();
  grupo.position.set(celda.x, 0, celda.y);
  const relativo = celda.puntos.map(([px, py]) => [(px - celda.x) * SEPARACION, -(py - celda.y) * SEPARACION] as [number, number]);
  // Planos de recorte en coordenadas del mundo, con la normal hacia adentro.
  const planos = relativo.map((p, i) => {
    const q = relativo[(i + 1) % relativo.length];
    const a = new THREE.Vector3(celda.x + p[0], 0, celda.y - p[1]), b = new THREE.Vector3(celda.x + q[0], 0, celda.y - q[1]);
    const borde = b.clone().sub(a);
    const normal = new THREE.Vector3(-borde.z, 0, borde.x).normalize();
    if (normal.dot(new THREE.Vector3(celda.x, 0, celda.y).sub(a)) < 0) normal.negate();
    return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, a);
  });
  // Lambert con sombreado plano: se ve como color de acuarela, no como plástico.
  const material = (opciones: THREE.MeshLambertMaterialParameters) => new THREE.MeshLambertMaterial({ ...opciones, clippingPlanes: planos });

  // El terreno es continuo: cada hexágono es solo un trozo de suelo y la rejilla queda como líneas finas encima.
  const suelo = new THREE.Mesh(acostar(new THREE.ShapeGeometry(forma(relativo))), new THREE.MeshLambertMaterial({ color: PALETA.pasto }));
  suelo.receiveShadow = true;
  grupo.add(suelo);
  const linea = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(relativo.map(([x, y]) => new THREE.Vector3(x, 2.5, -y))),
    new THREE.LineBasicMaterial({ color: PALETA.rejilla, transparent: true, opacity: celda.anillo === 0 ? 0.75 : 0.28, depthWrite: false }));
  linea.renderOrder = 2;
  grupo.add(linea);
  if (!archivo) return grupo;

  const azar = azarDe(celda.id ?? `${celda.x},${celda.y}`);
  const local = (x: number, y: number) => new THREE.Vector3(x, 0, -y); // del archivo al grupo

  // Zonas verdes y agua.
  const verdes: THREE.BufferGeometry[] = [], canchas: THREE.BufferGeometry[] = [], aguas: THREE.BufferGeometry[] = [];
  const areasConArboles: { puntos: [number, number][]; densidad: number }[] = [];
  for (const [tipo, ...plano] of archivo.verdes) {
    const puntos = pares(plano as number[]);
    if (puntos.length < 3) continue;
    const g = acostar(new THREE.ShapeGeometry(forma(puntos))).translate(0, 0.6, 0);
    (tipo === 'cancha' ? canchas : verdes).push(g);
    if (tipo !== 'cancha') areasConArboles.push({ puntos, densidad: tipo === 'bosque' ? 1 / 90 : 1 / 260 });
  }
  for (const plano of archivo.agua) { const puntos = pares(plano); if (puntos.length >= 3) aguas.push(acostar(new THREE.ShapeGeometry(forma(puntos))).translate(0, 0.9, 0)); }
  for (const [ancho, ...plano] of archivo.quebradas) aguas.push(cinta(pares(plano), ancho, 0.9));
  const agregar = (geos: THREE.BufferGeometry[], mat: THREE.Material, sombra = false) => {
    if (!geos.length) return;
    // Formas y cintas no traen los mismos atributos: se deja solo posición y normal para poder unirlas.
    const limpias = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); return n; });
    const m = new THREE.Mesh(mergeGeometries(limpias, false), mat);
    m.receiveShadow = sombra;
    grupo.add(m);
  };
  agregar(verdes, material({ color: PALETA.parque }), true);
  agregar(canchas, material({ color: PALETA.cancha }), true);
  agregar(aguas, material({ color: PALETA.agua, emissive: '#2a8f9a', emissiveIntensity: 0.7 }));

  // Vías y faroles.
  const vias: THREE.BufferGeometry[] = [], senderos: THREE.BufferGeometry[] = [];
  const faroles: THREE.Vector3[] = [], arbolesDeCalle: [number, number][] = [];
  for (const [ancho, ...plano] of archivo.vias) {
    const puntos = pares(plano);
    (ancho <= 2.5 ? senderos : vias).push(cinta(puntos, ancho, 0.4));
    if (ancho < 4) continue;
    let resto = 0;
    for (let i = 0; i + 1 < puntos.length; i++) {
      const [x1, y1] = puntos[i], [x2, y2] = puntos[i + 1], l = Math.hypot(x2 - x1, y2 - y1);
      for (let d = 45 - resto; d < l; d += 45) {
        const t = d / l, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t, nx = -(y2 - y1) / l, ny = (x2 - x1) / l, lado = ancho / 2 + 3;
        faroles.push(local(x + nx * lado, y + ny * lado).setY(9));
        if (azar() < 0.6) arbolesDeCalle.push([x - nx * (lado + 2), y - ny * (lado + 2)]);
      }
      resto = (resto + l) % 45;
    }
  }
  agregar(vias, material({ color: PALETA.via }), true);
  agregar(senderos, material({ color: PALETA.sendero }), true);
  if (faroles.length) {
    const lampara = new THREE.InstancedMesh(new THREE.SphereGeometry(2.6, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd889', clippingPlanes: planos }), Math.min(faroles.length, 500));
    const m = new THREE.Matrix4();
    for (let i = 0; i < lampara.count; i++) lampara.setMatrixAt(i, m.makeTranslation(faroles[i].x, faroles[i].y, faroles[i].z));
    grupo.add(lampara);
  }

  // Edificios: muros con ventanas encendidas y techos de teja o terrazas verdes.
  const muros: THREE.BufferGeometry[] = [], techos: THREE.BufferGeometry[] = [], trazos: THREE.BufferGeometry[] = [];
  const colorear = (g: THREE.BufferGeometry, color: THREE.Color) => {
    const n = g.getAttribute('position').count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([color.r, color.g, color.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  };
  for (const [pisos, ...plano] of archivo.edificios) {
    const puntos = pares(plano);
    if (puntos.length < 3) continue;
    const g = acostar(new THREE.ExtrudeGeometry(forma(puntos), { depth: Math.max(1, pisos) * ALTO_PISO, bevelEnabled: false }));
    // ExtrudeGeometry trae dos grupos: tapas (techo y piso) y paredes. Se separan para pintarlos distinto.
    const [tapas, paredes] = g.groups;
    const parte = (inicio: number, cuenta: number) => {
      const p = new THREE.BufferGeometry();
      for (const nombre of ['position', 'normal', 'uv'] as const) {
        const a = g.getAttribute(nombre) as THREE.BufferAttribute;
        p.setAttribute(nombre, new THREE.BufferAttribute((a.array as Float32Array).slice(inicio * a.itemSize, (inicio + cuenta) * a.itemSize), a.itemSize));
      }
      return p;
    };
    trazos.push(new THREE.EdgesGeometry(g, 30));
    techos.push(colorear(parte(tapas.start, tapas.count), new THREE.Color(PALETA.techos[Math.floor(azar() * PALETA.techos.length)])));
    muros.push(colorear(parte(paredes.start, paredes.count), new THREE.Color(PALETA.muros[Math.floor(azar() * PALETA.muros.length)])));
  }
  if (muros.length) {
    const m = new THREE.Mesh(mergeGeometries(muros), material({ vertexColors: true, flatShading: true, emissive: '#ffffff', emissiveMap: recursos.ventanas, emissiveIntensity: 1.25 }));
    m.castShadow = m.receiveShadow = true;
    grupo.add(m);
    const t = new THREE.Mesh(mergeGeometries(techos), material({ vertexColors: true, flatShading: true }));
    t.castShadow = t.receiveShadow = true;
    grupo.add(t);
    const tinta = new THREE.LineSegments(mergeGeometries(trazos), new THREE.LineBasicMaterial({ color: PALETA.tinta, transparent: true, opacity: 0.55, clippingPlanes: planos }));
    grupo.add(tinta);
  }

  // Árboles: copas redondas en parques y bosques, y algunos en la calle. Unos pocos florecidos (guayacanes).
  const copas: { x: number; y: number; r: number; color: string }[] = [];
  for (const { puntos, densidad } of areasConArboles) {
    const xs = puntos.map(p => p[0]), ys = puntos.map(p => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const intentos = Math.min(600, Math.round((x1 - x0) * (y1 - y0) * densidad));
    for (let i = 0; i < intentos; i++) {
      const x = x0 + azar() * (x1 - x0), y = y0 + azar() * (y1 - y0);
      if (puntoEnPoligono(x, y, puntos)) copas.push({ x, y, r: 6 + azar() * 5, color: azar() < 0.05 ? PALETA.florecido : PALETA.copa[Math.floor(azar() * PALETA.copa.length)] });
    }
  }
  for (const [x, y] of arbolesDeCalle) copas.push({ x, y, r: 5 + azar() * 3, color: PALETA.copa[Math.floor(azar() * PALETA.copa.length)] });
  if (copas.length) {
    const cuenta = Math.min(copas.length, 1600);
    const arboles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ flatShading: true, clippingPlanes: planos }), cuenta);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), color = new THREE.Color();
    for (let i = 0; i < cuenta; i++) {
      const { x, y, r, color: c } = copas[i];
      m.compose(new THREE.Vector3(x, r * 1.35, -y), q, new THREE.Vector3(r, r * 1.1, r));
      arboles.setMatrixAt(i, m);
      arboles.setColorAt(i, color.set(c));
    }
    arboles.castShadow = true;
    grupo.add(arboles);
  }
  return grupo;
}

type Punto = { x: number; y: number };
type Proyectado = Punto & { id: string };
type Rect = [number, number, number, number]; // izquierda, arriba, derecha, abajo (px)
type Vista = { zoom: number; dx: number; dy: number }; // desplazamiento en unidades de cámara

const choca = (a: Rect, b: Rect) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

// Zonas de la pantalla que la interfaz ocupa (encabezado, controles, tarjeta): se marcan con data-reserva.
// Las burbujas nunca se ponen encima y el encuadre inicial deja el tablero en el espacio libre.
function reservas(caja: HTMLElement): Rect[] {
  const base = caja.getBoundingClientRect();
  const raiz = caja.closest('.comunidad') ?? document.body;
  return [...raiz.querySelectorAll<HTMLElement>('[data-reserva]')].map(el => {
    const r = el.getBoundingClientRect();
    return [r.left - base.left - 8, r.top - base.top - 8, r.right - base.left + 8, r.bottom - base.top + 8] as Rect;
  }).filter(r => r[2] > r[0] && r[3] > r[1]);
}

// Capa 2: luces interactivas, ancladas a la escena (se recalculan con cada movimiento de cámara).
export function CapaLuces({ luces, porId, elegido, onElegir }: { luces: Proyectado[]; porId: Map<string, Plan>; elegido: string | null; onElegir: (id: string | null) => void }) {
  return <div className="capa capa-luces">
    {luces.map(l => {
      const plan = porId.get(l.id);
      if (!plan) return null;
      const pin = plan.voy || plan.mio ? 'mia' : plan.repite ? 'semanal' : 'semana';
      return <button key={l.id} type="button" className={`mapa-luz maqueta-pin pin-${pin}`} style={{ left: l.x, top: l.y }} aria-pressed={elegido === l.id}
        aria-label={`${plan.titulo} · ${cuandoCorto(plan)} · ${plan.lugarPublico} · ${plan.franja}`} onClick={() => onElegir(elegido === l.id ? null : l.id)}/>;
    })}
  </div>;
}

// Capa 3: burbujas de invitación. Las más cercanas al centro, sin repetir autor, sin chocar entre sí
// ni con la interfaz. Si una burbuja no cabe, queda solo su luz.
export function CapaBurbujas({ luces, porId, ancho, alto, ocupado, onElegir }: { luces: Proyectado[]; porId: Map<string, Plan>; ancho: number; alto: number; ocupado: Rect[]; onElegir: (id: string) => void }) {
  const ANCHO_B = 250, ALTO_B = 100;
  const puestas: { l: Proyectado; abajo: boolean; izquierda: number; rect: Rect }[] = [];
  const centro = { x: ancho / 2, y: alto / 2 };
  for (const l of [...luces].sort((a, b) => Math.hypot(a.x - centro.x, a.y - centro.y) - Math.hypot(b.x - centro.x, b.y - centro.y))) {
    if (puestas.length >= MAX_BURBUJAS || l.x < 0 || l.x > ancho || l.y < 0 || l.y > alto) continue;
    if (puestas.some(p => porId.get(p.l.id)?.autor === porId.get(l.id)?.autor)) continue;
    for (const abajo of [false, true]) {
      const izquierda = Math.min(Math.max(l.x - ANCHO_B / 2, 12), ancho - ANCHO_B - 12);
      const arriba = abajo ? l.y + TALLO : l.y - TALLO - ALTO_B;
      const rect: Rect = [izquierda, arriba, izquierda + ANCHO_B, arriba + ALTO_B];
      if (arriba < 0 || rect[3] > alto) continue;
      if (puestas.some(p => choca(p.rect, rect)) || ocupado.some(o => choca(o, rect))) continue;
      // Tampoco encima de otras luces: cada luz sigue visible y tocable.
      if (luces.some(o => o.id !== l.id && choca([o.x - 26, o.y - 26, o.x + 26, o.y + 26], rect))) continue;
      if (puestas.some(p => choca([l.x - 26, l.y - 26, l.x + 26, l.y + 26], p.rect))) continue;
      puestas.push({ l, abajo, izquierda, rect });
      break;
    }
  }
  return <div className="capa capa-burbujas" aria-hidden="true">
    {puestas.map(({ l, abajo, izquierda }) => {
      const plan = porId.get(l.id)!;
      return <span key={l.id}>
        <span className="maqueta-tallo" style={{ left: l.x, top: abajo ? l.y : l.y - TALLO, height: TALLO }}/>
        <button type="button" tabIndex={-1} className="mapa-burbuja maqueta-burbuja" onClick={() => onElegir(l.id)}
          style={{ left: izquierda, top: abajo ? l.y + TALLO : l.y - TALLO - ALTO_B, width: ANCHO_B }}>
          <strong>{plan.mio ? 'Tú' : plan.autor}:</strong> {plan.titulo.charAt(0).toLocaleLowerCase('es') + plan.titulo.slice(1)}
        </button>
      </span>;
    })}
  </div>;
}

export function Maqueta({ mapa, planes, elegido, onElegir }: { mapa: Disponible; planes: Plan[]; elegido: string | null; onElegir: (id: string | null) => void }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [luces, setLuces] = useState<Proyectado[]>([]);
  const [tuZona, setTuZona] = useState<Punto | null>(null);
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });
  const [ocupado, setOcupado] = useState<Rect[]>([]);
  const [listo, setListo] = useState(false);
  const porId = useMemo(() => new Map(planes.map(p => [p.id, p])), [planes]);
  const visibles = useMemo(() => mapa.planes.filter(l => porId.has(l.id)), [mapa, porId]);
  const control = useRef<{ dibujar: () => void; mover: (dxPx: number, dyPx: number) => void; acercar: (factor: number, px?: Punto) => void; enfocar: (id: string) => void }>(undefined);
  const elegidoRef = useRef(elegido);
  elegidoRef.current = elegido;
  // Al elegir un plan, si su luz quedó debajo de la tarjeta o del encabezado, la escena se corre para mostrarla.
  useEffect(() => { if (elegido) control.current?.enfocar(elegido); else control.current?.dibujar(); }, [elegido]);

  useEffect(() => {
    const caja = contenedor.current;
    if (!caja) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'capa-escena';
    caja.prepend(renderer.domElement);

    // ---- Capa 1: escena del barrio ----
    const escena = new THREE.Scene();
    const fondo = new THREE.Color('#1f2a22');
    escena.background = fondo;
    const radioTablero = Math.max(...mapa.celdas.flatMap(c => c.puntos.map(([x, y]) => Math.hypot(x, y))));
    escena.fog = new THREE.Fog(fondo, radioTablero * 6.8, radioTablero * 8.4);
    escena.add(new THREE.HemisphereLight('#b9d4e6', '#4a3a22', 1.1));
    escena.add(new THREE.AmbientLight('#ffe2b8', 0.45));
    const luna = new THREE.DirectionalLight('#ffeccc', 1.6);
    luna.position.set(-radioTablero * 0.6, radioTablero * 1.4, radioTablero * 0.9);
    luna.castShadow = true;
    luna.shadow.mapSize.set(2048, 2048);
    Object.assign(luna.shadow.camera, { left: -radioTablero, right: radioTablero, top: radioTablero, bottom: -radioTablero, near: 10, far: radioTablero * 4 });
    luna.shadow.bias = -0.0005;
    escena.add(luna);
    escena.add(new THREE.Mesh(new THREE.CircleGeometry(radioTablero * 5, 48).rotateX(-Math.PI / 2).translate(0, -0.5, 0), new THREE.MeshLambertMaterial({ color: '#3d4a30' })));
    const azar = azarDe('bosque');
    const cuentaBosque = 1400;
    const bosque = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: '#33462c', flatShading: true }), cuentaBosque);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < cuentaBosque; i++) {
      const a = azar() * Math.PI * 2, d = radioTablero * (1.02 + azar() * 1.6), r = 9 + azar() * 9;
      m.compose(new THREE.Vector3(Math.cos(a) * d, r * 1.1, Math.sin(a) * d), q, new THREE.Vector3(r, r * 1.2, r));
      bosque.setMatrixAt(i, m);
    }
    escena.add(bosque);
    const recursos = { ventanas: texturaVentanas() };
    const islas = new Map<Celda, THREE.Group>();
    for (const celda of mapa.celdas) { const isla = construirIsla(celda, null, recursos); islas.set(celda, isla); escena.add(isla); }
    // Un brillo suave en el suelo bajo cada luz (la luz interactiva va en la capa HTML, encima).
    const halos = { semana: texturaBrillo('#cefa63'), semanal: texturaBrillo('#8be4d5'), mia: texturaBrillo('#fff1c2') };
    const lucesPlan = visibles.map(l => {
      const plan = porId.get(l.id)!;
      const tipo = plan.voy || plan.mio ? 'mia' : plan.repite ? 'semanal' : 'semana';
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: halos[tipo], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
      sprite.position.set(l.x, 6, l.y);
      sprite.scale.setScalar(radioTablero / 9);
      escena.add(sprite);
      return { id: l.id, posicion: new THREE.Vector3(l.x, 6, l.y) };
    });

    // ---- Cámara: encuadre inicial en el espacio libre + desplazamiento y zoom de la persona ----
    const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, radioTablero * 20);
    const distancia = radioTablero * 6;
    camara.position.set(0, Math.sin(ELEVACION) * distancia, Math.cos(ELEVACION) * distancia);
    camara.lookAt(0, 0, 0);
    camara.updateMatrixWorld();
    // Límites del tablero en unidades de cámara.
    let bMinX = Infinity, bMaxX = -Infinity, bMinY = Infinity, bMaxY = -Infinity;
    for (const c of mapa.celdas) for (const [x, y] of c.puntos) {
      const v = new THREE.Vector3(x, 0, y).applyMatrix4(camara.matrixWorldInverse);
      bMinX = Math.min(bMinX, v.x); bMaxX = Math.max(bMaxX, v.x); bMinY = Math.min(bMinY, v.y); bMaxY = Math.max(bMaxY, v.y);
    }
    const vista: Vista = { zoom: 1, dx: 0, dy: 0 };
    let base = { u: 1, left: 0, top: 0 }; // unidades por px y esquina del encuadre inicial

    const encuadrar = (ancho: number, alto: number, libres: Rect[]) => {
      // Espacio libre: la pantalla menos lo que ocupan encabezado y controles de arriba y abajo.
      const arriba = Math.max(0, ...libres.filter(r => r[1] < alto * 0.35).map(r => r[3]));
      const abajo = Math.min(alto, ...libres.filter(r => r[3] > alto * 0.65 && r[2] - r[0] > ancho * 0.5).map(r => r[1]));
      const aw = ancho, ah = Math.max(alto * 0.4, abajo - arriba);
      const bw = bMaxX - bMinX, bh = bMaxY - bMinY;
      const angosto = ancho < 761;
      // En el teléfono el tablero llena el ancho (se puede desplazar para ver los bordes); en escritorio cabe entero.
      const u = angosto ? (bw / aw) / 1.2 : Math.max(bw / aw, bh / ah) * 1.04;
      const cx = (bMinX + bMaxX) / 2, cy = (bMinY + bMaxY) / 2;
      base = { u, left: cx - (aw / 2) * u, top: cy + (arriba + ah / 2) * u };
    };
    const aplicar = (ancho: number, alto: number) => {
      const u = base.u / vista.zoom;
      // El zoom se hace alrededor del centro del encuadre inicial.
      const cx0 = base.left + (ancho / 2) * base.u, cy0 = base.top - (alto / 2) * base.u;
      const left = cx0 - (ancho / 2) * u + vista.dx, top = cy0 + (alto / 2) * u + vista.dy;
      Object.assign(camara, { left, right: left + ancho * u, top, bottom: top - alto * u });
      camara.updateProjectionMatrix();
    };
    const limitar = () => {
      // Que el tablero nunca se salga del todo de la pantalla.
      const margenX = (bMaxX - bMinX) / 2, margenY = (bMaxY - bMinY) / 2;
      vista.dx = Math.min(Math.max(vista.dx, -margenX), margenX);
      vista.dy = Math.min(Math.max(vista.dy, -margenY), margenY);
      vista.zoom = Math.min(Math.max(vista.zoom, 0.8), 3.5);
    };
    const proyectar = (v: THREE.Vector3, ancho: number, alto: number): Punto => {
      const p = v.clone().project(camara);
      return { x: ((p.x + 1) / 2) * ancho, y: ((1 - p.y) / 2) * alto };
    };
    let pendiente = 0;
    const dibujar = () => {
      cancelAnimationFrame(pendiente);
      pendiente = requestAnimationFrame(() => {
        const ancho = caja.clientWidth || 1, alto = caja.clientHeight || 1;
        renderer.setSize(ancho, alto, false);
        aplicar(ancho, alto);
        renderer.render(escena, camara);
        setTamano({ ancho, alto });
        setOcupado(reservas(caja));
        setLuces(lucesPlan.map(l => ({ id: l.id, ...proyectar(l.posicion, ancho, alto) })));
        setTuZona(proyectar(new THREE.Vector3(0, 0, radioTablero * 0.12), ancho, alto));
      });
    };
    const reencuadrar = () => { encuadrar(caja.clientWidth || 1, caja.clientHeight || 1, reservas(caja)); dibujar(); };
    control.current = {
      dibujar,
      mover: (dxPx, dyPx) => { const u = base.u / vista.zoom; vista.dx -= dxPx * u; vista.dy += dyPx * u; limitar(); dibujar(); },
      acercar: (factor, px) => {
        const ancho = caja.clientWidth || 1, alto = caja.clientHeight || 1;
        // Acercar hacia el punto señalado (rueda o pellizco), o hacia el centro.
        const objetivo = px ?? { x: ancho / 2, y: alto / 2 };
        const antes = base.u / vista.zoom;
        vista.zoom *= factor; limitar();
        const despues = base.u / vista.zoom;
        vista.dx += (objetivo.x - ancho / 2) * (antes - despues);
        vista.dy -= (objetivo.y - alto / 2) * (antes - despues);
        limitar(); dibujar();
      },
      enfocar: id => {
        const luz = lucesPlan.find(l => l.id === id);
        if (!luz) return;
        const ancho = caja.clientWidth || 1, alto = caja.clientHeight || 1;
        aplicar(ancho, alto);
        const p = proyectar(luz.posicion, ancho, alto);
        // Esperar a que la tarjeta aparezca para saber qué tapa.
        requestAnimationFrame(() => {
          const tapado = reservas(caja).some(r => p.x > r[0] - 30 && p.x < r[2] + 30 && p.y > r[1] - 30 && p.y < r[3] + 30);
          if (tapado) {
            const libres = reservas(caja);
            const arriba = Math.max(0, ...libres.filter(r => r[1] < alto * 0.35).map(r => r[3]));
            const tarjeta = libres.find(r => r[3] > alto * 0.6);
            const destino = { x: ancho / 2 + (tarjeta && tarjeta[0] < ancho / 2 && ancho > 760 ? (tarjeta[2]) / 2 : 0), y: arriba + ((tarjeta?.[1] ?? alto) - arriba) / 2 };
            control.current?.mover(destino.x - p.x, destino.y - p.y);
          } else dibujar();
        });
      },
    };
    reencuadrar();

    let vigente = true;
    void Promise.all(mapa.celdas.map(async celda => {
      if (!celda.id) return;
      const archivo = await archivoDeMaqueta<Archivo>(celda.id);
      if (!vigente || !archivo) return;
      escena.remove(islas.get(celda)!);
      const isla = construirIsla(celda, archivo, recursos);
      islas.set(celda, isla);
      escena.add(isla);
    })).then(() => { if (vigente) { dibujar(); setListo(true); } });

    // ---- Desplazar (arrastrar) y acercar (rueda, pellizco) ----
    const punteros = new Map<number, Punto>();
    let distanciaPellizco = 0;
    const lienzo = renderer.domElement;
    const alBajar = (e: PointerEvent) => { punteros.set(e.pointerId, { x: e.clientX, y: e.clientY }); lienzo.setPointerCapture(e.pointerId); };
    const alMover = (e: PointerEvent) => {
      const antes = punteros.get(e.pointerId);
      if (!antes) return;
      punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (punteros.size === 2) {
        const [a, b] = [...punteros.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (distanciaPellizco) control.current?.acercar(d / distanciaPellizco);
        distanciaPellizco = d;
      } else control.current?.mover(e.clientX - antes.x, e.clientY - antes.y);
    };
    const alSoltar = (e: PointerEvent) => { punteros.delete(e.pointerId); distanciaPellizco = 0; };
    const alRodar = (e: WheelEvent) => {
      e.preventDefault();
      const r = caja.getBoundingClientRect();
      control.current?.acercar(e.deltaY < 0 ? 1.12 : 1 / 1.12, { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    lienzo.addEventListener('pointerdown', alBajar);
    lienzo.addEventListener('pointermove', alMover);
    lienzo.addEventListener('pointerup', alSoltar);
    lienzo.addEventListener('pointercancel', alSoltar);
    lienzo.addEventListener('wheel', alRodar, { passive: false });

    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(reencuadrar) : null;
    observador?.observe(caja);
    return () => {
      vigente = false;
      cancelAnimationFrame(pendiente);
      observador?.disconnect();
      lienzo.removeEventListener('pointerdown', alBajar);
      lienzo.removeEventListener('pointermove', alMover);
      lienzo.removeEventListener('pointerup', alSoltar);
      lienzo.removeEventListener('pointercancel', alSoltar);
      lienzo.removeEventListener('wheel', alRodar);
      renderer.dispose();
      escena.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) o.geometry.dispose(); });
      lienzo.remove();
    };
    // Las luces cambian con los planes; el tablero, con el lugar.
  }, [mapa, visibles, porId]);

  return <div className={`maqueta${listo ? ' lista' : ''}`} ref={contenedor}>
    {tuZona && <span className="capa mapa-tu-zona" style={{ left: tuZona.x, top: tuZona.y }}>Tu zona</span>}
    <CapaLuces luces={luces} porId={porId} elegido={elegido} onElegir={onElegir}/>
    <CapaBurbujas luces={luces} porId={porId} ancho={tamano.ancho} alto={tamano.alto} onElegir={onElegir}
      ocupado={tuZona ? [...ocupado, [tuZona.x - 60, tuZona.y - 18, tuZona.x + 60, tuZona.y + 18]] : ocupado}/>
    <div className="maqueta-zoom" data-reserva>
      <button type="button" aria-label="Acercar" onClick={() => control.current?.acercar(1.3)}>+</button>
      <button type="button" aria-label="Alejar" onClick={() => control.current?.acercar(1 / 1.3)}>−</button>
    </div>
    <p className="maqueta-creditos">Datos del barrio © colaboradores de OpenStreetMap</p>
  </div>;
}
