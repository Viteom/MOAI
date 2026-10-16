// Barra única y marco de las pantallas de uso cotidiano (decisión de Mateo, 15 de octubre): tres lugares
// (Brisa, Mi barrio, Mi gente) y «Más». Arriba en el escritorio y abajo en el teléfono; la misma en todas las pantallas.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Map as Mapa, Menu, MessageCircle, Users } from 'lucide-react';

export type Ir = (ruta: string) => void;
export type Lugar = 'brisa' | 'barrio' | 'gente';

// Lo que la barra necesita saber de la cuenta para «Más» (equipo, entidades). Lo pone la portada.
export const Permisos = createContext<{ equipo?: boolean; organizaciones?: boolean }>({});

const LUGARES: { id: Lugar; ruta: string; nombre: string; Icono: typeof Users }[] = [
  { id: 'brisa', ruta: '/inicio', nombre: 'Brisa', Icono: MessageCircle },
  { id: 'barrio', ruta: '/comunidad', nombre: 'Mi barrio', Icono: Mapa },
  { id: 'gente', ruta: '/gente', nombre: 'Mi gente', Icono: Users },
];

export function Barra({ ir, onSalir, actual }: { ir: Ir; onSalir: () => void; actual?: Lugar }) {
  return <header className="barra vidrio" data-reserva>
    <span className="diario-marca">MOAI</span>
    <nav aria-label="Lugares" className="barra-lugares">
      {LUGARES.map(({ id, ruta, nombre, Icono }) => <button key={id} type="button" aria-current={actual === id ? 'page' : undefined} onClick={() => ir(ruta)}>
        <Icono aria-hidden="true"/><span>{nombre}</span>
      </button>)}
      <MenuMas ir={ir} onSalir={onSalir}/>
    </nav>
  </header>;
}

// «Más»: lo que se usa poco. Se cierra al elegir, al tocar fuera o con Escape.
export function MenuMas({ ir, onSalir }: { ir: Ir; onSalir: () => void }) {
  const { equipo, organizaciones } = useContext(Permisos);
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);
  const opcion = (texto: string, hacer: () => void) => <li><button type="button" onClick={() => { setAbierto(false); hacer(); }}>{texto}</button></li>;
  return <div className="barra-mas" ref={caja}>
    <button type="button" aria-expanded={abierto} onClick={() => setAbierto(a => !a)}><Menu aria-hidden="true"/><span>Más</span></button>
    {abierto && <ul className="barra-menu">
      {opcion('Mis lugares', () => ir('/lugares'))}
      {opcion('Avisos', () => ir('/avisos'))}
      {organizaciones && opcion('Convocar como entidad', () => ir('/planes/nuevo'))}
      {equipo && opcion('Equipo de MOAI', () => ir('/equipo'))}
      {opcion('Cerrar sesión', onSalir)}
    </ul>}
  </div>;
}

// Pantallas de lectura (un plan, un Moai, Mis lugares, Avisos…): la barra, un «volver» claro y el contenido.
export function Diario({ titulo, bajada, ir, actual, volver, onSalir, children }: { titulo: string; bajada?: ReactNode; ir: Ir; actual?: Lugar; volver?: { texto: string; ruta: string }; onSalir: () => void; children: ReactNode }) {
  return <div className="diario">
    <Barra ir={ir} onSalir={onSalir} actual={actual}/>
    <main className="diario-contenido">
      {volver && <button type="button" className="diario-volver" onClick={() => ir(volver.ruta)}><ArrowLeft aria-hidden="true"/>{volver.texto}</button>}
      <h1 tabIndex={-1}>{titulo}</h1>
      {bajada && <p className="diario-bajada">{bajada}</p>}
      {children}
    </main>
  </div>;
}
