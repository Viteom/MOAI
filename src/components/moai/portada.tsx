import { useState } from 'react';
import { ArrowRight, Info, Leaf, Network, Sprout, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoaiApp } from './app';

// Portada web (horizontal). Sin servidor no hay cuentas: los dos botones llevan
// al primer día y lo dicen (regla 10: la interfaz promete lo que el código hace).
const fondo = '/backgrounds/portada.jpg';
const ideas = [
  { icon: Users, label: 'Personas en el centro' },
  { icon: Sprout, label: 'Entornos sostenibles' },
  { icon: Network, label: 'Tecnología para el bienestar' },
] as const;

export function Logo() {
  return <span className="moai-logo" aria-label="MOAI" role="img">
    <span aria-hidden="true">MO</span>
    <span className="moai-logo-a" aria-hidden="true">A<Leaf className="moai-logo-leaf"/></span>
    <span aria-hidden="true">I</span>
  </span>;
}

function LineasDeLuz() {
  return <svg className="portada-lineas" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <path className="linea-lima" d="M-20 820 C 240 760, 380 640, 560 660 S 860 760, 1040 600 S 1300 420, 1460 460"/>
    <path className="linea-cian" d="M-20 870 C 300 820, 460 740, 640 760 S 980 820, 1180 700 S 1380 600, 1460 620"/>
    <path className="linea-lima tenue" d="M420 900 C 470 800, 520 720, 600 690 M 900 900 C 930 820, 990 740, 1060 700"/>
    {[[560, 660], [1040, 600], [640, 760], [1180, 700]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} className="nodo-luz" cx={cx} cy={cy} r="4"/>)}
  </svg>;
}

export function Portada({ onEntrar }: { onEntrar: () => void }) {
  const [hayFondo, setHayFondo] = useState(true);
  return <main className="portada">
    <div className="portada-fondo" aria-hidden="true">
      {hayFondo && <img src={fondo} alt="" onError={() => setHayFondo(false)}/>}
      <LineasDeLuz/>
    </div>
    <header className="portada-header">
      <Logo/>
      <span className="portada-sello">Ciudades del cuidado</span>
    </header>
    <p className="portada-lema">Ciudades que cuidan,<br/>personas que florecen.</p>
    <section className="portada-panel" aria-labelledby="portada-titulo">
      <h1 id="portada-titulo">Nadie debería envejecer en soledad.</h1>
      <p className="portada-texto">MOAI es una red de cuidado entre vecinos. Te ayuda a acompañar a tu gente, a tus animales y al lugar donde vives. Sin prisa y sin números: solo presencia.</p>
      <div className="portada-acciones">
        <Button className="portada-boton principal" onClick={onEntrar}>Crear mi cuenta<ArrowRight/></Button>
        <Button className="portada-boton" onClick={onEntrar}>Iniciar sesión</Button>
      </div>
      <p className="portada-aviso"><Info size={14}/><span>Esto es un prototipo: todavía no hay cuentas y los dos caminos te llevan a tu primer día. Lo que escribas no se guarda.</span></p>
      <ul className="portada-ideas">
        {ideas.map(({ icon: Icon, label }) => <li key={label}><Icon/><span>{label}</span></li>)}
      </ul>
    </section>
  </main>;
}

export function Plataforma() {
  const [entro, setEntro] = useState(false);
  return entro ? <MoaiApp/> : <Portada onEntrar={() => setEntro(true)}/>;
}
