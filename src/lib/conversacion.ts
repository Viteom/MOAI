// Matriz conversacional de Brisa (decisión de Mateo, 19 de octubre de 2026): preguntas directas, una o dos por día,
// que rotan para que la conversación siga cada día; reacciones a lo que la persona cuenta; y respuestas a dudas sobre
// la plataforma. Es un guion escrito por el equipo, sin modelo de IA: entiende palabras, no frases complejas.
// Lo que la persona cuenta solo llega a su tarjeta si ella lo aprueba (la tarjeta se ve solo si la hace visible).
import type { Tipo } from './lugares';

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// `tarjeta`: a qué parte de la tarjeta puede ir la respuesta, si la persona quiere.
export type Pregunta = { clave: string; texto: string; tarjeta?: 'gustos' | 'comparte' | 'aprender' | 'frase' };

// Primero las que ayudan a conocerse; después, temas de todos los días. Directas, sin opciones para elegir.
export const PREGUNTAS: Pregunta[] = [
  { clave: 'domingo', texto: '¿Qué haces normalmente un domingo en la tarde?', tarjeta: 'gustos' },
  { clave: 'despues', texto: 'Cuando terminas tus cosas del día, ¿qué te gusta hacer?', tarjeta: 'gustos' },
  { clave: 'sabes', texto: '¿Qué sabes hacer que le podrías enseñar a alguien?', tarjeta: 'comparte' },
  { clave: 'aprender', texto: '¿Qué te gustaría aprender, aunque sea por gusto?', tarjeta: 'aprender' },
  { clave: 'frase', texto: 'Si tus vecinos te conocieran por una frase, ¿cuál sería?', tarjeta: 'frase' },
  { clave: 'lugar', texto: '¿Cuál es tu lugar favorito del barrio?' },
  { clave: 'manana', texto: '¿Cómo arrancas las mañanas?', tarjeta: 'gustos' },
  { clave: 'comida', texto: '¿Qué comida te recuerda a tu casa?' },
  { clave: 'musica', texto: '¿Qué música te pone de buen humor?' },
  { clave: 'hablaste', texto: '¿Con quién hablaste hoy?' },
  { clave: 'semana', texto: '¿Qué fue lo mejor de tu semana?' },
  { clave: 'oficio', texto: '¿A qué te dedicas, o a qué te dedicaste?', tarjeta: 'comparte' },
  { clave: 'nino', texto: 'De niña o de niño, ¿a qué te gustaba jugar?' },
  { clave: 'plantas', texto: '¿Tienes matas o animales en casa?', tarjeta: 'gustos' },
  { clave: 'favor', texto: '¿Cuándo fue la última vez que alguien del barrio te hizo un favor?' },
  { clave: 'calma', texto: '¿Qué te da calma cuando el día está pesado?' },
  { clave: 'historia', texto: '¿Qué historia te gusta contar?' },
  { clave: 'antes', texto: '¿Cómo era el barrio cuando llegaste?' },
  { clave: 'compania', texto: '¿Qué cosa te gusta más hacer en compañía que sola o solo?', tarjeta: 'gustos' },
  { clave: 'orgullo', texto: '¿De qué te sientes orgullosa u orgulloso últimamente?' },
  { clave: 'fin', texto: '¿Qué planes tienes para este fin de semana?', tarjeta: 'gustos' },
  { clave: 'receta', texto: '¿Hay alguna receta que te salga especialmente bien?', tarjeta: 'comparte' },
  { clave: 'leer', texto: '¿Qué estás leyendo, viendo o escuchando estos días?' },
  { clave: 'agradecer', texto: '¿A quién te gustaría agradecerle algo?' },
];

// La pregunta del día: la primera que no se ha hecho; arranca en un punto distinto cada día para que no se repita el orden.
export function preguntaDelDia(hechas: Set<string>, hoy: Date, desde = 0): Pregunta | null {
  const conocerse = PREGUNTAS.slice(0, 5).filter(p => !hechas.has(p.clave));
  if (conocerse.length) return conocerse[0];
  const resto = PREGUNTAS.slice(5);
  const dia = Math.floor(hoy.getTime() / 864e5);
  for (let i = 0; i < resto.length; i++) {
    const p = resto[(dia + desde + i) % resto.length];
    if (!hechas.has(p.clave)) return p;
  }
  return null;
}
// Qué preguntas ya se hicieron, según la conversación guardada (los últimos 90 días).
export const preguntasHechas = (textosDeBrisa: string[]) => new Set(PREGUNTAS.filter(p => textosDeBrisa.includes(p.texto)).map(p => p.clave));

