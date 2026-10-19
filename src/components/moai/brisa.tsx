// Inicio con Brisa (decisión de Mateo, 15 de octubre de 2026): Brisa es la pantalla de inicio y guía la plataforma
// conversando. Por ahora es un guion (sin modelo de IA): entiende opciones y algunas palabras; lo demás lo dice con
// honestidad. Los planes y el test de cuidado ocurren en la conversación, no en formularios.
// 19 de octubre (Mateo): la conversación se guarda cifrada 90 días y Brisa la retoma; cada día hace una o dos preguntas
// directas (src/lib/conversacion.ts), responde dudas de la plataforma y se le puede dictar con la voz.
// Regla 12: el sello «IA» va siempre junto a su nombre, y la primera vez dice que no es una persona.
// Regla 11: ante señales de riesgo, deriva a una persona y a la línea de emergencias.
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Api, Carta, Perfil, Plan } from '@/lib/api';
import { textoSaludo, type EntradaPerfil } from '@/lib/perfil';
import { plantillas, type Tipo } from '@/lib/lugares';
import { avisoCuidado, resultadoCuidado, textosCuidado, type Letra } from '@/lib/cuidado';
import { esDuda, gustosEn, PREGUNTAS, preguntaDelDia, preguntasHechas, reaccionar, responderDuda, type Pregunta } from '@/lib/conversacion';
import { OrbeBrisa } from './bosque';
import { Barra, type Ir } from './diario';
import { EscenaCuidado } from './escena';

type Mensaje = { id: number; de: 'brisa' | 'yo'; contenido: ReactNode; nota?: boolean };
type Previo = { de: 'brisa' | 'yo'; texto: string };
const MAX_PREGUNTAS_DIA = 2;
// `silencioso`: opciones como «Otra cosa» que solo muestran más opciones, sin aparecer como respuesta de la persona.
type Opcion = { texto: string; hacer: () => void; silencioso?: boolean };
// Ritmo (pedido de Mateo, 15 de octubre): Brisa escribe un mensaje a la vez, con una pausa en la que se ve
// «Brisa está escribiendo…», y las opciones aparecen cuando termina. En las pruebas, sin pausas.
const CON_PAUSAS = import.meta.env.MODE !== 'test';
const pausaPara = (m: { contenido: ReactNode; nota?: boolean }) =>
  m.nota ? 250 : Math.min(1500, 500 + (typeof m.contenido === 'string' ? m.contenido.length : 80) * 10);
const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));
type Borrador = { titulo: string; tipo: Tipo; dia?: Date; hora?: string; lugar?: string; semanal: boolean };
type Paso = 'libre' | 'plan-que' | 'plan-dia' | 'plan-hora' | 'plan-donde' | 'test' | 'charla';

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

