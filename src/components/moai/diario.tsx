// Marco de las pantallas de uso cotidiano: encabezado con secciones y contenido de lectura.
import type { ReactNode } from 'react';

export type Ir = (ruta: string) => void;

export function Diario({ titulo, bajada, ir, actual, onSalir, children }: { titulo: string; bajada?: ReactNode; ir: Ir; actual: string; onSalir: () => void; children: ReactNode }) {
  const enlaces: [string, string][] = [['/inicio', 'Inicio'], ['/comunidad', 'Mi comunidad'], ['/gente', 'Mi gente'], ['/zona', 'Mi zona'], ['/lugares', 'Mis lugares'], ['/avisos', 'Avisos'], ['/ciudad', 'Mi ciudad']];
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