// Gustos que se reconocen en lo que la persona cuenta (los tipos de plan de MOAI).
const GUSTOS: [RegExp, Tipo][] = [
  [/camin|trot|pasear|sender|montan/, 'caminar'], [/tinto|cafe|panader|conversa|charla/, 'tinto'],
  [/huerta|sembr|plant|mata|jardin/, 'huerta'], [/ajedrez|parques|domino|cartas|jugar|juego/, 'ajedrez'],
  [/tej|crochet|bord|cos[eo]/, 'tejer'], [/mandado|mercado|compras/, 'mandados'], [/voluntari|ayud|iglesia|fundacion/, 'voluntariado'],
];
export const gustosEn = (texto: string): Tipo[] => [...new Set(GUSTOS.filter(([re]) => re.test(plano(texto))).map(([, t]) => t))];

// Reacciones: primero las que reconocen algo concreto; si no, una por pregunta, y si no, una general.
const REACCIONES: [RegExp, string][] = [
  [/camin|pasear|sender/, 'Caminar es de las mejores formas de conocer a alguien: andando se habla más fácil.'],
  [/tinto|cafe/, 'Un tinto con alguien arregla muchas tardes.'],
  [/huerta|plant|mata|jardin/, 'Las matas también nos cuidan. Hay gente en el barrio a la que le encanta la huerta.'],
  [/perr|gat|mascota|animal/, 'Los animales son compañía de la buena. ¿Cómo se llama?'],
  [/niet|hij|famili|mama|papa|herman/, 'Qué bonito que tu familia esté presente en lo que me cuentas.'],
  [/cocin|recet|comida|sancocho|arepa|frijol/, 'Cocinar para otros es una forma de cuidar. Eso se comparte muy bien.'],
  [/music|cant|bail|guitarr|salsa|tango|bolero/, 'La música junta a la gente como pocas cosas.'],
  [/le[eo]|libro|novela/, 'Leer también es una forma de conversar. ¿Me recomiendas algo?'],
  [/tej|crochet|bord/, 'Tejer en compañía tiene algo especial: las manos ocupadas y la conversación suelta.'],
  [/futbol|partido|deporte|bicicleta|cicla/, 'Eso se disfruta más con gente alrededor.'],
  [/iglesia|misa|rezar|orar/, 'Esos espacios también son comunidad.'],
  [/nada|descans|dormir|television|tele\b|novela/, 'Descansar también cuenta. No todo tiene que ser un plan.'],
  [/sol[ao]\b|nadie|aburr|triste/, 'Gracias por contármelo con tanta honestidad. Para eso estoy, y para ayudarte a encontrar gente cerca.'],
];
const POR_PREGUNTA: Record<string, string> = {
  sabes: 'Eso que sabes es un regalo para el barrio. A mucha gente le gustaría aprenderlo.',
  aprender: 'Seguro hay alguien cerca que sabe y quiere enseñarlo.',
  frase: 'Me gusta. Dice mucho de ti en pocas palabras.',
  lugar: 'Qué buen lugar. Los planes en sitios así suelen animar a más gente.',
  hablaste: 'Gracias por contarme. Las conversaciones pequeñas también sostienen el día.',
  semana: 'Qué bueno que hubo algo así. Vale la pena recordarlo.',
  favor: 'Esos gestos son los que hacen barrio.',
  agradecer: 'Qué bonito. Tal vez valga la pena decírselo.',
};
export function reaccionar(pregunta: Pregunta | null, respuesta: string): string {
  const t = plano(respuesta);
  return REACCIONES.find(([re]) => re.test(t))?.[1] ?? (pregunta && POR_PREGUNTA[pregunta.clave]) ?? 'Gracias por contarme. Me gusta conocerte un poco más.';
}

