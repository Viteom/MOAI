export type City = 'medellin' | 'bogota' | 'cdmx' | 'nyc';
export type Time = 'dawn' | 'day' | 'dusk' | 'night';
export type Weather = 'despejado' | 'lluvia' | 'nublado';
export type Ring = 'raiz' | 'tronco' | 'rama';
export type Mood = 'Calma' | 'Energía' | 'Compañía' | 'Cuidado';
export type Person = { nombre: string; anillo: Ring };
export type MoaiState = {
  nombre: string; ciudad: City; hora: number; clima: Weather; semilla: string;
  oficios: string[]; deseos: string[]; estadoDia: Mood | null; personas: Person[];
  companeros: string[]; espora: { destinatario: string; intencion: string };
};
export const cities: { id: City; label: string }[] = [
  { id: 'medellin', label: 'Medellín' }, { id: 'bogota', label: 'Bogotá' },
  { id: 'cdmx', label: 'Ciudad de México' }, { id: 'nyc', label: 'Nueva York' },
];
export const rings: { id: Ring; label: string; short: string }[] = [
  { id: 'raiz', label: 'mi raíz (familia)', short: 'Mi raíz' },
  { id: 'tronco', label: 'mi tronco (mi gente más cercana)', short: 'Mi tronco' },
  { id: 'rama', label: 'mi rama (conocidos queridos)', short: 'Mi rama' },
];
export const oficios = ['cocinar para otros', 'contar historias', 'sembrar y cuidar', 'arreglar lo que se daña', 'escuchar', 'enseñar lo que sé', 'cuidar animales', 'tejer o bordar', 'cantar o tocar', 'acompañar'];
export const deseos = ['compañía para caminar', 'aprender algo nuevo', 'alguien que me escuche', 'aprender tecnología', 'cocinar juntos', 'otra cosa'];
export const companions = ['un perro', 'un gato', 'otro animal', 'mi huerta', 'mis matas'];
export const starters = ['Me acordé de ti y quise saber cómo estás.', 'Te siembro en mi bosque porque tus consejos me dan paz.', 'Extraño nuestras conversaciones del colegio.', 'Quiero que volvamos a cruzar caminos.'];
export function initialState(hour = 7): MoaiState {
  return { nombre: '', ciudad: 'medellin', hora: hour, clima: 'despejado', semilla: '', oficios: [], deseos: [], estadoDia: null, personas: [], companeros: [], espora: { destinatario: '', intencion: '' } };
}
export function timeOfDay(hour: number): Time {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'dusk';
  return 'night';
}
export function toggleChoice(values: string[], value: string, limit = Infinity) {
  if (values.includes(value)) return values.filter(item => item !== value);
  return values.length < limit ? [...values, value] : values;
}
export function addPerson(people: Person[], person: Person): Person[] {
  if (people.length >= 5 || !person.nombre.trim()) return people;
  return [...people, { ...person, nombre: person.nombre.trim() }];
}
export function afterCompanions(people: Person[]) { return people.length ? 12 : 11; }
export function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return 'Buenos días. La ciudad apenas despierta y te estaba esperando. No tengas afán: aquí nadie llega tarde.';
  if (hour >= 12 && hour < 19) return 'Buenas tardes. La luz está bajando y la ciudad te guardó un lugar.';
  return 'Buenas noches. Las ventanas se están encendiendo. Pasa, que aquí hay luz.';
}
export function letter(state: MoaiState) {
  const city = cities.find(c => c.id === state.ciudad)?.label ?? 'Medellín';
  if (state.clima === 'lluvia') return `Llueve en ${city}. Las plantas lo agradecen. ¿Con quién te tomarías un tinto hoy?`;
  if (timeOfDay(state.hora) === 'night') return 'Ya se encendieron las ventanas de tu calle. Antes de dormir, ¿a quién le mandas un abrazo corto?';
  return `Amaneció ${state.clima === 'nublado' ? 'nublado' : 'despejado'} en ${city}. Es buen día para escribirle a alguien que no ves hace rato.`;
}

export const momentos: { id: Time; label: string }[] = [
  { id: 'dawn', label: 'Amanecer' }, { id: 'day', label: 'Día' }, { id: 'dusk', label: 'Atardecer' }, { id: 'night', label: 'Noche' },
];
export const climas: { id: Weather; label: string }[] = [
  { id: 'despejado', label: 'Despejado' }, { id: 'nublado', label: 'Nublado' }, { id: 'lluvia', label: 'Lluvia' },
];
// Una hora representativa de cada momento del día, para el panel de demostración.
export function horaDe(time: Time): number {
  return { dawn: 6, day: 12, dusk: 17, night: 21 }[time];
}
