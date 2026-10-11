import { useEffect, useState } from 'react';
import { ArrowLeft, Heart, Leaf, PawPrint, Home, TreeDeciduous, House as HouseIcon, Settings, Plus, X, Wind, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Scene } from './scene';
import { TreeView } from './tree';
import { RadarOverlay } from './radar';
import { MoaiClaro } from './moai';
import { radarSiguiente, engrosar, type Radar, type Hilo } from '@/lib/moai/demo';
import { Seal, Primary, Panel, Voice, Choice, MoodShape, House, SeedIcon, CompanionIcon, LifeDrawing } from './primitives';
import { initialState, cities, rings, oficios, deseos, companions, starters, toggleChoice, addPerson, afterCompanions, greeting, timeOfDay, letter, momentos, climas, horaDe, type MoaiState, type Mood, type Ring } from '@/lib/moai/state';

export type Screen = number | 'home' | 'tree' | 'street' | 'settings' | 'demo' | 'moai';
const notice = 'Esto es un prototipo. Lo que escribas no se guarda.';
const seeds = ['ceiba', 'guayacán', 'yarumo', 'palma de cera'];
const moods: Mood[] = ['Calma', 'Energía', 'Compañía', 'Cuidado'];
const soloOptions = ['Quiero conocer a alguien de mi barrio', 'Quiero ir a un Tiempo Festivo', 'Prefiero mirar primero'];
function Notice() { return <p className="prototype-notice"><Info size={14}/><span>{notice}</span></p>; }