// Dudas sobre la plataforma. Respuestas escritas por el equipo; deben coincidir con lo que hace el código (regla 10).
const DUDAS: [RegExp, string[]][] = [
  [/emergencia|peligro|ambulancia|policia/, ['MOAI no es un servicio de emergencias. Si estás en peligro, llama a la línea 123 o a alguien de confianza.']],
  [/eres (una )?persona|eres real|eres (un )?robot|inteligencia artificial|\bia\b/, ['Soy una inteligencia artificial, no una persona. Converso con un guion que escribió el equipo de MOAI, así que todavía no entiendo todo.']],
  [/que es (un )?moai|moais|formar un grupo/, ['Un Moai es un grupo pequeño, de 2 a 5 personas, que se cuida y se ve seguido.', 'Nace con alguien con quien ya te viste en un plan: en Mi gente lo tocas y eliges «Formar un Moai». Para sumar a alguien más, todos tienen que estar de acuerdo.']],
  [/conversacion|historial|guardas lo que|guardas mis mensajes|lo que te escribo/, ['Guardo nuestra conversación cifrada, solo para ti, durante 90 días, para recordar lo que me cuentas.', 'En Más → Mi cuenta puedes borrarla cuando quieras.']],
  [/voz|microfono|dictar|audio/, ['El micrófono pasa tu voz a texto con el dictado de tu navegador. MOAI nunca recibe ni guarda el audio, solo el texto que tú envías.']],
  [/direccion|ubicacion|donde vivo|me ven|privacidad|seguro/, ['Nadie ve tu dirección ni tu ubicación exacta. Guardo solo una zona aproximada, y a los demás les digo si están «cerca» o «en tu zona».']],
  [/borr[a-z]* (mi |la )?cuenta|cerrar (mi )?cuenta|mis datos|descargar|elimin/, ['En Más → Mi cuenta puedes descargar todos tus datos o borrar tu cuenta, cuando quieras.']],
  [/reportar|bloquear|me trato mal|acoso|molest/, ['Si alguien te trató mal, en Mi gente tocas a la persona y eliges «Reportar o bloquear». En una conversación, cada mensaje tiene «Reportar».', 'La persona nunca sabe quién la reportó.']],
  [/puerta abierta/, ['La puerta abierta avisa a las personas con las que ya te viste que esta semana te caería bien compañía. Se cierra sola en 7 días.']],
  [/invierno/, ['El invierno es cuando estás pasando un momento difícil. Si me lo cuentas, bajo el ritmo: no te sugiero planes ni te llegan correos de planes, y solo lo saben las personas que tú elijas.']],
  [/avisos|notificacion|correo semanal|correos/, ['En Más → Avisos decides qué te cuento y si te llega un correo semanal. Todo viene apagado hasta que lo actives.']],
  [/tarjeta|vecinos|me conocen/, ['Tu tarjeta tiene tu primer nombre, una frase y lo que te gusta. Solo la ven tus vecinos si tú lo apruebas, en Mi barrio → Vecinos.']],
  [/mi gente|lazos|colores|red/, ['En Mi gente está tu red: tu familia, quienes te nutren, tus Moais y con quién te viste. El color dice cómo va cada vínculo, sin números.']],
  [/proponer|crear (un )?plan|invitar|organizar/, ['Dime qué tienes ganas de hacer, por ejemplo «quiero caminar el sábado», y lo armamos juntos. Siempre en un lugar público.']],
  [/sumar|unirme|apuntarme|plan|mapa|barrio/, ['En Mi barrio ves los planes cerca de ti, en el mapa o en la lista. Tocas uno y eliges «Me sumo».']],
  [/como funciona|para que sirve|que es moai|que hago aqui/, ['MOAI es para encontrarte con gente cerca de casa, sin presión: alguien cuenta qué va a hacer en un lugar público y quien quiera se suma.', 'Si se ven seguido, pueden formar un Moai: un grupo pequeño que se cuida.']],
];
export const esDuda = (texto: string) => /\?/.test(texto) || /^(como|que|quien|donde|cuando|cual|por que|puedo|se puede|es |hay )/.test(plano(texto).trim());
export function responderDuda(texto: string): string[] | null {
  const t = plano(texto);
  return DUDAS.find(([re]) => re.test(t))?.[1] ?? null;
}

// ---- Saludos (19 de octubre, Mateo: «cada vez es el mismo saludo») ----
// Según la hora y cuánto hace que hablaron. Cambia de un día a otro, pero no al recargar: nada de azar.
const franja = (h: number) => h < 5 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
const diaDelAnio = (d: Date) => Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5);
const VUELTAS = ['Qué bueno verte otra vez.', 'Me alegra que pases por aquí.', '¿Cómo va todo?', 'Aquí estoy, cuando quieras.', '¿Qué tal tu día?'];
export function saludoDeVuelta(ahora: Date, ultima?: Date | null): string {
  const hola = franja(ahora.getHours());
  if (!ultima) return `${hola}. ${VUELTAS[diaDelAnio(ahora) % VUELTAS.length]}`;
  const dias = Math.floor((new Date(ahora.toDateString()).getTime() - new Date(ultima.toDateString()).getTime()) / 864e5);
  if (dias <= 0) return `${hola} de nuevo. Aquí sigo.`;
  if (dias === 1) return `${hola}. Qué bueno verte otra vez, desde ayer.`;
  if (dias >= 7) return `${hola}. Hacía días no hablábamos; me alegra verte.`;
  return `${hola}. ${VUELTAS[diaDelAnio(ahora) % VUELTAS.length]}`;
}
const ABIERTAS = ['Cuéntame lo que quieras, o pregúntame cualquier duda sobre MOAI.', 'Si algo te ronda, cuéntamelo. También respondo dudas sobre MOAI.', 'Aquí estoy para lo que quieras contar o preguntar.'];
export const conversacionAbierta = (ahora: Date) => ABIERTAS[diaDelAnio(ahora) % ABIERTAS.length];
