// Marco de las pantallas de uso cotidiano: encabezado con secciones y contenido de lectura.
import { useState, type ReactNode } from 'react';
import { Menu as Menu2 } from 'lucide-react';

export type Ir = (ruta: string) => void;

export function Diario({ titulo, bajada, ir, actual, onSalir, children }: { titulo: string; bajada?: ReactNode; ir: Ir; actual: string; onSalir: () => void; children: ReactNode }) {
  const enlaces: [string, string][] = [['/inicio', 'Inicio'], ['/comunidad', 'Mi comunidad'], ['/lazos', 'Mis lazos'], ['/gente', 'Mi gente'], ['/zona', 'Mi zona'], ['/lugares', 'Mis lugares'], ['/avisos', 'Avisos']];
  return <div className="diario">
    <header className="diario-cabecera">
      <span className="diario-marca">MOAI</span>
      <nav aria-label="Secciones">
        {enlaces.map(([ruta, nombre]) => <button key={ruta} type="button" aria-current={actual === ruta ? 'page' : undefined} onClick={() => ir(ruta)}>{nombre}</button>)}
        <button type="button" onClick={onSalir}>Cerrar sesión</button>
      </nav>
    </header>
    <main className="diario-contenido">
      <h1 tabIndex={-1}>{titulo}</h1>
      {bajada && <p className="diario-bajada">{bajada}</p>}
      {children}
    </main>
  </div>;
}

// Menú ☰ compartido: lo que no cabe en la barra (sobre todo en el teléfono).
export function MenuMas({ ir, onSalir, equipo, organizaciones }: { ir: Ir; onSalir: () => void; equipo?: boolean; organizaciones?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  return <div className="selector-lugar-caja">
    <button type="button" className="menu-boton" aria-expanded={abierto} aria-label="Más opciones" onClick={() => setAbierto(a => !a)}><Menu2 aria-hidden="true"/></button>
    {abierto && <ul className="selector-lugar-lista menu-lista">
      <li><button type="button" onClick={() => ir('/inicio')}>Inicio con Brisa</button></li>
      <li><button type="button" onClick={() => ir('/comunidad')}>Mapa de mi comunidad</button></li>
      <li><button type="button" onClick={() => ir('/lazos')}>Mis lazos</button></li>
      <li><button type="button" onClick={() => ir('/gente')}>Mi gente</button></li>
      <li><button type="button" onClick={() => ir('/zona')}>Mi zona</button></li>
      {organizaciones && <li><button type="button" onClick={() => ir('/planes/nuevo')}>Convocar como entidad</button></li>}
      <li><button type="button" onClick={() => ir('/lugares')}>Mis lugares</button></li>
      <li><button type="button" onClick={() => ir('/avisos')}>Avisos</button></li>
      {equipo && <li><button type="button" onClick={() => ir('/equipo')}>Equipo de MOAI</button></li>}
      <li><button type="button" onClick={onSalir}>Cerrar sesión</button></li>
    </ul>}
  </div>;
}
