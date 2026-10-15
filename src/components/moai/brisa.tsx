// Inicio con Brisa (decisión de Mateo, 15 de octubre de 2026): Brisa es la pantalla de inicio y guía la plataforma
// conversando. Por ahora es un guion (sin modelo de IA): entiende opciones y algunas palabras; lo demás lo dice con
// honestidad. Los planes y el test de cuidado ocurren en la conversación, no en formularios.
// Regla 12: el sello «IA» va siempre junto a su nombre, y la primera vez dice que no es una persona.
// Regla 11: ante señales de riesgo, deriva a una persona y a la línea de emergencias. Nada de esto se guarda.
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { Api, Carta, Perfil, Plan } from '@/lib/api';
import { textoSaludo, type EntradaPerfil } from '@/lib/perfil';
import { plantillas, type Tipo } from '@/lib/lugares';
import { avisoCuidado, preguntasCuidado, resultadoCuidado, textosCuidado, type Letra } from '@/lib/cuidado';
import { OrbeBrisa } from './bosque';
import { Diario, type Ir } from './diario';

type Mensaje = { id: number; de: 'brisa' | 'yo'; contenido: ReactNode; nota?: boolean };
type Opcion = { texto: string; hacer: () => void };
type Borrador = { titulo: string; tipo: Tipo; dia?: Date; hora?: string; lugar?: string; semanal: boolean };
type Paso = 'libre' | 'plan-que' | 'plan-dia' | 'plan-hora' | 'plan-donde' | 'test' | 'perfil-gustos' | 'perfil-comparte' | 'perfil-aprender' | 'perfil-frase';

const RIESGO = /(suicid|matarme|quitarme la vida|no quiero vivir|me quiero morir|hacerme daño|no aguanto más)/i;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const capital = (t: string) => t.charAt(0).toLocaleUpperCase('es') + t.slice(1);
const fechaLarga = (d: Date) => capital(new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(d));
const horaLegible = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, h, m)); };

