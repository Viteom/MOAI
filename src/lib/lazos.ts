// Mis lazos (referente de Mateo, 15 de octubre de 2026): tú al centro, tus grupos y cada persona, con el color del vínculo.
// Modelo del proyecto: RAÍZ (familia), TRONCO (tus Moais y quien te nutre) y RAMA (personas con las que te viste).
// Regla 5: la fuerza de un vínculo nunca se muestra como número. Se muestra con color y grosor, y solo en lo visual:
// el vínculo nunca se borra, pasa a «dormido». La raíz no se marchita: su línea se mantiene, solo el punto recuerda.

export type EstadoLazo = 'vivo' | 'tibio' | 'dormido';
export const DIAS_VIVO = 14;
export const DIAS_TIBIO = 45;

export function estadoLazo(ultimo: Date | null, ahora: Date): EstadoLazo {
  if (!ultimo) return 'dormido';
  const dias = (ahora.getTime() - ultimo.getTime()) / 864e5;
  return dias <= DIAS_VIVO ? 'vivo' : dias <= DIAS_TIBIO ? 'tibio' : 'dormido';
}

// La raíz no se marchita: con la familia, el texto recuerda sin decir que el lazo «duerme».
export const textoRaiz: Record<EstadoLazo, string> = {
  vivo: 'Están en contacto',
  tibio: 'Hace un tiempo no hablan',
  dormido: 'Hace mucho no hablan. Las raíces esperan: una llamada basta',
};
export const textoDe = (estado: EstadoLazo, raiz: boolean) => (raiz ? textoRaiz : textoEstado)[estado];

export const textoEstado: Record<EstadoLazo, string> = {
  vivo: 'Están en contacto',
  tibio: 'Hace un tiempo no se hablan',
  dormido: 'Este lazo está dormido. Un saludo puede despertarlo',
};
