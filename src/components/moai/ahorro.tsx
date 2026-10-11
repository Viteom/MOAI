import { Button } from '@/components/ui/button';
import { estoyBienSiguiente, type EstoyBien } from '@/lib/moai/demo';

// H7 · «Estoy bien» en Modo Ahorro: un gesto por pantalla, texto grande, sin imágenes.
export function EstoyBienAhorro({ valor, onCambiar }: { valor: EstoyBien; onCambiar: (v: EstoyBien) => void }) {
  return <section className="ahorro-bloque" aria-live="polite">
    {valor === 'ninguno' && <Button variant="moai" size="moai" onClick={() => onCambiar(estoyBienSiguiente(valor, 'declarar'))}>Estoy bien</Button>}
    {valor === 'declarado' && <>
      <p className="ahorro-texto">Dijiste: estoy bien.</p>
      <Button variant="moai" size="moai" onClick={() => onCambiar(estoyBienSiguiente(valor, 'avisar'))}>Sí, avisar a mi Moai</Button>
      <Button variant="moaiSecondary" size="moai" onClick={() => onCambiar(estoyBienSiguiente(valor, 'privado'))}>Solo para mí</Button>
    </>}
    {valor === 'avisado' && <p className="ahorro-texto">Quedó avisado. (Simulación: no se envió nada.)</p>}
    {valor === 'privado' && <p className="ahorro-texto">Queda solo contigo.</p>}
  </section>;
}
