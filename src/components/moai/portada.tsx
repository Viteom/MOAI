import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MoaiApp } from './app';

// Portada web (horizontal): una ciudad de fondo y texto mínimo. Sin servidor no hay
// cuentas: los dos botones llevan al primer día y lo dicen (regla 10).
const fondo = '/backgrounds/portada.jpg';

function Simbolo() {
  return <svg className="portada-simbolo" viewBox="0 0 48 40" aria-hidden="true">
    <path d="M24 9 L9 30 M24 9 L39 27" />
    <circle className="nodo-lima" cx="24" cy="9" r="7"/>
    <circle className="nodo-brote" cx="9" cy="30" r="6"/>
    <circle className="nodo-claro" cx="39" cy="27" r="6"/>
  </svg>;
}

export function Portada({ onEntrar }: { onEntrar: () => void }) {
  const [hayFondo, setHayFondo] = useState(true);
  return <main className="portada">
    <div className="portada-fondo" aria-hidden="true">
      {hayFondo && <img src={fondo} alt="" onError={() => setHayFondo(false)}/>}
    </div>
    <Simbolo/>
    <section className="portada-texto">
      <h1>MOAI</h1>
      <p className="portada-sub">Ciudades del cuidado</p>
      <p className="portada-lema">Conecta. Comparte. Cuida.</p>
      <div className="portada-acciones">
        <Button className="portada-boton principal" onClick={onEntrar}>Crear cuenta</Button>
        <Button className="portada-boton" onClick={onEntrar}>Iniciar sesión</Button>
      </div>
    </section>
    <p className="portada-aviso">Prototipo: aún no hay cuentas. Lo que escribas no se guarda.</p>
  </main>;
}

export function Plataforma() {
  const [entro, setEntro] = useState(false);
  return entro ? <MoaiApp/> : <Portada onEntrar={() => setEntro(true)}/>;
}