// Palabras que indican qué plan quiere hacer la persona.
const PALABRAS: [RegExp, Tipo][] = [
  [/camin|trot|pasear/, 'caminar'], [/tinto|cafe|panader/, 'tinto'], [/huerta|sembr|plant|arbol/, 'voluntariado'],
  [/ajedrez|parques|domino|jugar/, 'ajedrez'], [/tej|crochet/, 'tejer'], [/mandado|mercado|compras/, 'mandados'],
];
export function entenderPlan(texto: string): { tipo: Tipo; titulo: string } {
  const plano = sinTildes(texto);
  const tipo = PALABRAS.find(([re]) => re.test(plano))?.[1] ?? 'otro';
  const resto = texto.trim().replace(/^(yo\s+)?(quiero|quisiera|me gustar[ií]a|tengo ganas de|voy a)\s+/i, '').replace(/[.!?¿¡]+$/, '');
  const titulo = `Voy a ${resto}, ¿alguien se suma?`;
  return { tipo, titulo: titulo.length > 80 ? `${titulo.slice(0, 77)}…` : titulo };
}
// «hoy», «mañana», «el sábado»: el próximo día con ese nombre.
export function entenderDia(texto: string, hoy: Date): Date | null {
  const plano = sinTildes(texto);
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (/pasado manana/.test(plano)) return new Date(base.getTime() + 2 * 864e5);
  if (/manana/.test(plano)) return new Date(base.getTime() + 864e5);
  if (/hoy/.test(plano)) return base;
  const i = DIAS.findIndex(d => plano.includes(sinTildes(d)));
  if (i < 0) return null;
  const faltan = (i - base.getDay() + 7) % 7 || 7;
  return new Date(base.getTime() + faltan * 864e5);
}
// «7», «7:30», «4 pm», «16:00».
export function entenderHora(texto: string): string | null {
  const m = sinTildes(texto).match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m|p\.?\s?m|de la tarde|de la noche|de la manana)?/);
  if (!m) return null;
  let h = Number(m[1]); const min = Number(m[2] ?? 0);
  if (/p|tarde|noche/.test(m[3] ?? '') && h < 12) h += 12;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function CartaEnChat({ carta, api, ir, alTerminar }: { carta: Carta; api: Api; ir: Ir; alTerminar: () => void }) {
  const [hecho, setHecho] = useState('');
  const [porque, setPorque] = useState(false);
  const cerrar = async (texto: string) => { await api.cartaVista(carta.clave); setHecho(texto); alTerminar(); };
  const motivo = carta.tipo === 'sugerencia' || carta.tipo === 'gente' || carta.tipo === 'interno' ? carta.motivo : undefined;
  return <div>
    <p>{carta.texto}</p>
    {motivo && porque && <p className="carta-motivo">{motivo}</p>}
    {hecho ? <p className="campo-ayuda">{hecho}</p> : <div className="plan-acciones">
      {carta.tipo === 'solo' && carta.repetir && <Button className="diario-boton principal" onClick={() => void api.repetirPlan(carta.planId).then(() => cerrar('Listo: queda cada semana.'))}>Sí, cada semana</Button>}
      {carta.tipo === 'sugerencia' && <Button className="diario-boton principal" onClick={() => void api.irAPlan(carta.planId).then(() => cerrar('Te sumaste. Nos vemos allá.'))}>Me sumo</Button>}
      {carta.tipo === 'gente' && <Button className="diario-boton principal" onClick={() => void api.cartaVista(carta.clave).then(() => ir('/gente'))}>Ir a Mi gente</Button>}
      {carta.tipo === 'saludo' && carta.opciones.map(o => <Button key={o} className="diario-boton" onClick={() => void api.saludar(carta.ref, o).then(r => cerrar(r.ok ? `Le mandaste: «${textoSaludo(o)}».` : r.error))}>{textoSaludo(o)}</Button>)}
      {carta.tipo === 'saludo' && carta.plan && <Button className="diario-boton principal" onClick={() => void api.cartaVista(carta.clave).then(() => ir('/inicio?plan=1'))}>Proponer algo juntos</Button>}
      {carta.tipo === 'interno' && <Button className="diario-boton principal" onClick={() => void api.hablamos(carta.personaId).then(() => cerrar('Qué bueno. Esos vínculos también te cuidan a ti.'))}>Ya le escribí</Button>}
      <Button className="diario-boton" onClick={() => void cerrar('Entendido.')}>{carta.tipo === 'solo' && !carta.repetir ? 'Entendido' : 'Ahora no'}</Button>
      {motivo && <button type="button" className="brisa-enlace" aria-expanded={porque} onClick={() => setPorque(p => !p)}>¿Por qué veo esto?</button>}
    </div>}
  </div>;
}

function MiniPlan({ plan, api, ir }: { plan: Plan; api: Api; ir: Ir }) {
  const [voy, setVoy] = useState(plan.voy);
  return <div className="brisa-plan">
    <strong>{plan.titulo}</strong>
    <span>{fechaLarga(new Date(plan.cuando))} · {plan.lugarPublico} · {plan.franja}</span>
    <span>{plan.organizacion ? `Convoca ${plan.organizacion.nombre}` : `Lo propone ${plan.autor}`}</span>
    <div className="plan-acciones">
      {voy ? <span className="plan-voy">Vas a ir</span> : <Button className="diario-boton principal" onClick={() => void api.irAPlan(plan.id).then(r => r.ok && setVoy(true))}>Me sumo</Button>}
      <Button className="diario-boton" onClick={() => ir(`/planes/${plan.id}`)}>Ver</Button>
    </div>
  </div>;
}

