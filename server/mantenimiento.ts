// Cuentas sin verificar (decisión de Mateo, octubre de 2026):
// - Se borran a los 20 días, con sus consentimientos (cascade) y sus códigos.
// - Mientras tanto, si se registraron por correo, reciben un recordatorio cada 3,5 días (dos por semana).
import type { Db } from './db';
import type { Recordar } from './envios';

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
