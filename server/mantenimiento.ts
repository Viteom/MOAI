// Cuentas sin verificar (decisión de Mateo, octubre de 2026):
// - Se borran a los 20 días, con sus consentimientos (cascade) y sus códigos.
// - Mientras tanto, si se registraron por correo, reciben un recordatorio cada 3,5 días (dos por semana).
import type { Db } from './db';
import type { Correo, Recordar } from './envios';
import { cuandoLegible, planesVisibles } from './comunidad';
import { DIAS_MENSAJES_MOAI } from '../src/lib/moai';
import { enInvierno } from './cercania';
import type { Cifrador } from './cifrado';

export const DIAS_PARA_VERIFICAR = 20;
const HORAS_ENTRE_RECORDATORIOS = 84; // 3,5 días

export async function mantener(db: Db, recordar: Recordar): Promise<{ borradas: number; recordadas: number }> {
  const borradas = await db.query<{ destino: string }>(
    `delete from cuentas where verificada_en is null and creada_en < now() - make_interval(days => $1) returning destino`, [DIAS_PARA_VERIFICAR]);
  if (borradas.length) await db.query('delete from verificaciones where destino = any($1)', [borradas.map(b => b.destino)]);

  const pendientes = await db.query<{ id: string; destino: string; nombre: string; dias_restantes: number }>(
    `select id, destino, nombre, greatest(1, $1 - extract(day from now() - creada_en)::int) as dias_restantes
     from cuentas
     where verificada_en is null and canal = 'correo'
       and coalesce(ultimo_recordatorio, creada_en) < now() - make_interval(hours => $2)`, [DIAS_PARA_VERIFICAR, HORAS_ENTRE_RECORDATORIOS]);
  let recordadas = 0;
  for (const cuenta of pendientes) {
    try {
      await recordar(cuenta.destino, cuenta.nombre, cuenta.dias_restantes);
      await db.query('update cuentas set recordatorios = recordatorios + 1, ultimo_recordatorio = now() where id = $1', [cuenta.id]);
      recordadas++;
    } catch {
      // Se reintenta en la próxima vuelta; el registro técnico no lleva el correo (regla 7).
      console.error('falló un recordatorio de verificación');
    }
  }
  return { borradas: borradas.length, recordadas };
}

// Resumen semanal «Planes cerca esta semana»: solo para quien lo activó, máximo uno por semana (regla 13),
// y solo si de verdad hay planes. Nunca se envía un correo vacío para «recordar que existimos».
export async function resumenSemanal(db: Db, correo: Correo, ahora: Date, urlApp = '', cifrador?: Cifrador): Promise<number> {
  const cuentas = await db.query<{ id: string; nombre: string; destino: string }>(
    `select id, split_part(nombre, ' ', 1) as nombre, destino from cuentas
     where resumen_semanal and canal = 'correo' and verificada_en is not null
       and (ultimo_resumen is null or ultimo_resumen < $1::timestamptz - interval '7 days')`, [ahora]);
  let enviados = 0;
  for (const c of cuentas) {
    if (cifrador && await enInvierno(db, cifrador, c.id)) continue; // en invierno, nada de correos de planes
    const visibles = await planesVisibles(db, c.id, ahora);
    const semana = ahora.getTime() + 7 * 864e5;
    const planes = (visibles?.planes ?? []).filter(p => !p.mio && new Date(p.cuando).getTime() <= semana).slice(0, 5);
    if (!planes.length) continue;
    const lista = planes.map(p => `• ${p.titulo}\n  ${cuandoLegible(new Date(p.cuando))} · ${p.lugarPublico} · ${p.franja}`).join('\n\n');
    try {
      await correo(c.destino, 'Planes cerca esta semana',
        `Hola, ${c.nombre}. Estos son algunos planes de tu comunidad para esta semana:\n\n${lista}\n\nSi alguno te provoca, entra a MOAI y súmate${urlApp ? ` (${urlApp})` : ''}.\n\nRecibes este correo porque lo activaste en «Avisos». Puedes apagarlo cuando quieras.`);
      await db.query('update cuentas set ultimo_resumen = $2 where id = $1', [c.id, ahora]);
      enviados++;
    } catch {
      console.error('falló un resumen semanal');
    }
  }
  return enviados;
}

// Las conversaciones de los planes se borran 30 días después del plan (o de cancelarse).
// La de cada Moai guarda solo los últimos 90 días.
export async function borrarConversacionesViejas(db: Db, ahora: Date): Promise<void> {
  await db.query(
    `delete from plan_mensajes m using planes p where m.plan_id = p.id
       and ((p.repite is null and p.cuando < $1::timestamptz - interval '30 days')
         or (p.cancelado_en is not null and p.cancelado_en < $1::timestamptz - interval '30 days'))`, [ahora]);
  await db.query(`delete from moai_mensajes where creado_en < $1::timestamptz - make_interval(days => $2)`, [ahora, DIAS_MENSAJES_MOAI]);
  await db.query(`delete from saludos where creado_en < $1::timestamptz - interval '30 days'`, [ahora]); // los saludos de lejos duran 30 días
}
