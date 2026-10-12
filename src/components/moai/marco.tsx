import { useState, type ReactNode } from 'react';

// Fondo compartido de la portada y de las pantallas de cuenta: la ciudad a la derecha
// y el verde bosque a la izquierda. Si la imagen no está, queda el fondo plano.
const fondo = '/backgrounds/portada.jpg';

export function Simbolo() {
  return <svg className="portada-simbolo" viewBox="0 0 48 40" aria-hidden="true">
    <path d="M24 9 L9 30 M24 9 L39 27" />
    <circle className="nodo-lima" cx="24" cy="9" r="7"/>
    <circle className="nodo-brote" cx="9" cy="30" r="6"/>
    <circle className="nodo-claro" cx="39" cy="27" r="6"/>
  </svg>;
}

export function Marco({ className = '', children }: { className?: string; children: ReactNode }) {
  const [hayFondo, setHayFondo] = useState(true);
  return <main className={`portada ${className}`}>
    <div className="portada-fondo" aria-hidden="true">
      {hayFondo && <img src={fondo} alt="" onError={() => setHayFondo(false)}/>}
    </div>
    <Simbolo/>
    {children}
  </main>;
}