function CartaEnChat({ carta, api, ir, alTerminar, alCuidado }: { carta: Carta; api: Api; ir: Ir; alTerminar: () => void; alCuidado: () => void }) {
  const [hecho, setHecho] = useState('');
  const [porque, setPorque] = useState(false);
  const [error, setError] = useState('');
  const cerrar = async (texto: string) => { await api.cartaVista(carta.clave); setHecho(texto); alTerminar(); };
  // Revisión de Codex: solo se anuncia lo que el servidor confirmó; si falla, la carta sigue ahí para reintentar.
  const siSale = (r: { ok: boolean; error?: string }, texto: string) => r.ok ? void cerrar(texto) : setError(r.error ?? 'No se pudo. Intenta de nuevo.');
  const motivo = carta.tipo === 'sugerencia' || carta.tipo === 'gente' || carta.tipo === 'interno' ? carta.motivo : undefined;
  return <div>
    <p>{carta.texto}</p>
    {motivo && porque && <p className="carta-motivo">{motivo}</p>}
    {error && !hecho && <p className="campo-error" role="alert">{error}</p>}
    {hecho ? <p className="campo-ayuda">{hecho}</p> : <div className="plan-acciones">
      {carta.tipo === 'solo' && carta.repetir && <Button className="diario-boton principal" onClick={() => void api.repetirPlan(carta.planId).then(r => siSale(r, 'Listo: queda cada semana.'))}>Sí, cada semana</Button>}
      {carta.tipo === 'sugerencia' && <Button className="diario-boton principal" onClick={() => void api.irAPlan(carta.planId).then(r => siSale(r, 'Te sumaste. Nos vemos allá.'))}>Me sumo</Button>}
      {carta.tipo === 'gente' && <Button className="diario-boton principal" onClick={() => void api.cartaVista(carta.clave).then(() => ir('/gente'))}>Ir a Mi gente</Button>}
      {carta.tipo === 'saludo' && carta.opciones.map(o => <Button key={o} className="diario-boton" onClick={() => void api.saludar(carta.ref, o).then(r => cerrar(r.ok ? `Le mandaste: «${textoSaludo(o)}».` : r.error))}>{textoSaludo(o)}</Button>)}
      {carta.tipo === 'saludo' && carta.plan && <Button className="diario-boton principal" onClick={() => void api.cartaVista(carta.clave).then(() => ir('/inicio?plan=1'))}>Proponer algo juntos</Button>}
      {carta.tipo === 'cuidado' && <Button className="diario-boton principal" onClick={() => void api.cartaVista(carta.clave).then(() => { setHecho('Vamos.'); alCuidado(); })}>Sí, volvamos a mirarlo</Button>}
      {carta.tipo === 'interno' && <Button className="diario-boton principal" onClick={() => void api.hablamos(carta.personaId).then(r => siSale(r, 'Qué bueno. Esos vínculos también te cuidan a ti.'))}>Ya le escribí</Button>}
      <Button className="diario-boton" onClick={() => void cerrar('Entendido.')}>{carta.tipo === 'solo' && !carta.repetir ? 'Entendido' : 'Ahora no'}</Button>
      {motivo && <button type="button" className="brisa-enlace" aria-expanded={porque} onClick={() => setPorque(p => !p)}>¿Por qué veo esto?</button>}
    </div>}
  </div>;
}

function MiniPlan({ plan, api, ir }: { plan: Plan; api: Api; ir: Ir }) {
  const [voy, setVoy] = useState(plan.voy);
  const [error, setError] = useState('');
  return <div className="brisa-plan">
    <strong>{plan.titulo}</strong>
    <span>{fechaLarga(new Date(plan.cuando))} · {plan.lugarPublico} · {plan.franja}</span>
    <span>{plan.organizacion ? `Convoca ${plan.organizacion.nombre}` : `Lo propone ${plan.autor}`}</span>
    <div className="plan-acciones">
      {voy ? <span className="plan-voy">Vas a ir</span> : <Button className="diario-boton principal" onClick={() => void api.irAPlan(plan.id).then(r => r.ok ? setVoy(true) : setError(r.error))}>Me sumo</Button>}
      <Button className="diario-boton" onClick={() => ir(`/planes/${plan.id}`)}>Ver</Button>
    </div>
    {error && <span className="campo-error" role="alert">{error}</span>}
  </div>;
}

