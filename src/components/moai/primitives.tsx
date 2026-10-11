import type { ReactNode } from 'react';
import { ArrowRight, Check, Circle, Sparkles, Users, Droplet, Leaf, Heart, PawPrint, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rings, type Person, type Mood } from '@/lib/moai/state';
export function Seal() { return <span className="mo-seal" aria-label="MOAI">Mo<span className="seal-dot" /></span>; }
export function Primary({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <Button variant="moai" size="moai" onClick={onClick} disabled={disabled}>{children}<ArrowRight size={21} aria-hidden="true" /></Button>;
}
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`paper-panel ${className}`}>{children}</section>; }
export function Voice({ line = 'Hola, soy Brisa.', question }: { line?: string; question: string }) { return <><p className="voice-line">{line}</p><h1 className="voice-question">{question}</h1></>; }
export function Choice({ children, selected, onClick, disabled, slot = false }: { children: ReactNode; selected: boolean; onClick: () => void; disabled?: boolean; slot?: boolean }) {
  return <Button variant="moaiOption" size="moai" aria-pressed={selected} onClick={onClick} disabled={disabled} className={`${selected ? 'is-selected' : ''} ${slot ? 'oficio-option' : ''}`}><span>{children}</span><span className="choice-indicator">{selected ? <Check size={17} /> : <Circle size={17} />}</span></Button>;
}
export function MoodShape({ mood }: { mood: Mood }) { const Icon = mood === 'Calma' ? Circle : mood === 'Energía' ? Sparkles : mood === 'Compañía' ? Users : Droplet; return <Icon className={`mood-shape mood-${mood}`} size={29} aria-hidden="true" />; }
export function House({ person, lit, selected, onClick }: { person: Person; lit: boolean; selected?: boolean; onClick?: () => void }) {
  const content = <><span className={`house-avatar ring-${person.anillo}`}>{person.nombre.slice(0,1).toLocaleUpperCase('es')}</span><span className="house-name"><strong>{person.nombre}</strong><span>{rings.find(r => r.id === person.anillo)?.short}</span></span><span className={`house-window ${lit ? 'lit' : ''}`} aria-label={lit ? 'Ventana encendida' : 'Ventana apagada'}>{lit && <Heart size={12} />}</span>{selected && <Check size={18} />}</>;
  return onClick ? <Button variant="moaiHouse" size="moai" onClick={onClick} aria-pressed={selected} className={selected ? 'is-selected' : ''}>{content}</Button> : <div className="house-row">{content}</div>;
}
export function SeedIcon({ seed }: { seed: string }) { return seed === 'palma de cera' ? <Sprout size={27}/> : seed === 'guayacán' ? <Sparkles size={27}/> : <Leaf size={27}/>; }
export function CompanionIcon({ name }: { name: string }) { return name.includes('matas') || name.includes('huerta') ? <Sprout size={19}/> : <PawPrint size={19}/>; }
export function LifeDrawing({ leaf }: { leaf: boolean }) {
  return <div className={`life-drawing ${leaf ? 'is-leaf' : ''}`} aria-hidden="true"><svg viewBox="0 0 230 210"><g className="finger-rings">{[0,1,2,3,4,5,6].map(i => <path key={i} d={`M${47+i*9} 175 C${17+i*9} ${151-i*2} ${39+i*9} ${39+i*8} 112 ${33+i*9} C${195-i*8} ${25+i*9} ${207-i*9} ${153-i*3} ${174-i*8} 178`} />)}<path d="M105 169c-19-22-9-68 11-66s30 37 10 61" /></g><g className="leaf-drawing"><path d="M45 176Q24 45 190 30Q203 153 45 176Z" /><path d="M42 184L174 44M78 148L65 98M99 127L92 69M124 101L122 53M79 147L130 152M102 125L157 120M127 97L180 90" /></g></svg></div>;
}