export function InicioBrisa({ perfil, api, ir, onSalir, empezar }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void; empezar?: 'plan' | 'perfil' | 'estado' }) {
  const nombre = perfil.nombre.split(' ')[0];
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [texto, setTexto] = useState('');
  const paso = useRef<Paso>('libre');
  const borrador = useRef<Borrador | null>(null);
  const respuestas = useRef<Letra[]>([]);
  const borradorPerfil = useRef<EntradaPerfil>({ frase: '', gustos: [], comparte: '', aprender: '', visible: false });
  const siguiente = useRef(0);
  const final = useRef<HTMLDivElement>(null);
  const iniciado = useRef(false);

  const decir = useCallback((...contenidos: ReactNode[]) => setMensajes(m => [...m, ...contenidos.map(c => ({ id: siguiente.current++, de: 'brisa' as const, contenido: c }))]), []);
  const nota = useCallback((c: ReactNode) => setMensajes(m => [...m, { id: siguiente.current++, de: 'brisa', contenido: c, nota: true }]), []);
  const yo = useCallback((t: string) => setMensajes(m => [...m, { id: siguiente.current++, de: 'yo', contenido: t }]), []);
  useEffect(() => { final.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' }); }, [mensajes]);

  // ---- Menú principal ----
  const menu = useCallback((): Opcion[] => [
    { texto: 'Conocer vecinos', hacer: () => conocer() },
    { texto: 'Qué pasa cerca', hacer: () => void cerca() },
    { texto: 'Tengo ganas de…', hacer: () => iniciarPlan() },
    { texto: 'Cómo estoy', hacer: () => void comoEstoy() },
    { texto: 'Cuéntame de ti', hacer: () => void iniciarPerfil() },
    { texto: 'Cómo funciona', hacer: () => comoFunciona() },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps
  const volver = (pregunta = '¿Qué más te provoca?') => { paso.current = 'libre'; decir(pregunta); setOpciones(menu()); };
  const elegir = (o: Opcion) => { yo(o.texto); setOpciones([]); o.hacer(); };

  function conocer() {
    decir('Aquí la gente se conoce haciendo cosas sencillas juntas: una caminata, un tinto, una partida en el parque.',
      'Después de cada plan te pregunto con quién te viste. Con esas personas puedes formar un Moai, aunque sean solo dos.');
    setOpciones([{ texto: 'Ver vecinos de mi zona', hacer: () => ir('/zona') }, { texto: 'Qué pasa cerca', hacer: () => void cerca() }, { texto: 'Ir a Mi gente', hacer: () => ir('/gente') }]);
  }
  async function cerca() {
    if (!perfil.lugar) { decir('Primero cuéntame dónde vives, así te muestro lo que pasa cerca.'); setOpciones([{ texto: 'Elegir mi lugar', hacer: () => ir('/lugares') }]); return; }
    const r = await api.planes();
    const planes = r.ok ? r.datos.filter(p => !p.mio).slice(0, 3) : [];
    if (!r.ok) { decir(r.error); volver(); return; }
    if (!planes.length) { decir('Todavía no hay planes cerca de ti. ¿Y si propones uno? Casi siempre alguien se anima.'); setOpciones([{ texto: 'Tengo ganas de…', hacer: () => iniciarPlan() }, ...menu().slice(3)]); return; }
    decir(planes.length === 1 ? 'Esto pasa cerca de ti:' : 'Esto pasa cerca de ti estos días:', ...planes.map(p => <MiniPlan key={p.id} plan={p} api={api} ir={ir}/>));
    setOpciones([{ texto: 'Ver el mapa', hacer: () => ir('/comunidad') }, { texto: 'Tengo ganas de…', hacer: () => iniciarPlan() }, { texto: 'Volver', hacer: () => volver() }]);
  }
  function comoFunciona() {
    decir('MOAI es para encontrarte con gente cerca de casa, sin presión.',
      'Cuentas qué tienes ganas de hacer, en un lugar público, y quien quiera se suma. Si se ven seguido, pueden formar un Moai: un grupo pequeño que se cuida.',
      'Nadie ve tu dirección ni tu ubicación exacta, y tú decides qué avisos recibes.');
    volver('¿Por dónde quieres empezar?');
  }

  // ---- Planes en la conversación ----
  function iniciarPlan(semilla?: { tipo: Tipo; titulo: string }) {
    if (!perfil.lugar) { decir('Me encanta. Primero cuéntame dónde vives, para que tu plan llegue a quienes están cerca.'); setOpciones([{ texto: 'Elegir mi lugar', hacer: () => ir('/lugares') }]); return; }
    if (semilla) { borrador.current = { ...semilla, semanal: false }; preguntarDia(); return; }
    paso.current = 'plan-que';
    decir('¡Qué bien! ¿Qué tienes ganas de hacer? Elige una idea o escríbemelo con tus palabras.');
    setOpciones(plantillas.map(p => ({ texto: p.nombre, hacer: () => { borrador.current = { titulo: p.titulo, tipo: p.tipo, semanal: false }; preguntarDia(); } })));
  }
  function preguntarDia() {
    paso.current = 'plan-dia';
    const hoy = new Date();
    const opcionesDia = ['hoy', 'mañana', 'sábado', 'domingo'].map(t => ({ texto: capital(t), dia: entenderDia(t, hoy)! }));
    decir(`«${borrador.current!.titulo}» ¿Qué día?`);
    setOpciones(opcionesDia.map(o => ({ texto: o.texto, hacer: () => { borrador.current!.dia = o.dia; preguntarHora(); } })));
  }
  function preguntarHora() {
    paso.current = 'plan-hora';
    decir('¿A qué hora?');
    setOpciones(['07:00', '09:00', '16:00', '18:00'].map(h => ({ texto: horaLegible(h), hacer: () => { borrador.current!.hora = h; preguntarLugar(); } })));
  }
  function preguntarLugar() {
    paso.current = 'plan-donde';
    const sugerido = plantillas.find(p => p.tipo === borrador.current!.tipo)?.lugar;
    decir('¿Dónde? Un lugar público: un parque, una biblioteca, un café. Nunca la casa de nadie.');
    setOpciones(sugerido ? [{ texto: sugerido, hacer: () => { borrador.current!.lugar = sugerido; mostrarBorrador(); } }] : []);
  }
  function mostrarBorrador() {
    paso.current = 'libre';
    const b = borrador.current!;
    decir('¡Qué buen plan! Lo dejé así. ¿Lo compartimos con tus vecinos?', <TarjetaBorrador key={`b-${siguiente.current}`} borrador={b}/>);
    setOpciones([
      { texto: 'Sí, compartir', hacer: () => void publicar(false) },
      { texto: 'Compartir y repetir cada semana', hacer: () => void publicar(true) },
      { texto: 'Cambiar algo', hacer: () => iniciarPlan() },
    ]);
  }
  async function publicar(semanal: boolean) {
    const b = borrador.current!;
    const [h, m] = b.hora!.split(':').map(Number);
    const cuando = new Date(b.dia!.getFullYear(), b.dia!.getMonth(), b.dia!.getDate(), h, m);
    const lugar = perfil.lugar!;
    const r = await api.crearPlan({ titulo: b.titulo, cuando: cuando.toISOString(), lugarPublico: b.lugar!, ciudad: lugar.ciudad, barrio: lugar.barrio,
      alcance: lugar.barrio ? 'cerca' : 'ciudad', tipo: b.tipo, repite: semanal ? 'semanal' : null, cupo: null });
    if (!r.ok) {
      decir(r.errores ? Object.values(r.errores).join(' ') : r.error);
      setOpciones([{ texto: 'Intentarlo de nuevo', hacer: () => iniciarPlan() }, { texto: 'Volver', hacer: () => volver() }]);
      return;
    }
    decir(semanal ? 'Listo, quedó cada semana. Ya lo pueden ver tus vecinos; si alguien se suma, te cuento aquí.' : 'Listo. Ya lo pueden ver tus vecinos; si alguien se suma, te cuento aquí.');
    setOpciones([{ texto: 'Ver en el mapa', hacer: () => ir('/comunidad') }, { texto: 'Volver', hacer: () => volver() }]);
  }

  // ---- Cuidarme: el test y el Moai interno ----
  async function cuidarme() {
    const r = await api.cuidado();
    decir('Quienes cuidan mucho a veces se olvidan de sí. ¿Qué te gustaría?');
    setOpciones([
      { texto: r.ok && r.datos.letras ? 'Repetir el test' : '¿Cómo cuido y cómo me cuido?', hacer: () => empezarTest() },
      ...(r.ok && r.datos.letras ? [{ texto: 'Ver mi resultado', hacer: () => mostrarResultado(r.datos.letras!, true) }] : []),
      { texto: 'Mi Moai interno', hacer: () => ir('/gente') },
      { texto: 'Volver', hacer: () => volver() },
    ]);
  }
  function empezarTest() {
    decir('Te haré seis preguntas. No hay respuestas buenas ni malas. Al final te muestro el resultado y tú decides si lo guardo.');
    setOpciones([{ texto: 'Empezar', hacer: () => { respuestas.current = []; pregunta(0); } }, { texto: 'Ahora no', hacer: () => volver() }]);
  }
  function pregunta(i: number) {
    paso.current = 'test';
    const p = preguntasCuidado[i];
    decir(<span key={`p${i}`}><span className="campo-ayuda">{i + 1} de {preguntasCuidado.length}</span><br/>{p.pregunta}</span>);
    setOpciones((['A', 'B', 'C'] as Letra[]).map(l => ({ texto: p.opciones[l], hacer: () => {
      respuestas.current = [...respuestas.current, l];
      if (i + 1 < preguntasCuidado.length) pregunta(i + 1); else terminarTest();
    } })));
  }
  function terminarTest() {
    paso.current = 'libre';
    const letras = resultadoCuidado(respuestas.current)!;
    mostrarResultado(letras, false);
    decir('¿Quieres que lo guarde? Así puedo recordarte cuidar tus límites y a quienes te nutren. Solo tú lo ves y lo puedes borrar cuando quieras.');
    setOpciones([
      { texto: 'Sí, guárdalo', hacer: () => void api.responderCuidado(respuestas.current, true).then(r => { decir(r.ok ? 'Guardado. Lo tendré en cuenta para cuidarte.' : r.error); seguirConInterno(); }) },
      { texto: 'Solo quería verlo', hacer: () => void api.responderCuidado(respuestas.current, false).then(() => { decir('Listo, no lo guardé.'); seguirConInterno(); }) },
    ]);
  }
  function mostrarResultado(letras: Letra[], guardado: boolean) {
    decir(...letras.map(l => textosCuidado[l]));
    nota(avisoCuidado);
    if (guardado) setOpciones([{ texto: 'Borrar mi resultado', hacer: () => void api.borrarCuidado().then(() => volver('Listo, lo borré. ¿Qué más te provoca?')) }, { texto: 'Mi Moai interno', hacer: () => ir('/gente') }, { texto: 'Volver', hacer: () => volver() }]);
  }
  function seguirConInterno() {
    decir('Algo que ayuda: tener presentes a las personas que te nutren. ¿Armamos tu Moai interno?');
    setOpciones([{ texto: 'Sí, armarlo', hacer: () => ir('/gente') }, { texto: 'Después', hacer: () => volver() }]);
  }

  // ---- Cuéntame de ti: la tarjeta que verán tus vecinos (solo si la apruebas) ----
  async function iniciarPerfil() {
    const r = await api.perfilPublico();
    borradorPerfil.current = { ...(r.ok ? r.datos : borradorPerfil.current), gustos: [] };
    decir('Me encantaría conocerte un poco más. Con lo que me cuentes armo una tarjeta para tus vecinos, sin foto ni ubicación, y solo la muestro si tú quieres.',
      '¿Qué te gusta hacer? Elige todo lo que quieras.');
    preguntarGustos();
  }
  function preguntarGustos() {
    paso.current = 'perfil-gustos';
    const elegidos = borradorPerfil.current.gustos;
    setOpciones([
      ...plantillas.filter(p => !elegidos.includes(p.tipo)).map(p => ({ texto: p.nombre, hacer: () => { borradorPerfil.current.gustos = [...borradorPerfil.current.gustos, p.tipo]; preguntarGustos(); } })),
      { texto: elegidos.length ? 'Eso es todo' : 'Prefiero no decir', hacer: () => preguntarComparte() },
    ]);
  }
  function preguntarComparte() {
    paso.current = 'perfil-comparte';
    decir('¿Hay algo que sepas hacer y te guste compartir o enseñar? Cocinar, arreglar cosas, contar historias… Escríbemelo.');
    setOpciones([{ texto: 'Por ahora nada', hacer: () => preguntarAprender() }]);
  }
  function preguntarAprender() {
    paso.current = 'perfil-aprender';
    decir('¿Y algo que te gustaría aprender?');
    setOpciones([{ texto: 'Por ahora nada', hacer: () => preguntarFrase() }]);
  }
  function preguntarFrase() {
    paso.current = 'perfil-frase';
    decir('Última: si tus vecinos te conocieran por una frase, ¿cuál sería? Por ejemplo, «Me gusta madrugar a regar mis matas».');
    setOpciones([{ texto: 'Prefiero no escribirla', hacer: () => mostrarPerfil() }]);
  }
  function mostrarPerfil() {
    paso.current = 'libre';
    const p = { ...borradorPerfil.current };
    if (!p.frase && !p.comparte && !p.gustos.length) { decir('Está bien, no hace falta contar nada ahora. Cuando quieras, aquí estoy.'); volver(); return; }
    decir('Así te verían tus vecinos:', <TarjetaPerfil key={`perfil-${siguiente.current}`} nombre={nombre} perfil={p}/>,
      '¿La muestro en Mi zona? Solo la verían vecinos de tu zona, nunca tu dirección. Puedes cambiarlo cuando quieras.');
    const guardar = (visible: boolean) => void api.guardarPerfilPublico({ ...p, visible }).then(r => {
      decir(!r.ok ? r.error : visible ? 'Listo, tu tarjeta ya se ve en Mi zona. Cuando alguien te salude, te cuento.' : 'Guardado. No se muestra a nadie por ahora.');
      setOpciones([{ texto: 'Ver Mi zona', hacer: () => ir('/zona') }, { texto: 'Volver', hacer: () => volver() }]);
    });
    setOpciones([{ texto: 'Sí, mostrarla', hacer: () => guardar(true) }, { texto: 'Guardarla sin mostrar', hacer: () => guardar(false) }, { texto: 'Empezar de nuevo', hacer: () => void iniciarPerfil() }]);
  }

  // ---- Cómo estoy: puerta abierta e invierno. Los declara la persona; nada se deduce (regla 6) ----
  async function comoEstoy() {
    const r = await api.estado();
    if (r.ok && r.datos.invierno) {
      decir('Sigo aquí contigo. ¿Cómo va tu invierno?');
      setOpciones([
        { texto: 'Ya salí del invierno', hacer: () => void api.invierno(false).then(() => { decir('Me alegra mucho. Vuelvo a contarte de planes cerca, con calma.'); volver(); }) },
        { texto: 'Sigo igual', hacer: () => void acompanarInvierno() },
      ]);
      return;
    }
    decir('¿Cómo estás estos días?');
    setOpciones([
      { texto: 'Bien', hacer: () => volver('¡Qué bueno! ¿Qué te provoca hoy?') },
      { texto: 'Más o menos', hacer: () => ofrecerPuerta() },
      { texto: 'Me siento sola o solo', hacer: () => ofrecerPuerta() },
      { texto: 'En invierno', hacer: () => void api.invierno(true).then(() => { decir('Gracias por contármelo. Voy a bajar el ritmo: mientras dure, no te sugiero planes ni te llegan correos de planes.'); void acompanarInvierno(); }) },
      { texto: 'Quiero cuidarme', hacer: () => void cuidarme() },
    ]);
  }
  function ofrecerPuerta() {
    decir('Gracias por contarme. Si quieres, dejo tu puerta abierta: las personas con las que ya te viste sabrán que esta semana te caería bien compañía. Se cierra sola en 7 días.');
    setOpciones([
      { texto: 'Sí, abrir mi puerta', hacer: () => void api.puerta(true).then(r => { decir(r.ok ? 'Listo, tu puerta está abierta esta semana.' : r.error); volver(); }) },
      { texto: 'Prefiero que no', hacer: () => volver('Está bien. ¿Hay algo que te provoque hoy?') },
      { texto: 'Quiero cuidarme', hacer: () => void cuidarme() },
    ]);
  }
  async function acompanarInvierno() {
    const [interno, gente] = await Promise.all([api.interno(), api.gente()]);
    const conocidos = gente.ok ? gente.datos.conocidos.map(c => ({ ref: c.ref, nombre: c.nombre })) : [];
    decir('¿A quién te gustaría tener cerca estos días?');
    setOpciones([
      ...(interno.ok ? interno.datos.slice(0, 3).map(p => ({ texto: `Escribirle a ${p.nombre}`, hacer: () => escribirA(p.nombre) })) : []),
      ...(conocidos.length ? [{ texto: 'Contarle a alguien con quien me vi', hacer: () => elegirAQuienContar(conocidos, []) }] : []),
      { texto: 'Solo quiero que me acompañes', hacer: () => {
        decir('Aquí estoy. No tienes que hacer nada ni explicar nada.', 'Si en algún momento sientes que estás en peligro, llama a la línea 123 o a alguien de confianza.');
        volver('Cuando quieras, seguimos.');
      } },
    ]);
  }
  function escribirA(quien: string) {
    const mensaje = `Hola, ${quien}. Estos días ando en invierno y me haría bien hablar contigo.`;
    decir(<span key={`wa-${siguiente.current}`}>Te dejo un mensaje listo; cámbialo como quieras. Tú lo envías y nadie más lo ve.<br/>«{mensaje}»<br/><a className="brisa-enlace" href={`whatsapp://send?text=${encodeURIComponent(mensaje)}`}>Abrir WhatsApp con este mensaje</a></span>);
    volver('¿Algo más en lo que te acompañe?');
  }
  function elegirAQuienContar(conocidos: { ref: string; nombre: string }[], elegidos: string[]) {
    if (!elegidos.length) decir('¿A quién se lo cuento? Solo sabrán que estás pasando un invierno, nada más.');
    setOpciones([
      ...conocidos.filter(c => !elegidos.includes(c.ref)).map(c => ({ texto: c.nombre, hacer: () => elegirAQuienContar(conocidos, [...elegidos, c.ref]) })),
      ...(elegidos.length ? [{ texto: 'Contarles', hacer: () => void api.contarInvierno(elegidos).then(r => {
        decir(r.ok ? `Listo, se lo conté a ${r.datos.contadoA.join(', ')}. Cuando salgas del invierno, lo olvido.` : r.error);
        volver();
      }) }] : []),
      { texto: 'Mejor no', hacer: () => volver() },
    ]);
  }

  // ---- Lo que escribe la persona ----
  function enviar(e: FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    yo(t); setTexto(''); setOpciones([]);
    if (RIESGO.test(sinTildes(t)) || RIESGO.test(t)) {
      decir('Gracias por contármelo. Lo que sientes importa, y aquí no puedo ayudarte como lo haría una persona.',
        <span key="riesgo">Si estás en peligro ahora, llama a la línea de emergencias <strong>123</strong>. Y si puedes, escríbele o llama ya a alguien de confianza.</span>);
      setOpciones([{ texto: 'Ver mi Moai interno', hacer: () => ir('/gente') }]);
      return;
    }
    const b = borrador.current;
    switch (paso.current) {
      case 'plan-que': borrador.current = { ...entenderPlan(t), semanal: false }; preguntarDia(); return;
      case 'plan-dia': { const dia = entenderDia(t, new Date()); if (dia && b) { b.dia = dia; preguntarHora(); } else { decir('No te entendí el día. Dime, por ejemplo, «mañana» o «el sábado».'); preguntarDia(); } return; }
      case 'plan-hora': { const hora = entenderHora(t); if (hora && b) { b.hora = hora; preguntarLugar(); } else { decir('No te entendí la hora. Dime, por ejemplo, «7 am» o «4:30 pm».'); preguntarHora(); } return; }
      case 'plan-donde': if (b && t.length >= 3) { b.lugar = t.slice(0, 80); mostrarBorrador(); } else preguntarLugar(); return;
      case 'test': decir('Elige la opción que más se parezca a ti.'); setOpciones(preguntaActual()); return;
      case 'perfil-gustos': {
        const tipo = entenderPlan(t).tipo;
        if (tipo !== 'otro' && !borradorPerfil.current.gustos.includes(tipo)) borradorPerfil.current.gustos = [...borradorPerfil.current.gustos, tipo];
        preguntarGustos(); return;
      }
      case 'perfil-comparte': borradorPerfil.current.comparte = t.slice(0, 80); preguntarAprender(); return;
      case 'perfil-aprender': borradorPerfil.current.aprender = t.slice(0, 80); preguntarFrase(); return;
      case 'perfil-frase': borradorPerfil.current.frase = t.replace(/^[«"]|[»"]$/g, '').slice(0, 140); mostrarPerfil(); return;
    }
    const plano = sinTildes(t);
    if (/vecin|conocer gente|amig/.test(plano)) { conocer(); return; }
    if (/que pasa|planes|cerca|hay algo/.test(plano)) { void cerca(); return; }
    if (/sol[ao]\b|triste|invierno|desanimad/.test(plano)) { void comoEstoy(); return; }
    if (/cuid|cansad|agotad|nutre|limite/.test(plano)) { void cuidarme(); return; }
    if (/quiero|ganas|voy a|me gustaria/.test(plano) || PALABRAS.some(([re]) => re.test(plano))) { iniciarPlan(entenderPlan(t)); return; }
    decir('Todavía estoy aprendiendo a conversar, así que no siempre entiendo todo. Por ahora te puedo ayudar con esto:');
    setOpciones(menu());
  }
  const preguntaActual = (): Opcion[] => {
    const i = respuestas.current.length;
    const p = preguntasCuidado[i];
    return (['A', 'B', 'C'] as Letra[]).map(l => ({ texto: p.opciones[l], hacer: () => { respuestas.current = [...respuestas.current, l]; if (i + 1 < preguntasCuidado.length) pregunta(i + 1); else terminarTest(); } }));
  };

  // ---- Saludo ----
  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    decir(`Soy Brisa, tu compañera en MOAI. Estoy aquí para ayudarte a encontrar a tu gente, cerca de casa.`);
    if (!perfil.presentada) { nota('No soy una persona: soy una inteligencia artificial.'); void api.cartaVista('brisa:presentada'); }
    if (empezar === 'plan') { iniciarPlan(); return; }
    if (empezar === 'perfil') { void iniciarPerfil(); return; }
    if (empezar === 'estado') { void comoEstoy(); return; }
    decir('Aquí puedes conocer a tus vecinos, sumarte a lo que pasa en tu zona y, con el tiempo, formar tu Moai. ¿Qué te provoca hoy?');
    if (!perfil.lugar) {
      decir('Para mostrarte lo que pasa cerca, primero cuéntame dónde vives. Solo guardo una zona aproximada, nunca tu dirección.');
      setOpciones([{ texto: 'Elegir dónde vivo', hacer: () => ir('/lugares') }, ...menu()]);
    } else setOpciones(menu());
    void api.cartas().then(r => {
      if (!r.ok || !r.datos.length) return;
      decir('Antes, algo que quería contarte:', ...r.datos.map(c => <CartaEnChat key={c.clave} carta={c} api={api} ir={ir} alTerminar={() => {}}/>));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <Diario titulo={`Hola, ${nombre}`} ir={ir} actual="/inicio" onSalir={onSalir}>
    <div className="brisa-chat">
      <div className="brisa-quien"><OrbeBrisa/><strong>Brisa</strong><span className="sello-ia" title="Brisa es una inteligencia artificial">IA</span>
        <button type="button" className="brisa-enlace" onClick={() => ir('/comunidad')}>Ver el mapa de mi comunidad</button></div>
      <div className="brisa-mensajes" aria-live="polite">
        {mensajes.map(m => <div key={m.id} className={`burbuja de-${m.de}${m.nota ? ' nota' : ''}`}>{m.contenido}</div>)}
        <div ref={final}/>
      </div>
      {opciones.length > 0 && <div className="brisa-opciones" role="group" aria-label="Respuestas sugeridas">
        {opciones.map(o => <button key={o.texto} type="button" onClick={() => elegir(o)}>{o.texto}</button>)}
      </div>}
      <form className="mensaje-form brisa-escribir" onSubmit={enviar}>
        <label htmlFor="a-brisa" className="solo-lectores">Escríbele a Brisa</label>
        <input id="a-brisa" className="cuenta-campo" maxLength={300} placeholder="Escríbele a Brisa" value={texto} onChange={e => setTexto(e.target.value)} autoComplete="off"/>
        <Button type="submit" className="diario-boton principal">Enviar</Button>
      </form>
    </div>
  </Diario>;
}

function TarjetaBorrador({ borrador }: { borrador: Borrador }) {
  return <div className="brisa-plan">
    <strong>{borrador.titulo}</strong>
    <span>{fechaLarga(borrador.dia!)} · {horaLegible(borrador.hora!)}</span>
    <span>{borrador.lugar}</span>
  </div>;
}

function TarjetaPerfil({ nombre, perfil }: { nombre: string; perfil: EntradaPerfil }) {
  return <div className="brisa-plan">
    <strong>{nombre}</strong>
    {perfil.frase && <span className="frase">«{perfil.frase}»</span>}
    {perfil.gustos.length > 0 && <span>Le gusta: {perfil.gustos.map(g => plantillas.find(p => p.tipo === g)?.nombre.toLowerCase()).join(', ')}</span>}
    {perfil.comparte && <span>Comparte: {perfil.comparte}</span>}
    {perfil.aprender && <span>Quiere aprender: {perfil.aprender}</span>}
  </div>;
}