// La conversación con Brisa, sin marco: va en el panel de vidrio del inicio y en el del mapa.
export function ConversacionBrisa({ perfil, api, ir, empezar }: { perfil: Perfil; api: Api; ir: Ir; empezar?: 'plan' | 'perfil' | 'estado' }) {
  const nombre = perfil.nombre.split(' ')[0];
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [opciones, setOpcionesVisibles] = useState<Opcion[]>([]);
  const [escribiendo, setEscribiendo] = useState(false);
  const cola = useRef<Mensaje[]>([]);
  const opcionesPendientes = useRef<Opcion[] | null>(null);
  const procesando = useRef(false);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []); // en desarrollo React monta dos veces
  const [texto, setTexto] = useState('');
  const paso = useRef<Paso>('libre');
  const borrador = useRef<Borrador | null>(null);
  const respuestas = useRef<Letra[]>([]);
  const [escena, setEscena] = useState(false);
  const borradorPerfil = useRef<EntradaPerfil>({ frase: '', gustos: [], comparte: '', aprender: '', visible: false });
  const siguiente = useRef(0);
  const final = useRef<HTMLDivElement>(null);
  const iniciado = useRef(false);
  // Conversación de cada día: qué preguntas ya hizo (según lo guardado), cuál espera respuesta y, al conocerte, la fila
  // de preguntas para la tarjeta.
  const [previos, setPrevios] = useState<Previo[]>([]);
  const hechas = useRef<Set<string>>(new Set());
  const preguntasHoy = useRef(0);
  const preguntaActual = useRef<Pregunta | null>(null);
  const secuencia = useRef<Pregunta[]>([]);
  const conociendote = useRef(false);
  const tarjetaVisible = useRef(false);

  // Lo que se dice en texto se guarda (cifrado, 90 días) en lotes pequeños; las tarjetas y los planes no.
  const porGuardar = useRef<Previo[]>([]);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guardarAhora = useCallback(() => {
    if (temporizador.current) { clearTimeout(temporizador.current); temporizador.current = null; }
    const lote = porGuardar.current.splice(0, 20);
    if (lote.length) void api.guardarHistorial?.(lote);
    if (porGuardar.current.length) guardarAhora();
  }, [api]);
  const registrar = useCallback((de: Previo['de'], contenido: ReactNode) => {
    if (typeof contenido !== 'string') return;
    porGuardar.current.push({ de, texto: contenido });
    if (!temporizador.current) temporizador.current = setTimeout(guardarAhora, 800);
  }, [guardarAhora]);
  useEffect(() => () => guardarAhora(), [guardarAhora]);

  // Los mensajes de Brisa entran en fila: uno a la vez, con su pausa. Las opciones esperan a que termine.
  const procesar = useCallback(async () => {
    if (procesando.current) return;
    procesando.current = true;
    try {
      while (cola.current.length) {
        const m = cola.current.shift()!;
        setEscribiendo(!m.nota);
        await esperar(pausaPara(m));
        if (!vivo.current) return;
        setEscribiendo(false);
        setMensajes(ms => [...ms, m]);
        registrar('brisa', m.contenido);
        await esperar(150);
      }
    } finally { procesando.current = false; }
    if (opcionesPendientes.current && vivo.current) { setOpcionesVisibles(opcionesPendientes.current); opcionesPendientes.current = null; }
  }, [registrar]);
  const encolar = useCallback((nuevos: Mensaje[]) => {
    if (!CON_PAUSAS) { setMensajes(m => [...m, ...nuevos]); nuevos.forEach(m => registrar('brisa', m.contenido)); return; }
    cola.current.push(...nuevos);
    void procesar();
  }, [procesar]);
  const setOpciones = useCallback((ops: Opcion[]) => {
    if (!CON_PAUSAS || !ops.length || (!procesando.current && !cola.current.length)) { opcionesPendientes.current = null; setOpcionesVisibles(ops); return; }
    opcionesPendientes.current = ops;
    setOpcionesVisibles([]);
  }, []);
  // Como mucho tres opciones a la vista; el resto, detrás de «Otra cosa».
  const pocas = (ops: Opcion[], n = 3, mas = 'Otra cosa', despues: Opcion[] = []): Opcion[] => ops.length <= n + 1 ? [...ops, ...despues] : [
    ...ops.slice(0, n),
    { texto: mas, silencioso: true, hacer: () => setOpciones([...ops.slice(n), { texto: 'Volver', silencioso: true, hacer: () => setOpciones(pocas(ops, n, mas, despues)) }, ...despues]) },
    ...despues,
  ];
  const decir = useCallback((...contenidos: ReactNode[]) => encolar(contenidos.map(c => ({ id: siguiente.current++, de: 'brisa' as const, contenido: c }))), [encolar]);
  const nota = useCallback((c: ReactNode) => encolar([{ id: siguiente.current++, de: 'brisa', contenido: c, nota: true }]), [encolar]);
  const hablo = useRef(false); // si la persona ya tomó la palabra, el saludo no la interrumpe con más cartas
  const yo = useCallback((t: string) => { hablo.current = true; setMensajes(m => [...m, { id: siguiente.current++, de: 'yo', contenido: t }]); registrar('yo', t); }, [registrar]);
  useEffect(() => { final.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' }); }, [mensajes]);

  // ---- Menú principal ----
  // La primera vez, lo primero es contar de ti; después, lo de todos los días. El resto, detrás de «Otra cosa».
  const primeraVez = !perfil.presentada;
  const menu = useCallback((): Opcion[] => {
    const cuentame = { texto: 'Cuéntame de ti', hacer: () => void iniciarPerfil() };
    const cerca_ = { texto: 'Qué pasa cerca', hacer: () => void cerca() };
    const ganas = { texto: 'Tengo ganas de…', hacer: () => iniciarPlan() };
    const estoy = { texto: 'Cómo estoy', hacer: () => void comoEstoy() };
    const vecinos = { texto: 'Conocer vecinos', hacer: () => conocer() };
    const funciona = { texto: 'Cómo funciona', hacer: () => comoFunciona() };
    return pocas(primeraVez ? [cuentame, cerca_, ganas, estoy, vecinos, funciona] : [cerca_, ganas, estoy, vecinos, cuentame, funciona]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const volver = (pregunta = '¿Qué más te provoca?') => { paso.current = 'libre'; decir(pregunta); setOpciones(menu()); };
  const elegir = (o: Opcion) => { if (!o.silencioso) yo(o.texto); setOpciones([]); o.hacer(); };
  // Sin botones de por medio: la conversación sigue escribiendo. Las opciones quedan a un toque, por si se necesitan.
  const verOpciones: Opcion = { texto: 'Ver qué puedo hacer', silencioso: true, hacer: () => { paso.current = 'libre'; preguntaActual.current = null; decir('Esto es lo que podemos hacer juntas:'); setOpciones(menu()); } };

  // ---- Conversar: una o dos preguntas directas por día ----
  // `antes`: lo que Brisa dice primero (por ejemplo, «Listo, ya está en tu tarjeta»). Después, la pregunta del día si
  // queda alguna; si no, deja la conversación abierta.
  function conversar(antes?: string) {
    if (antes) decir(antes);
    const p = preguntasHoy.current < MAX_PREGUNTAS_DIA ? preguntaDelDia(hechas.current, new Date(), preguntasHoy.current) : null;
    if (p) { preguntasHoy.current++; preguntar(p); return; }
    paso.current = 'libre';
    if (!antes) decir('Aquí sigo. Cuéntame lo que quieras, o pregúntame cualquier duda sobre MOAI.');
    setOpciones([verOpciones]);
  }
  function preguntar(p: Pregunta) {
    hechas.current.add(p.clave);
    preguntaActual.current = p;
    paso.current = 'charla';
    decir(p.texto);
    setOpciones([{ ...verOpciones, texto: 'Mejor otra cosa' }]);
  }
  // Lo que la persona cuenta y puede ir a su tarjeta. Devuelve si hubo algo nuevo.
  function anotar(p: Pregunta, t: string): boolean {
    const b = borradorPerfil.current;
    if (p.tarjeta === 'gustos') { const nuevos = gustosEn(t).filter(g => !b.gustos.includes(g)); b.gustos = [...b.gustos, ...nuevos]; return nuevos.length > 0; }
    if (p.tarjeta === 'comparte') { b.comparte = t.slice(0, 80); return true; }
    if (p.tarjeta === 'aprender') { b.aprender = t.slice(0, 80); return true; }
    if (p.tarjeta === 'frase') { b.frase = t.replace(/^[«"]|[»"]$/g, '').slice(0, 140); return true; }
    return false;
  }
  function responder(t: string) {
    const p = preguntaActual.current;
    preguntaActual.current = null;
    paso.current = 'libre';
    if (conociendote.current) { // «Cuéntame de ti»: las preguntas de la tarjeta seguidas, y al final la tarjeta
      if (p) anotar(p, t);
      decir(reaccionar(p, t));
      const otra = secuencia.current.shift();
      if (otra) preguntar(otra); else { conociendote.current = false; mostrarPerfil(); }
      return;
    }
    decir(reaccionar(p, t));
    if (p && anotar(p, t)) {
      decir('¿Lo sumo a tu tarjeta para los vecinos? Solo la ven si tú lo apruebas.');
      setOpciones([
        { texto: 'Sí, súmalo', hacer: () => void api.guardarPerfilPublico({ ...borradorPerfil.current, visible: tarjetaVisible.current }).then(r => {
          if (!r.ok) { decir(r.error); conversar(); return; }
          if (tarjetaVisible.current) { conversar('Listo, ya está en tu tarjeta.'); return; }
          decir('Listo, lo guardé. Tu tarjeta todavía no se muestra a nadie.');
          setOpciones([{ texto: 'Ver mi tarjeta', hacer: () => mostrarPerfil() }, { texto: 'Seguir conversando', silencioso: true, hacer: () => conversar() }]);
        }) },
        { texto: 'No, era solo para ti', hacer: () => conversar('Entendido, queda entre nosotras.') },
      ]);
      return;
    }
    conversar();
  }

  function conocer() {
    decir('Aquí la gente se conoce haciendo cosas sencillas juntas: una caminata, un tinto, una partida en el parque.',
      'Después de cada plan te pregunto con quién te viste. Con esas personas puedes formar un Moai, aunque sean solo dos.');
    setOpciones([{ texto: 'Ver vecinos', hacer: () => ir('/zona') }, { texto: 'Qué pasa cerca', hacer: () => void cerca() }, { texto: 'Ir a Mi gente', hacer: () => ir('/gente') }]);
  }
  async function cerca() {
    if (!perfil.lugar) { decir('Primero cuéntame dónde vives, así te muestro lo que pasa cerca.'); setOpciones([{ texto: 'Elegir mi lugar', hacer: () => ir('/lugares') }]); return; }
    const r = await api.planes();
    const planes = r.ok ? r.datos.filter(p => !p.mio).slice(0, 3) : [];
    if (!r.ok) { decir(r.error); volver(); return; }
    if (!planes.length) { decir('Todavía no hay planes cerca de ti. ¿Y si propones uno? Casi siempre alguien se anima.'); setOpciones([{ texto: 'Tengo ganas de…', hacer: () => iniciarPlan() }, { texto: 'Volver', silencioso: true, hacer: () => volver() }]); return; }
    decir(planes.length === 1 ? 'Esto pasa cerca de ti:' : 'Esto pasa cerca de ti estos días:', ...planes.map(p => <MiniPlan key={p.id} plan={p} api={api} ir={ir}/>));
    setOpciones([{ texto: 'Ver Mi barrio', hacer: () => ir('/comunidad') }, { texto: 'Tengo ganas de…', hacer: () => iniciarPlan() }, { texto: 'Volver', hacer: () => volver() }]);
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
    setOpciones(pocas(plantillas.map(p => ({ texto: p.nombre, hacer: () => { borrador.current = { titulo: p.titulo, tipo: p.tipo, semanal: false }; preguntarDia(); } }))));
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
    setOpciones([{ texto: 'Empezar', hacer: () => setEscena(true) }, { texto: 'Ahora no', hacer: () => volver() }]);
  }
  // Las preguntas ocurren en la escena inmersiva; aquí se recibe lo que la persona decidió.
  function alTerminarEscena(resp: Letra[] | null, guardar: boolean) {
    setEscena(false);
    if (!resp) { decir('Lo dejamos para otro momento. Las preguntas no se van a ningún lado.'); volver(); return; }
    respuestas.current = resp;
    mostrarResultado(resultadoCuidado(resp)!, false);
    void api.responderCuidado(resp, guardar).then(r => {
      decir(!r.ok ? r.error : guardar ? 'Guardado. Lo tendré en cuenta para cuidarte, y en unos meses te propongo repetirlo: las personas cambian.' : 'Listo, no lo guardé.');
      seguirConInterno();
    });
  }
  function mostrarResultado(letras: Letra[], guardado: boolean) {
    decir(...letras.map(l => textosCuidado[l]));
    nota(avisoCuidado);
    if (guardado) opcionesResultado();
  }
  // Borrar el resultado: solo se dice «lo borré» si el servidor lo confirmó; si no, sigue guardado y se puede reintentar.
  function opcionesResultado() {
    setOpciones([{ texto: 'Borrar mi resultado', hacer: () => void api.borrarCuidado().then(r => {
      if (r.ok) { volver('Listo, lo borré. ¿Qué más te provoca?'); return; }
      decir(`No pude borrarlo: ${r.error} Sigue guardado; puedes intentarlo de nuevo.`);
      opcionesResultado();
    }) }, { texto: 'Mi Moai interno', hacer: () => ir('/gente') }, { texto: 'Volver', hacer: () => volver() }]);
  }
  function seguirConInterno() {
    decir('Algo que ayuda: tener presentes a las personas que te nutren. ¿Armamos tu Moai interno?');
    setOpciones([{ texto: 'Sí, armarlo', hacer: () => ir('/gente') }, { texto: 'Después', hacer: () => volver() }]);
  }

  // ---- Cuéntame de ti: la tarjeta que verán tus vecinos (solo si la apruebas) ----
  // Directo, sin opciones para elegir (pedido de Mateo): cuatro preguntas seguidas y, al final, la tarjeta.
  async function iniciarPerfil() {
    const r = await api.perfilPublico();
    if (r.ok) { borradorPerfil.current = { ...r.datos, gustos: [] }; tarjetaVisible.current = r.datos.visible; }
    conociendote.current = true;
    secuencia.current = ['domingo', 'sabes', 'aprender', 'frase'].map(c => PREGUNTAS.find(p => p.clave === c)!);
    decir('Cuéntame de ti.');
    preguntar(secuencia.current.shift()!);
    setOpciones([{ texto: 'Mejor después', silencioso: true, hacer: () => { conociendote.current = false; secuencia.current = []; verOpciones.hacer(); } }]);
  }
  function mostrarPerfil() {
    paso.current = 'libre';
    const p = { ...borradorPerfil.current };
    if (!p.frase && !p.comparte && !p.gustos.length) { decir('Está bien, no hace falta contar nada ahora. Cuando quieras, aquí estoy.'); volver(); return; }
    decir('Así te verían tus vecinos:', <TarjetaPerfil key={`perfil-${siguiente.current}`} nombre={nombre} perfil={p}/>,
      '¿La muestro a tus vecinos? La verían en Mi barrio, en «Vecinos», nunca con tu dirección. Puedes cambiarlo cuando quieras.');
    const guardar = (visible: boolean) => void api.guardarPerfilPublico({ ...p, visible }).then(r => {
      decir(!r.ok ? r.error : visible ? 'Listo, tus vecinos ya pueden ver tu tarjeta. Cuando alguien te salude, te cuento.' : 'Guardado. No se muestra a nadie por ahora.');
      setOpciones([{ texto: 'Ver vecinos', hacer: () => ir('/zona') }, { texto: 'Volver', hacer: () => volver() }]);
    });
    setOpciones([{ texto: 'Sí, mostrarla', hacer: () => guardar(true) }, { texto: 'Guardarla sin mostrar', hacer: () => guardar(false) }, { texto: 'Empezar de nuevo', hacer: () => void iniciarPerfil() }]);
  }

  // ---- Cómo estoy: puerta abierta e invierno. Los declara la persona; nada se deduce (regla 6) ----
  async function comoEstoy() {
    const r = await api.estado();
    if (r.ok && r.datos.invierno) {
      decir('Sigo aquí contigo. ¿Cómo va tu invierno?');
      setOpciones([
        { texto: 'Ya salí del invierno', hacer: () => void api.invierno(false).then(r => { decir(r.ok ? 'Me alegra mucho. Vuelvo a contarte de planes cerca, con calma.' : `No pude guardarlo: ${r.error} Inténtalo de nuevo en un momento.`); volver(); }) },
        { texto: 'Sigo igual', hacer: () => void acompanarInvierno() },
      ]);
      return;
    }
    decir('¿Cómo estás estos días?');
    // Cuatro respuestas a la vista; «Quiero cuidarme» aparece después de «Más o menos» o «Me siento sola o solo».
    setOpciones([
      { texto: 'Bien', hacer: () => volver('¡Qué bueno! ¿Qué te provoca hoy?') },
      { texto: 'Más o menos', hacer: () => ofrecerPuerta() },
      { texto: 'Me siento sola o solo', hacer: () => ofrecerPuerta() },
      { texto: 'En invierno', hacer: () => void api.invierno(true).then(r => {
        if (!r.ok) { decir(`No pude guardarlo: ${r.error} Por ahora nada cambió; inténtalo de nuevo en un momento.`); volver(); return; }
        decir('Gracias por contármelo. Voy a bajar el ritmo: mientras dure, no te sugiero planes ni te llegan correos de planes.'); void acompanarInvierno();
      }) },
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
      case 'charla': if (!esDuda(t) || !responderDuda(t)) { responder(t); return; } break; // si responde con una duda, primero la duda
    }
    // Dudas sobre la plataforma: respuestas escritas por el equipo.
    if (esDuda(t)) {
      const respuesta = responderDuda(t);
      if (respuesta) { decir(...respuesta); setOpciones([verOpciones]); return; }
    }
    const plano = sinTildes(t);
    if (/vecin|conocer gente|amig/.test(plano)) { conocer(); return; }
    if (/que pasa|planes|cerca|hay algo/.test(plano)) { void cerca(); return; }
    if (/sol[ao]\b|triste|invierno|desanimad/.test(plano)) { void comoEstoy(); return; }
    if (/cuid|cansad|agotad|nutre|limite/.test(plano)) { void cuidarme(); return; }
    if (/quiero|ganas|voy a|me gustaria/.test(plano)) { iniciarPlan(entenderPlan(t)); return; }
    if (esDuda(t)) { decir('Esa no me la sé todavía. Puedes preguntarme por los planes, los Moais, tu privacidad o tu cuenta.'); setOpciones([verOpciones]); return; }
    // Lo demás es conversación: Brisa reacciona a lo que le cuentan y sigue.
    conversar(reaccionar(null, t));
  }

  // ---- Saludo ----
  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    // Primero, lo que ya hablaron (para retomar y no repetir preguntas) y la tarjeta (para sumarle lo que cuente).
    void Promise.all([api.historial?.() ?? Promise.resolve(null), api.perfilPublico?.() ?? Promise.resolve(null)]).then(([h, t]) => {
      const lineas = h?.ok ? h.datos : [];
      setPrevios(lineas.map(l => ({ de: l.de, texto: l.texto })));
      hechas.current = preguntasHechas(lineas.filter(l => l.de === 'brisa').map(l => l.texto));
      const hoy = new Date().toDateString();
      preguntasHoy.current = PREGUNTAS.filter(p => lineas.some(l => l.de === 'brisa' && l.texto === p.texto && new Date(l.fecha).toDateString() === hoy)).length;
      if (t?.ok) { borradorPerfil.current = { ...t.datos }; tarjetaVisible.current = t.datos.visible; }
      saludar();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function saludar() {
    // La primera vez se presenta; después, un saludo corto. Una cosa a la vez: primero lo pendiente, después la pregunta.
    if (primeraVez) {
      decir('Soy Brisa, tu compañera en MOAI.');
      nota('No soy una persona: soy una inteligencia artificial.');
      void api.cartaVista('brisa:presentada');
      decir('Estoy aquí para ayudarte a encontrar a tu gente, cerca de casa.');
    } else decir('Qué bueno verte otra vez.');
    if (empezar === 'plan') { iniciarPlan(); return; }
    if (empezar === 'perfil') { void iniciarPerfil(); return; }
    if (empezar === 'estado') { void comoEstoy(); return; }
    if (!perfil.lugar) {
      decir('Para mostrarte lo que pasa cerca, primero cuéntame dónde vives. Solo guardo una zona aproximada, nunca tu dirección.');
      setOpciones([{ texto: 'Elegir dónde vivo', hacer: () => ir('/lugares') }, { texto: 'Otra cosa', silencioso: true, hacer: () => setOpciones(menu()) }]);
      return;
    }
    // Las cartas pendientes (invitaciones, saludos, recordatorios), de a una: la siguiente cuando se atiende la anterior.
    void api.cartas().then(r => {
      const cartas = r.ok ? r.datos : [];
      const mostrar = (i: number) => {
        if (hablo.current) return;
        if (i >= cartas.length) { conversar(primeraVez ? 'Me gustaría conocerte un poco.' : undefined); return; }
        decir(i ? 'Y otra cosa:' : 'Antes, algo que quería contarte:',
          <CartaEnChat key={cartas[i].clave} carta={cartas[i]} api={api} ir={ir} alTerminar={() => mostrar(i + 1)} alCuidado={() => setEscena(true)}/>);
      };
      mostrar(0);
    });
  }

  return <div className="brisa-chat">
    <div className="brisa-quien"><OrbeBrisa/><strong>Brisa</strong><span className="sello-ia" title="Brisa es una inteligencia artificial">IA</span>
</div>
    <div className="brisa-mensajes" aria-live="polite">
      {previos.map((m, i) => <div key={`p${i}`} className={`burbuja de-${m.de} previo`}>{m.texto}</div>)}
      {previos.length > 0 && <p className="brisa-separador" role="separator">Hoy</p>}
      {mensajes.map(m => <div key={m.id} className={`burbuja de-${m.de}${m.nota ? ' nota' : ''}`}>{m.contenido}</div>)}
      {escribiendo && <div className="burbuja de-brisa escribiendo" role="status" aria-label="Brisa está escribiendo"><span/><span/><span/></div>}
      <div ref={final}/>
    </div>
    {opciones.length > 0 && <div className="brisa-opciones" role="group" aria-label="Respuestas sugeridas">
      {opciones.map(o => <button key={o.texto} type="button" onClick={() => elegir(o)}>{o.texto}</button>)}
    </div>}
    <form className="mensaje-form brisa-escribir" onSubmit={enviar}>
      <label htmlFor="a-brisa" className="solo-lectores">Escríbele a Brisa</label>
      <input id="a-brisa" className="cuenta-campo" maxLength={300} placeholder="Escríbele a Brisa" value={texto} onChange={e => setTexto(e.target.value)} autoComplete="off"/>
      <Dictado alTexto={setTexto}/>
      <Button type="submit" className="diario-boton principal">Enviar</Button>
    </form>
    {escena && <EscenaCuidado onTerminar={alTerminarEscena}/>}
    </div>;
}

// Inicio: la ciudad ilustrada de fondo y Brisa en un panel de vidrio al lado (referente de Mateo, 15 de octubre).
export function InicioBrisa({ perfil, api, ir, onSalir, empezar }: { perfil: Perfil; api: Api; ir: Ir; onSalir: () => void; empezar?: 'plan' | 'perfil' | 'estado' }) {
  return <div className="inicio-ciudad">
    <img className="inicio-fondo" src="/backgrounds/comunidad-ilustrada.webp" alt="" aria-hidden="true"/>
    <Barra ir={ir} onSalir={onSalir} actual="brisa"/>
    <aside className="panel-brisa vidrio" aria-labelledby="inicio-titulo">
      <h1 id="inicio-titulo" tabIndex={-1}>Hola, {perfil.nombre.split(' ')[0]}</h1>
      <ConversacionBrisa perfil={perfil} api={api} ir={ir} empezar={empezar}/>
    </aside>
  </div>;
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

// Dictado (decisión de Mateo, 19 de octubre): la voz pasa a texto con el reconocimiento del navegador y queda en la caja
// para revisarla antes de enviar. MOAI nunca recibe ni guarda el audio; el navegador sí lo envía a su servicio de
// dictado (en Chrome, Google), y eso se avisa mientras se escucha. Si el navegador no lo tiene, no aparece el botón.
type Reconocedor = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
const ReconocedorDeVoz = (globalThis as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor }).SpeechRecognition
  ?? (globalThis as unknown as { webkitSpeechRecognition?: new () => Reconocedor }).webkitSpeechRecognition;

function Dictado({ alTexto }: { alTexto: (t: string) => void }) {
  const [escuchando, setEscuchando] = useState(false);
  const reconocedor = useRef<Reconocedor | null>(null);
  useEffect(() => () => reconocedor.current?.stop(), []);
  if (!ReconocedorDeVoz) return null;
  const alternar = () => {
    if (escuchando) { reconocedor.current?.stop(); return; }
    const r = new ReconocedorDeVoz();
    r.lang = 'es-CO'; r.interimResults = true; r.continuous = false;
    r.onresult = e => alTexto(Array.from(e.results).map(x => x[0].transcript).join(' ').slice(0, 300));
    r.onend = () => setEscuchando(false);
    r.onerror = () => setEscuchando(false);
    reconocedor.current = r;
    r.start();
    setEscuchando(true);
  };
  return <>
    <button type="button" className={`dictado${escuchando ? ' escuchando' : ''}`} aria-pressed={escuchando} aria-label={escuchando ? 'Dejar de escuchar' : 'Dictar con la voz'} onClick={alternar}><Mic aria-hidden="true"/></button>
    {escuchando && <p className="dictado-aviso" role="status">Te escucho. Tu navegador pasa tu voz a texto con su servicio de dictado; MOAI no guarda el audio. Revisa el texto y envíalo.</p>}
  </>;
}