// `inicio` y `estadoInicial` existen para las pruebas y para abrir una pantalla concreta al presentar.
export function MoaiApp({ inicio = 1, estadoInicial }: { inicio?: Screen; estadoInicial?: Partial<MoaiState> } = {}) {
  const [state, setState] = useState<MoaiState>(() => ({ ...initialState(), ...estadoInicial }));
  const [screen, setScreen] = useState<Screen>(inicio);
  const [history, setHistory] = useState<Screen[]>([]);
  const [handPage, setHandPage] = useState(false);
  const [officeThanks, setOfficeThanks] = useState(false);
  const [personName, setPersonName] = useState('');
  const [ring, setRing] = useState<Ring>('raiz');
  const [soloChoice, setSoloChoice] = useState('');
  const [esporaStage, setEsporaStage] = useState<'choose' | 'write' | 'sent'>('choose');
  const [esporaReturn, setEsporaReturn] = useState<Screen>(13);
  const [sentTo, setSentTo] = useState('');
  const [finalPage, setFinalPage] = useState(0);
  const [descending, setDescending] = useState(false);
  const [moodAnswered, setMoodAnswered] = useState(false);
  const [fondoReal, setFondoReal] = useState(false);
  const [radar, setRadar] = useState<Radar>('apagado');
  const [hilo, setHilo] = useState<Hilo>('fino');
  const [abrazoEnviado, setAbrazoEnviado] = useState(false);
  const [seVieron, setSeVieron] = useState(false);
  useEffect(() => { if (estadoInicial?.hora === undefined) setState(current => ({ ...current, hora: new Date().getHours() })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (radar !== 'enviado') return;
    const timeout = window.setTimeout(() => setRadar(current => radarSiguiente(current, 'aceptar')), 1600);
    return () => window.clearTimeout(timeout);
  }, [radar]);
  useEffect(() => {
    if (screen !== 13) return;
    setDescending(true);
    const timeout = window.setTimeout(() => setDescending(false), 3500);
    return () => window.clearTimeout(timeout);
  }, [screen]);
  const patch = (value: Partial<MoaiState>) => setState(current => ({ ...current, ...value }));
  const go = (next: Screen) => { setHistory(current => [...current, screen]); setScreen(next); };
  const back = () => {
    if (screen === 4 && handPage) { setHandPage(false); return; }
    if (screen === 6 && officeThanks) { setOfficeThanks(false); return; }
    if (screen === 12 && esporaStage !== 'choose') { setEsporaStage(esporaStage === 'sent' ? 'write' : 'choose'); return; }
    if (screen === 13 && finalPage > 0) { setFinalPage(current => current - 1); return; }
    const previous = history.at(-1);
    if (previous === undefined) return;
    setScreen(previous); setHistory(current => current.slice(0,-1));
  };
  const reset = () => {
    setState(initialState(new Date().getHours())); setScreen(1); setHistory([]); setHandPage(false); setOfficeThanks(false);
    setPersonName(''); setRing('raiz'); setSoloChoice(''); setEsporaStage('choose'); setEsporaReturn(13); setSentTo(''); setFinalPage(0); setDescending(false); setMoodAnswered(false); setRadar('apagado'); setHilo('fino'); setAbrazoEnviado(false); setSeVieron(false);
  };
  const startEspora = () => { setEsporaStage('choose'); setEsporaReturn('home'); go(state.personas.length ? 12 : 11); };
  const cityName = cities.find(c => c.id === state.ciudad)?.label ?? 'Medellín';
  const hourTime = timeOfDay(state.hora);
  const isHome = typeof screen === 'string';
  const showCourtyard = (typeof screen === 'number' && screen >= 5) || (isHome && screen !== 'tree' && screen !== 'moai');
  const courtyardState = { ...state, semilla: screen === 5 ? state.semilla || 'ceiba' : state.semilla, espora: { ...state.espora, destinatario: sentTo } };
  const scroll = (children: React.ReactNode) => <div key={`${screen}-${esporaStage}-${officeThanks}-${handPage}-${finalPage}`} className="panel-scroll">{children}</div>;
  let content: React.ReactNode;

  if (screen === 1) content = <>
    <div className="brand-intro"><h2>MOAI</h2><p>Una ciudad que cuida.</p><div className="one-health-icons"><Heart size={18}/><span/><PawPrint size={18}/><span/><Leaf size={18}/></div></div>
    <Panel>{scroll(<><Voice question="¿Cómo te dicen los que te quieren?"/><input className="moai-field" value={state.nombre} placeholder="Tu nombre o apodo" aria-label="Tu nombre o apodo" autoComplete="off" onChange={e => patch({ nombre: e.target.value })} onKeyDown={e => { if (e.key === 'Enter' && state.nombre.trim()) go(2); }}/><p className="help-text">Tu nombre, un apodo, como quieras que te llamen aquí.</p><Notice/></>)}<div className="panel-action"><Primary disabled={!state.nombre.trim()} onClick={() => { patch({nombre: state.nombre.trim()}); go(2); }}>Continuar</Primary></div></Panel>
  </>;
  else if (screen === 2) content = <Panel>{scroll(<><Voice line={`Mucho gusto, ${state.nombre}.`} question="¿En qué ciudad amaneces?"/><div className="choice-list">{cities.map(city => <Choice key={city.id} selected={state.ciudad === city.id} onClick={() => patch({ ciudad: city.id })}>{city.label}</Choice>)}<Button variant="moaiOption" size="moai" disabled>Usar mi ubicación aproximada</Button><p className="disabled-note">próximamente</p></div></>)}<Primary onClick={() => go(3)}>Continuar</Primary></Panel>;
  else if (screen === 3) content = <><div className="scene-caption"><h1>{cityName}</h1><p>{greeting(state.hora)}</p></div><div className="scene-entry"><Primary onClick={() => go(4)}>Entrar</Primary></div></>;
  else if (screen === 4) content = <><LifeDrawing leaf={handPage}/><Panel>{scroll(<p className="body-message">{!handPage ? 'Antes de entrar, mira tu mano. Tu huella y los anillos de un árbol se parecen. Tus venas dibujan lo mismo que las nervaduras de una hoja. La vida repite sus dibujos.' : 'Por eso, cuando cuidas a una persona, a un animal o a un jardín, estás cuidando de lo mismo. Tu salud, la de quienes te rodean y la del lugar donde vives son una sola. Esta ciudad se construye cuidándola entera.'}</p>)}<Primary onClick={() => handPage ? go(5) : setHandPage(true)}>{handPage ? 'Quiero empezar' : 'Continuar'}</Primary></Panel></>;
  else if (screen === 5) content = <Panel>{scroll(<><Voice question="Todo árbol empieza en una semilla. Elige la que se parezca a ti."/><div className="choice-grid">{seeds.map(seed => <Choice key={seed} selected={state.semilla === seed} onClick={() => patch({semilla: seed})}><SeedIcon seed={seed}/>{seed}</Choice>)}</div></>)}<Primary disabled={!state.semilla} onClick={() => go(6)}>Continuar</Primary></Panel>;
  else if (screen === 6) content = <Panel>{scroll(officeThanks ? <><p className="voice-line">Gracias, {state.nombre}.</p><h1 className="voice-question">Gracias. Ya levantamos tu primera casa en la calle de los oficios.</h1><div className="one-health-icons"><HouseIcon size={32}/><Leaf size={24}/></div></> : <><Voice question="Todo el mundo trae algo en las manos. ¿Qué es lo tuyo?"/><div className="choice-grid">{oficios.map(value => <Choice slot key={value} selected={state.oficios.includes(value)} disabled={state.oficios.length >= 3 && !state.oficios.includes(value)} onClick={() => patch({oficios: toggleChoice(state.oficios,value,3)})}>{value}</Choice>)}</div></>)}<Primary disabled={!state.oficios.length} onClick={() => officeThanks ? go(7) : setOfficeThanks(true)}>Continuar</Primary></Panel>;
  else if (screen === 7) content = <Panel>{scroll(<><Voice question="Aquí también se recibe. Pedir es parte de cuidar. ¿Qué te gustaría que llegara a tu vida?"/><div className="choice-list">{deseos.map(value => <Choice key={value} selected={state.deseos.includes(value)} onClick={() => patch({deseos: toggleChoice(state.deseos,value)})}>{value}</Choice>)}</div></>)}<Primary disabled={!state.deseos.length} onClick={() => go(8)}>Continuar</Primary></Panel>;
  else if (screen === 8) content = <Panel>{scroll(<><Voice question="¿Cómo amaneciste hoy?"/><p className="body-message">Esto lo ves solo tú. Tu árbol lo mostrará con una luz.</p><div className="choice-grid">{moods.map(mood => <Button key={mood} variant="moaiOption" size="moai" className={`mood-option ${state.estadoDia === mood ? 'is-selected' : ''}`} aria-pressed={state.estadoDia === mood} onClick={() => {patch({estadoDia: mood}); setMoodAnswered(true);}}><MoodShape mood={mood}/><span>{mood}</span>{state.estadoDia === mood && <span aria-label="Elegido">✓</span>}</Button>)}</div><Button variant="moaiSecondary" size="moai" className="text-action" aria-pressed={moodAnswered && state.estadoDia === null} onClick={() => {patch({estadoDia: null});setMoodAnswered(true);}}>Prefiero no decirlo{moodAnswered && !state.estadoDia ? ' ✓' : ''}</Button>{moodAnswered && <p className="help-text">Mañana te lo preguntaré con otras palabras. Y puedes saltarte la pregunta cuando quieras.</p>}</>)}<Primary disabled={!moodAnswered} onClick={() => go(9)}>Continuar</Primary></Panel>;
  else if (screen === 9) content = <Panel>{scroll(<><Voice question="¿Quién ha estado a tu lado cuando más lo necesitaste?"/><p className="body-message">Puedes nombrar a una persona o a varias. Lo que escribas no se guarda.</p><div className="choice-list">{state.personas.map((person,i) => <div key={i} className="person-list-item"><House person={person} lit={false}/><Button variant="moaiSecondary" size="moaiIcon" className="remove-person" onClick={() => patch({personas: state.personas.filter((_,j) => j !== i)})} aria-label={`Quitar a ${person.nombre}`}><X size={18}/></Button></div>)}</div>{state.personas.length < 5 && <div className="person-editor"><label className="help-text" htmlFor="person-name">Alguien de tu gente</label><div className="inline-add"><input id="person-name" className="moai-field" placeholder="Su nombre o apodo" autoComplete="off" value={personName} onChange={e => setPersonName(e.target.value)} onKeyDown={e => {if (e.key === 'Enter' && personName.trim()) {patch({personas: addPerson(state.personas,{nombre:personName,anillo:ring})});setPersonName('');}}}/><Button variant="moaiSecondary" size="moai" disabled={!personName.trim()} aria-label="Añadir persona" onClick={() => {patch({personas: addPerson(state.personas,{nombre:personName,anillo:ring})});setPersonName('');}}><Plus size={20}/></Button></div><select className="moai-field ring-select" aria-label="Su anillo" value={ring} onChange={e => setRing(e.target.value as Ring)}>{rings.map(value => <option key={value.id} value={value.id}>{value.label}</option>)}</select></div>}</>)}<Primary onClick={() => go(10)}>Continuar</Primary></Panel>;
  else if (screen === 10) content = <Panel>{scroll(<><Voice question="También cuentan los que no hablan. ¿Quién más te acompaña?"/><div className="choice-grid">{companions.map(value => <Choice key={value} selected={state.companeros.includes(value)} onClick={() => patch({companeros: toggleChoice(state.companeros,value)})}><CompanionIcon name={value}/>{value}</Choice>)}</div></>)}<Primary onClick={() => go(afterCompanions(state.personas))}>Continuar</Primary></Panel>;
  else if (screen === 11) content = <Panel>{scroll(<><Voice question="Si hoy no se te viene nadie a la mente, no pasa nada."/><p className="body-message">Las ciudades también empiezan con una sola lámpara.</p><div className="choice-list">{soloOptions.map(value => <Choice key={value} selected={soloChoice === value} onClick={() => setSoloChoice(value)}>{value}</Choice>)}</div></>)}<Primary disabled={!soloChoice} onClick={() => {if(esporaReturn === 'home') go('home'); else {setFinalPage(0);go(13);}}}>Continuar</Primary></Panel>;
  else if (screen === 12) content = <>{esporaStage === 'sent' && <div className="espora-wind"><Wind/></div>}<Panel>{scroll(esporaStage === 'choose' ? <><Voice question="¿A quién le debes un café?"/><div className="choice-list">{state.personas.map((person,i) => <House key={i} person={person} lit={sentTo === person.nombre} selected={state.espora.destinatario === person.nombre} onClick={() => patch({espora:{...state.espora,destinatario:person.nombre}})}/>)}</div></> : esporaStage === 'write' ? <><Voice line={`Para ${state.espora.destinatario}.`} question="Escríbele con tus palabras. Es lo único que importa."/><textarea className="moai-field moai-textarea" placeholder="Lo que quieras decirle…" aria-label="Tu Espora" value={state.espora.intencion} onChange={e => patch({espora:{...state.espora,intencion:e.target.value}})}/><div className="choice-list">{starters.map(value => <Choice key={value} selected={state.espora.intencion === value} onClick={() => patch({espora:{...state.espora,intencion:value}})}>{value}</Choice>)}</div><p className="help-text">Este envío es simulado. Tu mensaje no se envía ni se guarda.</p></> : <><p className="voice-line">Una Espora en el viento.</p><h1 className="voice-question">Tu Espora salió con la brisa. No hay prisa: quedará en el viento treinta días.</h1><p className="help-text">Este envío es simulado. Tu mensaje no se envía ni se guarda.</p></>)}<Primary disabled={esporaStage === 'choose' ? !state.espora.destinatario : esporaStage === 'write' ? !state.espora.intencion.trim() : false} onClick={() => {if(esporaStage === 'choose') setEsporaStage('write');else if(esporaStage === 'write') {setSentTo(state.espora.destinatario);setEsporaStage('sent');}else {setFinalPage(0);go(esporaReturn);}}}>{esporaStage === 'write' ? 'Enviar Espora' : 'Continuar'}</Primary></Panel></>;
  else if (screen === 13) content = <>{descending && <Button variant="moaiIcon" size="moaiIcon" className="skip-descent" onClick={() => setDescending(false)}>Saltar</Button>}<Panel>{scroll(<><p className="voice-line">Tu primer amanecer.</p><h1 className="voice-question">{finalPage === 0 ? `Listo, ${state.nombre}. Esta es tu ciudad. Hoy encendiste tu primera luz.` : finalPage === 1 ? `Mientras esperas respuesta, sal a mirar el cielo de ${cityName}. Hoy está así: ${state.clima}.` : 'Mañana te escribo otra vez.'}</h1>{finalPage === 2 && <p className="help-text">Aquí te espera tu ciudad.</p>}</>)}<Primary onClick={() => {setDescending(false);finalPage < 2 ? setFinalPage(value => value + 1) : go('home');}}>{finalPage < 2 ? 'Continuar' : 'Ir a Inicio'}</Primary></Panel></>;
  else if (screen === 'home') content = <><div className="scene-caption home-caption"><h1>Tu ciudad, {state.nombre}.</h1><p>{cityName} · {state.clima}</p></div><Panel className="home-panel">{scroll(<><div className="letter-heading"><Seal/><div><strong>Carta de Brisa</strong><p>{hourTime === 'night' ? 'Cuando la ciudad baja la voz' : state.clima === 'lluvia' ? 'La lluvia también cuida' : 'Una brisa para ti'}</p></div></div><p className="serif-message">{letter(state)}</p></>)}<Primary onClick={startEspora}>Escribirle a alguien</Primary></Panel></>;
  else if (screen === 'tree') content = <TreeView state={state}/>;
  else if (screen === 'street') content = <><div className="scene-caption home-caption"><h1>Tu calle.</h1><p>Hay una luz para tu gente.</p></div><Panel className="home-panel">{scroll(<>{state.personas.length ? state.personas.map((person,i) => <House key={i} person={person} lit={sentTo === person.nombre}/>) : <><h1 className="voice-question">Las ciudades también empiezan con una sola lámpara.</h1><p className="body-message">Tu lugar está aquí.</p></>}</>)}<Primary onClick={startEspora}>Escribirle a alguien</Primary></Panel></>;
  else if (screen === 'moai') content = <MoaiClaro hilo={hilo} abrazoEnviado={abrazoEnviado} seVieron={seVieron} onAbrazo={() => setAbrazoEnviado(true)} onSeVieron={() => { setSeVieron(true); setHilo(h => engrosar(h)); }}/>;
  else if (screen === 'demo') content = <><div className="scene-caption home-caption"><h1>Demostración.</h1><p>Cambia el cielo de tu ciudad.</p></div><Panel className="home-panel">{scroll(<>
    <Voice line="Para quien presenta." question="¿Qué cielo quieres ver?"/>
    {!fondoReal && <p className="provisional-chip" role="status">Fondo provisional: todavía no hay imagen de {cityName} a esta hora. Se ve el dibujo de reemplazo.</p>}
    <h2 className="demo-group">Ciudad</h2>
    <div className="choice-list">{cities.map(city => <Choice key={city.id} selected={state.ciudad === city.id} onClick={() => patch({ ciudad: city.id })}>{city.label}</Choice>)}</div>
    <h2 className="demo-group">Hora</h2>
    <div className="choice-grid">{momentos.map(m => <Choice key={m.id} selected={hourTime === m.id} onClick={() => patch({ hora: horaDe(m.id) })}>{m.label}</Choice>)}</div>
    <h2 className="demo-group">Clima</h2>
    <div className="choice-grid">{climas.map(c => <Choice key={c.id} selected={state.clima === c.id} onClick={() => patch({ clima: c.id })}>{c.label}</Choice>)}</div>
    <h2 className="demo-group">Simulaciones</h2>
    <Button variant="moaiSecondary" size="moai" onClick={() => { setRadar(current => radarSiguiente(current, 'simular')); go('home'); }}>Simular que alguien de tu tronco está cerca</Button>
    <Button variant="moaiSecondary" size="moai" onClick={() => go('moai')}>Ver un Moai de ejemplo</Button>
  </>)}<Primary onClick={() => go('home')}>Ver mi ciudad</Primary></Panel></>;
  else content = <><div className="scene-caption home-caption"><h1>Ajustes.</h1><p>A tu ritmo.</p></div><Panel className="home-panel">{scroll(<><Voice line="Este lugar es tuyo." question="Puedes volver a empezar."/><Notice/><p className="help-text">Nada se envía. Nada se guarda. Al salir, tu ciudad vuelve a empezar.</p><Button variant="moaiSecondary" size="moai" onClick={() => go('demo')}>Para quien presenta: demostración</Button></>)}<Primary onClick={reset}>Empezar de nuevo</Primary></Panel></>;

  return <main className="moai-stage"><div className="phone-frame"><div className="app-screen">
    <Scene city={state.ciudad} time={hourTime} weather={state.clima} courtyard={showCourtyard ? courtyardState : undefined} descend={screen === 13 && descending} onBackground={setFondoReal}/>
    <header className="screen-header"><Seal/>{history.length > 0 && <Button variant="moaiIcon" size="moaiIcon" onClick={back} aria-label="Volver"><ArrowLeft size={18}/><span>Volver</span></Button>}</header>
    {content}
    {isHome && <RadarOverlay radar={radar} onTocar={() => setRadar(r => radarSiguiente(r, 'tocar'))} onSaludar={() => setRadar(r => radarSiguiente(r, 'saludar'))} onAhoraNo={() => setRadar(r => radarSiguiente(r, 'ahoraNo'))} onCerrar={() => setRadar(r => radarSiguiente(r, 'cerrar'))}/>}
    {isHome && <nav className="bottom-nav" aria-label="Tu ciudad">{([
      ['home','Inicio',Home], ['tree','Árbol',TreeDeciduous], ['street','Calle',HouseIcon], ['settings','Ajustes',Settings],
    ] as const).map(([target,label,Icon]) => <Button key={target} variant="moaiNav" aria-current={screen === target ? 'page' : undefined} onClick={() => {if(screen !== target) go(target);}}><Icon/><span>{label}</span></Button>)}</nav>}
  </div></div></main>;
}
