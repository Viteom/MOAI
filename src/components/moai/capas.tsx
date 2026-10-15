// Capas de «Mi comunidad» que no dependen de cómo se dibuja el barrio (ilustración o maqueta 3D):
// luces de los planes, burbujas de invitación y las zonas que la interfaz reserva. Sin three.js.
import type { Plan } from '@/lib/api';
import { cuandoCorto } from './mapa';

const MAX_BURBUJAS = 3;
const TALLO = 64; // la línea que sube de la luz a su burbuja (px)

export type Punto = { x: number; y: number };
export type Proyectado = Punto & { id: string };
export type Rect = [number, number, number, number]; // izquierda, arriba, derecha, abajo (px)

export const choca = (a: Rect, b: Rect) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

// Zonas de la pantalla que la interfaz ocupa (encabezado, controles, tarjeta): se marcan con data-reserva.
// Las burbujas nunca se ponen encima y el encuadre inicial deja el tablero en el espacio libre.
export function reservas(caja: HTMLElement): Rect[] {
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
